'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  detectArtworkType,
  normalizeCardName,
  normalizeFrenchName,
  type ArtworkType,
} from '@/lib/card';

interface Card {
  code: string;
  nameEnglish: string;
  nameFrench: string;
  rarity: string;
  type: string;
  artwork: ArtworkType;
}

interface FetchCardsResponse {
  success: true;
  cards: Card[];
  url: string;
  uniqueCodes: number;
  cardsCount: number;
}

type ApiError = { error: string };

const wrapHtmlIfNeeded = (html: string) => {
  const trimmed = html.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.startsWith('<tbody') ? `<table>${html}</table>` : html;
};

const parseCardsFromHTML = (html: string): Card[] => {
  const wrappedHtml = wrapHtmlIfNeeded(html);
  if (!wrappedHtml) {
    return [];
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(wrappedHtml, 'text/html');
  const tbody = doc.querySelector('tbody');

  if (!tbody) {
    return [];
  }

  const rows = Array.from(tbody.querySelectorAll('tr'));
  const cards: Card[] = [];

  rows.forEach((row) => {
    const cells = Array.from(row.querySelectorAll('td'));
    if (cells.length < 4) {
      return;
    }

    const code = cells[0]?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    if (!code) {
      return;
    }

    const englishRaw = cells[1]?.textContent ?? '';
    const detection = detectArtworkType({
      code,
      englishName: englishRaw,
      extraText: cells[5]?.textContent ?? '',
    });

    const rarities = Array.from(cells[3]?.querySelectorAll('a') ?? [])
      .map((link) => link.textContent?.trim() ?? '')
      .filter(Boolean);

    if (rarities.length === 0) {
      return;
    }

    const type = cells[4]?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

    rarities.forEach((rarity) => {
      cards.push({
        code,
        nameEnglish: detection.cleanedEnglishName || normalizeCardName(englishRaw),
        nameFrench: normalizeFrenchName(cells[2]?.textContent ?? ''),
        rarity,
        type,
        artwork: detection.artwork,
      });
    });
  });

  return cards;
};

const extractSeriesNameFromUrl = (inputUrl: string): string => {
  if (!inputUrl) {
    return '';
  }

  try {
    let seriesName = '';

    if (inputUrl.includes('Set_Card_Lists:')) {
      const afterSetCardLists = inputUrl.split('Set_Card_Lists:')[1];
      if (afterSetCardLists) {
        seriesName = afterSetCardLists;
      }
    } else if (inputUrl.includes('/wiki/')) {
      const wikiPart = inputUrl.split('/wiki/')[1];
      if (wikiPart) {
        seriesName = wikiPart.split('?')[0];
      }
    }

    return seriesName
      .replace(/\(TCG-FR\)$/i, '')
      .replace(/\(TCG\)$/i, '')
      .replace(/\(OCG\)$/i, '')
      .trim()
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/%3A/gi, ':')
      .replace(/&colon;/gi, ':')
      .trim();
  } catch (error) {
    console.error('Erreur extraction nom série:', error);
    return '';
  }
};

export default function ConvertisseurPage() {
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [extractedCards, setExtractedCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedArtworks, setSelectedArtworks] = useState<ArtworkType[]>([]);
  const [selectedRarities, setSelectedRarities] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [recentUrls, setRecentUrls] = useState<string[]>([]);
  const STORAGE_KEY = 'convertisseur:last-imports';

  useEffect(() => {
    const stored = (typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY)) || null;
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentUrls(parsed.slice(0, 5));
        }
      } catch (error) {
        console.warn('Impossible de lire les imports récents', error);
      }
    }
  }, []);

  const artworkOptions = useMemo<ArtworkType[]>(() => {
    const set = new Set<ArtworkType>();
    extractedCards.forEach((card) => {
      set.add(card.artwork);
    });
    return Array.from(set);
  }, [extractedCards]);

  const rarityOptions = useMemo<string[]>(() => {
    const set = new Set<string>();
    extractedCards.forEach((card) => {
      set.add(card.rarity);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [extractedCards]);

  const summaryStats = useMemo(() => {
    const codes = new Set<string>();
    const rarityCount: Record<string, number> = {};
    const artworkCount: Record<ArtworkType, number> = {
      None: 0,
      New: 0,
      Alternative: 0,
    };

    extractedCards.forEach((card) => {
      codes.add(card.code);
      rarityCount[card.rarity] = (rarityCount[card.rarity] || 0) + 1;
      artworkCount[card.artwork] = (artworkCount[card.artwork] || 0) + 1;
    });

    return {
      totalEntries: extractedCards.length,
      uniqueCodes: codes.size,
      duplicates: Math.max(extractedCards.length - codes.size, 0),
      rarityCount,
      artworkCount,
    };
  }, [extractedCards]);

  const showMessage = (message: { type: 'success' | 'error'; text: string }, duration = 5000) => {
    setSaveMessage(message);
    if (duration > 0) {
      setTimeout(() => setSaveMessage(null), duration);
    }
  };

  const handleFetchFromUrl = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    setIsLoading(true);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/fetch-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const data: FetchCardsResponse | ApiError = await response.json();

      if (!response.ok || 'error' in data) {
        throw new Error(('error' in data && data.error) || 'Erreur lors de la récupération');
      }

      setExtractedCards(data.cards);
      setUrl(data.url);
      setText('');
      setRecentUrls((prev) => {
        const next = [data.url, ...prev.filter((item) => item !== data.url)].slice(0, 5);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
        return next;
      });
      showMessage({
        type: 'success',
        text: `${data.cardsCount} versions détectées (${data.uniqueCodes} codes uniques)`,
      });
    } catch (error) {
      showMessage({
        type: 'error',
        text: `Erreur lors de la récupération: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToDatabase = async () => {
    if (extractedCards.length === 0) {
      showMessage({ type: 'error', text: 'Aucune carte à sauvegarder' });
      return;
    }

    const seriesCode = extractedCards[0]?.code.substring(0, 4);
    if (!seriesCode) {
      showMessage({ type: 'error', text: 'Impossible de déterminer le code de série' });
      return;
    }

    const invalidIndex = extractedCards.findIndex((card) => !isCardValid(card));
    if (invalidIndex !== -1) {
      showMessage({
        type: 'error',
        text: 'Certaines cartes sont incomplètes. Vérifiez les codes, noms et raretés avant de sauvegarder.',
      });
      return;
    }

    const seriesName = extractSeriesNameFromUrl(url) || `Série ${seriesCode}`;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/save-series', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seriesCode,
          seriesName,
          sourceUrl: url.trim() || undefined,
          cards: extractedCards,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la sauvegarde');
      }

      showMessage({
        type: 'success',
        text: `Série "${seriesName}" sauvegardée avec succès ! (${result.data.cardsAdded} cartes ajoutées)`,
      });
    } catch (error) {
      showMessage({
        type: 'error',
        text: `Erreur lors de la sauvegarde: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConvert = () => {
    const cards = parseCardsFromHTML(text);
    if (cards.length === 0) {
      showMessage({
        type: 'error',
        text: 'Aucune carte détectée dans le HTML fourni.',
      });
      setExtractedCards([]);
      return;
    }

    setExtractedCards(cards);
    showMessage({
      type: 'success',
      text: `${cards.length} entrées détectées dans le HTML`,
    });
  };

  const handleClear = () => {
    setText('');
    setExtractedCards([]);
    setSaveMessage(null);
    resetFilters();
  };

  const updateCard = (index: number, updates: Partial<Card>) => {
    setExtractedCards((prev) =>
      prev.map((card, cardIndex) => (cardIndex === index ? { ...card, ...updates } : card))
    );
  };

  const removeCard = (index: number) => {
    setExtractedCards((prev) => prev.filter((_, cardIndex) => cardIndex !== index));
  };

  const toggleArtworkFilter = (artwork: ArtworkType) => {
    setSelectedArtworks((prev) =>
      prev.includes(artwork) ? prev.filter((item) => item !== artwork) : [...prev, artwork]
    );
  };

  const toggleRarityFilter = (rarity: string) => {
    setSelectedRarities((prev) =>
      prev.includes(rarity) ? prev.filter((item) => item !== rarity) : [...prev, rarity]
    );
  };

  const resetFilters = () => {
    setSelectedArtworks([]);
    setSelectedRarities([]);
    setSearchTerm('');
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredCards = useMemo(() => {
    return extractedCards
      .map((card, index) => ({ card, index }))
      .filter(({ card }) => {
        const matchesArtwork =
          selectedArtworks.length === 0 || selectedArtworks.includes(card.artwork);
        const matchesRarity =
          selectedRarities.length === 0 || selectedRarities.includes(card.rarity);
        const matchesSearch =
          normalizedSearch.length === 0 ||
          card.code.toLowerCase().includes(normalizedSearch) ||
          card.nameEnglish.toLowerCase().includes(normalizedSearch) ||
          card.nameFrench.toLowerCase().includes(normalizedSearch) ||
          card.rarity.toLowerCase().includes(normalizedSearch);

        return matchesArtwork && matchesRarity && matchesSearch;
      });
  }, [extractedCards, selectedArtworks, selectedRarities, normalizedSearch]);

  const derivedSeriesName = extractSeriesNameFromUrl(url);

  const isCardValid = (card: Card) => {
    return Boolean(card.code.trim() && card.nameEnglish.trim() && card.rarity.trim());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <nav className="mb-8">
          <Link href="/" className="text-blue-300 hover:text-white transition-colors flex items-center gap-2">
            ← Retour à l&apos;accueil
          </Link>
        </nav>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Convertisseur de Cartes Yu-Gi-Oh!</h1>
          <p className="text-gray-300">
            Récupérez automatiquement les données depuis Yugipedia ou collez le code HTML
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <h2 className="text-2xl font-semibold text-white mb-4">🌐 Récupération automatique depuis URL</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://yugipedia.com/wiki/Set_Card_Lists:..."
                className="flex-1 p-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
              />
              <button
                onClick={handleFetchFromUrl}
                disabled={!url.trim() || isLoading}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-teal-700 transform hover:scale-105 transition-all shadow-lg disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? '⏳ Récupération...' : '� Récupérer'}
              </button>
            </div>
            {recentUrls.length > 0 && (
              <div className="mt-3 text-sm text-blue-200 flex flex-wrap items-center gap-2">
                <span className="opacity-70">Dernières importations :</span>
                {recentUrls.map((recentUrl) => (
                  <button
                    key={recentUrl}
                    onClick={() => setUrl(recentUrl)}
                    className="px-3 py-1 bg-white/10 border border-white/20 rounded-full hover:bg-white/20 transition-colors"
                  >
                    {recentUrl.length > 45 ? `${recentUrl.slice(0, 42)}…` : recentUrl}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-center">
            <div className="border-t border-white/20 flex-grow"></div>
            <span className="mx-4 text-white/60 text-sm font-medium">OU</span>
            <div className="border-t border-white/20 flex-grow"></div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <h2 className="text-2xl font-semibold text-white mb-4">📝 Collage manuel du code HTML</h2>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Collez le code HTML du tableau des cartes ici..."
              className="w-full h-64 bg-white/5 border border-white/30 rounded-lg p-4 text-white placeholder-gray-400 resize-none focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />

            <div className="mt-4 flex gap-4 flex-wrap">
              <button
                onClick={handleConvert}
                disabled={!text.trim()}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  text.trim() ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg' : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                🔄 Convertir
              </button>

              <button
                onClick={() => {
                  const testHtml =
                    '<tbody><tr><td><a href="/wiki/BLMM-FR001" class="mw-redirect" title="BLMM-FR001">BLMM-FR001</a></td><td>"<a href="/wiki/Blue-Eyes_White_Dragon" title="Blue-Eyes White Dragon">Blue-Eyes White Dragon</a>"</td><td><span lang="fr">"Dragon Blanc aux Yeux Bleus"</span></td><td><a href="/wiki/Secret_Rare" title="Secret Rare">Secret Rare</a><br><a href="/wiki/Starlight_Rare" title="Starlight Rare">Starlight Rare</a></td><td><a href="/wiki/Normal_Monster" title="Normal Monster">Normal Monster</a></td><td>New artwork</td></tr></tbody>';
                  const cards = parseCardsFromHTML(testHtml);
                  setExtractedCards(cards);
                  showMessage({
                    type: 'success',
                    text: `${cards.length} entrée(s) détectée(s) avec l'exemple`,
                  });
                }}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-lg"
              >
                🧪 Test
              </button>

              <button
                onClick={handleClear}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all shadow-lg"
              >
                🗑️ Effacer
              </button>

              {extractedCards.length > 0 && (
                <span className="px-4 py-3 bg-blue-600 text-white rounded-lg font-medium">
                  {extractedCards.length} carte{extractedCards.length > 1 ? 's' : ''} trouvée{extractedCards.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {extractedCards.length > 0 && (
          <div className="max-w-7xl mx-auto mt-8">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
              <div className="flex flex-col gap-6 mb-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
                    🃏 Cartes extraites ({extractedCards.length})
                  </h2>
                  <div className="space-y-2 text-sm">
                    <div className="bg-purple-600/30 border border-purple-500 rounded-lg px-3 py-1 text-purple-200">
                      <span className="font-medium text-white">Code série:</span>{' '}
                      {extractedCards[0]?.code.substring(0, 4)}
                    </div>
                    {derivedSeriesName && (
                      <div className="bg-blue-600/30 border border-blue-500 rounded-lg px-3 py-1 text-blue-200">
                        <span className="font-medium text-white">Nom série:</span>{' '}
                        {derivedSeriesName}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="text-sm text-blue-200 uppercase tracking-wide">Entrées totales</div>
                    <div className="text-2xl font-semibold text-white mt-1">{summaryStats.totalEntries}</div>
                    <div className="text-xs text-blue-300 mt-1">
                      {filteredCards.length} visibles avec les filtres
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="text-sm text-blue-200 uppercase tracking-wide">Codes uniques</div>
                    <div className="text-2xl font-semibold text-white mt-1">{summaryStats.uniqueCodes}</div>
                    <div className="text-xs text-blue-300 mt-1">
                      {summaryStats.duplicates} doublon{summaryStats.duplicates > 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="text-sm text-blue-200 uppercase tracking-wide">Raretés</div>
                    <div className="text-2xl font-semibold text-white mt-1">{Object.keys(summaryStats.rarityCount).length}</div>
                    <div className="text-xs text-blue-300 mt-1">
                      {Object.entries(summaryStats.rarityCount)
                        .slice(0, 2)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(' • ')}
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="text-sm text-blue-200 uppercase tracking-wide">Artworks</div>
                    <div className="text-2xl font-semibold text-white mt-1">
                      {Object.entries(summaryStats.artworkCount)
                        .filter(([, value]) => value > 0).length}
                    </div>
                    <div className="text-xs text-blue-300 mt-1">
                      {Object.entries(summaryStats.artworkCount)
                        .filter(([, value]) => value > 0)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(' • ') || 'Aucun'}
                    </div>
                  </div>
                </div>

                {summaryStats.duplicates > 0 && (
                  <div className="bg-orange-600/20 border border-orange-500/40 text-orange-200 rounded-lg px-4 py-3 text-sm">
                    ⚠️ {summaryStats.duplicates} doublon{summaryStats.duplicates > 1 ? 's' : ''} détecté{summaryStats.duplicates > 1 ? 's' : ''}. Vérifiez les codes ou artworks avant de sauvegarder.
                  </div>
                )}

                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <h3 className="text-sm text-blue-200 uppercase tracking-wide mb-2">Artworks</h3>
                      <div className="flex flex-wrap gap-2">
                        {artworkOptions.map((artwork) => {
                          const label =
                            artwork === 'Alternative'
                              ? '🎨 Alternatif'
                              : artwork === 'New'
                                ? '✨ Nouvel artwork'
                                : '📄 Standard';
                          const selected = selectedArtworks.includes(artwork);
                          return (
                            <button
                              key={artwork}
                              onClick={() => toggleArtworkFilter(artwork)}
                              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors border ${
                                selected
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

                    <div className="flex-1 min-w-[200px]">
                      <h3 className="text-sm text-blue-200 uppercase tracking-wide mb-2">Raretés</h3>
                      <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1">
                        {rarityOptions.map((rarity) => {
                          const selected = selectedRarities.includes(rarity);
                          return (
                            <button
                              key={rarity}
                              onClick={() => toggleRarityFilter(rarity)}
                              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors border ${
                                selected
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

                    <div className="flex-1 min-w-[200px]">
                      <h3 className="text-sm text-blue-200 uppercase tracking-wide mb-2">Recherche</h3>
                      <div className="relative">
                        <input
                          type="search"
                          value={searchTerm}
                          onChange={(event) => setSearchTerm(event.target.value)}
                          placeholder="Nom, code ou rareté..."
                          className="w-full bg-white/10 border border-white/20 rounded-lg py-2.5 pl-10 pr-3 text-white placeholder:text-blue-200/60 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-200">🔍</span>
                      </div>
                      <button
                        onClick={resetFilters}
                        className="mt-2 text-xs text-red-300 hover:text-red-200 underline underline-offset-4"
                      >
                        Réinitialiser les filtres
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-white">
                  <thead>
                    <tr className="border-b border-white/30">
                      <th className="text-left p-3 font-semibold">Code</th>
                      <th className="text-left p-3 font-semibold">Nom Anglais</th>
                      <th className="text-left p-3 font-semibold">Nom Français</th>
                      <th className="text-left p-3 font-semibold">Rareté</th>
                      <th className="text-left p-3 font-semibold">Artwork</th>
                      <th className="text-left p-3 font-semibold">Type</th>
                      <th className="text-left p-3 font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCards.map(({ card, index }) => {
                      const rowHasError = !isCardValid(card);
                      return (
                        <tr
                          key={`${index}-${card.code}-${card.artwork}-${card.rarity}`}
                          className={`border-b border-white/10 hover:bg-white/5 transition-colors ${
                            rowHasError ? 'bg-red-900/20' : ''
                          }`}
                        >
                          <td className="p-3">
                            <input
                              value={card.code}
                              onChange={(event) => updateCard(index, { code: event.target.value })}
                              className="w-full bg-transparent border border-white/10 rounded px-2 py-1 text-blue-200 focus:outline-none focus:border-blue-400"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              value={card.nameEnglish}
                              onChange={(event) => updateCard(index, { nameEnglish: event.target.value })}
                              className="w-full bg-transparent border border-white/10 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-400"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              value={card.nameFrench}
                              onChange={(event) => updateCard(index, { nameFrench: event.target.value })}
                              className="w-full bg-transparent border border-white/10 rounded px-2 py-1 text-green-200 focus:outline-none focus:border-blue-400"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              value={card.rarity}
                              onChange={(event) => updateCard(index, { rarity: event.target.value })}
                              className="w-full bg-transparent border border-white/10 rounded px-2 py-1 text-yellow-200 focus:outline-none focus:border-blue-400"
                            />
                          </td>
                          <td className="p-3">
                            <select
                              value={card.artwork}
                              onChange={(event) => updateCard(index, { artwork: event.target.value as ArtworkType })}
                              className="bg-transparent border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-400"
                            >
                              <option value="None">📄 Standard</option>
                              <option value="Alternative">🎨 Alternatif</option>
                              <option value="New">✨ Nouvel artwork</option>
                            </select>
                          </td>
                          <td className="p-3">
                            <input
                              value={card.type}
                              onChange={(event) => updateCard(index, { type: event.target.value })}
                              className="w-full bg-transparent border border-white/10 rounded px-2 py-1 text-purple-200 focus:outline-none focus:border-blue-400"
                            />
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => removeCard(index)}
                              className="text-red-300 hover:text-red-200 text-xs underline"
                            >
                              Supprimer
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-4">
                {filteredCards.map(({ card, index }) => {
                  const rowHasError = !isCardValid(card);
                  return (
                    <div
                      key={`${index}-${card.code}-${card.artwork}-${card.rarity}`}
                      className={`bg-white/5 rounded-lg p-4 border border-white/20 ${rowHasError ? 'border-red-500/40' : ''}`}
                    >
                      <div className="font-mono text-blue-300 text-lg font-bold mb-2">{card.code}</div>
                      <div className="space-y-2">
                        <div>
                          <span className="text-gray-400">EN:</span>
                          <input
                            value={card.nameEnglish}
                            onChange={(event) => updateCard(index, { nameEnglish: event.target.value })}
                            className="ml-2 w-full bg-transparent border border-white/10 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-400"
                          />
                        </div>
                        <div>
                          <span className="text-gray-400">FR:</span>
                          <input
                            value={card.nameFrench}
                            onChange={(event) => updateCard(index, { nameFrench: event.target.value })}
                            className="ml-2 w-full bg-transparent border border-white/10 rounded px-2 py-1 text-green-200 focus:outline-none focus:border-blue-400"
                          />
                        </div>
                        <div>
                          <span className="text-gray-400">Rareté:</span>
                          <input
                            value={card.rarity}
                            onChange={(event) => updateCard(index, { rarity: event.target.value })}
                            className="ml-2 w-full bg-transparent border border-white/10 rounded px-2 py-1 text-yellow-200 focus:outline-none focus:border-blue-400"
                          />
                        </div>
                        <div>
                          <span className="text-gray-400">Artwork:</span>{' '}
                          <select
                            value={card.artwork}
                            onChange={(event) => updateCard(index, { artwork: event.target.value as ArtworkType })}
                            className="ml-2 bg-transparent border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-400"
                          >
                            <option value="None">📄 Standard</option>
                            <option value="Alternative">🎨 Alternatif</option>
                            <option value="New">✨ Nouvel artwork</option>
                          </select>
                        </div>
                        <div>
                          <span className="text-gray-400">Type:</span>
                          <input
                            value={card.type}
                            onChange={(event) => updateCard(index, { type: event.target.value })}
                            className="ml-2 w-full bg-transparent border border-white/10 rounded px-2 py-1 text-purple-200 focus:outline-none focus:border-blue-400"
                          />
                        </div>
                        <button
                          onClick={() => removeCard(index)}
                          className="mt-3 text-xs text-red-300 underline"
                        >
                          Supprimer la ligne
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {saveMessage && (
                <div
                  className={`mt-4 p-4 rounded-lg border ${
                    saveMessage.type === 'success'
                      ? 'bg-green-900/30 border-green-500 text-green-300'
                      : 'bg-red-900/30 border-red-500 text-red-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{saveMessage.type === 'success' ? '✅' : '❌'}</span>
                    <span>{saveMessage.text}</span>
                  </div>
                </div>
              )}

              <div className="mt-6 flex gap-4 flex-wrap">
                <button
                  onClick={handleSaveToDatabase}
                  disabled={isSaving || extractedCards.length === 0}
                  className={`px-6 py-3 rounded-lg font-medium transition-all shadow-lg flex items-center gap-2 ${
                    isSaving || extractedCards.length === 0
                      ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {isSaving ? '💾 Sauvegarde en cours...' : '💾 Sauvegarder dans la base'}
                </button>
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all shadow-lg"
                >
                  ⬆️ Modifier la source
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
