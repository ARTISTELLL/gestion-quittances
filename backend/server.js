require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const cron = require('node-cron');
const { generateQuittance } = require('./services/pdfGenerator');
const {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  testEmailConnection,
  sendSupportEmail
} = require('./services/emailService');
const { getAuthUrl, getTokenFromCode } = require('./services/oauthService');
const { createCheckoutSession } = require('./services/billingService');
const { requireAuth, generateToken } = require('./middleware/auth');
const {
  getConfig,
  updateConfig,
  getBiens,
  createBien,
  updateBien,
  deleteBien,
  getLocataires,
  createLocataire,
  updateLocataire,
  deleteLocataire,
  updateLocataireLastSent,
  createUser,
  getUserByEmail,
  updateUserPassword,
  createPasswordReset,
  getPasswordResetByToken,
  markPasswordResetUsed
} = require('./database');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Health check simple pour tester le backend en GET
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// URL de base pour les redirections OAuth (Vercel n'expose pas toujours req.protocol/host correctement)
function getBaseUrl(req) {
  if (process.env.VERCEL && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return `${req.protocol}://${req.get('host')}`;
}

function getFrontendBaseUrl(req) {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.replace(/\/+$/, '');
  }
  if (process.env.PUBLIC_URL) {
    return process.env.PUBLIC_URL.replace(/\/+$/, '');
  }
  return getBaseUrl(req);
}

// Initialisation DB (faite automatiquement par database.js)
function initData() {
  // Plus besoin d'initialiser les fichiers JSON, la DB le fait automatiquement
  console.log('✅ Base de données prête');
}

// ==================== ROUTES D'AUTHENTIFICATION (PUBLIQUES) ====================

// Inscription
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password || password.length < 6) {
      return res.status(400).json({ error: 'Email et mot de passe (min 6 caractères) requis' });
    }
    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = await createUser(email, passwordHash);
    const token = generateToken(userId);
    try {
      await sendWelcomeEmail({ email, appName: 'Gestion Quittances' });
    } catch (mailError) {
      console.warn('Email de bienvenue non envoyé:', mailError.message);
    }
    res.json({ token, userId, email });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Connexion
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    const token = generateToken(user.id);
    res.json({ token, userId: user.id, email: user.email });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mot de passe oublié
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email requis' });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return res.json({ success: true });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await createPasswordReset(user.id, tokenHash, expiresAt);

    const resetUrl = `${getFrontendBaseUrl(req)}/?reset=${token}`;
    try {
      await sendPasswordResetEmail({
        email,
        appName: 'Gestion Quittances',
        resetUrl
      });
    } catch (mailError) {
      console.warn('Email reset non envoyé:', mailError.message);
    }

    return res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Réinitialisation du mot de passe
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 6) {
      return res.status(400).json({ error: 'Token et mot de passe (min 6 caractères) requis' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const reset = await getPasswordResetByToken(tokenHash);
    if (!reset) {
      return res.status(400).json({ error: 'Lien invalide ou expiré' });
    }

    if (reset.expires_at && new Date(reset.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Lien expiré' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await updateUserPassword(reset.user_id, passwordHash);
    await markPasswordResetUsed(reset.id);
    return res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ROUTES API PROTÉGÉES (REQUIÈRENT AUTHENTIFICATION) ====================

// Locataires
app.get('/api/locataires', requireAuth, async (req, res) => {
  try {
    const locataires = await getLocataires(req.userId);
    // Convertir bien_id en bienId pour compatibilité frontend
    res.json(locataires.map(l => ({
      ...l,
      bienId: l.bien_id,
      lastQuittanceSentAt: l.last_quittance_sent_at
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/locataires', requireAuth, async (req, res) => {
  try {
    let bienId = req.body.bienId;
    if (bienId == null) {
      const biens = await getBiens(req.userId);
      bienId = biens[0]?.id || null;
    }
    const newLocataire = await createLocataire(req.userId, { ...req.body, bienId });
    res.json({ ...newLocataire, bienId: newLocataire.bien_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/locataires/:id', requireAuth, async (req, res) => {
  try {
    await updateLocataire(req.userId, parseInt(req.params.id), req.body);
    const locataires = await getLocataires(req.userId);
    const updated = locataires.find(l => l.id === parseInt(req.params.id));
    if (!updated) {
      return res.status(404).json({ error: 'Locataire non trouvé' });
    }
    res.json({ ...updated, bienId: updated.bien_id, lastQuittanceSentAt: updated.last_quittance_sent_at });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/locataires/:id', requireAuth, async (req, res) => {
  try {
    await deleteLocataire(req.userId, parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/config', requireAuth, async (req, res) => {
  try {
    const config = await getConfig(req.userId);
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/config', requireAuth, async (req, res) => {
  try {
    await updateConfig(req.userId, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/test-email', requireAuth, async (req, res) => {
  try {
    const config = await getConfig(req.userId);
    const result = await testEmailConnection(config);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/support-message', requireAuth, async (req, res) => {
  try {
    const { nom, email, message } = req.body;
    if (!message || typeof message !== 'string' || message.trim().length < 5) {
      return res.status(400).json({ error: 'Message trop court.' });
    }
    const config = await getConfig(req.userId);
    await sendSupportEmail({ nom, email, message }, config);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stripe Checkout – création d'une session d'abonnement
app.post('/api/billing/create-checkout-session', requireAuth, async (req, res) => {
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
app.get('/api/biens', requireAuth, async (req, res) => {
  try {
    const biens = await getBiens(req.userId);
    res.json(biens);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/biens', requireAuth, async (req, res) => {
  try {
    const { nom, adresse } = req.body;
    if (!nom || typeof nom !== 'string') {
      return res.status(400).json({ error: 'Nom du bien obligatoire.' });
    }
    const bien = await createBien(req.userId, { nom, adresse: adresse || '' });
    res.json(bien);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/biens/:id', requireAuth, async (req, res) => {
  try {
    await updateBien(req.userId, parseInt(req.params.id), req.body);
    const biens = await getBiens(req.userId);
    const updated = biens.find(b => b.id === parseInt(req.params.id));
    if (!updated) {
      return res.status(404).json({ error: 'Bien non trouvé' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/biens/:id', requireAuth, async (req, res) => {
  try {
    await deleteBien(req.userId, parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Route pour obtenir l'URL d'autorisation OAuth2 (Client ID/Secret lus depuis les variables d'env du serveur)
app.post('/api/oauth/get-auth-url', requireAuth, async (req, res) => {
  try {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return res.status(500).json({
        error: 'OAuth non configuré : définir GOOGLE_OAUTH_CLIENT_ID et GOOGLE_OAUTH_CLIENT_SECRET dans les variables d\'environnement du serveur.'
      });
    }
    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl}/api/oauth/callback`;
    // Inclure userId dans state pour que le callback sache quel utilisateur connecter
    const state = String(req.userId);
    const authUrl = getAuthUrl(clientId, clientSecret, redirectUri, state);
    res.json({ authUrl, redirectUri });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route de callback OAuth2 (PUBLIQUE - appelée par Google après autorisation)
app.get('/api/oauth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      return res.status(400).send('Code d\'autorisation manquant');
    }
    // state contient le userId encodé (envoyé depuis le frontend)
    if (!state) {
      return res.status(400).send('State manquant (userId requis)');
    }
    const userId = parseInt(state);
    if (!userId || isNaN(userId)) {
      return res.status(400).send('UserId invalide');
    }
    
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return res.status(500).send('OAuth non configuré sur le serveur (variables d\'environnement manquantes).');
    }
    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl}/api/oauth/callback`;
    const tokens = await getTokenFromCode(code, clientId, clientSecret, redirectUri);
    
    // Sauvegarder le refresh token dans la config de l'utilisateur
    const config = await getConfig(userId);
    config.email.oauth2.refreshToken = tokens.refresh_token;
    updateConfig(userId, config);
    
    const frontendUrl = getFrontendBaseUrl(req);
    res.send(`
      <html>
        <head>
          <title>Autorisation réussie</title>
          <meta http-equiv="refresh" content="0; url=${frontendUrl}">
        </head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: green;">✅ Autorisation Gmail réussie !</h1>
          <p>Redirection en cours...</p>
          <p>
            <a href="${frontendUrl}" style="color: #007bff; text-decoration: underline;">
              Cliquez ici si la redirection ne fonctionne pas
            </a>
          </p>
        </body>
      </html>
    `);
  } catch (error) {
    const frontendUrl = getFrontendBaseUrl(req);
    res.status(500).send(`
      <html>
        <head><title>Erreur</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: red;">❌ Erreur lors de l'autorisation</h1>
          <p>${error.message}</p>
          <p>
            <a href="${frontendUrl}" style="color: #007bff; text-decoration: underline;">
              Retourner à l'application
            </a>
          </p>
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

app.post('/api/generate-quittance', requireAuth, async (req, res) => {
  try {
    const { locataireId, mois, annee } = req.body;
    const locataires = await getLocataires(req.userId);
    const locataire = locataires.find(l => l.id === locataireId);
    if (!locataire) {
      return res.status(404).json({ error: 'Locataire non trouvé' });
    }
    const config = await getConfig(req.userId);
    const pdfPath = await generateQuittance({ ...locataire, bienId: locataire.bien_id }, config, mois, annee);
    res.json({ pdfPath, success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/send-quittance', requireAuth, async (req, res) => {
  try {
    const { locataireId, mois, annee } = req.body;
    const locataires = await getLocataires(req.userId);
    const locataire = locataires.find(l => l.id === locataireId);
    if (!locataire) {
      return res.status(404).json({ error: 'Locataire non trouvé' });
    }
    if (!locataire.email) {
      return res.status(400).json({ error: 'Email du locataire non renseigné' });
    }
    const config = await getConfig(req.userId);
    const pdfPath = await generateQuittance({ ...locataire, bienId: locataire.bien_id }, config, mois, annee);
    await sendEmail({ ...locataire, bienId: locataire.bien_id }, config, pdfPath, mois, annee);
    const nowIso = new Date().toISOString();
    await updateLocataireLastSent(req.userId, locataireId, nowIso);
    res.json({ success: true, lastQuittanceSentAt: nowIso });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export comptable (CSV)
app.get('/api/exports/compta', requireAuth, async (req, res) => {
  try {
    const { bienId, from, to } = req.query;
    const locataires = await getLocataires(req.userId);
    const biens = await getBiens(req.userId);

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

      if (bienId && String(locataire.bien_id) !== String(bienId)) continue;

      const bien = biens.find(b => b.id === locataire.bien_id);

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
app.post('/api/send-quittances-range', requireAuth, async (req, res) => {
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
    const locataires = await getLocataires(req.userId);
    const locataire = locataires.find((l) => l.id === locataireId);
    if (!locataire) {
      return res.status(404).json({ error: 'Locataire non trouvé' });
    }
    if (!locataire.email) {
      return res.status(400).json({ error: 'Email du locataire non renseigné' });
    }
    const config = await getConfig(req.userId);
    let current = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
    const end = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
    let sentCount = 0;
    let lastSentDate = null;
    while (current <= end) {
      const mois = current.toLocaleString('fr-FR', { month: 'long' });
      const annee = current.getFullYear();
      try {
        const pdfPath = await generateQuittance({ ...locataire, bienId: locataire.bien_id }, config, mois, annee);
        await sendEmail({ ...locataire, bienId: locataire.bien_id }, config, pdfPath, mois, annee);
        const dernierJour = new Date(annee, current.getMonth() + 1, 0);
        lastSentDate = dernierJour;
        sentCount += 1;
      } catch (e) {
        console.error(`Erreur lors de l'envoi du mois ${mois} ${annee} pour le locataire ${locataireId}:`, e.message);
      }
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }
    if (sentCount > 0 && lastSentDate) {
      await updateLocataireLastSent(req.userId, locataireId, lastSentDate.toISOString());
    }
    res.json({ success: true, sentCount, from: fromDate.toISOString(), to: toDate.toISOString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tâche cron pour générer et envoyer les quittances le premier de chaque mois
// ATTENTION : dans un environnement serverless (Vercel), cette tâche ne tournera pas.
// Elle restera active uniquement en mode serveur "classique" (exécution locale ou hébergement Node dédié).
if (!process.env.VERCEL) {
  cron.schedule('0 9 1 * *', async () => {
    try {
      console.log('Génération automatique des quittances...');
      const singleUserId = process.env.CRON_USER_ID ? parseInt(process.env.CRON_USER_ID, 10) : null;
      if (!singleUserId || Number.isNaN(singleUserId)) {
        console.log('Aucun CRON_USER_ID défini, tâche planifiée ignorée.');
        return;
      }

      const config = await getConfig(singleUserId);
      const locataires = await getLocataires(singleUserId);
      const now = new Date();
      const mois = now.toLocaleString('fr-FR', { month: 'long' });
      const annee = now.getFullYear();

      for (const locataire of locataires) {
        if (locataire.email && Number(locataire.loyer || 0) > 0) {
          try {
            const pdfPath = await generateQuittance({ ...locataire, bienId: locataire.bien_id }, config, mois, annee);
            await sendEmail({ ...locataire, bienId: locataire.bien_id }, config, pdfPath, mois, annee);
            await updateLocataireLastSent(singleUserId, locataire.id, new Date().toISOString());
            console.log(`Quittance envoyée à ${locataire.nom} ${locataire.prenom} (user ${singleUserId})`);
          } catch (error) {
            console.error(`Erreur pour ${locataire.nom} (user ${singleUserId}):`, error.message);
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de la génération automatique:', error);
    }
  });
}

// Export de l'app pour utilisation en mode serverless (Vercel)
module.exports = { app, initData };

// Démarrage du serveur uniquement en mode "classique" (non Vercel)
if (!process.env.VERCEL) {
  initData();
  app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
  });
}
