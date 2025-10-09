import { PrismaClient } from '../../../generated/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const prisma = new PrismaClient();

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SeriePage({ params }: PageProps) {
  const { id } = await params;
  const serieId = parseInt(id);

  if (isNaN(serieId)) {
    notFound();
  }

  // Récupérer la série avec ses cartes et raretés
  const serie = await prisma.series.findUnique({
    where: { id: serieId },
    include: {
      cartes: {
        include: {
          carteRaretes: {
            include: {
              rarete: true
            }
          }
        },
        orderBy: {
          numeroCarte: 'asc'
        }
      }
    }
  });

  if (!serie) {
    notFound();
  }

  // Statistiques de collection
  const totalCartes = serie.cartes.length;
  const cartesUniques = serie.cartes.reduce((acc, carte) => {
    return acc + carte.carteRaretes.length;
  }, 0);
  const cartesPossedees = serie.cartes.reduce((acc, carte) => {
    return acc + carte.carteRaretes.filter(cr => cr.possedee).length;
  }, 0);

  const pourcentageCompletion = cartesUniques > 0 ? (cartesPossedees / cartesUniques * 100).toFixed(1) : 0;

  await prisma.$disconnect();

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
              <div className="text-2xl font-bold text-white">{totalCartes}</div>
              <div className="text-blue-200 text-sm">Cartes uniques</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{cartesUniques}</div>
              <div className="text-blue-200 text-sm">Versions totales</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{cartesPossedees}</div>
              <div className="text-blue-200 text-sm">Possédées</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{pourcentageCompletion}%</div>
              <div className="text-blue-200 text-sm">Complétion</div>
            </div>
          </div>

          {/* Barre de progression */}
          <div className="mt-6 max-w-md mx-auto">
            <div className="bg-gray-700 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${pourcentageCompletion}%` }}
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
          {serie.cartes.map((carte) => (
            <div key={carte.id} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">{carte.nomCarte}</h3>
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
                      <span className={`px-2 py-1 rounded text-xs ${
                        carteRarete.possedee 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-600 text-gray-300'
                      }`}>
                        {carteRarete.possedee ? 'Possédée' : 'Manquante'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer className="text-center mt-12 text-gray-400">
          <p>Série ajoutée le {new Date(serie.dateAjout).toLocaleDateString('fr-FR')}</p>
        </footer>
      </div>
    </div>
  );
}