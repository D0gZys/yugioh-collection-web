import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { detectArtworkType, normalizeFrenchName } from '@/lib/card';
import { z } from 'zod';

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
  sourceUrl: z.preprocess(
    (value) => {
      if (typeof value !== 'string') {
        return null;
      }
      const normalized = value.trim();
      return normalized.length === 0 ? null : normalized;
    },
    z.string().url().nullable()
  ),
  cards: z.array(cardDataSchema).min(1, 'Au moins une carte est requise'),
});

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const parsed = saveSeriesSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Données de requête invalides',
          details: parsed.error.flatten(),
        },
        { status: 422 }
      );
    }

    const data = parsed.data;

    console.log('📝 Réception des données:', {
      seriesCode: data.seriesCode,
      seriesName: data.seriesName,
      cardsCount: data.cards.length,
      sourceUrl: data.sourceUrl
    });

    // Analyser les doublons dans les données reçues
    const cardCodes = data.cards.map(card => card.code);
    const uniqueCardCodes = [...new Set(cardCodes)];
    const duplicatesCount = cardCodes.length - uniqueCardCodes.length;
    
    if (duplicatesCount > 0) {
      console.log(`⚠️ Doublons détectés: ${duplicatesCount} cartes dupliquées sur ${cardCodes.length} total`);
      
      // Identifier les codes en double
      const duplicatedCodes = cardCodes.filter((code, index) => cardCodes.indexOf(code) !== index);
      const uniqueDuplicates = [...new Set(duplicatedCodes)];
      console.log('🔍 Codes de cartes dupliqués:', uniqueDuplicates.slice(0, 5), 
        uniqueDuplicates.length > 5 ? `... et ${uniqueDuplicates.length - 5} autres` : '');
    }

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

      // 2. Créer les cartes uniques (basé sur code + artwork)
      // Regrouper les cartes par code+artwork pour gérer les multiples versions
      const cardMap = new Map();
      
      data.cards.forEach(card => {
        // Détecter le type d'artwork automatiquement ou utiliser celui fourni
        const artworkDetection = detectArtworkType({
          code: card.code,
          englishName: card.nameEnglish,
        });
        const artworkType = card.artwork || artworkDetection.artwork;
        const cardKey = `${card.code}_${artworkType}`;
        const normalizedFrenchName = card.nameFrench ? normalizeFrenchName(card.nameFrench) : '';
        
        if (!cardMap.has(cardKey)) {
          cardMap.set(cardKey, {
            code: card.code.trim(),
            nameFrench: normalizedFrenchName,
            nameEnglish: artworkDetection.cleanedEnglishName,
            artwork: artworkType,
            rarities: new Set<string>()
          });
        }
        // Ajouter la rareté à cet ensemble
        cardMap.get(cardKey).rarities.add(card.rarity);
      });

      console.log(`📊 Cartes uniques détectées: ${cardMap.size} sur ${data.cards.length} entrées`);
      
      // Analyser la répartition des artworks
      const artworkStats: Record<string, number> = {};
      cardMap.forEach(card => {
        artworkStats[card.artwork] = (artworkStats[card.artwork] || 0) + 1;
      });
      console.log('🎨 Répartition des artworks:', artworkStats);

      // Créer les cartes uniques avec artwork
      const cardsToCreate = Array.from(cardMap.values()).map(card => ({
        numeroCarte: card.code,
        nomCarte: card.nameFrench && card.nameFrench.length > 0 ? card.nameFrench : card.nameEnglish,
        serieId: newSeries.id,
        artwork: card.artwork
      }));

      const createdCards = await tx.carte.createMany({
        data: cardsToCreate,
        skipDuplicates: true // Ignorer les doublons si ils existent déjà
      });

      console.log('✅ Cartes créées:', createdCards.count);

      // 3. Récupérer les cartes créées pour créer les raretés
      const cards = await tx.carte.findMany({
        where: { serieId: newSeries.id }
      });

      // 4. Traiter les raretés et créer les relations
      const allRarities = [...new Set(data.cards.map(card => card.rarity))];
      console.log(`🎨 Raretés détectées: ${allRarities.length} types différents`);
      
      // Créer ou récupérer toutes les raretés d'abord
      const rarityMap = new Map();
      for (const rarityName of allRarities) {
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
          console.log(`➕ Nouvelle rareté créée: ${rarityName}`);
        }
        
        rarityMap.set(rarityName, rarity);
      }

      // 5. Créer les relations carte-rareté en utilisant notre cardMap
      let relationsCreated = 0;
      
      for (const [, cardInfo] of cardMap) {
        // Rechercher la carte correspondante par code ET artwork
        const correspondingCard = cards.find(card => 
          card.numeroCarte === cardInfo.code && 
          card.artwork === cardInfo.artwork
        );
        
        if (correspondingCard) {
          // Pour chaque rareté de cette carte
          for (const rarityName of cardInfo.rarities) {
            const rarity = rarityMap.get(rarityName);
            
            if (rarity) {
              // Vérifier si la relation existe déjà
              const existingCarteRarete = await tx.carteRarete.findUnique({
                where: {
                  carteId_rareteId: {
                    carteId: correspondingCard.id,
                    rareteId: rarity.id
                  }
                }
              });

              // Créer la relation seulement si elle n'existe pas
              if (!existingCarteRarete) {
                await tx.carteRarete.create({
                  data: {
                    carteId: correspondingCard.id,
                    rareteId: rarity.id,
                    possedee: false,
                    condition: 'NM'
                  }
                });
                relationsCreated++;
              }
            }
          }
        } else {
          console.log(`⚠️ Carte non trouvée: ${cardInfo.code} (${cardInfo.artwork})`);
        }
      }
      
      console.log(`🔗 Relations carte-rareté créées: ${relationsCreated}`);

      return {
        series: newSeries,
        cardsCount: createdCards.count,
        raritiesCount: allRarities.length,
        relationsCreated: relationsCreated
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
        raritiesProcessed: result.raritiesCount,
        relationsCreated: result.relationsCreated,
        originalDataCount: data.cards.length
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde:', error);
    
    // Gestion spécifique des erreurs Prisma
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { 
            error: 'Conflit de données',
            details: 'Une ou plusieurs cartes/raretés existent déjà dans la base de données'
          },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la sauvegarde de la série',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
