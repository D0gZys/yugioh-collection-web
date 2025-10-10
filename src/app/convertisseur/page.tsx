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

  // Fonction pour extraire les données des cartes depuis le HTML
  const parseCardsFromHTML = (htmlText: string): Card[] => {
    console.log('Début de l\'analyse HTML');
    const cards: Card[] = [];
    
    // Nettoyer et préparer le HTML
    let cleanHtml = htmlText.trim();
    
    // Si le texte commence par <tbody>, on l'encapsule dans une table complète
    if (cleanHtml.startsWith('<tbody>')) {
      cleanHtml = `<table>${cleanHtml}</table>`;
    }
    
    // Créer un élément temporaire pour parser le HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cleanHtml;
    
    // Récupérer tous les éléments <tr>
    const rows = tempDiv.querySelectorAll('tr');
    console.log('Nombre de lignes <tr> trouvées:', rows.length);
    
    rows.forEach((row, index) => {
      const cells = row.querySelectorAll('td');
      console.log(`Ligne ${index}: ${cells.length} cellules trouvées`);
      
      // Vérifier qu'on a au moins 5 colonnes (code, nom EN, nom FR, rareté, type)
      if (cells.length >= 5) {
        try {
          // Extraire le code (première colonne)
          const codeElement = cells[0].querySelector('a');
          const code = codeElement?.textContent?.trim() || '';
          
          // Extraire le nom anglais (deuxième colonne)
          const englishNameElement = cells[1].querySelector('a');
          const nameEnglish = englishNameElement?.textContent?.replace(/"/g, '').trim() || '';
          
          // Extraire le nom français (troisième colonne) 
          const frenchSpan = cells[2].querySelector('span[lang="fr"]');
          const nameFrench = frenchSpan?.textContent?.replace(/"/g, '').trim() || '';
          
          // Extraire la rareté (quatrième colonne)
          const rarityLinks = cells[3].querySelectorAll('a');
          const rarity = Array.from(rarityLinks).map(link => link.textContent?.trim()).join(', ');
          
          // Extraire le type (cinquième colonne)
          const typeLinks = cells[4].querySelectorAll('a');
          const type = Array.from(typeLinks).map(link => link.textContent?.trim()).join(' ');
          
          // Ajouter la carte si toutes les informations essentielles sont présentes
          if (code && nameEnglish && nameFrench) {
            cards.push({
              code,
              nameEnglish,
              nameFrench,
              rarity,
              type
            });
          }
        } catch (error) {
          console.warn('Erreur lors de l\'extraction d\'une ligne:', error);
        }
      }
    });
    
    return cards;
  };

  // Fonction pour récupérer les données depuis une URL
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

  // Fonction appelée lors du clic sur "Convertir"
  const handleConvert = () => {
    console.log('Bouton Convertir cliqué');
    console.log('Texte à analyser:', text.substring(0, 200) + '...');
    
    if (!text.trim()) {
      console.log('Aucun texte trouvé');
      return;
    }
    
    try {
      const cards = parseCardsFromHTML(text);
      console.log('Cartes extraites:', cards);
      console.log('Nombre de cartes:', cards.length);
      setExtractedCards(cards);
    } catch (error) {
      console.error('Erreur lors de l\'extraction:', error);
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
              <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
                🃏 Cartes extraites ({extractedCards.length})
              </h2>
              
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

              {/* Boutons d'action */}
              <div className="mt-6 flex gap-4 flex-wrap">
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
