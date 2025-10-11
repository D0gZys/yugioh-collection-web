import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function testArtworkFeature() {
  console.log('🧪 Test des fonctionnalités d\'artwork...\n');

  try {
    // 1. Vérifier si nous avons des séries avec des artworks
    const seriesWithArtworks = await prisma.series.findMany({
      include: {
        cartes: {
          where: {
            artwork: {
              not: 'None'
            }
          },
          select: {
            id: true,
            numeroCarte: true,
            nomCarte: true,
            artwork: true
          }
        }
      }
    });

    console.log('📊 Séries avec artworks spéciaux trouvées:', seriesWithArtworks.length);
    
    seriesWithArtworks.forEach(serie => {
      if (serie.cartes.length > 0) {
        console.log(`\n📂 ${serie.nomSerie} (${serie.codeSerie}):`);
        serie.cartes.forEach(carte => {
          console.log(`  🎨 ${carte.numeroCarte} - ${carte.nomCarte} [${carte.artwork}]`);
        });
      }
    });

    // 2. Statistiques générales
    const totalCartes = await prisma.carte.count();
    const cartesAlternatives = await prisma.carte.count({
      where: { artwork: 'Alternative' }
    });
    const cartesNew = await prisma.carte.count({
      where: { artwork: 'New' }
    });
    const cartesNormales = await prisma.carte.count({
      where: { artwork: 'None' }
    });

    console.log('\n📈 Statistiques globales:');
    console.log(`  Total cartes: ${totalCartes}`);
    console.log(`  🎨 Artworks alternatifs: ${cartesAlternatives}`);
    console.log(`  ✨ Nouveaux artworks: ${cartesNew}`);
    console.log(`  📄 Artworks standard: ${cartesNormales}`);

    // 3. Vérifier s'il y a des doublons de codes avec différents artworks
    const duplicateCardCodes = await prisma.$queryRaw`
      SELECT numero_carte, COUNT(*) as count, 
             STRING_AGG(DISTINCT artwork, ', ') as artworks
      FROM cartes 
      GROUP BY numero_carte 
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 10
    ` as Array<{numero_carte: string, count: bigint, artworks: string}>;

    if (duplicateCardCodes.length > 0) {
      console.log('\n🔍 Cartes avec plusieurs versions (artwork différent):');
      duplicateCardCodes.forEach(dup => {
        console.log(`  ${dup.numero_carte}: ${dup.count} versions (${dup.artworks})`);
      });
    }

    console.log('\n✅ Test terminé avec succès!');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testArtworkFeature();