import { prisma } from "@/lib/prisma";
import Link from 'next/link';

type SeriesWithStats = {
  id: number;
  codeSerie: string;
  nomSerie: string;
  urlSource: string | null;
  dateAjout: Date;
  nbCartesTotal: number;
  _count: {
    cartes: number;
  };
  artworkStats: Record<string, number>;
  totalVersions: number;
  ownedVersions: number;
  completionRate: number;
};

interface HomeProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

export default async function Home({ searchParams }: HomeProps) {
  let series: SeriesWithStats[] = [];
  let hasDbError = false;

  try {
    // Récupérer toutes les séries avec le nombre de cartes et les statistiques d'artwork
    const [rawSeries, artworkGroups] = await Promise.all([
      prisma.series.findMany({
        include: {
          cartes: {
            select: {
              carteRaretes: {
                select: {
                  possedee: true,
                },
              },
            },
          },
          _count: {
            select: { cartes: true },
          },
        },
        orderBy: {
          nomSerie: 'asc',
        },
      }),
      prisma.carte.groupBy({
        by: ['serieId', 'artwork'],
        _count: {
          _all: true,
        },
      }),
    ]);

    const artworkStatsBySerie = new Map<number, Record<string, number>>();
    for (const group of artworkGroups) {
      const currentStats = artworkStatsBySerie.get(group.serieId) ?? {};
      currentStats[group.artwork ?? 'None'] = group._count._all;
      artworkStatsBySerie.set(group.serieId, currentStats);
    }

    series = rawSeries.map((serie) => {
      const { cartes, ...serieData } = serie;
      const totalVersions = cartes.reduce((acc, carte) => acc + carte.carteRaretes.length, 0);
      const ownedVersions = cartes.reduce(
        (acc, carte) => acc + carte.carteRaretes.filter((rarete) => rarete.possedee).length,
        0,
      );
      const completionRate = totalVersions > 0 ? (ownedVersions / totalVersions) * 100 : 0;

      return {
        ...serieData,
        artworkStats: artworkStatsBySerie.get(serie.id) ?? {},
        totalVersions,
        ownedVersions,
        completionRate,
      };
    });
  } catch (error) {
    console.error('Erreur de base de données:', error);
    hasDbError = true;
  }

  const resolvedSearchParams =
    searchParams instanceof Promise ? await searchParams : (searchParams ?? {});

  const rawQuery = resolvedSearchParams?.q;
  const queryValue = Array.isArray(rawQuery) ? rawQuery[0] : rawQuery;
  const searchQuery = queryValue?.trim() ?? '';
  const normalizedQuery = searchQuery.toLowerCase();
  const filteredSeries = searchQuery.length > 0
    ? series.filter((serie) =>
        serie.nomSerie.toLowerCase().includes(normalizedQuery) ||
        serie.codeSerie.toLowerCase().includes(normalizedQuery)
      )
    : series;

  const totalCards = series.reduce((total, serie) => total + serie._count.cartes, 0);
  const filteredCards = filteredSeries.reduce((total, serie) => total + serie._count.cartes, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <nav className="flex justify-end mb-6">
          <div className="flex flex-wrap gap-3">
            <Link 
              href="/statistiques" 
              className="bg-white/10 hover:bg-white/20 text-blue-100 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 border border-white/10"
            >
              📈 Statistiques
            </Link>
            <Link 
              href="/convertisseur" 
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              🔄 Convertisseur
            </Link>
          </div>
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
              {searchQuery
                ? `${filteredSeries.length}/${series.length} séries • ${filteredCards}/${totalCards} cartes`
                : `${series.length} séries • ${totalCards} cartes`}
            </p>
          )}

          {!hasDbError && (
            <form
              method="get"
              className="mt-6 mx-auto w-full max-w-xl"
            >
              <div className="relative group">
                <input
                  type="search"
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="Rechercher une série (nom ou code)..."
                  className="w-full rounded-full bg-white/10 border border-white/20 py-3 pl-12 pr-4 text-white placeholder:text-blue-200/70 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40 transition"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-200">
                  🔍
                </span>
                {searchQuery && (
                  <a
                    href="/"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-blue-200 hover:text-white underline"
                  >
                    Effacer
                  </a>
                )}
              </div>
            </form>
          )}
        </header>

        {/* Grille des séries */}
        {hasDbError ? (
          <div className="text-center text-gray-300">
            <p className="mb-4">La base de données n&apos;est pas accessible pour le moment.</p>
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
          <>
            {filteredSeries.length === 0 ? (
              <div className="text-center text-blue-100 bg-white/10 border border-white/10 rounded-2xl py-12">
                <p className="text-lg font-semibold">Aucune série trouvée</p>
                <p className="text-sm text-blue-200 mt-2">
                  Vérifiez l’orthographe ou utilisez un autre mot-clé.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSeries.map((serie) => {
                  const hasProgressData = serie.totalVersions > 0;
                  const completionPercent = hasProgressData ? Math.round(serie.completionRate) : 0;

                  return (
                    <Link key={serie.id} href={`/series/${serie.id}`}>
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-all duration-300 cursor-pointer group h-full flex flex-col">
                    <div className="flex justify-between items-start">
                      <h2 className="text-xl font-semibold text-white group-hover:text-blue-200 transition-colors">
                        {serie.nomSerie}
                      </h2>
                      <span className="bg-blue-500/30 text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
                        {serie.codeSerie}
                      </span>
                    </div>

                    <div className="mt-6 space-y-3 text-gray-300 flex-1">
                      <p className="flex justify-between">
                        <span>Cartes suivies</span>
                        <span className="font-semibold text-white">{serie._count.cartes}</span>
                      </p>
                      <p className="flex justify-between">
                        <span>Total prévu</span>
                        <span className="font-semibold text-white">{serie.nbCartesTotal || 'N/A'}</span>
                      </p>

                      <div className="pt-2">
                        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-blue-200">
                          <span>Complétion</span>
                          {hasProgressData ? (
                            <span className="text-white font-semibold">
                              {serie.ownedVersions}/{serie.totalVersions}
                              <span className="ml-2 text-xs text-blue-300 font-medium">
                                ({completionPercent}%)
                              </span>
                            </span>
                          ) : (
                            <span className="text-blue-300">En attente</span>
                          )}
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              completionPercent >= 100
                                ? 'bg-green-500'
                                : 'bg-gradient-to-r from-green-400 to-blue-500'
                            }`}
                            style={{ width: `${hasProgressData ? Math.min(100, completionPercent) : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/10">
                      <p className="text-xs text-gray-400">
                        Ajoutée le {new Date(serie.dateAjout).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <footer className="text-center mt-12 text-gray-400">
          <p>Collection Yu-Gi-Oh! - Développée avec Next.js & PostgreSQL</p>
        </footer>
      </div>
    </div>
  );
}
