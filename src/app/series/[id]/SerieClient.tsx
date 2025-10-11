'use client';

import { useState } from 'react';
import Link from 'next/link';

interface CarteRarete {
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

interface Serie {
  id: number;
  codeSerie: string;
  nomSerie: string;
  urlSource: string | null;
  dateAjout: string;
  nbCartesTotal: number;
  cartes: Carte[];
}

interface SerieClientProps {
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
            <span className="bg-blue-500/30 text-blue-200 px-4 py-2 rounded-full text-lg font-medium">
              {serie.codeSerie}
            </span>
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

        {/* Liste des cartes */}
        <div className="space-y-4">
          {serie.cartes.map((carte) => {
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