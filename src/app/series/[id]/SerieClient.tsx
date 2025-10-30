'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { type ArtworkType } from '@/lib/card';

export interface CarteRarete {
  id: number;
  carteId: number;
  rareteId: number;
  possedee: boolean;
  dateAcquisition: string | null;
  condition: string;
  prixAchat: number | null;
  notes: string | null;
  rarete: {
    id: number;
    nomRarete: string;
  };
}

interface Carte {
  id: number;
  numeroCarte: string;
  nomCarte: string;
  artwork: string;
  carteRaretes: CarteRarete[];
}

export interface Serie {
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
  cartes: Carte[];
}

export interface SerieClientProps {
  initialSerie: Serie;
  initialStats: {
    totalCartes: number;
    cartesUniques: number;
    cartesPossedees: number;
    pourcentageCompletion: string;
    artworkStats: Record<string, number>;
  };
}

export default function SerieClient({ initialSerie, initialStats }: SerieClientProps) {
  const [serie, setSerie] = useState(initialSerie);
  const [stats, setStats] = useState(initialStats);
  const [loadingStates, setLoadingStates] = useState<Record<number, boolean>>({});
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [selectedArtworks, setSelectedArtworks] = useState<ArtworkType[]>([]);
  const [selectedRarities, setSelectedRarities] = useState<string[]>([]);
  const [possessionFilter, setPossessionFilter] = useState<'all' | 'owned' | 'missing'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterCompact, setIsFilterCompact] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const shouldCompact = window.scrollY > 140;
      setIsFilterCompact(prev => (prev === shouldCompact ? prev : shouldCompact));
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Fonction pour mettre à jour le statut de possession d'une carte
  const togglePossession = async (carteRareteId: number, currentStatus: boolean) => {
    setLoadingStates(prev => ({ ...prev, [carteRareteId]: true }));

    try {
      const response = await fetch('/api/carte-rarete/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          carteRareteId,
          possedee: !currentStatus,
          condition: 'NM' // Condition par défaut
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la mise à jour');
      }

      const result = await response.json();

      // Mettre à jour l'état local
      setSerie(prevSerie => ({
        ...prevSerie,
        cartes: prevSerie.cartes.map(carte => ({
          ...carte,
          carteRaretes: carte.carteRaretes.map(cr =>
            cr.id === carteRareteId
              ? { ...cr, possedee: !currentStatus, dateAcquisition: !currentStatus ? new Date().toISOString() : null }
              : cr
          )
        }))
      }));

      // Recalculer les statistiques
      const newCartesPossedees = !currentStatus ? stats.cartesPossedees + 1 : stats.cartesPossedees - 1;
      const newPourcentage = stats.cartesUniques > 0 ? (newCartesPossedees / stats.cartesUniques * 100).toFixed(1) : '0';
      
      setStats(prev => ({
        ...prev,
        cartesPossedees: newCartesPossedees,
        pourcentageCompletion: newPourcentage
      }));

      console.log('✅ Statut mis à jour:', result.message);
      
      // Afficher le toast de confirmation
      setToast({
        message: result.message,
        type: 'success'
      });
      
      // Auto-hide toast après 3 secondes
      setTimeout(() => setToast(null), 3000);

    } catch (error) {
      console.error('❌ Erreur:', error);
      setToast({
        message: `Erreur: ${error}`,
        type: 'error'
      });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setLoadingStates(prev => ({ ...prev, [carteRareteId]: false }));
    }
  };

  const availableArtworks = useMemo<ArtworkType[]>(() => {
    const set = new Set<ArtworkType>();
    serie.cartes.forEach((carte) => {
      set.add((carte.artwork || 'None') as ArtworkType);
    });
    return Array.from(set);
  }, [serie.cartes]);

  const availableRarities = useMemo<string[]>(() => {
    const set = new Set<string>();
    serie.cartes.forEach((carte) => {
      carte.carteRaretes.forEach((cr) => set.add(cr.rarete.nomRarete));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [serie.cartes]);

  const toggleArtwork = (artwork: ArtworkType) => {
    setSelectedArtworks((prev) =>
      prev.includes(artwork) ? prev.filter((item) => item !== artwork) : [...prev, artwork]
    );
  };

  const toggleRarity = (rarity: string) => {
    setSelectedRarities((prev) =>
      prev.includes(rarity) ? prev.filter((item) => item !== rarity) : [...prev, rarity]
    );
  };

  const clearFilters = () => {
    setSelectedArtworks([]);
    setSelectedRarities([]);
    setPossessionFilter('all');
    setSearchTerm('');
  };

  const filteredCards = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return serie.cartes
      .map((carte) => {
        const artworkType = (carte.artwork || 'None') as ArtworkType;
        const matchesArtwork =
          selectedArtworks.length === 0 || selectedArtworks.includes(artworkType);

        if (!matchesArtwork) {
          return null;
        }

        const filteredRaretes = carte.carteRaretes.filter((carteRarete) => {
          const matchesRarity =
            selectedRarities.length === 0 || selectedRarities.includes(carteRarete.rarete.nomRarete);

          const matchesPossession =
            possessionFilter === 'all' ||
            (possessionFilter === 'owned' ? carteRarete.possedee : !carteRarete.possedee);

          const matchesSearch =
            normalizedSearch.length === 0 ||
            carte.nomCarte.toLowerCase().includes(normalizedSearch) ||
            carte.numeroCarte.toLowerCase().includes(normalizedSearch) ||
            carteRarete.rarete.nomRarete.toLowerCase().includes(normalizedSearch);

          return matchesRarity && matchesPossession && matchesSearch;
        });

        if (filteredRaretes.length === 0) {
          return null;
        }

        return {
          ...carte,
          carteRaretes: filteredRaretes,
        };
      })
      .filter(Boolean) as Carte[];
  }, [serie.cartes, selectedArtworks, selectedRarities, possessionFilter, searchTerm]);

  const filteredVersionsCount = filteredCards.reduce(
    (total, carte) => total + carte.carteRaretes.length,
    0
  );

  const filteredOwnedCount = filteredCards.reduce(
    (total, carte) => total + carte.carteRaretes.filter((cr) => cr.possedee).length,
    0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <nav className="mb-8">
          <Link 
            href="/" 
            className="text-blue-300 hover:text-white transition-colors flex items-center gap-2"
          >
            ← Retour aux séries
          </Link>
        </nav>

        {/* Header de la série */}
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="bg-blue-500/30 text-blue-200 px-4 py-2 rounded-full text-lg font-medium">
                {serie.codeSerie}
              </span>
              <span
                className="bg-green-500/20 text-green-100 px-3 py-1 rounded-full text-sm font-semibold"
                title={serie.langue.nomLangue}
              >
                {serie.langue.codeLangue}
              </span>
            </div>
            <h1 className="text-4xl font-bold text-white">
              {serie.nomSerie}
            </h1>
          </div>
          
          {/* Statistiques */}
          <div className="flex justify-center gap-8 text-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{stats.totalCartes}</div>
              <div className="text-blue-200 text-sm">Cartes uniques</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{stats.cartesUniques}</div>
              <div className="text-blue-200 text-sm">Versions totales</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{stats.cartesPossedees}</div>
              <div className="text-blue-200 text-sm">Possédées</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{stats.pourcentageCompletion}%</div>
              <div className="text-blue-200 text-sm">Complétion</div>
            </div>
          </div>

          {/* Répartition des artworks */}
          {(stats.artworkStats['Alternative'] || stats.artworkStats['New']) && (
            <div className="mt-4 flex justify-center gap-4 text-sm">
              {stats.artworkStats['Alternative'] && (
                <span className="bg-orange-600/20 text-orange-300 px-3 py-1 rounded-full border border-orange-500/50">
                  🎨 {stats.artworkStats['Alternative']} Artwork{stats.artworkStats['Alternative'] > 1 ? 's' : ''} Alternatif{stats.artworkStats['Alternative'] > 1 ? 's' : ''}
                </span>
              )}
              {stats.artworkStats['New'] && (
                <span className="bg-cyan-600/20 text-cyan-300 px-3 py-1 rounded-full border border-cyan-500/50">
                  ✨ {stats.artworkStats['New']} Nouvel{stats.artworkStats['New'] > 1 ? 'x' : ''} Artwork{stats.artworkStats['New'] > 1 ? 's' : ''}
                </span>
              )}
              {stats.artworkStats['None'] && (
                <span className="bg-gray-600/20 text-gray-300 px-3 py-1 rounded-full border border-gray-500/50">
                  📄 {stats.artworkStats['None']} Standard{stats.artworkStats['None'] > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}

          {/* Barre de progression */}
          <div className="mt-6 max-w-md mx-auto">
            <div className="bg-gray-700 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${stats.pourcentageCompletion}%` }}
              ></div>
            </div>
          </div>

          {serie.urlSource && (
            <div className="mt-4">
              <a 
                href={serie.urlSource} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-300 hover:text-white transition-colors text-sm"
              >
                📖 Voir la source officielle
              </a>
            </div>
          )}
        </header>

        {/* Filtres */}
        <section className={`sticky z-10 transition-all duration-300 ${isFilterCompact ? 'top-2' : 'top-4'}`}>
          <div className={`bg-white/10 backdrop-blur border border-white/20 rounded-xl shadow-lg shadow-black/20 transition-all duration-300 ${isFilterCompact ? 'p-3' : 'p-4'}`}>
            <div className={`flex flex-col md:flex-row md:items-center md:justify-between transition-all duration-200 ${isFilterCompact ? 'gap-2 mb-2' : 'gap-4 mb-4'}`}>
              <h2 className={`text-white font-semibold flex items-center gap-2 transition-all duration-200 ${isFilterCompact ? 'text-base' : 'text-lg'}`}>
                🎛️ Filtres
              </h2>
              <div className={`flex flex-wrap items-center text-blue-200 transition-all duration-200 ${isFilterCompact ? 'gap-2 text-xs' : 'gap-3 text-sm'}`}>
                <span>
                  {filteredCards.length} carte{filteredCards.length > 1 ? 's' : ''} affichée{filteredCards.length > 1 ? 's' : ''}
                </span>
                <span>•</span>
                <span>
                  {filteredVersionsCount} version{filteredVersionsCount > 1 ? 's' : ''} / {stats.cartesUniques}
                </span>
                <span>•</span>
                <span>
                  {filteredOwnedCount} possédée{filteredOwnedCount > 1 ? 's' : ''} / {stats.cartesPossedees}
                </span>
                {(selectedArtworks.length > 0 ||
                  selectedRarities.length > 0 ||
                  possessionFilter !== 'all') && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-red-300 hover:text-red-200 underline underline-offset-4"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
            </div>

            <div className={`grid md:grid-cols-[repeat(12,minmax(0,1fr))] ${isFilterCompact ? 'gap-3' : 'gap-4'}`}>
              <div className="md:col-span-4">
                <h3 className={`text-blue-200 uppercase tracking-wide transition-all duration-200 ${isFilterCompact ? 'text-xs mb-1' : 'text-sm mb-2'}`}>Artwork</h3>
                <div className="flex flex-wrap gap-2">
                  {availableArtworks.map((artwork) => {
                    const isSelected = selectedArtworks.includes(artwork);
                    const label =
                      artwork === 'Alternative'
                        ? '🎨 Alternatif'
                        : artwork === 'New'
                          ? '✨ Nouvel'
                          : '📄 Standard';
                    return (
                      <button
                        key={artwork}
                        onClick={() => toggleArtwork(artwork)}
                        className={`rounded-full text-xs font-semibold transition-colors border ${isFilterCompact ? 'px-2.5 py-1' : 'px-3 py-1.5'} ${
                          isSelected
                            ? 'bg-blue-500/40 border-blue-400 text-white'
                            : 'bg-white/10 border-white/20 text-blue-200 hover:bg-white/20'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-5">
                <h3 className={`text-blue-200 uppercase tracking-wide transition-all duration-200 ${isFilterCompact ? 'text-xs mb-1' : 'text-sm mb-2'}`}>Raretés</h3>
                <div className={`flex flex-wrap ${isFilterCompact ? 'gap-1.5' : 'gap-2'}`}>
                  {availableRarities.map((rarity) => {
                    const isSelected = selectedRarities.includes(rarity);
                    return (
                      <button
                        key={rarity}
                        onClick={() => toggleRarity(rarity)}
                        className={`rounded-full text-xs font-semibold transition-colors border ${isFilterCompact ? 'px-2.5 py-1' : 'px-3 py-1.5'} ${
                          isSelected
                            ? 'bg-purple-600/50 border-purple-400 text-white'
                            : 'bg-white/10 border-white/20 text-purple-200 hover:bg-white/20'
                        }`}
                      >
                        {rarity}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-3">
                <h3 className={`text-blue-200 uppercase tracking-wide transition-all duration-200 ${isFilterCompact ? 'text-xs mb-1' : 'text-sm mb-2'}`}>Possession</h3>
                <div className={`grid grid-cols-3 text-xs font-semibold transition-all duration-200 ${isFilterCompact ? 'gap-1.5' : 'gap-2'}`}>
                  {[
                    { value: 'all', label: 'Toutes' },
                    { value: 'owned', label: 'Possédées' },
                    { value: 'missing', label: 'Manquantes' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setPossessionFilter(value as 'all' | 'owned' | 'missing')}
                      className={`rounded-lg border transition-colors ${isFilterCompact ? 'px-2.5 py-1.5' : 'px-3 py-2'} ${
                        possessionFilter === value
                          ? 'bg-green-500/40 border-green-400 text-white'
                          : 'bg-white/10 border-white/20 text-green-200 hover:bg-white/20'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-12">
                <h3 className={`text-blue-200 uppercase tracking-wide transition-all duration-200 ${isFilterCompact ? 'text-xs mb-1' : 'text-sm mb-2'}`}>Recherche rapide</h3>
                <div className="relative">
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Nom de carte, numéro ou rareté…"
                    className={`w-full bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-blue-200/60 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all duration-200 ${isFilterCompact ? 'py-2 pl-9 pr-3 text-sm' : 'py-2.5 pl-10 pr-3 text-base'}`}
                  />
                  <span className={`absolute top-1/2 -translate-y-1/2 text-blue-200 transition-all duration-200 ${isFilterCompact ? 'left-2.5 text-sm' : 'left-3 text-base'}`}>🔍</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Liste des cartes */}
        <div className="space-y-4 mt-6">
          {filteredCards.length === 0 && (
            <div className="text-center text-blue-200 bg-white/10 border border-white/10 rounded-xl py-8">
              <p className="text-lg font-semibold">Aucune carte ne correspond à ces filtres.</p>
              <p className="text-sm mt-2">Essayez d’élargir votre sélection ou réinitialisez les filtres.</p>
            </div>
          )}

          {filteredCards.map((carte) => {
            // Vérifier si d'autres versions de cette carte existent (même code mais artwork différent)
            const autresVersions = serie.cartes.filter(c => 
              c.numeroCarte === carte.numeroCarte && c.id !== carte.id
            );

            return (
              <div key={carte.id} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-white">{carte.nomCarte}</h3>
                      {carte.artwork && carte.artwork !== 'None' && (
                        <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                          carte.artwork === 'Alternative' ? 'bg-orange-600/30 text-orange-300 border border-orange-500/50' :
                          carte.artwork === 'New' ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50' :
                          'bg-gray-600/30 text-gray-300 border border-gray-500/50'
                        }`}>
                          {carte.artwork === 'Alternative' ? '🎨 Artwork Alternatif' :
                           carte.artwork === 'New' ? '✨ Nouvel Artwork' :
                           carte.artwork}
                        </span>
                      )}
                    </div>
                    <p className="text-blue-300 text-sm">{carte.numeroCarte}</p>
                  </div>
                </div>

                {/* Raretés pour cette carte */}
                <div className="space-y-2">
                  {carte.carteRaretes.map((carteRarete) => (
                    <div 
                      key={carteRarete.id} 
                      className={`flex justify-between items-center p-3 rounded-md ${
                        carteRarete.possedee 
                          ? 'bg-green-500/20 border-green-500/30' 
                          : 'bg-gray-500/20 border-gray-500/30'
                      } border`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${
                          carteRarete.possedee ? 'bg-green-400' : 'bg-gray-400'
                        }`}></span>
                        <span className="text-white font-medium">
                          {carteRarete.rarete.nomRarete}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm">
                        {carteRarete.possedee && (
                          <>
                            <span className="text-green-300">
                              {carteRarete.condition}
                            </span>
                            {carteRarete.prixAchat && (
                              <span className="text-yellow-300">
                                {carteRarete.prixAchat.toString()}€
                              </span>
                            )}
                            {carteRarete.dateAcquisition && (
                              <span className="text-blue-300">
                                {new Date(carteRarete.dateAcquisition).toLocaleDateString('fr-FR')}
                              </span>
                            )}
                          </>
                        )}
                        
                        {/* Bouton interactif pour changer le statut */}
                        <button
                          onClick={() => togglePossession(carteRarete.id, carteRarete.possedee)}
                          disabled={loadingStates[carteRarete.id]}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 transform hover:scale-105 ${
                            carteRarete.possedee 
                              ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/30' 
                              : 'bg-gray-600 hover:bg-blue-600 text-gray-300 hover:text-white shadow-lg shadow-gray-500/20 hover:shadow-blue-500/30'
                          } ${loadingStates[carteRarete.id] ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-xl'}`}
                        >
                          {loadingStates[carteRarete.id] ? (
                            <span className="flex items-center gap-1">
                              <span className="animate-spin">⏳</span> 
                              Mise à jour...
                            </span>
                          ) : carteRarete.possedee ? (
                            <span className="flex items-center gap-1">
                              ✓ Possédée
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              + Ajouter
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Indicateur d'autres versions */}
                {autresVersions.length > 0 && (
                  <div className="mt-2 text-xs text-blue-300">
                    💡 Cette carte existe aussi en {autresVersions.length} autre{autresVersions.length > 1 ? 's' : ''} version{autresVersions.length > 1 ? 's' : ''} 
                    ({autresVersions.map(v => v.artwork === 'Alternative' ? 'artwork alternatif' : 
                                               v.artwork === 'New' ? 'nouvel artwork' : 'standard').join(', ')})
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <footer className="text-center mt-12 text-gray-400">
          <p>Série ajoutée le {new Date(serie.dateAjout).toLocaleDateString('fr-FR')}</p>
        </footer>

        {/* Toast de notification */}
        {toast && (
          <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 ${
            toast.type === 'success' 
              ? 'bg-green-600 text-white' 
              : 'bg-red-600 text-white'
          }`}>
            <div className="flex items-center gap-2">
              <span>{toast.type === 'success' ? '✅' : '❌'}</span>
              <span className="font-medium">{toast.message}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


