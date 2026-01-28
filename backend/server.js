require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const cron = require('node-cron');
const { generateQuittance } = require('./services/pdfGenerator');
const { sendEmail, testEmailConnection, sendSupportEmail } = require('./services/emailService');
const { getAuthUrl, getTokenFromCode } = require('./services/oauthService');
const { createCheckoutSession } = require('./services/billingService');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const DATA_DIR = path.join(__dirname, 'data');
const LOCATAIRES_FILE = path.join(DATA_DIR, 'locataires.json');
const BIENS_FILE = path.join(DATA_DIR, 'biens.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// Initialiser les fichiers de données
async function initData() {
  await fs.ensureDir(DATA_DIR);
  
  if (!await fs.pathExists(LOCATAIRES_FILE)) {
    const defaultLocataires = [
      { id: 1, nom: 'Locataire 1', prenom: '', email: '', loyer: 0, charges: 0, adresse: '', bienId: 1 },
      { id: 2, nom: 'Locataire 2', prenom: '', email: '', loyer: 0, charges: 0, adresse: '', bienId: 1 },
      { id: 3, nom: 'Locataire 3', prenom: '', email: '', loyer: 0, charges: 0, adresse: '', bienId: 1 },
      { id: 4, nom: 'Locataire 4', prenom: '', email: '', loyer: 0, charges: 0, adresse: '', bienId: 1 },
      { id: 5, nom: 'Locataire 5', prenom: '', email: '', loyer: 0, charges: 0, adresse: '', bienId: 1 }
    ];
    await fs.writeJson(LOCATAIRES_FILE, defaultLocataires);
  } else {
    // Migration douce : si certains locataires n'ont pas de bienId, les rattacher au bien 1 par défaut
    try {
      const locataires = await fs.readJson(LOCATAIRES_FILE);
      let updated = false;
      const migrated = locataires.map(l => {
        if (l.bienId == null) {
          updated = true;
          return { ...l, bienId: 1 };
        }
        return l;
      });
      if (updated) {
        await fs.writeJson(LOCATAIRES_FILE, migrated);
      }
    } catch (e) {
      console.error('Erreur de migration des locataires (bienId) :', e.message);
    }
  }
  
  if (!await fs.pathExists(BIENS_FILE)) {
    const defaultBiens = [
      { id: 1, nom: 'Bien principal', adresse: '' }
    ];
    await fs.writeJson(BIENS_FILE, defaultBiens);
  }
  
  if (!await fs.pathExists(CONFIG_FILE)) {
    const defaultConfig = {
      proprietaire: {
        nom: '',
        prenom: '',
        adresse: '',
        signature: ''
      },
      email: {
        host: 'smtp.gmail.com',
        port: 587,
        user: '',
        password: '',
        from: '',
        oauth2: {
          clientId: '',
          clientSecret: '',
          refreshToken: ''
        }
      },
      appName: 'Gestion Quittances'
    };
    await fs.writeJson(CONFIG_FILE, defaultConfig);
  }
}

// Routes API
app.get('/api/locataires', async (req, res) => {
  try {
    const locataires = await fs.readJson(LOCATAIRES_FILE);
    res.json(locataires);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/locataires', async (req, res) => {
  try {
    const locataires = await fs.readJson(LOCATAIRES_FILE);
    const newId = Math.max(...locataires.map(l => l.id), 0) + 1;
    // Affecter un bien par défaut si non fourni
    let bienId = req.body.bienId;
    if (bienId == null) {
      const biens = await fs.readJson(BIENS_FILE);
      bienId = biens[0]?.id || 1;
    }
    const newLocataire = { id: newId, ...req.body, bienId };
    locataires.push(newLocataire);
    await fs.writeJson(LOCATAIRES_FILE, locataires);
    res.json(newLocataire);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/locataires/:id', async (req, res) => {
  try {
    const locataires = await fs.readJson(LOCATAIRES_FILE);
    const index = locataires.findIndex(l => l.id === parseInt(req.params.id));
    if (index === -1) {
      return res.status(404).json({ error: 'Locataire non trouvé' });
    }
    locataires[index] = { ...locataires[index], ...req.body };
    await fs.writeJson(LOCATAIRES_FILE, locataires);
    res.json(locataires[index]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/locataires/:id', async (req, res) => {
  try {
    const locataires = await fs.readJson(LOCATAIRES_FILE);
    const filtered = locataires.filter(l => l.id !== parseInt(req.params.id));
    await fs.writeJson(LOCATAIRES_FILE, filtered);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/config', async (req, res) => {
  try {
    const config = await fs.readJson(CONFIG_FILE);
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/config', async (req, res) => {
  try {
    await fs.writeJson(CONFIG_FILE, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/test-email', async (req, res) => {
  try {
    const config = await fs.readJson(CONFIG_FILE);
    const result = await testEmailConnection(config);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/support-message', async (req, res) => {
  try {
    const { nom, email, message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length < 5) {
      return res.status(400).json({ error: 'Message trop court.' });
    }

    const config = await fs.readJson(CONFIG_FILE);
    await sendSupportEmail({ nom, email, message }, config);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stripe Checkout – création d'une session d'abonnement
app.post('/api/billing/create-checkout-session', async (req, res) => {
  try {
    const { priceId, successUrl, cancelUrl, customerEmail } = req.body;

    const session = await createCheckoutSession({
      priceId: priceId || process.env.STRIPE_PRICE_ID,
      successUrl: successUrl || `${process.env.PUBLIC_URL || 'http://localhost:3000'}?abonnement=success`,
      cancelUrl: cancelUrl || `${process.env.PUBLIC_URL || 'http://localhost:3000'}?abonnement=cancel`,
      customerEmail
    });

    res.json({ url: session.url, id: session.id });
  } catch (error) {
    console.error('Erreur création session Stripe:', error);
    res.status(500).json({ error: error.message });
  }
});

// Biens
app.get('/api/biens', async (req, res) => {
  try {
    const biens = await fs.readJson(BIENS_FILE);
    res.json(biens);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/biens', async (req, res) => {
  try {
    const { nom, adresse } = req.body;
    if (!nom || typeof nom !== 'string') {
      return res.status(400).json({ error: 'Nom du bien obligatoire.' });
    }
    const biens = await fs.readJson(BIENS_FILE);
    const newId = Math.max(...biens.map(b => b.id), 0) + 1;
    const bien = { id: newId, nom, adresse: adresse || '' };
    biens.push(bien);
    await fs.writeJson(BIENS_FILE, biens);
    res.json(bien);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/biens/:id', async (req, res) => {
  try {
    const biens = await fs.readJson(BIENS_FILE);
    const index = biens.findIndex(b => b.id === parseInt(req.params.id));
    if (index === -1) {
      return res.status(404).json({ error: 'Bien non trouvé' });
    }
    biens[index] = { ...biens[index], ...req.body, id: biens[index].id };
    await fs.writeJson(BIENS_FILE, biens);
    res.json(biens[index]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/biens/:id', async (req, res) => {
  try {
    const biens = await fs.readJson(BIENS_FILE);
    const id = parseInt(req.params.id);
    const bien = biens.find(b => b.id === id);
    if (!bien) {
      return res.status(404).json({ error: 'Bien non trouvé' });
    }
    // Vérifier qu'aucun locataire n'est rattaché à ce bien
    const locataires = await fs.readJson(LOCATAIRES_FILE);
    const hasLocataires = locataires.some(l => l.bienId === id);
    if (hasLocataires) {
      return res.status(400).json({ error: 'Impossible de supprimer un bien qui a encore des locataires rattachés.' });
    }
    const filtered = biens.filter(b => b.id !== id);
    await fs.writeJson(BIENS_FILE, filtered);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour obtenir l'URL d'autorisation OAuth2
app.post('/api/oauth/get-auth-url', async (req, res) => {
  try {
    const { clientId, clientSecret } = req.body;
    if (!clientId || !clientSecret) {
      return res.status(400).json({ error: 'Client ID et Client Secret requis' });
    }
    
    const redirectUri = `${req.protocol}://${req.get('host')}/api/oauth/callback`;
    const authUrl = getAuthUrl(clientId, clientSecret, redirectUri);
    
    res.json({ authUrl, redirectUri });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route de callback OAuth2
app.get('/api/oauth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send('Code d\'autorisation manquant');
    }
    
    const config = await fs.readJson(CONFIG_FILE);
    if (!config.email.oauth2 || !config.email.oauth2.clientId || !config.email.oauth2.clientSecret) {
      return res.status(400).send('Configuration OAuth2 incomplète');
    }
    
    const redirectUri = `${req.protocol}://${req.get('host')}/api/oauth/callback`;
    const tokens = await getTokenFromCode(
      code,
      config.email.oauth2.clientId,
      config.email.oauth2.clientSecret,
      redirectUri
    );
    
    // Sauvegarder le refresh token dans la config
    config.email.oauth2.refreshToken = tokens.refresh_token;
    await fs.writeJson(CONFIG_FILE, config);
    
    res.send(`
      <html>
        <head><title>Autorisation réussie</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: green;">✅ Autorisation Gmail réussie !</h1>
          <p>Vous pouvez fermer cette fenêtre et retourner à l'application.</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 2000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`
      <html>
        <head><title>Erreur</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: red;">❌ Erreur lors de l'autorisation</h1>
          <p>${error.message}</p>
        </body>
      </html>
    `);
  }
});

// Route pour échanger le code contre un token (alternative)
app.post('/api/oauth/exchange-code', async (req, res) => {
  try {
    const { code, clientId, clientSecret } = req.body;
    if (!code || !clientId || !clientSecret) {
      return res.status(400).json({ error: 'Code, Client ID et Client Secret requis' });
    }
    
    const redirectUri = 'urn:ietf:wg:oauth:2.0:oob'; // Pour les applications de bureau
    const tokens = await getTokenFromCode(code, clientId, clientSecret, redirectUri);
    
    res.json({ 
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate-quittance', async (req, res) => {
  try {
    const { locataireId, mois, annee } = req.body;
    const locataires = await fs.readJson(LOCATAIRES_FILE);
    const config = await fs.readJson(CONFIG_FILE);
    const locataire = locataires.find(l => l.id === locataireId);
    
    if (!locataire) {
      return res.status(404).json({ error: 'Locataire non trouvé' });
    }
    
    const pdfPath = await generateQuittance(locataire, config, mois, annee);
    res.json({ pdfPath, success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/send-quittance', async (req, res) => {
  try {
    const { locataireId, mois, annee } = req.body;
    const locataires = await fs.readJson(LOCATAIRES_FILE);
    const config = await fs.readJson(CONFIG_FILE);
    const locataire = locataires.find(l => l.id === locataireId);
    
    if (!locataire) {
      return res.status(404).json({ error: 'Locataire non trouvé' });
    }
    
    if (!locataire.email) {
      return res.status(400).json({ error: 'Email du locataire non renseigné' });
    }
    
    const pdfPath = await generateQuittance(locataire, config, mois, annee);
    await sendEmail(locataire, config, pdfPath, mois, annee);

    // Mettre à jour la date du dernier envoi de quittance
    const nowIso = new Date().toISOString();
    const updatedLocataires = locataires.map(l =>
      l.id === locataireId ? { ...l, lastQuittanceSentAt: nowIso } : l
    );
    await fs.writeJson(LOCATAIRES_FILE, updatedLocataires);
    
    res.json({ success: true, lastQuittanceSentAt: nowIso });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export comptable (CSV)
app.get('/api/exports/compta', async (req, res) => {
  try {
    const { bienId, from, to } = req.query;

    const locataires = await fs.readJson(LOCATAIRES_FILE);
    const biens = await fs.readJson(BIENS_FILE);

    let fromDate = null;
    let toDate = null;

    if (from) {
      const d = new Date(from);
      if (!isNaN(d.getTime())) fromDate = d;
    }
    if (to) {
      const d = new Date(to);
      if (!isNaN(d.getTime())) {
        // Inclure toute la journée de fin
        d.setHours(23, 59, 59, 999);
        toDate = d;
      }
    }

    const header = [
      'Date quittance',
      'Période (mois/année)',
      'Bien',
      'Locataire',
      'Loyer',
      'Charges',
      'Total',
      'Date paiement'
    ];

    const rows = [];

    for (const locataire of locataires) {
      if (!locataire.lastQuittanceSentAt) continue;

      const d = new Date(locataire.lastQuittanceSentAt);
      if (isNaN(d.getTime())) continue;

      if (fromDate && d < fromDate) continue;
      if (toDate && d > toDate) continue;

      if (bienId && String(locataire.bienId) !== String(bienId)) continue;

      const bien = biens.find(b => b.id === locataire.bienId);

      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();

      const dateQuittance = `${day}/${month}/${year}`;
      const periode = `${month}/${year}`;

      const locataireNom = `${locataire.nom} ${locataire.prenom || ''}`.trim();
      const loyer = (locataire.loyer || 0).toFixed(2).replace('.', ',');
      const charges = (locataire.charges || 0).toFixed(2).replace('.', ',');
      const total = ((locataire.loyer || 0) + (locataire.charges || 0)).toFixed(2).replace('.', ',');

      // Pour l'instant, on considère la date de paiement = date de quittance
      const datePaiement = dateQuittance;

      rows.push([
        dateQuittance,
        periode,
        bien ? bien.nom : '',
        locataireNom,
        loyer,
        charges,
        total,
        datePaiement
      ]);
    }

    // Générer le CSV avec séparateur ';' (adapté à Excel FR)
    const allLines = [header, ...rows]
      .map(cols =>
        cols
          .map((c) => {
            const v = c == null ? '' : String(c);
            // Échapper les guillemets
            const escaped = v.replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(';')
      )
      .join('\n');

    const filename = `export_compta_${new Date().toISOString().slice(0,10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // BOM pour que Excel gère correctement l'UTF-8
    res.send('\uFEFF' + allLines);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Envoi de quittances sur une plage de dates (par mois)
app.post('/api/send-quittances-range', async (req, res) => {
  try {
    const { locataireId, from, to } = req.body;

    if (!locataireId || !from || !to) {
      return res.status(400).json({ error: 'Paramètres manquants (locataireId, from, to).' });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({ error: 'Dates invalides.' });
    }

    if (fromDate > toDate) {
      return res.status(400).json({ error: 'La date de début doit être avant la date de fin.' });
    }

    const locataires = await fs.readJson(LOCATAIRES_FILE);
    const config = await fs.readJson(CONFIG_FILE);
    const locataire = locataires.find((l) => l.id === locataireId);

    if (!locataire) {
      return res.status(404).json({ error: 'Locataire non trouvé' });
    }

    if (!locataire.email) {
      return res.status(400).json({ error: 'Email du locataire non renseigné' });
    }

    // Normaliser au premier jour du mois de départ
    let current = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
    const end = new Date(toDate.getFullYear(), toDate.getMonth(), 1);

    let sentCount = 0;
    let lastSentDate = null;

    while (current <= end) {
      const mois = current.toLocaleString('fr-FR', { month: 'long' });
      const annee = current.getFullYear();

      try {
        const pdfPath = await generateQuittance(locataire, config, mois, annee);
        await sendEmail(
          locataire,
          config,
          pdfPath,
          mois,
          annee
        );
        // On considère la date de quittance = dernier jour du mois concerné
        const dernierJour = new Date(annee, current.getMonth() + 1, 0);
        lastSentDate = dernierJour;
        sentCount += 1;
      } catch (e) {
        console.error(`Erreur lors de l'envoi du mois ${mois} ${annee} pour le locataire ${locataireId}:`, e.message);
        // On continue avec les autres mois
      }

      // Mois suivant
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }

    // Mettre à jour la dernière date de quittance envoyée si au moins une a été envoyée
    if (sentCount > 0 && lastSentDate) {
      const nowIso = lastSentDate.toISOString();
      const updatedLocataires = locataires.map((l) =>
        l.id === locataireId ? { ...l, lastQuittanceSentAt: nowIso } : l
      );
      await fs.writeJson(LOCATAIRES_FILE, updatedLocataires);
    }

    res.json({
      success: true,
      sentCount,
      from: fromDate.toISOString(),
      to: toDate.toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tâche cron pour générer et envoyer les quittances le premier de chaque mois
cron.schedule('0 9 1 * *', async () => {
  try {
    console.log('Génération automatique des quittances...');
    const locataires = await fs.readJson(LOCATAIRES_FILE);
    const config = await fs.readJson(CONFIG_FILE);
    const now = new Date();
    const mois = now.toLocaleString('fr-FR', { month: 'long' });
    const annee = now.getFullYear();
    
    const updatedLocataires = [...locataires];

    for (const locataire of updatedLocataires) {
      if (locataire.email && locataire.loyer > 0) {
        try {
          const pdfPath = await generateQuittance(locataire, config, mois, annee);
          await sendEmail(locataire, config, pdfPath, mois, annee);
          locataire.lastQuittanceSentAt = new Date().toISOString();
          console.log(`Quittance envoyée à ${locataire.nom} ${locataire.prenom}`);
        } catch (error) {
          console.error(`Erreur pour ${locataire.nom}:`, error.message);
        }
      }
    }

    await fs.writeJson(LOCATAIRES_FILE, updatedLocataires);
  } catch (error) {
    console.error('Erreur lors de la génération automatique:', error);
  }
});

initData().then(() => {
  app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
  });
});
