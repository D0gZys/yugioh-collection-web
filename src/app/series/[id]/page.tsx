import { PrismaClient } from '../../../generated/prisma';
import { notFound } from 'next/navigation';
import SerieClient from './SerieClient';

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
        orderBy: [
          { numeroCarte: 'asc' },
          { artwork: 'asc' } // Trier aussi par artwork pour regrouper les versions
        ]
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

  // Compter les artworks différents
  const artworkStats = serie.cartes.reduce((acc, carte) => {
    const artworkType = carte.artwork || 'None';
    acc[artworkType] = (acc[artworkType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pourcentageCompletion = cartesUniques > 0 ? (cartesPossedees / cartesUniques * 100).toFixed(1) : '0';

  // Préparer les données pour le composant client
  const initialStats = {
    totalCartes,
    cartesUniques,
    cartesPossedees,
    pourcentageCompletion,
    artworkStats
  };

  await prisma.$disconnect();

  return (
    <SerieClient 
      initialSerie={serie as any} 
      initialStats={initialStats}
    />
  );
}