import { PrismaClient } from '../generated/prisma';
import Link from 'next/link';

const prisma = new PrismaClient();

export default async function Home() {
  // Récupérer toutes les séries avec le nombre de cartes
  const series = await prisma.series.findMany({
    include: {
      _count: {
        select: { cartes: true }
      }
    },
    orderBy: {
      nomSerie: 'asc'
    }
  });

  await prisma.$disconnect();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            🃏 Ma Collection Yu-Gi-Oh!
          </h1>
          <p className="text-xl text-blue-200">
            {series.length} séries • {series.reduce((total, serie) => total + serie._count.cartes, 0)} cartes
          </p>
        </header>

        {/* Grille des séries */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {series.map((serie) => (
            <Link key={serie.id} href={`/series/${serie.id}`}>
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-all duration-300 cursor-pointer group">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-semibold text-white group-hover:text-blue-200 transition-colors">
                    {serie.nomSerie}
                  </h2>
                  <span className="bg-blue-500/30 text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
                    {serie.codeSerie}
                  </span>
                </div>
                
                <div className="space-y-2 text-gray-300">
                  <p className="flex justify-between">
                    <span>Cartes:</span>
                    <span className="font-semibold text-white">{serie._count.cartes}</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Total prévu:</span>
                    <span className="font-semibold text-white">{serie.nbCartesTotal || 'N/A'}</span>
                  </p>
                  {serie.urlSource && (
                    <p className="text-xs text-blue-300 truncate mt-3">
                      📖 Source disponible
                    </p>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-xs text-gray-400">
                    Ajoutée le {new Date(serie.dateAjout).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <footer className="text-center mt-12 text-gray-400">
          <p>Collection Yu-Gi-Oh! - Développée avec Next.js & PostgreSQL</p>
        </footer>
      </div>
    </div>
  );
}
