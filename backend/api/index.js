const { app, initData } = require('../server');

// Initialisation "lazy" pour Vercel : on prépare les fichiers de données
// au premier appel seulement.
let initialized = false;

module.exports = async (req, res) => {
  if (!initialized) {
    try {
      await initData();
      initialized = true;
    } catch (e) {
      console.error('Erreur initData sur Vercel :', e);
      return res.status(500).json({ error: 'Erreur d\'initialisation du backend' });
    }
  }

  // L'app Express est une fonction (req, res) => ...
  return app(req, res);
};

