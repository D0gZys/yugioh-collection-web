import Link from 'next/link';
import { prisma } from '@/lib/prisma';

type ChartDatum = {
  label: string;
  value: number;
  color?: string;
};

const chartPalette = ['#60a5fa', '#a855f7', '#f97316', '#34d399', '#facc15', '#22d3ee', '#f87171'];

const monthFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' });

const formatNumber = (value: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value);

const formatPercent = (ratio: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(ratio);

const buildMonthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

function ensureRecentMonths(count: number) {
  const months: { key: string; label: string }[] = [];
  const now = new Date();

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const ref = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = buildMonthKey(ref);
    months.push({
      key,
      label: monthFormatter.format(ref),
    });
  }

  return months;
}

function SimpleBarChart({ data }: { data: ChartDatum[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-blue-200">Pas encore de données à afficher.</p>;
  }

  const maxValue = Math.max(...data.map((item) => item.value));
  const safeMax = maxValue === 0 ? 1 : maxValue;
  const total = data.reduce((acc, item) => acc + item.value, 0);

  return (
    <div className="space-y-4">
      {data.map((item) => {
        const widthPercent = Math.max((item.value / safeMax) * 100, 8);
        const ratioPercent = total === 0 ? 0 : (item.value / total) * 100;
        return (
          <div key={item.label} className="space-y-2">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-blue-100 font-medium flex items-center gap-2">
                <span
                  className="inline-flex h-2 w-2 rounded-full"
                  style={{ backgroundColor: item.color ?? '#60a5fa' }}
                />
                {item.label}
              </span>
              <span className="text-white font-semibold">
                {formatNumber(item.value)}
                <span className="ml-2 text-xs text-blue-300">
                  ({formatPercent(ratioPercent)}%)
                </span>
              </span>
            </div>
            <div
              className="w-full h-2 rounded-full bg-white/10 overflow-hidden shadow-inner"
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${widthPercent}%`,
                  background: item.color
                    ? `linear-gradient(90deg, ${item.color}cc 0%, ${item.color}88 100%)`
                    : 'linear-gradient(90deg, rgba(96,165,250,0.8) 0%, rgba(37,99,235,0.6) 100%)',
                  boxShadow: item.color
                    ? `0 0 14px ${item.color}44`
                    : '0 0 14px rgba(59,130,246,0.35)',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MultiLineChart({
  data,
  seriesLabel,
  cardsLabel,
}: {
  data: { label: string; series: number; cards: number }[];
  seriesLabel: string;
  cardsLabel: string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-blue-200">Aucune activité récente.</p>;
  }

  const allValues = data.flatMap((point) => [point.series, point.cards]);
  const maxValue = Math.max(...allValues);
  const safeMax = maxValue === 0 ? 1 : maxValue;
  const xStep = data.length > 1 ? 100 / (data.length - 1) : 100;

  const buildPoints = (values: number[]) =>
    values
      .map((value, index) => {
        const x = data.length > 1 ? index * xStep : 50;
        const y = 100 - (value / safeMax) * 100;
        return `${x},${Number.isFinite(y) ? y : 100}`;
      })
      .join(' ');

  const seriesPoints = buildPoints(data.map((item) => item.series));
  const cardPoints = buildPoints(data.map((item) => item.cards));

  const horizontalGuides = Array.from({ length: 4 }).map((_, index) => {
    const y = ((index + 1) / 5) * 100;
    return (
      <line
        key={`guide-${y}`}
        x1="0"
        y1={y}
        x2="100"
        y2={y}
        stroke="rgba(148, 163, 184, 0.2)"
        strokeWidth={0.5}
      />
    );
  });

  return (
    <div className="space-y-4">
      <div className="relative w-full">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-56">
          <defs>
            <linearGradient id="seriesLine" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(96,165,250,0.5)" />
              <stop offset="100%" stopColor="rgba(96,165,250,0.05)" />
            </linearGradient>
            <linearGradient id="cardsLine" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(168,85,247,0.5)" />
              <stop offset="100%" stopColor="rgba(168,85,247,0.05)" />
            </linearGradient>
          </defs>

          {horizontalGuides}

          <polyline
            points={`${seriesPoints}`}
            fill="url(#seriesLine)"
            stroke="#60a5fa"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          <polyline
            points={`${cardPoints}`}
            fill="url(#cardsLine)"
            stroke="#a855f7"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={0.9}
          />
        </svg>
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/5 via-transparent to-white/5 rounded-lg" />
      </div>

      <div className="flex justify-between text-xs text-blue-200 uppercase tracking-wide">
        {data.map((point) => (
          <span key={point.label} className="min-w-[60px] text-center">
            {point.label}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-blue-100">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#60a5fa]" aria-hidden />
          {seriesLabel}
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#a855f7]" aria-hidden />
          {cardsLabel}
        </span>
      </div>
    </div>
  );
}

function ConicPieChart({ data, totalLabel }: { data: ChartDatum[]; totalLabel: string }) {
  const total = data.reduce((acc, item) => acc + item.value, 0);

  if (total === 0) {
    return <p className="text-sm text-blue-200">Pas encore de données à afficher.</p>;
  }

  let cumulative = 0;
  const segments = data.map((item) => {
    const start = (cumulative / total) * 360;
    cumulative += item.value;
    const end = (cumulative / total) * 360;
    return `${item.color ?? '#60a5fa'} ${start}deg ${end}deg`;
  });

  const gradient = `conic-gradient(${segments.join(', ')})`;

  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
      <div className="relative w-48 h-48 mx-auto lg:mx-0">
        <div
          className="w-full h-full rounded-full border border-white/10 shadow-lg shadow-black/30"
          style={{ background: gradient }}
        />
        <div className="absolute inset-10 rounded-full bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-900 flex flex-col items-center justify-center text-center text-white">
          <span className="text-xs uppercase tracking-wide text-blue-200/80">{totalLabel}</span>
          <span className="text-2xl font-bold">{formatNumber(total)}</span>
        </div>
      </div>
      <ul className="flex-1 space-y-2 text-sm text-blue-100">
        {data.map((item) => {
          const ratio = total === 0 ? 0 : (item.value / total) * 100;
          return (
            <li key={item.label} className="flex items-center gap-3">
              <span
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: item.color ?? '#60a5fa' }}
              />
              <span className="flex-1 font-medium text-white/90">{item.label}</span>
              <span className="text-white font-semibold">{formatNumber(item.value)}</span>
              <span className="text-blue-300">
                ({formatPercent(ratio)}%)
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SeriesProgressList({
  title,
  series,
}: {
  title: string;
  series: {
    id: number;
    nomSerie: string;
    codeSerie: string;
    owned: number;
    total: number;
    completion: number;
  }[];
}) {
  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <span className="text-xs uppercase text-blue-200/80 tracking-wider">
          {series.length} série{series.length > 1 ? 's' : ''}
        </span>
      </div>
      {series.length === 0 ? (
        <p className="text-sm text-blue-200">Pas de séries renseignées pour le moment.</p>
      ) : (
        <ul className="space-y-4">
          {series.map((item) => {
            const percentage = item.total > 0 ? (item.completion * 100) : 0;
            return (
              <li key={item.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm text-blue-100">
                  <Link
                    href={`/series/${item.id}`}
                    className="text-white font-semibold hover:text-blue-200 transition-colors"
                  >
                    {item.nomSerie}
                  </Link>
                  <span className="text-xs bg-white/10 border border-white/10 rounded-full px-2 py-0.5 text-blue-200">
                    {item.codeSerie}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600"
                    style={{ width: `${Math.min(100, Math.round(percentage))}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-blue-200">
                  <span>{formatNumber(item.owned)} possédée{item.owned > 1 ? 's' : ''}</span>
                  <span>
                    {formatPercent(percentage)}% ({formatNumber(item.owned)} / {formatNumber(item.total)})
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default async function StatistiquesPage() {
  let hasDbError = false;

  try {
    const [
      totalSeries,
      totalCards,
      totalCardVersions,
      ownedCardVersions,
      rarityGroups,
      artworkGroups,
      seriesDates,
      cardDates,
      seriesWithProgress,
    ] = await Promise.all([
      prisma.series.count(),
      prisma.carte.count(),
      prisma.carteRarete.count(),
      prisma.carteRarete.count({
        where: { possedee: true },
      }),
      prisma.carteRarete.groupBy({
        by: ['rareteId'],
        _count: { _all: true },
      }),
      prisma.carte.groupBy({
        by: ['artwork'],
        _count: { _all: true },
      }),
      prisma.series.findMany({
        select: { dateAjout: true },
      }),
      prisma.carte.findMany({
        select: { dateAjout: true },
      }),
      prisma.series.findMany({
        select: {
          id: true,
          nomSerie: true,
          codeSerie: true,
          cartes: {
            select: {
              carteRaretes: {
                select: { possedee: true },
              },
            },
          },
        },
      }),
    ]);

    const rareteIds = rarityGroups.map((group) => group.rareteId);
    const raretes = rareteIds.length
      ? await prisma.rarete.findMany({
          where: { id: { in: rareteIds } },
          select: { id: true, nomRarete: true, ordreTri: true },
        })
      : [];

    const rareteLabelMap = new Map(
      raretes
        .sort((a, b) => a.ordreTri - b.ordreTri)
        .map((item) => [item.id, item.nomRarete]),
    );

    const rarityChartData: ChartDatum[] = rarityGroups
      .map((group, index) => ({
        label: rareteLabelMap.get(group.rareteId) ?? `Rareté ${group.rareteId}`,
        value: group._count._all,
        color: chartPalette[index % chartPalette.length],
      }))
      .sort((a, b) => b.value - a.value);

    const artworkChartData: ChartDatum[] = artworkGroups
      .map((group) => ({
        label:
          group.artwork === 'Alternative'
            ? 'Artwork alternatifs'
            : group.artwork === 'New'
              ? 'Nouveaux artworks'
              : 'Artwork standard',
        value: group._count._all,
        color:
          group.artwork === 'Alternative'
            ? '#f97316'
            : group.artwork === 'New'
              ? '#a855f7'
              : '#60a5fa',
      }))
      .sort((a, b) => b.value - a.value);

    const monthSlots = ensureRecentMonths(6);
    const monthMap = new Map(
      monthSlots.map((slot) => [
        slot.key,
        {
          label: slot.label,
          series: 0,
          cards: 0,
        },
      ]),
    );

    seriesDates.forEach(({ dateAjout }) => {
      const key = buildMonthKey(dateAjout);
      const entry = monthMap.get(key);
      if (entry) {
        entry.series += 1;
      }
    });

    cardDates.forEach(({ dateAjout }) => {
      const key = buildMonthKey(dateAjout);
      const entry = monthMap.get(key);
      if (entry) {
        entry.cards += 1;
      }
    });

    const monthlyActivity = monthSlots.map((slot) => monthMap.get(slot.key) ?? {
      label: slot.label,
      series: 0,
      cards: 0,
    });

    const seriesProgress = seriesWithProgress.map((serie) => {
      const total = serie.cartes.reduce((acc, carte) => acc + carte.carteRaretes.length, 0);
      const owned = serie.cartes.reduce(
        (acc, carte) => acc + carte.carteRaretes.filter((rarete) => rarete.possedee).length,
        0,
      );
      const completion = total > 0 ? owned / total : 0;
      return {
        id: serie.id,
        nomSerie: serie.nomSerie,
        codeSerie: serie.codeSerie,
        owned,
        total,
        completion,
      };
    });

    const topSeries = seriesProgress
      .filter((serie) => serie.total > 0)
      .sort((a, b) => b.completion - a.completion)
      .slice(0, 5);

    const completionRate = totalCardVersions > 0
      ? (ownedCardVersions / totalCardVersions) * 100
      : 0;
    const missingVersions = Math.max(totalCardVersions - ownedCardVersions, 0);

    const lastSeriesMonth = monthlyActivity[monthlyActivity.length - 1];
    const previousSeriesMonth = monthlyActivity.length > 1
      ? monthlyActivity[monthlyActivity.length - 2]
      : undefined;
    const deltaCards =
      lastSeriesMonth && previousSeriesMonth
        ? lastSeriesMonth.cards - previousSeriesMonth.cards
        : 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <div className="container mx-auto px-4 py-10 space-y-10">
          <nav className="flex justify-between items-center flex-wrap gap-4">
            <Link
              href="/"
              className="text-blue-300 hover:text-white transition-colors flex items-center gap-2"
            >
              ← Retour à l&apos;accueil
            </Link>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/convertisseur"
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                🔄 Convertisseur
              </Link>
              <span className="bg-white/10 border border-white/10 text-blue-200 px-4 py-2 rounded-lg">
                📈 Statistiques
              </span>
            </div>
          </nav>

          <header className="space-y-2 text-white text-center">
            <h1 className="text-4xl md:text-5xl font-bold">Tableau de bord de la collection</h1>
            <p className="text-blue-100 max-w-2xl mx-auto">
              Suivez la progression de votre collection Yu-Gi-Oh!, identifiez les raretés dominantes
              et visualisez les séries les plus avancées.
            </p>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-5 space-y-2">
              <span className="text-xs uppercase text-blue-200/80 tracking-widest">Séries référencées</span>
              <p className="text-3xl font-bold text-white">{formatNumber(totalSeries)}</p>
              <p className="text-sm text-blue-200">
                {lastSeriesMonth?.series ?? 0} série{(lastSeriesMonth?.series ?? 0) > 1 ? 's' : ''} ajoutée{(lastSeriesMonth?.series ?? 0) > 1 ? 's' : ''} ce mois-ci
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-5 space-y-2">
              <span className="text-xs uppercase text-blue-200/80 tracking-widest">Cartes cataloguées</span>
              <p className="text-3xl font-bold text-white">{formatNumber(totalCards)}</p>
              <p className="text-sm text-blue-200">
                {deltaCards > 0
                  ? `+${formatNumber(deltaCards)} par rapport au mois précédent`
                  : deltaCards < 0
                    ? `${formatNumber(deltaCards)} par rapport au mois précédent`
                    : 'Progression stable ce mois-ci'}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-5 space-y-2">
              <span className="text-xs uppercase text-blue-200/80 tracking-widest">Versions suivies</span>
              <p className="text-3xl font-bold text-white">{formatNumber(totalCardVersions)}</p>
              <p className="text-sm text-blue-200">
                {formatNumber(ownedCardVersions)} possédée{ownedCardVersions > 1 ? 's' : ''}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-5 space-y-2">
              <span className="text-xs uppercase text-blue-200/80 tracking-widest">Taux de complétion</span>
              <p className="text-3xl font-bold text-green-300">
                {formatPercent(completionRate)}%
              </p>
              <p className="text-sm text-blue-200">
                {formatNumber(missingVersions)} version{missingVersions > 1 ? 's' : ''} restantes
              </p>
            </div>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-white">Distribution par rareté</h2>
                <p className="text-sm text-blue-200">Visualisez quelles raretés dominent votre collection.</p>
              </div>
              <SimpleBarChart data={rarityChartData} />
            </div>

            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-white">Répartition des artworks</h2>
                <p className="text-sm text-blue-200">Comparez la part des artworks standards, alternatifs et exclusifs.</p>
              </div>
              <ConicPieChart data={artworkChartData} totalLabel="Total cartes" />
            </div>
          </section>

          <section className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Activité des 6 derniers mois</h2>
              <p className="text-sm text-blue-200">
                Suivez les nouvelles séries ajoutées et le volume de cartes intégrées dans la base.
              </p>
            </div>
            <MultiLineChart
              data={monthlyActivity}
              seriesLabel="Nouvelles séries"
              cardsLabel="Nouvelles cartes"
            />
          </section>

          <section className="grid grid-cols-1 gap-8 items-start">
            <SeriesProgressList title="Séries les plus avancées" series={topSeries} />
          </section>

          <footer className="text-center text-blue-200 text-sm pt-8">
            Dernière mise à jour calculée côté serveur • Données issues de votre base PostgreSQL
          </footer>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    hasDbError = true;
  }

  if (hasDbError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center">
        <div className="container mx-auto px-4">
          <div className="bg-red-900/30 border border-red-500/60 rounded-xl p-8 max-w-xl mx-auto text-center text-red-100 space-y-4">
            <h1 className="text-2xl font-bold text-white">Impossible de charger les statistiques</h1>
            <p className="text-sm">
              Vérifiez que votre base PostgreSQL est accessible puis relancez la page.
            </p>
            <div className="bg-black/40 rounded-lg p-4 text-left text-red-200 text-xs font-mono">
              <p>npm run db:generate</p>
              <p>npm run db:migrate</p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors"
            >
              ← Retourner à l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
