import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../generated/prisma';

const prisma = new PrismaClient();

interface CardData {
  code: string;
  nameEnglish: string;
  nameFrench: string;
  rarity: string;
  type: string;
}

interface SaveSeriesRequest {
  seriesCode: string;
  seriesName: string;
  sourceUrl: string;
  cards: CardData[];
}

export async function POST(request: NextRequest) {
  try {
    const data: SaveSeriesRequest = await request.json();
    
    console.log('📝 Réception des données:', {
      seriesCode: data.seriesCode,
      seriesName: data.seriesName,
      cardsCount: data.cards.length,
      sourceUrl: data.sourceUrl
    });

    // Vérifier si la série existe déjà
    const existingSeries = await prisma.series.findUnique({
      where: { codeSerie: data.seriesCode }
    });

    if (existingSeries) {
      return NextResponse.json(
        { error: 'Cette série existe déjà dans la base de données' },
        { status: 400 }
      );
    }

    // Créer la série avec toutes ses cartes en une transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Créer la série
      const newSeries = await tx.series.create({
        data: {
          codeSerie: data.seriesCode,
          nomSerie: data.seriesName,
          urlSource: data.sourceUrl,
          nbCartesTotal: data.cards.length,
          dateAjout: new Date()
        }
      });

      console.log('✅ Série créée:', newSeries);

      // 2. Créer toutes les cartes
      const cardsToCreate = data.cards.map(card => ({
        numeroCarte: card.code,
        nomCarte: card.nameFrench || card.nameEnglish, // Priorité au français
        serieId: newSeries.id
      }));

      const createdCards = await tx.carte.createMany({
        data: cardsToCreate
      });

      console.log('✅ Cartes créées:', createdCards.count);

      // 3. Récupérer les cartes créées pour créer les raretés
      const cards = await tx.carte.findMany({
        where: { serieId: newSeries.id }
      });

      // 4. Créer les raretés uniques
      const rarities = [...new Set(data.cards.map(card => card.rarity))];
      
      for (const rarityName of rarities) {
        // Vérifier si la rareté existe déjà
        let rarity = await tx.rarete.findFirst({
          where: { nomRarete: rarityName }
        });

        if (!rarity) {
          rarity = await tx.rarete.create({
            data: {
              nomRarete: rarityName,
              ordreTri: 0
            }
          });
        }

        // 5. Créer les relations carte-rareté
        const cardsWithThisRarity = data.cards
          .map((cardData, index) => ({ cardData, cardIndex: index }))
          .filter(({ cardData }) => cardData.rarity === rarityName);

        for (const { cardData, cardIndex } of cardsWithThisRarity) {
          const correspondingCard = cards.find(card => card.numeroCarte === cardData.code);
          
          if (correspondingCard) {
            await tx.carteRarete.create({
              data: {
                carteId: correspondingCard.id,
                rareteId: rarity.id,
                possedee: false,
                condition: 'NM'
              }
            });
          }
        }
      }

      return {
        series: newSeries,
        cardsCount: createdCards.count,
        raritiesCount: rarities.length
      };
    });

    console.log('🎉 Transaction complétée avec succès');

    return NextResponse.json({
      success: true,
      message: `Série "${data.seriesName}" ajoutée avec succès`,
      data: {
        seriesId: result.series.id,
        seriesCode: result.series.codeSerie,
        cardsAdded: result.cardsCount,
        raritiesProcessed: result.raritiesCount
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde:', error);
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la sauvegarde de la série',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}