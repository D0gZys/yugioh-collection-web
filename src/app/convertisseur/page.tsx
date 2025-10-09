import Link from 'next/link';

export default function ConvertisseurPage() {
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

        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            🔄 Convertisseur
          </h1>
          <p className="text-xl text-blue-200">
            Outils de conversion pour ta collection Yu-Gi-Oh
          </p>
        </header>

        {/* Contenu principal */}
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Section Import SQLite */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
                📥 Import SQLite
              </h2>
              <p className="text-gray-300 mb-4">
                Importer des données depuis un fichier SQLite existant vers PostgreSQL.
              </p>
              <div className="space-y-3">
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                  Choisir un fichier SQLite
                </button>
                <div className="text-sm text-gray-400">
                  Formats supportés : .db, .sqlite, .sqlite3
                </div>
              </div>
            </div>

            {/* Section Export */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
                📤 Export Base
              </h2>
              <p className="text-gray-300 mb-4">
                Exporter ta collection PostgreSQL vers différents formats.
              </p>
              <div className="space-y-3">
                <button className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors">
                  Exporter en CSV
                </button>
                <button className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors">
                  Exporter en JSON
                </button>
                <button className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors">
                  Backup SQL
                </button>
              </div>
            </div>

            {/* Section Nettoyage */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
                🧹 Nettoyage
              </h2>
              <p className="text-gray-300 mb-4">
                Outils de maintenance et nettoyage de la base de données.
              </p>
              <div className="space-y-3">
                <button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors">
                  Supprimer doublons
                </button>
                <button className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors">
                  Reset complet
                </button>
              </div>
            </div>

            {/* Section Statistiques */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
                📊 Statistiques
              </h2>
              <p className="text-gray-300 mb-4">
                Analyse et statistiques de ta collection.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-300">
                  <span>Séries :</span>
                  <span className="text-white font-semibold">0</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Cartes :</span>
                  <span className="text-white font-semibold">0</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Raretés :</span>
                  <span className="text-white font-semibold">0</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Taille DB :</span>
                  <span className="text-white font-semibold">~2 MB</span>
                </div>
              </div>
            </div>

          </div>

          {/* Section Info */}
          <div className="mt-12 bg-blue-500/20 border border-blue-500/30 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              ℹ️ Informations
            </h3>
            <div className="text-sm text-blue-200 space-y-2">
              <p>• Les conversions préservent toutes les relations entre tables</p>
              <p>• Un backup automatique est créé avant chaque opération importante</p>
              <p>• Les données sensibles (.env) ne sont jamais incluses dans les exports</p>
              <p>• Les opérations de reset sont irréversibles, sois prudent !</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-12 text-gray-400">
          <p>Convertisseur de données Yu-Gi-Oh Collection</p>
        </footer>
      </div>
    </div>
  );
}