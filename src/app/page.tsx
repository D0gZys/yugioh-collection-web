import { prisma } from "@/lib/prisma";
import HomeClient from "./HomeClient";

type SeriesWithStats = {
  id: number;
  codeSerie: string;
  nomSerie: string;
  urlSource: string | null;
  dateAjout: Date;
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

interface HomeProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

export default async function Home({ searchParams }: HomeProps) {
  let series: SeriesWithStats[] = [];
  let hasDbError = false;

  try {
    const [rawSeries, artworkGroups] = await Promise.all([
      prisma.series.findMany({
        include: {
          langue: true,
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
      const { cartes, langue, ...serieData } = serie;
      const totalVersions = cartes.reduce((acc, carte) => acc + carte.carteRaretes.length, 0);
      const ownedVersions = cartes.reduce(
        (acc, carte) => acc + carte.carteRaretes.filter((rarete) => rarete.possedee).length,
        0,
      );
      const completionRate = totalVersions > 0 ? (ownedVersions / totalVersions) * 100 : 0;

      return {
        ...serieData,
        langue,
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

  const serializableSeries = series.map((serie) => ({
    ...serie,
    dateAjout: serie.dateAjout.toISOString(),
  }));

  return (
    <HomeClient
      initialSeries={serializableSeries}
      hasDbError={hasDbError}
      searchQuery={searchQuery}
    />
  );
}








