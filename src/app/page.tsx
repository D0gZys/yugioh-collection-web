import { PrismaClient } from '../generated/prisma';
import Link from 'next/link';

const prisma = new PrismaClient();

type SeriesWithCount = {
  id: number;
  codeSerie: string;
  nomSerie: string;
  urlSource: string | null;
  dateAjout: Date;
  nbCartesTotal: number;
  _count: {
    cartes: number;
  };
};

export default async function Home() {
  let series: SeriesWithCount[] = [];
  let hasDbError = false;

  try {
    // Récupérer toutes les séries avec le nombre de cartes
    series = await prisma.series.findMany({
      include: {
        _count: {
          select: { cartes: true }
        }
      },
      orderBy: {
        nomSerie: 'asc'
      }
    });
  } catch (error) {
    console.error('Erreur de base de données:', error);
    hasDbError = true;
  } finally {
    await prisma.$disconnect();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <nav className="flex justify-end mb-6">
          <Link 
            href="/convertisseur" 
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            🔄 Convertisseur
          </Link>
        </nav>

        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            🃏 Ma Collection Yu-Gi-Oh!
          </h1>
          {hasDbError ? (
            <div className="text-xl text-red-300 bg-red-900/30 border border-red-500 rounded-lg p-4 mx-auto max-w-md">
              ⚠️ Erreur de connexion à la base de données
              <p className="text-sm mt-2">Veuillez vérifier que PostgreSQL est démarré et que les migrations sont appliquées.</p>
            </div>
          ) : (
            <p className="text-xl text-blue-200">
              {series.length} séries • {series.reduce((total, serie) => total + serie._count.cartes, 0)} cartes
            </p>
          )}
        </header>

        {/* Grille des séries */}
        {hasDbError ? (
          <div className="text-center text-gray-300">
            <p className="mb-4">La base de données n'est pas accessible pour le moment.</p>
            <p className="text-sm text-gray-400">
              Commandes pour résoudre le problème :
            </p>
            <div className="bg-gray-800 rounded-lg p-4 mt-4 text-left max-w-md mx-auto">
              <code className="text-green-400">
                npx prisma migrate dev<br />
                npx prisma generate
              </code>
            </div>
          </div>
        ) : (
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
        )}

        {/* Footer */}
        <footer className="text-center mt-12 text-gray-400">
          <p>Collection Yu-Gi-Oh! - Développée avec Next.js & PostgreSQL</p>
        </footer>
      </div>
    </div>
  );
}
