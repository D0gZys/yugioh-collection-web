'use client';

import Link from 'next/link';
import { useState } from 'react';

// Type pour définir une carte
interface Card {
  code: string;
  nameEnglish: string;
  nameFrench: string;
  rarity: string;
  type: string;
}

export default function ConvertisseurPage() {
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [extractedCards, setExtractedCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Fonction pour extraire les cartes depuis le HTML
  const parseCardsFromHTML = (html: string): Card[] => {
    console.log('=== Début de l\'analyse HTML ===');
    console.log('HTML reçu (longueur):', html.length);
    console.log('HTML échantillon:', html.substring(0, 300));
    
    // Préparer le HTML pour le parsing
    let htmlToParse = html;
    
    // Si le HTML commence par <tbody>, on l'entoure d'une table complète
    if (html.trim().startsWith('<tbody')) {
      htmlToParse = `<table>${html}</table>`;
      console.log('HTML transformé en table complète');
    }
    
    // Créer un élément DOM temporaire pour parser le HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlToParse, 'text/html');
    
    // Chercher le tableau des cartes (tbody)
    const tbody = doc.querySelector('tbody');
    if (!tbody) {
      console.log('Aucun tbody trouvé');
      console.log('Elements tbody disponibles:', doc.querySelectorAll('tbody').length);
      console.log('Elements table disponibles:', doc.querySelectorAll('table').length);
      return [];
    }
    
    console.log('Tbody trouvé:', tbody.outerHTML.substring(0, 200) + '...');
    
    const rows = tbody.querySelectorAll('tr');
    console.log('Nombre de lignes trouvées:', rows.length);
    
    // Analyser chaque ligne pour identifier les en-têtes vs données
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const hasHeaders = row.querySelector('th') !== null;
      const hasCells = row.querySelector('td') !== null;
      console.log(`Ligne ${i}: headers=${hasHeaders}, cells=${hasCells}`);
    }
    
    const cards: Card[] = [];
    
    // Traiter seulement les lignes avec des cellules de données (td)
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const cells = row.querySelectorAll('td');
      
      // Ignorer les lignes d'en-têtes (qui n'ont que des th)
      if (cells.length === 0) {
        console.log(`Ligne ${i}: ligne d'en-tête, ignorée`);
        continue;
      }
      
      console.log(`Ligne ${i}:`, cells.length, 'cellules de données');
      
      if (cells.length >= 4) {
        // Extraction du code de carte
        const codeCell = cells[0];
        const codeText = codeCell.textContent?.trim() || '';
        console.log('Code brut:', codeText);
        
        // Extraction du nom anglais
        const nameCell = cells[1];
        let nameText = nameCell.textContent?.trim() || '';
        console.log('Nom brut:', nameText);
        
        // Nettoyage du nom (enlever les guillemets)
        if (nameText.startsWith('"') && nameText.endsWith('"')) {
          nameText = nameText.slice(1, -1);
        }
        
        // Détection des variantes d'artwork
        let artworkVariant = '';
        const artworkPatterns = [
          '(new artwork)',
          '(alternate artwork)',
          '(alternative artwork)'
        ];
        
        for (const pattern of artworkPatterns) {
          if (nameText.includes(pattern)) {
            artworkVariant = pattern;
            // Retirer la mention du nom principal
            nameText = nameText.replace(pattern, '').trim();
            break;
          }
        }
        
        console.log('Nom nettoyé:', nameText);
        if (artworkVariant) {
          console.log('Variante d\'artwork détectée:', artworkVariant);
        }
        
        // Extraction du nom français
        const frenchNameCell = cells[2];
        let frenchNameText = frenchNameCell.textContent?.trim() || '';
        if (frenchNameText.startsWith('"') && frenchNameText.endsWith('"')) {
          frenchNameText = frenchNameText.slice(1, -1);
        }
        
        // Extraction des raretés
        const rarityCell = cells[3];
        const rarityLinks = rarityCell.querySelectorAll('a');
        const rarities = Array.from(rarityLinks).map(link => link.textContent?.trim() || '');
        console.log('Raretés trouvées:', rarities);
        
        if (codeText && nameText && rarities.length > 0) {
          // Créer une carte pour chaque rareté
          rarities.forEach(rarity => {
            let finalName = nameText;
            let finalFrenchName = frenchNameText;
            
            // Si c'est une variante d'artwork, ajouter l'info entre parenthèses
            if (artworkVariant) {
              finalName = `${nameText} ${artworkVariant}`;
              finalFrenchName = `${frenchNameText} ${artworkVariant}`;
            }
            
            const card: Card = {
              code: codeText,
              nameEnglish: finalName,
              nameFrench: finalFrenchName,
              rarity: rarity,
              type: cells[4]?.textContent?.trim() || ''
            };
            cards.push(card);
            console.log('Carte ajoutée:', card);
          });
        }
      }
    }
    
    console.log('=== Fin de l\'analyse ===');
    console.log('Total des cartes extraites:', cards.length);
    return cards;
  };  // Fonction pour récupérer les données depuis une URL
  const handleFetchFromUrl = async () => {
    if (!url.trim()) return;
    
    setIsLoading(true);
    try {
      console.log('Récupération depuis URL:', url);
      
      const response = await fetch('/api/fetch-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la récupération');
      }

      console.log('HTML récupéré:', data.html.substring(0, 200) + '...');
      
      // Utiliser le HTML récupéré avec notre fonction d'extraction
      const cards = parseCardsFromHTML(data.html);
      console.log('Cartes extraites depuis URL:', cards);
      setExtractedCards(cards);
      setText(data.html); // Optionnel : afficher le HTML récupéré
      
    } catch (error) {
      console.error('Erreur:', error);
      alert(`Erreur: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour extraire le nom complet de la série depuis l'URL
  const extractSeriesNameFromUrl = (url: string): string => {
    if (!url) return '';
    
    try {
      let seriesName = '';
      
      if (url.includes('Set_Card_Lists:')) {
        // Format: "Set_Card_Lists:Battles_of_Legend:_Monster_Mayhem_(TCG-FR)"
        // Extraire tout ce qui suit "Set_Card_Lists:"
        const setCardListsIndex = url.indexOf('Set_Card_Lists:');
        if (setCardListsIndex !== -1) {
          const afterSetCardLists = url.substring(setCardListsIndex + 'Set_Card_Lists:'.length);
          // Maintenant on a "Battles_of_Legend:_Monster_Mayhem_(TCG-FR)"
          // Il faut reconstruire le nom avec les deux-points
          seriesName = afterSetCardLists;
        }
      } else if (url.includes('/wiki/')) {
        // Format: "https://yugipedia.com/wiki/Battles_of_Legend:_Monster_Mayhem"
        const wikiPart = url.split('/wiki/')[1];
        if (wikiPart) {
          seriesName = wikiPart.split('?')[0]; // Enlever les paramètres de requête
        }
      }
      
      if (!seriesName) return '';
      
      // Nettoyer le nom - attention à préserver les deux-points
      seriesName = seriesName
        .replace(/\(TCG-FR\)$/i, '') // Supprimer (TCG-FR) à la fin d'abord
        .replace(/\(TCG\)$/i, '') // Supprimer (TCG) à la fin
        .replace(/\(OCG\)$/i, '') // Supprimer (OCG) à la fin
        .trim() // Supprimer espaces début/fin
        .replace(/_/g, ' ') // Remplacer underscores par espaces APRÈS avoir supprimé les suffixes
        .replace(/\s+/g, ' ') // Normaliser les espaces multiples
        .trim();
      
      // Remplacer les caractères encodés
      seriesName = seriesName
        .replace(/%3A/g, ':')
        .replace(/&colon;/g, ':');
      
      console.log('🏷️ Nom de série extrait:', `"${seriesName}"`, 'depuis URL:', url);
      
      return seriesName || '';
    } catch (error) {
      console.error('Erreur extraction nom série:', error);
      return '';
    }
  };

  // Fonction pour sauvegarder la série dans la base de données
  const handleSaveToDatabase = async () => {
    if (extractedCards.length === 0) {
      setSaveMessage({ type: 'error', text: 'Aucune carte à sauvegarder' });
      return;
    }

    // Extraire le code de série (4 premiers caractères du premier code de carte)
    const seriesCode = extractedCards[0]?.code.substring(0, 4);
    if (!seriesCode) {
      setSaveMessage({ type: 'error', text: 'Impossible de déterminer le code de série' });
      return;
    }

    // Extraire le nom complet de la série depuis l'URL, sinon utiliser le code
    let seriesName = extractSeriesNameFromUrl(url);
    if (!seriesName) {
      seriesName = `Série ${seriesCode}`;
    }
    
    setIsSaving(true);
    setSaveMessage(null);

    try {
      console.log('🚀 Début de la sauvegarde:', {
        seriesCode,
        seriesName,
        cardsCount: extractedCards.length,
        sourceUrl: url
      });

      const response = await fetch('/api/save-series', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seriesCode,
          seriesName,
          sourceUrl: url,
          cards: extractedCards
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la sauvegarde');
      }

      console.log('✅ Sauvegarde réussie:', result);
      setSaveMessage({ 
        type: 'success', 
        text: `Série "${seriesName}" sauvegardée avec succès ! (${result.data.cardsAdded} cartes ajoutées)` 
      });

      // Optionnel : nettoyer le formulaire après succès
      // setText('');
      // setUrl('');
      // setExtractedCards([]);
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
      setSaveMessage({ 
        type: 'error', 
        text: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}` 
      });
    } finally {
      setIsSaving(false);
      
      // Effacer le message après 5 secondes
      setTimeout(() => setSaveMessage(null), 5000);
    }
  };

  // Fonction appelée lors du clic sur "Convertir"
  const handleConvert = () => {
    console.log('=== DÉBOGAGE HANDLECONVERT ===');
    console.log('Bouton Convertir cliqué');
    console.log('Longueur du texte:', text.length);
    console.log('Text trim vide?', !text.trim());
    console.log('Texte à analyser (200 premiers caractères):', text.substring(0, 200));
    
    if (!text.trim()) {
      console.log('Aucun texte trouvé - Arrêt de la fonction');
      alert('Aucun texte à convertir. Veuillez coller du contenu HTML.');
      return;
    }
    
    try {
      console.log('Démarrage du parsing...');
      const cards = parseCardsFromHTML(text);
      console.log('Cartes extraites:', cards);
      console.log('Nombre de cartes:', cards.length);
      setExtractedCards(cards);
      console.log('État mis à jour');
    } catch (error) {
      console.error('Erreur lors de l\'extraction:', error);
      alert(`Erreur lors de l'extraction: ${error}`);
    }
    console.log('=== FIN DÉBOGAGE HANDLECONVERT ===');
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
            ← Retour à l'accueil
          </Link>
        </nav>

        {/* Titre principal */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Convertisseur de Cartes Yu-Gi-Oh!
          </h1>
          <p className="text-gray-300">
            Récupérez automatiquement les données depuis Yugipedia ou collez le code HTML
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Section URL */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <h2 className="text-2xl font-semibold text-white mb-4">
              🌐 Récupération automatique depuis URL
            </h2>
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

          {/* Séparateur */}
          <div className="flex items-center justify-center">
            <div className="border-t border-white/20 flex-grow"></div>
            <span className="mx-4 text-white/60 text-sm font-medium">OU</span>
            <div className="border-t border-white/20 flex-grow"></div>
          </div>
          
          {/* Section manuelle */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <h2 className="text-2xl font-semibold text-white mb-4">
              📝 Collage manuel du code HTML
            </h2>
            
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Collez le code HTML du tableau des cartes ici..."
              className="w-full h-64 bg-white/5 border border-white/30 rounded-lg p-4 text-white placeholder-gray-400 resize-none focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
            
            <div className="mt-4 flex gap-4">
              <button
                onClick={handleConvert}
                disabled={!text.trim()}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  text.trim()
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                🔄 Convertir
              </button>
              
              <button
                onClick={() => {
                  // Test avec une seule ligne pour débugger
                  const testHtml = '<tbody><tr><td><a href="/wiki/BLMM-FR001" class="mw-redirect" title="BLMM-FR001">BLMM-FR001</a></td><td>"<a href="/wiki/Blue-Eyes_White_Dragon" title="Blue-Eyes White Dragon">Blue-Eyes White Dragon</a>"</td><td><span lang="fr">"Dragon Blanc aux Yeux Bleus"</span></td><td><a href="/wiki/Secret_Rare" title="Secret Rare">Secret Rare</a><br><a href="/wiki/Starlight_Rare" title="Starlight Rare">Starlight Rare</a></td><td><a href="/wiki/Normal_Monster" title="Normal Monster">Normal Monster</a></td><td>New artwork</td></tr></tbody>';
                  console.log('Test avec HTML simple');
                  const cards = parseCardsFromHTML(testHtml);
                  console.log('Résultat du test:', cards);
                  setExtractedCards(cards);
                }}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-lg"
              >
                🧪 Test
              </button>
              
              <button
                onClick={() => {
                  setText('');
                  setExtractedCards([]);
                }}
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

        {/* Affichage des cartes extraites */}
        {extractedCards.length > 0 && (
          <div className="max-w-7xl mx-auto mt-8">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
                  🃏 Cartes extraites ({extractedCards.length})
                </h2>
                {extractedCards.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm bg-purple-600/30 border border-purple-500 rounded-lg px-3 py-1">
                      <span className="text-purple-200">Code série:</span>{' '}
                      <span className="text-white font-semibold">{extractedCards[0]?.code.substring(0, 4)}</span>
                    </div>
                    {extractSeriesNameFromUrl(url) && (
                      <div className="text-sm bg-blue-600/30 border border-blue-500 rounded-lg px-3 py-1">
                        <span className="text-blue-200">Nom série:</span>{' '}
                        <span className="text-white font-semibold">{extractSeriesNameFromUrl(url)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Version tableau pour les grands écrans */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-white">
                  <thead>
                    <tr className="border-b border-white/30">
                      <th className="text-left p-3 font-semibold">Code</th>
                      <th className="text-left p-3 font-semibold">Nom Anglais</th>
                      <th className="text-left p-3 font-semibold">Nom Français</th>
                      <th className="text-left p-3 font-semibold">Rareté</th>
                      <th className="text-left p-3 font-semibold">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extractedCards.map((card, index) => (
                      <tr key={index} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                        <td className="p-3 font-mono text-blue-300">{card.code}</td>
                        <td className="p-3">{card.nameEnglish}</td>
                        <td className="p-3 text-green-300">{card.nameFrench}</td>
                        <td className="p-3 text-yellow-300">{card.rarity}</td>
                        <td className="p-3 text-purple-300">{card.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Version cartes pour les petits écrans */}
              <div className="md:hidden space-y-4">
                {extractedCards.map((card, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/20">
                    <div className="font-mono text-blue-300 text-lg font-bold mb-2">{card.code}</div>
                    <div className="space-y-2">
                      <div>
                        <span className="text-gray-400">EN:</span> <span className="text-white">{card.nameEnglish}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">FR:</span> <span className="text-green-300">{card.nameFrench}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Rareté:</span> <span className="text-yellow-300">{card.rarity}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Type:</span> <span className="text-purple-300">{card.type}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message de statut de sauvegarde */}
              {saveMessage && (
                <div className={`mt-4 p-4 rounded-lg border ${
                  saveMessage.type === 'success' 
                    ? 'bg-green-900/30 border-green-500 text-green-300' 
                    : 'bg-red-900/30 border-red-500 text-red-300'
                }`}>
                  <div className="flex items-center gap-2">
                    <span>{saveMessage.type === 'success' ? '✅' : '❌'}</span>
                    <span>{saveMessage.text}</span>
                  </div>
                </div>
              )}

              {/* Boutons d'action */}
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
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Sauvegarde...
                    </>
                  ) : (
                    <>
                      🗃️ Ajouter à la collection
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    const dataStr = JSON.stringify(extractedCards, null, 2);
                    const dataBlob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'cartes_yu_gi_oh.json';
                    link.click();
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
                >
                  📁 Télécharger JSON
                </button>
                
                <button
                  onClick={() => {
                    const csvContent = [
                      'Code,Nom Anglais,Nom Français,Rareté,Type',
                      ...extractedCards.map(card => 
                        `"${card.code}","${card.nameEnglish}","${card.nameFrench}","${card.rarity}","${card.type}"`
                      )
                    ].join('\n');
                    
                    const dataBlob = new Blob([csvContent], { type: 'text/csv' });
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'cartes_yu_gi_oh.csv';
                    link.click();
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all"
                >
                  📊 Télécharger CSV
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
