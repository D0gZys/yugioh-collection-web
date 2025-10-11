import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function seedTestData() {
  console.log('🌱 Ajout de données de test...\n');

  try {
    // Vérifier s'il y a déjà des données
    const existingSeries = await prisma.series.count();
    
    if (existingSeries > 0) {
      console.log(`✅ Base de données déjà initialisée avec ${existingSeries} série(s)`);
      return;
    }

    // Créer une série de test
    const testSerie = await prisma.series.create({
      data: {
        codeSerie: 'TEST',
        nomSerie: 'Série de Test',
        urlSource: 'https://example.com',
        nbCartesTotal: 3,
        dateAjout: new Date()
      }
    });

    console.log('📂 Série créée:', testSerie.nomSerie);

    // Créer quelques raretés de test
    const raretes = await Promise.all([
      prisma.rarete.create({
        data: { nomRarete: 'Common', ordreTri: 1 }
      }),
      prisma.rarete.create({
        data: { nomRarete: 'Rare', ordreTri: 2 }
      }),
      prisma.rarete.create({
        data: { nomRarete: 'Super Rare', ordreTri: 3 }
      }),
      prisma.rarete.create({
        data: { nomRarete: 'Secret Rare', ordreTri: 4 }
      })
    ]);

    console.log('🎨 Raretés créées:', raretes.length);

    // Créer des cartes de test avec différents artworks
    const cartes = await Promise.all([
      prisma.carte.create({
        data: {
          numeroCarte: 'TEST-001',
          nomCarte: 'Dragon de Test',
          serieId: testSerie.id,
          artwork: 'None'
        }
      }),
      prisma.carte.create({
        data: {
          numeroCarte: 'TEST-001',
          nomCarte: 'Dragon de Test',
          serieId: testSerie.id,
          artwork: 'Alternative'
        }
      }),
      prisma.carte.create({
        data: {
          numeroCarte: 'TEST-002',
          nomCarte: 'Magicien de Test',
          serieId: testSerie.id,
          artwork: 'None'
        }
      })
    ]);

    console.log('🃏 Cartes créées:', cartes.length);

    // Créer les relations carte-rareté
    const relations = [];
    
    for (const carte of cartes) {
      // Chaque carte aura 2-3 raretés différentes
      const carteRaretes = raretes.slice(0, Math.floor(Math.random() * 2) + 2);
      
      for (const rarete of carteRaretes) {
        relations.push(
          prisma.carteRarete.create({
            data: {
              carteId: carte.id,
              rareteId: rarete.id,
              possedee: Math.random() > 0.5, // 50% de chance d'être possédée
              condition: 'NM',
              prixAchat: Math.random() > 0.7 ? Math.floor(Math.random() * 50) + 1 : null
            }
          })
        );
      }
    }

    const createdRelations = await Promise.all(relations);
    console.log('🔗 Relations créées:', createdRelations.length);

    console.log('\n✅ Données de test ajoutées avec succès !');
    console.log('🌐 Allez sur http://localhost:3000 pour voir la série de test');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestData();