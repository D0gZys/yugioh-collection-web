import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL manquante' }, { status: 400 });
    }

    // Vérifier que c'est bien une URL Yugipedia
    if (!url.includes('yugipedia.com')) {
      return NextResponse.json({ error: 'Seules les URLs Yugipedia sont autorisées' }, { status: 400 });
    }

    // Récupérer la page web
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; YugiohCollectionBot/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const html = await response.text();
    
    // Utiliser Cheerio pour parser le HTML côté serveur
    const $ = cheerio.load(html);
    
    // Trouver le tableau des cartes (habituellement dans une table avec tbody)
    const tableBody = $('table tbody').first();
    
    if (tableBody.length === 0) {
      return NextResponse.json({ error: 'Aucun tableau trouvé sur cette page' }, { status: 404 });
    }

    // Extraire le HTML du tbody
    const tableHtml = tableBody.html();

    return NextResponse.json({ 
      success: true, 
      html: `<tbody>${tableHtml}</tbody>`,
      url: url 
    });

  } catch (error) {
    console.error('Erreur lors de la récupération:', error);
    return NextResponse.json(
      { error: 'Impossible de récupérer les données de cette URL' }, 
      { status: 500 }
    );
  }
}