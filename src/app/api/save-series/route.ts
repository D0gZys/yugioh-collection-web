import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { detectArtworkType, normalizeFrenchName } from '@/lib/card';
import {
  DEFAULT_LANGUAGE_CODE,
  detectDominantLanguageFromCodes,
  getLanguageLabel,
  resolveLanguageCode,
} from '@/lib/language';
import { prisma } from '@/lib/prisma';

const cardDataSchema = z.object({
  code: z.string().trim().min(1),
  nameEnglish: z.string().trim().min(1),
  nameFrench: z.string().trim().optional(),
  rarity: z.string().trim().min(1),
  type: z.string().trim().optional().default(''),
  artwork: z.enum(['None', 'New', 'Alternative']).optional(),
});

const saveSeriesSchema = z.object({
  seriesCode: z.string().trim().min(1).max(10),
  seriesName: z.string().trim().min(1),
  sourceUrl: z
    .preprocess((value) => {
      if (typeof value !== 'string') {
        return null;
      }
      const normalized = value.trim();
      return normalized.length === 0 ? null : normalized;
    }, z.string().url().nullable()),
  languageCode: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .optional(),
  cards: z.array(cardDataSchema).min(1, 'Au moins une carte est requise'),
});

type ParsedPayload = z.infer<typeof saveSeriesSchema>;

type CardAggregation = {
  code: string;
  nameEnglish: string;
  nameFrench: string;
  artwork: 'None' | 'New' | 'Alternative';
  rarities: Set<string>;
};

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const parsed = saveSeriesSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Donnees de requete invalides',
          details: parsed.error.flatten(),
        },
        { status: 422 },
      );
    }

    const data: ParsedPayload = parsed.data;

    console.log('<< API save-series >> reception:', {
      seriesCode: data.seriesCode,
      seriesName: data.seriesName,
      cardsCount: data.cards.length,
      sourceUrl: data.sourceUrl,
    });

    const cardCodes = data.cards.map((card) => card.code);
    const uniqueCardCodes = new Set(cardCodes);
    const duplicatesCount = cardCodes.length - uniqueCardCodes.size;

    if (duplicatesCount > 0) {
      const duplicatedCodes = cardCodes.filter(
        (code, index) => cardCodes.indexOf(code) !== index,
      );
      const uniqueDuplicates = [...new Set(duplicatedCodes)];
      console.log('  -> Doublons detectes:', {
        duplicatesCount,
        sample: uniqueDuplicates.slice(0, 5),
      });
    }

    const languageDetection = detectDominantLanguageFromCodes(cardCodes);
    const requestedLanguage = resolveLanguageCode(data.languageCode);
    const languageCode =
      requestedLanguage ??
      languageDetection.code ??
      DEFAULT_LANGUAGE_CODE;
    const languageLabel = getLanguageLabel(languageCode);

    console.log('  -> Langue retenue:', {
      requested: data.languageCode ?? 'none',
      detected: languageDetection.code ?? 'none',
      chosen: languageCode,
      confidence: languageDetection.confidence,
      matches: languageDetection.matches,
      sampleSize: languageDetection.total,
    });

    const existingSeries = await prisma.series.findFirst({
      where: {
        codeSerie: data.seriesCode,
        langue: {
          codeLangue: languageCode,
        },
      },
    });

    if (existingSeries) {
      return NextResponse.json(
        {
          error: `Cette serie existe deja pour la langue ${languageLabel}`,
        },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const languageRecord = await tx.langue.upsert({
        where: { codeLangue: languageCode },
        create: {
          codeLangue: languageCode,
          nomLangue: languageLabel,
        },
        update: {
          nomLangue: languageLabel,
        },
      });

      const newSeries = await tx.series.create({
        data: {
          codeSerie: data.seriesCode,
          nomSerie: data.seriesName,
          urlSource: data.sourceUrl ?? null,
          nbCartesTotal: data.cards.length,
          dateAjout: new Date(),
          langueId: languageRecord.id,
        },
      });

      const cardMap = new Map<string, CardAggregation>();

      data.cards.forEach((card) => {
        const artworkDetection = detectArtworkType({
          code: card.code,
          englishName: card.nameEnglish,
        });
        const artworkType = card.artwork ?? artworkDetection.artwork;
        const key = `${card.code.trim()}__${artworkType}`;
        const normalizedFrenchName = card.nameFrench
          ? normalizeFrenchName(card.nameFrench)
          : '';

        if (!cardMap.has(key)) {
          cardMap.set(key, {
            code: card.code.trim(),
            nameEnglish: artworkDetection.cleanedEnglishName,
            nameFrench: normalizedFrenchName,
            artwork: artworkType,
            rarities: new Set<string>(),
          });
        }

        cardMap.get(key)?.rarities.add(card.rarity);
      });

      console.log('  -> Cartes uniques detectees:', {
        uniqueEntries: cardMap.size,
        totalRows: data.cards.length,
      });

      const cardsToCreate = Array.from(cardMap.values()).map((card) => ({
        numeroCarte: card.code,
        nomCarte:
          card.nameFrench.length > 0
            ? card.nameFrench
            : card.nameEnglish,
        serieId: newSeries.id,
        artwork: card.artwork,
      }));

      const createdCards = await tx.carte.createMany({
        data: cardsToCreate,
        skipDuplicates: true,
      });

      const cards = await tx.carte.findMany({
        where: { serieId: newSeries.id },
      });

      const allRarities = Array.from(
        new Set(data.cards.map((card) => card.rarity)),
      );

      const rarityMap = new Map<string, { id: number }>();
      for (const rarityName of allRarities) {
        let rarity = await tx.rarete.findFirst({
          where: { nomRarete: rarityName },
        });

        if (!rarity) {
          rarity = await tx.rarete.create({
            data: {
              nomRarete: rarityName,
              ordreTri: 0,
            },
          });
          console.log('    -> Nouvelle rarete creee:', rarityName);
        }

        rarityMap.set(rarityName, rarity);
      }

      let relationsCreated = 0;

      for (const cardInfo of cardMap.values()) {
        const targetCard = cards.find(
          (card) =>
            card.numeroCarte === cardInfo.code &&
            card.artwork === cardInfo.artwork,
        );

        if (!targetCard) {
          console.log('    -> Carte introuvable lors de la liaison:', {
            code: cardInfo.code,
            artwork: cardInfo.artwork,
          });
          continue;
        }

        for (const rarityName of cardInfo.rarities) {
          const rarity = rarityMap.get(rarityName);
          if (!rarity) {
            continue;
          }

          const existingRelation = await tx.carteRarete.findUnique({
            where: {
              carteId_rareteId: {
                carteId: targetCard.id,
                rareteId: rarity.id,
              },
            },
          });

          if (!existingRelation) {
            await tx.carteRarete.create({
              data: {
                carteId: targetCard.id,
                rareteId: rarity.id,
                possedee: false,
                condition: 'NM',
              },
            });
            relationsCreated += 1;
          }
        }
      }

      console.log('  -> Cartes inserees:', createdCards.count);
      console.log('  -> Relations carte-rarete creees:', relationsCreated);

      return {
        series: newSeries,
        cardsCount: createdCards.count,
        raritiesCount: allRarities.length,
        relationsCreated,
        language: {
          id: languageRecord.id,
          code: languageCode,
          label: languageLabel,
        },
      };
    });

    return NextResponse.json({
      success: true,
      message: `Serie "${data.seriesName}" ajoutee avec succes`,
      data: {
        seriesId: result.series.id,
        seriesCode: result.series.codeSerie,
        cardsAdded: result.cardsCount,
        raritiesProcessed: result.raritiesCount,
        relationsCreated: result.relationsCreated,
        languageCode,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la serie:', error);

    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        {
          error: 'Conflit de donnees',
          details:
            'Une ou plusieurs cartes ou raretes existent deja dans la base de donnees',
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error: 'Erreur lors de la sauvegarde de la serie',
        details:
          error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 },
    );
  }
}
