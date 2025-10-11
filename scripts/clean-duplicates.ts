import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function analyzeAndCleanDuplicates() {
  console.log('🔍 Analyse des doublons dans la base de données...\n');

  try {
    // 1. Trouver les doublons
    const duplicates = await prisma.$queryRaw`
      SELECT numero_carte, serie_id, COUNT(*) as count
      FROM cartes 
      GROUP BY numero_carte, serie_id 
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    ` as Array<{numero_carte: string, serie_id: number, count: bigint}>;

    console.log(`📊 Doublons trouvés: ${duplicates.length} codes de cartes dupliqués`);
    
    if (duplicates.length > 0) {
      console.log('\n🔍 Détails des doublons:');
      duplicates.forEach((dup) => {
        console.log(`- ${dup.numero_carte} (série ${dup.serie_id}): ${dup.count} copies`);
      });

      console.log('\n🔧 Nettoyage automatique des doublons...');

      // 2. Pour chaque doublon, garder le premier et supprimer les autres
      for (const dup of duplicates) {
        const cartes = await prisma.carte.findMany({
          where: {
            numeroCarte: dup.numero_carte,
            serieId: dup.serie_id
          },
          orderBy: { id: 'asc' }
        });

        if (cartes.length > 1) {
          // Garder la première carte, supprimer les autres
          const cartesToDelete = cartes.slice(1);
          
          for (const carte of cartesToDelete) {
            // Supprimer d'abord les relations CarteRarete
            await prisma.carteRarete.deleteMany({
              where: { carteId: carte.id }
            });
            
            // Puis supprimer la carte
            await prisma.carte.delete({
              where: { id: carte.id }
            });
          }
          
          console.log(`✅ Nettoyé ${cartesToDelete.length} doublons pour ${dup.numero_carte}`);
        }
      }
    }

    console.log('\n✅ Nettoyage terminé!');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeAndCleanDuplicates();