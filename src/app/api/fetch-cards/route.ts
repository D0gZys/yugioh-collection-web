import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { detectArtworkType, normalizeCardName, normalizeFrenchName, type ArtworkType } from '@/lib/card';
import { z } from 'zod';

const requestSchema = z.object({
  url: z.string().url(),
});

const ALLOWED_HOST = 'yugipedia.com';

const isAllowedHost = (hostname: string) =>
  hostname === ALLOWED_HOST || hostname.endsWith(`.${ALLOWED_HOST}`);

type ParsedCard = {
  code: string;
  nameEnglish: string;
  nameFrench: string;
  rarity: string;
  type: string;
  artwork: ArtworkType;
};

const getCellText = (cell: cheerio.Cheerio<cheerio.AnyNode>) =>
  cell.text().replace(/\s+/g, ' ').trim();

export async function POST(request: NextRequest) {
  let timeout: NodeJS.Timeout | undefined;

  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Corps de requête invalide', details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const targetUrl = new URL(parsed.data.url);

    if (targetUrl.protocol !== 'https:') {
      return NextResponse.json(
        { error: 'Seules les URLs HTTPS sont autorisées' },
        { status: 400 }
      );
    }

    if (!isAllowedHost(targetUrl.hostname)) {
      return NextResponse.json(
        { error: 'Seules les URLs Yugipedia sont autorisées' },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; YugiohCollectionBot/1.0)',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const finalUrl = new URL(response.url);
    if (!isAllowedHost(finalUrl.hostname)) {
      return NextResponse.json(
        { error: 'Redirection vers un domaine non autorisé' },
        { status: 400 }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const tableBody = $('table tbody').first();

    if (tableBody.length === 0) {
      return NextResponse.json({ error: 'Aucun tableau trouvé sur cette page' }, { status: 404 });
    }

    const cards: ParsedCard[] = [];
    const rows = tableBody.find('tr').toArray();

    for (const row of rows) {
      const $row = $(row);
      const cells = $row.find('td');
      if (cells.length < 4) {
        continue;
      }

      const codeText = getCellText(cells.eq(0));
      if (!codeText) {
        continue;
      }

      const englishRaw = getCellText(cells.eq(1));
      const extraArtworkHint = cells.eq(5)?.text();
      const detection = detectArtworkType({
        code: codeText,
        englishName: englishRaw,
        extraText: extraArtworkHint,
      });

      const frenchRaw = cells.eq(2) ? getCellText(cells.eq(2)) : '';
      const rarityLinks = cells
        .eq(3)
        .find('a')
        .map((_, link) => $(link).text().trim())
        .get()
        .filter(Boolean);

      if (rarityLinks.length === 0) {
        continue;
      }

      const typeText = cells.eq(4) ? getCellText(cells.eq(4)) : '';

      rarityLinks.forEach((rarity) => {
        cards.push({
          code: codeText,
          nameEnglish: detection.cleanedEnglishName || normalizeCardName(englishRaw),
          nameFrench: normalizeFrenchName(frenchRaw),
          rarity,
          type: typeText,
          artwork: detection.artwork,
        });
      });
    }

    if (cards.length === 0) {
      return NextResponse.json(
        { error: 'Aucune carte valide trouvée sur cette page' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      cards,
      url: finalUrl.toString(),
      uniqueCodes: new Set(cards.map((card) => card.code)).size,
      cardsCount: cards.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 422 });
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Délai dépassé pour la récupération de la page' }, { status: 504 });
    }

    console.error('Erreur lors de la récupération:', error);
    return NextResponse.json(
      { error: 'Impossible de récupérer les données de cette URL' },
      { status: 500 }
    );
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
