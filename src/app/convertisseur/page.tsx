'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function ConvertisseurPage() {
  const [text, setText] = useState('');

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

        {/* Zone de texte */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <h2 className="text-2xl font-semibold text-white mb-4">
              📝 Zone de texte
            </h2>
            
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Collez votre texte ici..."
              className="w-full h-96 bg-white/5 border border-white/30 rounded-lg p-4 text-white placeholder-gray-400 resize-none focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
