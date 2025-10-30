'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type SeriesWithStats = {
  id: number;
  codeSerie: string;
  nomSerie: string;
  urlSource: string | null;
  dateAjout: string;
  nbCartesTotal: number;
  langue: {
    codeLangue: string;
    nomLangue: string;
  };
  _count: {
    cartes: number;
  };
  artworkStats: Record<string, number>;
  totalVersions: number;
  ownedVersions: number;
  completionRate: number;
};

type HomeClientProps = {
  initialSeries: SeriesWithStats[];
  hasDbError: boolean;
  searchQuery: string;
};

const normalize = (value: string) => value.trim().toLowerCase();

const formatDate = (input: string) =>
  new Date(input).toLocaleDateString('fr-FR');

export default function HomeClient({
  initialSeries,
  hasDbError,
  searchQuery,
}: HomeClientProps) {
  const [series, setSeries] = useState(initialSeries);
  const [editMode, setEditMode] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setSeries(initialSeries);
    setEditMode(false);
    setDeletingIds(new Set());
  }, [initialSeries]);

  const trimmedQuery = searchQuery.trim();
  const normalizedQuery = normalize(trimmedQuery);

  const filteredSeries = useMemo(() => {
    if (!trimmedQuery) {
      return series;
    }

    return series.filter((serie) => {
      const lowerName = serie.nomSerie.toLowerCase();
      const lowerCode = serie.codeSerie.toLowerCase();
      const lowerLangCode = serie.langue.codeLangue.toLowerCase();
      const lowerLangName = serie.langue.nomLangue.toLowerCase();
      return (
        lowerName.includes(normalizedQuery) ||
        lowerCode.includes(normalizedQuery) ||
        lowerLangCode.includes(normalizedQuery) ||
        lowerLangName.includes(normalizedQuery)
      );
    });
  }, [series, trimmedQuery, normalizedQuery]);

  const totalCards = useMemo(
    () => series.reduce((total, serie) => total + serie._count.cartes, 0),
    [series],
  );

  const filteredCards = useMemo(
    () => filteredSeries.reduce((total, serie) => total + serie._count.cartes, 0),
    [filteredSeries],
  );

  const toggleEditMode = () => {
    if (hasDbError) {
      return;
    }
    setErrorMessage(null);
    setEditMode((previous) => !previous);
  };

  const handleDelete = async (serieId: number) => {
    setErrorMessage(null);

    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.add(serieId);
      return next;
    });

    try {
      const response = await fetch(`/api/series/${serieId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message =
          body?.error || 'Impossible de supprimer la série pour le moment.';
        throw new Error(message);
      }

      setSeries((current) => current.filter((serie) => serie.id !== serieId));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Une erreur inconnue est survenue lors de la suppression.';
      setErrorMessage(message);
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(serieId);
        return next;
      });
    }
  };

  const renderHeaderStats = () => {
    if (hasDbError) {
      return (
        <div className="text-xl text-red-300 bg-red-900/30 border border-red-500 rounded-lg p-4 mx-auto max-w-md">
          ⚠️ Erreur de connexion à la base de données
          <p className="text-sm mt-2">
            Veuillez vérifier que PostgreSQL est démarré et que les migrations
            sont appliquées.
          </p>
        </div>
      );
    }

    if (trimmedQuery) {
      return (
        <p className="text-xl text-blue-200">
          {filteredSeries.length}/{series.length} séries • {filteredCards}/
          {totalCards} cartes
        </p>
      );
    }

    return (
      <p className="text-xl text-blue-200">
        {series.length} séries • {totalCards} cartes
      </p>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <nav className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <button
            type="button"
            onClick={toggleEditMode}
            disabled={hasDbError}
            aria-pressed={editMode}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              editMode
                ? 'bg-orange-500/90 hover:bg-orange-600 text-white border-orange-300'
                : 'bg-white/10 hover:bg-white/20 text-blue-100 border-white/10'
            } ${hasDbError ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {editMode ? 'Terminer' : 'Editer'}
          </button>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/statistiques"
              className="bg-white/10 hover:bg-white/20 text-blue-100 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 border border-white/10"
            >
              Statistiques
            </Link>
            <Link
              href="/convertisseur"
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              Convertisseur
            </Link>
          </div>
        </nav>

        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            Ma Collection Yu-Gi-Oh!
          </h1>

          {renderHeaderStats()}

          {!hasDbError && (
            <form method="get" className="mt-6 mx-auto w-full max-w-xl">
              <div className="relative group">
                <input
                  type="search"
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="Rechercher une série (nom ou code)..."
                  className="w-full rounded-full bg-white/10 border border-white/20 py-3 pl-12 pr-4 text-white placeholder:text-blue-200/70 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40 transition"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-200">
                  ?
                </span>
                {trimmedQuery && (
                  <Link
                    href="/"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-blue-200 hover:text-white underline"
                  >
                    Effacer
                  </Link>
                )}
              </div>
            </form>
          )}
        </header>

        {errorMessage && (
          <div className="mb-6 rounded-lg border border-red-500 bg-red-900/40 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        {hasDbError ? (
          <div className="text-center text-gray-300">
            <p className="mb-4">
              La base de données n’est pas accessible pour le moment.
            </p>
            <p className="text-sm text-gray-400">
              Commandes pour résoudre le problème :
            </p>
            <div className="bg-gray-800 rounded-lg p-4 mt-4 text-left max-w-md mx-auto">
              <code className="text-green-400">
                npx prisma migrate dev
                <br />
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
                  const completionPercent = hasProgressData
                    ? Math.round(serie.completionRate)
                    : 0;
                  const deleting = deletingIds.has(serie.id);

                  return (
                    <div key={serie.id} className="relative group h-full">
                      {editMode && (
                        <button
                          type="button"
                          onClick={() => handleDelete(serie.id)}
                          disabled={deleting}
                          className="absolute -top-3 -right-3 z-10 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white shadow-lg transition hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {deleting ? 'Suppression...' : 'Supprimer'}
                        </button>
                      )}

                      <Link
                        href={`/series/${serie.id}`}
                        className="block h-full"
                      >
                        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-all duration-300 cursor-pointer h-full flex flex-col">
                          <div className="flex justify-between items-start">
                            <h2 className="text-xl font-semibold text-white group-hover:text-blue-200 transition-colors">
                              {serie.nomSerie}
                            </h2>
                            <div className="flex items-center gap-2">
                              <span className="bg-blue-500/30 text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
                                {serie.codeSerie}
                              </span>
                              <span
                                className="bg-green-500/20 text-green-200 px-2 py-1 rounded-full text-xs font-semibold"
                                title={serie.langue.nomLangue}
                              >
                                {serie.langue.codeLangue}
                              </span>
                            </div>
                          </div>

                          <div className="mt-6 space-y-3 text-gray-300 flex-1">
                            <p className="flex justify-between">
                              <span>Cartes suivies</span>
                              <span className="font-semibold text-white">
                                {serie._count.cartes}
                              </span>
                            </p>
                            <p className="flex justify-between">
                              <span>Total prévu</span>
                              <span className="font-semibold text-white">
                                {serie.nbCartesTotal || 'N/A'}
                              </span>
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
                                  <span className="text-blue-300">
                                    En attente
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    completionPercent >= 100
                                      ? 'bg-green-500'
                                      : 'bg-gradient-to-r from-green-400 to-blue-500'
                                  }`}
                                  style={{
                                    width: `${
                                      hasProgressData
                                        ? Math.min(100, completionPercent)
                                        : 0
                                    }%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="mt-6 pt-4 border-t border-white/10">
                            <p className="text-xs text-gray-400">
                              Ajoutée le {formatDate(serie.dateAjout)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        <footer className="text-center mt-12 text-gray-400">
          <p>Collection Yu-Gi-Oh! - Développée avec Next.js et PostgreSQL</p>
        </footer>
      </div>
    </div>
  );
}



