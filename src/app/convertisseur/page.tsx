'use client';

import Link from 'next/link';
import { useState } from 'react';
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
  };

  const derivedSeriesName = extractSeriesNameFromUrl(url);

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
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
                  🃏 Cartes extraites ({extractedCards.length})
                </h2>
                <div className="space-y-2">
                  <div className="text-sm bg-purple-600/30 border border-purple-500 rounded-lg px-3 py-1">
                    <span className="text-purple-200">Code série:</span>{' '}
                    <span className="text-white font-semibold">{extractedCards[0]?.code.substring(0, 4)}</span>
                  </div>
                  {derivedSeriesName && (
                    <div className="text-sm bg-blue-600/30 border border-blue-500 rounded-lg px-3 py-1">
                      <span className="text-blue-200">Nom série:</span>{' '}
                      <span className="text-white font-semibold">{derivedSeriesName}</span>
                    </div>
                  )}
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
                    </tr>
                  </thead>
                  <tbody>
                    {extractedCards.map((card, index) => (
                      <tr key={`${card.code}-${card.artwork}-${card.rarity}-${index}`} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                        <td className="p-3 font-mono text-blue-300">{card.code}</td>
                        <td className="p-3">{card.nameEnglish}</td>
                        <td className="p-3 text-green-300">{card.nameFrench}</td>
                        <td className="p-3 text-yellow-300">{card.rarity}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              card.artwork === 'Alternative'
                                ? 'bg-orange-600/30 text-orange-300'
                                : card.artwork === 'New'
                                  ? 'bg-cyan-600/30 text-cyan-300'
                                  : 'bg-gray-600/30 text-gray-300'
                            }`}
                          >
                            {card.artwork || 'None'}
                          </span>
                        </td>
                        <td className="p-3 text-purple-300">{card.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-4">
                {extractedCards.map((card, index) => (
                  <div key={`${card.code}-${card.artwork}-${card.rarity}-${index}`} className="bg-white/5 rounded-lg p-4 border border-white/20">
                    <div className="font-mono text-blue-300 text-lg font-bold mb-2">{card.code}</div>
                    <div className="space-y-2">
                      <div>
                        <span className="text-gray-400">EN:</span> <span className="text-white">{card.nameEnglish}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">FR:</span>{' '}
                        <span className="text-green-300">{card.nameFrench}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Rareté:</span>{' '}
                        <span className="text-yellow-300">{card.rarity}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Artwork:</span>{' '}
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            card.artwork === 'Alternative'
                              ? 'bg-orange-600/30 text-orange-300'
                              : card.artwork === 'New'
                                ? 'bg-cyan-600/30 text-cyan-300'
                                : 'bg-gray-600/30 text-gray-300'
                          }`}
                        >
                          {card.artwork || 'None'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Type:</span>{' '}
                        <span className="text-purple-300">{card.type}</span>
                      </div>
                    </div>
                  </div>
                ))}
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
