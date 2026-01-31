import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api');

function App() {
  // ==== AUTH ====
  const [authMode, setAuthMode] = useState('login'); // 'login' ou 'signup'
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authNotice, setAuthNotice] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('authToken') || '';
    } catch {
      return '';
    }
  });
  const [authUserEmail, setAuthUserEmail] = useState(() => {
    try {
      return localStorage.getItem('authUserEmail') || '';
    } catch {
      return '';
    }
  });
  const [locataires, setLocataires] = useState([]);
  const [biens, setBiens] = useState([]);
  const [config, setConfig] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingLocataire, setEditingLocataire] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    loyer: '',
    charges: '',
    adresse: '',
    bienId: ''
  });
  const [configData, setConfigData] = useState({
    proprietaire: { nom: '', prenom: '', adresse: '', signature: '' },
    email: { user: '', from: '', oauth2: { clientId: '', clientSecret: '', refreshToken: '' } },
    appName: 'Gestion Quittances'
  });
  const [emailTestResult, setEmailTestResult] = useState(null);
  const [testingEmail, setTestingEmail] = useState(false);
  const [oauthConnecting, setOauthConnecting] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpForm, setHelpForm] = useState({ nom: '', email: '', message: '' });
  const [helpSending, setHelpSending] = useState(false);
  const [sendingQuittanceId, setSendingQuittanceId] = useState(null);
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');

  const currentYear = new Date().getFullYear();

  // Toujours travailler avec un tableau pour l'affichage
  const locatairesList = Array.isArray(locataires) ? locataires : [];

  // Mettre à jour le header Authorization global d'axios dès qu'on a un token
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('reset');
    if (tokenParam) {
      setResetToken(tokenParam);
      setAuthMode('reset');
    }
  }, []);

  // Chargement initial des données au montage
  useEffect(() => {
    const init = async () => {
      try {
        if (!token) return;
        await loadLocataires();
        await loadBiens();
        await loadConfig();
      } catch (error) {
        console.error('Erreur lors du chargement initial des données:', error);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadLocataires = async () => {
    try {
      if (!token) return;
      const response = await axios.get(`${API_URL}/locataires`);
      setLocataires(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des locataires:', error);
    }
  };

  const loadBiens = async () => {
    try {
      if (!token) return;
      const response = await axios.get(`${API_URL}/biens`);
      setBiens(response.data);
      // Si aucun bien sélectionné, prendre le premier par défaut pour le formulaire
      if (response.data.length > 0 && !formData.bienId) {
        setFormData((prev) => ({ ...prev, bienId: response.data[0].id }));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des biens:', error);
    }
  };

  const loadConfig = async () => {
    try {
      if (!token) return;
      const response = await axios.get(`${API_URL}/config`);
      const serverConfig = response.data || {};
      setConfigData((prev) => ({
        ...prev,
        ...serverConfig,
        proprietaire: {
          ...prev.proprietaire,
          ...(serverConfig.proprietaire || {})
        },
        email: {
          ...prev.email,
          ...(serverConfig.email || {}),
          oauth2: {
            ...prev.email.oauth2,
            ...(serverConfig.email?.oauth2 || {})
          }
        }
      }));
      setConfig(serverConfig);
    } catch (error) {
      console.error('Erreur lors du chargement de la config:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!token) {
        alert('Vous devez être connecté pour gérer les locataires.');
        return;
      }
      const data = {
        ...formData,
        loyer: parseFloat(formData.loyer) || 0,
        charges: parseFloat(formData.charges) || 0
      };

      if (editingLocataire) {
        await axios.put(`${API_URL}/locataires/${editingLocataire.id}`, data);
      } else {
        await axios.post(`${API_URL}/locataires`, data);
      }

      setShowModal(false);
      setEditingLocataire(null);
      setFormData({
        nom: '',
        prenom: '',
        email: '',
        loyer: '',
        charges: '',
        adresse: '',
        bienId: biens[0]?.id || ''
      });
      loadLocataires();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (locataire) => {
    setEditingLocataire(locataire);
    setFormData({
      nom: locataire.nom,
      prenom: locataire.prenom,
      email: locataire.email,
      loyer: locataire.loyer,
      charges: locataire.charges,
      adresse: locataire.adresse,
      bienId: locataire.bienId || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce locataire ?')) {
      try {
        if (!token) {
          alert('Vous devez être connecté pour gérer les locataires.');
          return;
        }
        await axios.delete(`${API_URL}/locataires/${id}`);
        loadLocataires();
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la suppression');
      }
    }
  };

  const handleSendQuittance = async (locataireId) => {
    if (!window.confirm('Envoyer la quittance par email maintenant ?')) {
      return;
    }

    try {
      if (!token) {
        alert('Vous devez être connecté pour envoyer des quittances.');
        return;
      }
      setSendingQuittanceId(locataireId);
      const now = new Date();
      const mois = now.toLocaleString('fr-FR', { month: 'long' });
      const annee = now.getFullYear();

      const response = await axios.post(`${API_URL}/send-quittance`, {
        locataireId,
        mois,
        annee
      });

      const sentAt = response.data?.lastQuittanceSentAt || new Date().toISOString();
      setLocataires((prev) =>
        prev.map((l) =>
          l.id === locataireId ? { ...l, lastQuittanceSentAt: sentAt } : l
        )
      );

    } catch (error) {
      console.error('Erreur:', error);
      const errorMessage = error.response?.data?.error || error.message;
      
      if (errorMessage.includes('ERREUR_AUTH_GMAIL') || errorMessage.includes('BadCredentials') || errorMessage.includes('Invalid login')) {
        alert('❌ ERREUR D\'AUTHENTIFICATION GMAIL\n\n' +
              'Vous devez utiliser un "Mot de passe d\'application" Gmail, pas votre mot de passe Gmail normal.\n\n' +
              'Étapes pour créer un mot de passe d\'application :\n' +
              '1. Allez sur https://myaccount.google.com/apppasswords\n' +
              '2. Activez la validation en 2 étapes si nécessaire\n' +
              '3. Créez un mot de passe d\'application (16 caractères)\n' +
              '4. Utilisez ce mot de passe dans la configuration\n\n' +
              'Allez dans Configuration (⚙️) pour corriger cela.');
      } else {
        alert('Erreur lors de l\'envoi: ' + errorMessage);
      }
    } finally {
      setSendingQuittanceId(null);
    }
  };

  const handleConfigSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!token) {
        alert('Vous devez être connecté pour modifier la configuration.');
        return;
      }
      await axios.put(`${API_URL}/config`, configData);
      setShowConfigModal(false);
      loadConfig();
      setEmailTestResult(null);
      alert('Configuration sauvegardée !');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    setEmailTestResult(null);
    try {
      if (!token) {
        alert('Vous devez être connecté pour tester la connexion email.');
        return;
      }
      // Sauvegarder temporairement la config pour le test
      await axios.put(`${API_URL}/config`, configData);
      const response = await axios.post(`${API_URL}/test-email`);
      setEmailTestResult(response.data);
    } catch (error) {
      setEmailTestResult({
        success: false,
        message: error.response?.data?.message || error.message || 'Erreur lors du test'
      });
    } finally {
      setTestingEmail(false);
    }
  };

  const handleOAuthConnect = async () => {
    if (!token) {
      alert('Vous devez être connecté pour lier votre compte Gmail.');
      return;
    }
    if (!configData.email?.user?.trim()) {
      alert('Veuillez d\'abord entrer votre adresse Gmail (champ « Email Gmail ») ci-dessus.');
      return;
    }

    setOauthConnecting(true);
    try {
      await axios.put(`${API_URL}/config`, configData);
      const response = await axios.post(`${API_URL}/oauth/get-auth-url`, {});

      const authUrl = response.data?.authUrl;
      if (!authUrl) {
        setOauthConnecting(false);
        alert('Le serveur n\'a pas renvoyé l\'URL d\'autorisation. Vérifiez que le backend est bien déployé et accessible.');
        return;
      }

      const authWindow = window.open(authUrl, 'Gmail OAuth', 'width=600,height=700');
      if (!authWindow) {
        setOauthConnecting(false);
        const openSame = window.confirm(
          'La fenêtre popup a été bloquée. Souhaitez-vous ouvrir la connexion Gmail dans cet onglet ?'
        );
        if (openSame) window.location.href = authUrl;
        return;
      }

      const checkClosed = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(checkClosed);
          setOauthConnecting(false);
          loadConfig();
          alert('Autorisation terminée ! Testez la connexion pour vérifier.');
        }
      }, 1000);
    } catch (error) {
      setOauthConnecting(false);
      const msg = error.response?.data?.error || error.message || 'Erreur inconnue';
      const hint = error.response?.status === 404
        ? '\n\nVérifiez que REACT_APP_API_URL pointe vers l\'URL de votre backend (ex. https://gestion-quittances-6psv.vercel.app/api) dans les variables d\'environnement du projet frontend Vercel.'
        : '';
      alert('Erreur lors de la connexion Gmail : ' + msg + hint);
    }
  };

  const handleHelpSubmit = async (e) => {
    e.preventDefault();
    if (!helpForm.message || helpForm.message.trim().length < 5) {
      alert('Merci de décrire un peu plus votre problème.');
      return;
    }

    try {
      setHelpSending(true);
      if (!token) {
        alert('Vous devez être connecté pour envoyer une demande d’aide.');
        setHelpSending(false);
        return;
      }
      await axios.post(`${API_URL}/support-message`, helpForm);
      setHelpSending(false);
      setShowHelpModal(false);
      setHelpForm({ nom: '', email: '', message: '' });
      alert('Votre demande d\'aide a bien été envoyée. Vous recevrez une réponse par email.');
    } catch (error) {
      setHelpSending(false);
      alert('Erreur lors de l\'envoi du message d\'aide : ' + (error.response?.data?.error || error.message));
    }
  };

  const handleSendQuittancesRange = async (locataire) => {
    const from = window.prompt(
      `Date de début (format AAAA-MM-JJ) pour ${locataire.prenom} ${locataire.nom} :`
    );
    if (!from) return;
    const to = window.prompt(
      `Date de fin (format AAAA-MM-JJ) pour ${locataire.prenom} ${locataire.nom} :`
    );
    if (!to) return;

    if (new Date(from) > new Date(to)) {
      alert('La date de début doit être avant la date de fin.');
      return;
    }

    try {
      if (!token) {
        alert('Vous devez être connecté pour envoyer plusieurs quittances.');
        return;
      }
      const response = await axios.post(`${API_URL}/send-quittances-range`, {
        locataireId: locataire.id,
        from,
        to
      });
      const count = response.data?.sentCount ?? 0;
      if (count > 0) {
        await loadLocataires();
        alert(`✅ ${count} quittance(s) ont été envoyées à ${locataire.prenom} ${locataire.nom}.`);
      } else {
        alert('Aucune quittance n\'a été envoyée sur cette période (vérifiez les dates).');
      }
    } catch (error) {
      console.error('Erreur envoi multiple:', error);
      alert('Erreur lors de l\'envoi des quittances : ' + (error.response?.data?.error || error.message));
    }
  };

  const handleExportCompta = async () => {
    try {
      if (!token) {
        alert('Vous devez être connecté pour exporter la comptabilité.');
        return;
      }
      const params = new URLSearchParams();
      if (exportFrom) params.append('from', exportFrom);
      if (exportTo) params.append('to', exportTo);

      const url = `${API_URL}/exports/compta?${params.toString()}`;
      const response = await axios.get(url, { responseType: 'blob' });

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const today = new Date().toISOString().slice(0, 10);
      link.download = `export_compta_${today}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Erreur export comptable:', error);
      alert('Erreur lors de l\'export comptable : ' + (error.response?.data?.error || error.message));
    }
  };

  const handleSubscribe = async () => {
    try {
      if (!token) {
        alert('Vous devez être connecté pour gérer votre abonnement.');
        return;
      }
      const response = await axios.post(`${API_URL}/billing/create-checkout-session`, {
        priceId: process.env.REACT_APP_STRIPE_PRICE_ID || undefined,
        customerEmail: config?.email?.user || undefined,
        successUrl: window.location.origin + '?abonnement=success',
        cancelUrl: window.location.origin + '?abonnement=cancel'
      });
      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        alert('Impossible d’ouvrir la page de paiement Stripe.');
      }
    } catch (error) {
      console.error('Erreur Stripe:', error);
      alert('Erreur lors de la création de la session de paiement : ' + (error.response?.data?.error || error.message));
    }
  };

  // === Gestion inscription / connexion ===
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthNotice('');
    setAuthLoading(true);
    try {
      const endpoint = authMode === 'signup' ? '/auth/signup' : '/auth/login';
      const response = await axios.post(`${API_URL}${endpoint}`, {
        email: authForm.email,
        password: authForm.password
      });

      const receivedToken = response.data?.token;
      if (!receivedToken) {
        throw new Error('Token non reçu depuis le serveur.');
      }
      setToken(receivedToken);
      const email = response.data?.email || '';
      setAuthUserEmail(email);
      try {
        localStorage.setItem('authToken', receivedToken);
        if (email) localStorage.setItem('authUserEmail', email);
      } catch {
        // ignore
      }
      setAuthForm({ email: '', password: '' });
      setShowHeaderMenu(false);
      await loadLocataires();
      await loadBiens();
      await loadConfig();
    } catch (error) {
      console.error('Erreur auth:', error);
      const msg = error.response?.data?.error || error.message || 'Erreur de connexion';
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthNotice('');
    setAuthLoading(true);
    try {
      if (!authForm.email) {
        setAuthError('Email requis');
        return;
      }
      await axios.post(`${API_URL}/auth/forgot-password`, { email: authForm.email });
      setAuthNotice('Si un compte existe, un email de réinitialisation a été envoyé.');
      setAuthMode('login');
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'Erreur';
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthNotice('');
    if (!resetToken) {
      setAuthError('Lien invalide ou expiré');
      return;
    }
    if (!resetPassword || resetPassword.length < 6) {
      setAuthError('Mot de passe (min 6 caractères) requis');
      return;
    }
    if (resetPassword !== resetPasswordConfirm) {
      setAuthError('Les mots de passe ne correspondent pas');
      return;
    }
    setAuthLoading(true);
    try {
      await axios.post(`${API_URL}/auth/reset-password`, { token: resetToken, password: resetPassword });
      setAuthNotice('Mot de passe mis à jour. Vous pouvez vous connecter.');
      setAuthMode('login');
      setResetPassword('');
      setResetPasswordConfirm('');
      setResetToken('');
      const nextUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, '', nextUrl);
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'Erreur';
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    setAuthUserEmail('');
    setShowHeaderMenu(false);
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUserEmail');
    } catch {
      // ignore
    }
    setLocataires([]);
    setBiens([]);
    setConfig(null);
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="brand-block">
          <span className="brand-title">Quittance de Loyer</span>
          <span className="brand-subtitle">Une application DaniCorp°</span>
        </div>
        <div className="header-actions">
          {token && (
            <>
              <div className="header-actions-top">
                {authUserEmail && (
                  <span className="auth-user-email">Connecté : {authUserEmail}</span>
                )}
                <button
                  type="button"
                  className="btn-menu"
                  onClick={() => setShowHeaderMenu((prev) => !prev)}
                >
                  Menu
                </button>
              </div>
              <div className={`header-menu ${showHeaderMenu ? 'is-open' : ''}`}>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setShowHeaderMenu(false);
                    handleSubscribe();
                  }}
                >
                  S’abonner (Stripe)
                </button>
                <button
                  className="btn-help"
                  onClick={() => {
                    setShowHeaderMenu(false);
                    setShowHelpModal(true);
                  }}
                >
                  Aide / Support
                </button>
                <button
                  className="btn-config"
                  onClick={() => {
                    setShowHeaderMenu(false);
                    setShowConfigModal(true);
                  }}
                >
                  ⚙️ Configuration
                </button>
                <button
                  className="btn-help"
                  onClick={() => {
                    setShowHeaderMenu(false);
                    handleLogout();
                  }}
                >
                  Se déconnecter
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <main className="main-content">
        {!token && (
          <section id="connexion" className="auth-section auth-page" aria-label="Connexion ou inscription">
            <h1 className="auth-page-title">Connexion / Inscription</h1>
            <div className="auth-card">
              <div className="auth-tabs">
                <button
                  type="button"
                  className={authMode === 'login' ? 'auth-tab active' : 'auth-tab'}
                  onClick={() => { setAuthMode('login'); setAuthError(''); setAuthNotice(''); }}
                >
                  Connexion
                </button>
                <button
                  type="button"
                  className={authMode === 'signup' ? 'auth-tab active' : 'auth-tab'}
                  onClick={() => { setAuthMode('signup'); setAuthError(''); setAuthNotice(''); }}
                >
                  Inscription
                </button>
              </div>
              {authMode === 'forgot' ? (
                <form onSubmit={handleForgotPassword} className="auth-form">
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      required
                      value={authForm.email}
                      onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                    />
                  </div>
                  {authError && <div className="auth-error">{authError}</div>}
                  {authNotice && <div className="auth-success">{authNotice}</div>}
                  <button type="submit" className="btn-primary" disabled={authLoading}>
                    {authLoading ? 'Veuillez patienter...' : 'Envoyer le lien'}
                  </button>
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => { setAuthMode('login'); setAuthError(''); setAuthNotice(''); }}
                  >
                    Retour à la connexion
                  </button>
                </form>
              ) : authMode === 'reset' ? (
                <form onSubmit={handleResetPassword} className="auth-form">
                  <div className="form-group">
                    <label>Nouveau mot de passe</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Confirmer le mot de passe</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={resetPasswordConfirm}
                      onChange={(e) => setResetPasswordConfirm(e.target.value)}
                    />
                  </div>
                  {authError && <div className="auth-error">{authError}</div>}
                  {authNotice && <div className="auth-success">{authNotice}</div>}
                  <button type="submit" className="btn-primary" disabled={authLoading}>
                    {authLoading ? 'Veuillez patienter...' : 'Mettre à jour'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleAuthSubmit} className="auth-form">
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      required
                      value={authForm.email}
                      onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Mot de passe</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={authForm.password}
                      onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    />
                  </div>
                  {authError && <div className="auth-error">{authError}</div>}
                  {authNotice && <div className="auth-success">{authNotice}</div>}
                  <button type="submit" className="btn-primary" disabled={authLoading}>
                    {authLoading
                      ? 'Veuillez patienter...'
                      : authMode === 'signup'
                        ? 'Créer mon compte'
                        : 'Se connecter'}
                  </button>
                  {authMode === 'login' && (
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() => { setAuthMode('forgot'); setAuthError(''); setAuthNotice(''); }}
                    >
                      Mot de passe oublié ?
                    </button>
                  )}
                </form>
              )}
              <p className="auth-hint">
                Une fois connecté, vous pourrez ajouter vos locataires, connecter Gmail et envoyer les quittances.
              </p>
            </div>
          </section>
        )}

        <section className="hero">
          <div className="hero-content">
            <div className="hero-text">
              <p className="hero-eyebrow">DaniCorp° • Gestion locative</p>
              <h1 className="hero-title">Quittance de loyer automatique</h1>
              <p className="hero-subtitle">
                Génération, signature et envoi automatique de vos quittances de loyer, chaque début de mois, avec vos
                mentions légales intégrées.
              </p>
            </div>
            <div className="hero-logo">
              <img src="/quittance-logo.png" alt="Logo Quittance de Loyer" />
            </div>
          </div>
        </section>

        {token && (
        <div className="locataires-header">
          <div className="locataires-header-left">
            <h2>Locataires</h2>
          </div>
          <button className="btn-add" onClick={() => {
            setEditingLocataire(null);
            setFormData({
              nom: '',
              prenom: '',
              email: '',
              loyer: '',
              charges: '',
              adresse: '',
              bienId: biens[0]?.id || ''
            });
            setShowModal(true);
          }}>
            + Ajouter un locataire
          </button>
        </div>
        )}

        {token && (
        <div className="locataires-grid">
          {locatairesList.map((locataire) => {
            const bien = biens.find((b) => b.id === locataire.bienId);
            return (
            <div key={locataire.id} className="locataire-card">
              <div className="locataire-header">
                <h3>{locataire.nom} {locataire.prenom}</h3>
                <div className="locataire-actions">
                  <button onClick={() => handleEdit(locataire)} className="btn-icon">✏️</button>
                  <button onClick={() => handleDelete(locataire.id)} className="btn-icon">🗑️</button>
                </div>
              </div>
              <div className="locataire-info">
                <p><strong>Bien:</strong> {bien ? bien.nom : 'Non défini'}</p>
                <p><strong>Email:</strong> {locataire.email || 'Non renseigné'}</p>
                <p><strong>Adresse:</strong> {locataire.adresse || 'Non renseignée'}</p>
                <p><strong>Loyer:</strong> {locataire.loyer.toFixed(2)} €</p>
                <p><strong>Charges:</strong> {locataire.charges.toFixed(2)} €</p>
                <p><strong>Total:</strong> {(locataire.loyer + locataire.charges).toFixed(2)} €</p>
                <p>
                  <strong>Dernière quittance :</strong>{' '}
                  {locataire.lastQuittanceSentAt
                    ? new Date(locataire.lastQuittanceSentAt).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Jamais envoyée'}
                </p>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => handleSendQuittancesRange(locataire)}
                >
                  Envoyer plusieurs mois…
                </button>
              </div>
              <button
                className={`btn-send ${sendingQuittanceId === locataire.id ? 'btn-send-loading' : ''}`}
                onClick={() => handleSendQuittance(locataire.id)}
                disabled={!locataire.email || locataire.loyer === 0 || sendingQuittanceId === locataire.id}
              >
                {sendingQuittanceId === locataire.id ? 'Envoi en cours…' : 'Envoyer quittance'}
              </button>
            </div>
          );
        })}
        </div>
        )}

        {token && (
        <div className="export-bar">
          <div className="export-filters">
            <label>
              Du :
              <input
                type="date"
                value={exportFrom}
                onChange={(e) => setExportFrom(e.target.value)}
              />
            </label>
            <label>
              au :
              <input
                type="date"
                value={exportTo}
                onChange={(e) => setExportTo(e.target.value)}
              />
            </label>
            <button type="button" className="btn-export" onClick={handleExportCompta}>
              Exporter CSV
            </button>
          </div>
        </div>
        )}
      </main>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingLocataire ? 'Modifier' : 'Ajouter'} un locataire</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nom *</label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Prénom</label>
                <input
                  type="text"
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Adresse</label>
                <input
                  type="text"
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Loyer (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.loyer}
                  onChange={(e) => setFormData({ ...formData, loyer: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Charges (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.charges}
                  onChange={(e) => setFormData({ ...formData, charges: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Bien *</label>
                <select
                  required
                  value={formData.bienId}
                  onChange={(e) => setFormData({ ...formData, bienId: e.target.value })}
                >
                  {biens.length === 0 && <option value="">Aucun bien défini</option>}
                  {biens.map((bien) => (
                    <option key={bien.id} value={bien.id}>
                      {bien.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit">Sauvegarder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showConfigModal && (
        <div className="modal-overlay" onClick={() => setShowConfigModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <h2>Configuration</h2>
            <form onSubmit={handleConfigSubmit}>
              <h3>Propriétaire</h3>
              <div className="form-group">
                <label>Nom</label>
                <input
                  type="text"
                  value={configData.proprietaire?.nom || ''}
                  onChange={(e) => setConfigData((prev) => ({
                    ...prev,
                    proprietaire: { ...(prev.proprietaire || {}), nom: e.target.value }
                  }))}
                />
              </div>
              <div className="form-group">
                <label>Prénom</label>
                <input
                  type="text"
                  value={configData.proprietaire?.prenom || ''}
                  onChange={(e) => setConfigData((prev) => ({
                    ...prev,
                    proprietaire: { ...(prev.proprietaire || {}), prenom: e.target.value }
                  }))}
                />
              </div>
              <div className="form-group">
                <label>Adresse</label>
                <input
                  type="text"
                  value={configData.proprietaire?.adresse || ''}
                  onChange={(e) => setConfigData((prev) => ({
                    ...prev,
                    proprietaire: { ...(prev.proprietaire || {}), adresse: e.target.value }
                  }))}
                />
              </div>
              <div className="form-group">
                <label>Signature (pour tous les documents)</label>
                <small style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Uploadez une image de votre signature (PNG ou JPG). Elle apparaîtra sur toutes les quittances.
                </small>
                {configData.proprietaire?.signature ? (
                  <div>
                    <img
                      src={configData.proprietaire.signature}
                      alt="Signature"
                      style={{ maxWidth: 200, maxHeight: 80, border: '1px solid #ddd', borderRadius: 4, marginBottom: '0.5rem' }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <label style={{ cursor: 'pointer', padding: '0.5rem 1rem', backgroundColor: '#007bff', color: 'white', borderRadius: 4 }}>
                        Changer
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              const r = new FileReader();
                              r.onload = () => setConfigData({
                                ...configData,
                                proprietaire: { ...configData.proprietaire, signature: r.result }
                              });
                              r.readAsDataURL(f);
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setConfigData({
                          ...configData,
                          proprietaire: { ...configData.proprietaire, signature: '' }
                        })}
                        style={{ padding: '0.5rem 1rem', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ) : (
                  <label style={{ cursor: 'pointer', display: 'inline-block', padding: '0.75rem 1.5rem', backgroundColor: '#f0f0f0', border: '1px dashed #999', borderRadius: 4 }}>
                    📄 Choisir une image (PNG / JPG)
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const r = new FileReader();
                          r.onload = () => setConfigData({
                            ...configData,
                            proprietaire: { ...configData.proprietaire, signature: r.result }
                          });
                          r.readAsDataURL(f);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              <h3>Email Gmail</h3>
              <div className="form-group">
                <label>Email Gmail *</label>
                <input
                  type="email"
                  value={configData.email.user || ''}
                  onChange={(e) => setConfigData({
                    ...configData,
                    email: { ...configData.email, user: e.target.value }
                  })}
                  placeholder="votre.email@gmail.com"
                />
              </div>

              <div style={{ 
                border: '2px solid #007bff', 
                borderRadius: '8px', 
                padding: '1rem', 
                marginBottom: '1.5rem',
                backgroundColor: '#f0f8ff'
              }}>
                <h4 style={{ marginTop: 0, color: '#007bff' }}>🔐 Connexion Gmail</h4>
                <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                  Entrez votre adresse Gmail ci-dessus, puis cliquez sur le bouton : une fenêtre Google s’ouvrira pour vous connecter et autoriser l’envoi des quittances. Aucune clé à récupérer.
                </p>

                {configData.email.oauth2?.refreshToken && (
                  <div style={{
                    padding: '0.5rem',
                    backgroundColor: '#d4edda',
                    borderRadius: '4px',
                    marginBottom: '0.5rem',
                    fontSize: '0.9rem',
                    color: '#155724'
                  }}>
                    ✅ Gmail connecté
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleOAuthConnect}
                  disabled={oauthConnecting || !(configData.email?.user || '').trim()}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: oauthConnecting ? '#6c757d' : '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: oauthConnecting ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}
                >
                  {oauthConnecting ? '⏳ Connexion en cours...' : '🔗 Se connecter à Gmail'}
                </button>
              </div>

              <div className="form-group">
                <label>Nom de l'expéditeur</label>
                <input
                  type="text"
                  value={configData.email.from || ''}
                  onChange={(e) => setConfigData({
                    ...configData,
                    email: { ...configData.email, from: e.target.value }
                  })}
                  placeholder="Votre nom <email@gmail.com>"
                />
              </div>

              <button 
                type="button" 
                onClick={handleTestEmail}
                disabled={testingEmail || !configData.email.user}
                style={{
                  width: '100%',
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: testingEmail ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  opacity: (testingEmail || !configData.email.user) ? 0.6 : 1
                }}
              >
                {testingEmail ? '⏳ Test en cours...' : '🔍 Tester la connexion Gmail'}
              </button>
              {emailTestResult && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  backgroundColor: emailTestResult.success ? '#d4edda' : '#f8d7da',
                  color: emailTestResult.success ? '#155724' : '#721c24',
                  border: `1px solid ${emailTestResult.success ? '#c3e6cb' : '#f5c6cb'}`,
                  whiteSpace: 'pre-line',
                  fontSize: '0.9rem'
                }}>
                  {emailTestResult.success ? '✅ ' : '❌ '}
                  {emailTestResult.message}
                </div>
              )}

              <h3>Application</h3>
              <div className="form-group">
                <label>Nom de l'application</label>
                <input
                  type="text"
                  value={configData.appName}
                  onChange={(e) => setConfigData({ ...configData, appName: e.target.value })}
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowConfigModal(false)}>Annuler</button>
                <button type="submit">Sauvegarder</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {showHelpModal && (
        <div className="modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Besoin d'aide ?</h2>
            <p style={{ marginBottom: '1rem', fontSize: '0.95rem', color: '#555' }}>
              Décrivez votre problème, et vous serez recontacté sur votre adresse email.
            </p>
            <form onSubmit={handleHelpSubmit}>
              <div className="form-group">
                <label>Nom</label>
                <input
                  type="text"
                  value={helpForm.nom}
                  onChange={(e) => setHelpForm({ ...helpForm, nom: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Email de contact *</label>
                <input
                  type="email"
                  required
                  value={helpForm.email}
                  onChange={(e) => setHelpForm({ ...helpForm, email: e.target.value })}
                  placeholder="votre.email@exemple.com"
                />
              </div>
              <div className="form-group">
                <label>Message *</label>
                <textarea
                  required
                  rows={5}
                  value={helpForm.message}
                  onChange={(e) => setHelpForm({ ...helpForm, message: e.target.value })}
                  placeholder="Expliquez ce qui ne fonctionne pas, à quel moment, avec quel locataire, etc."
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowHelpModal(false)}>Annuler</button>
                <button type="submit" disabled={helpSending}>
                  {helpSending ? 'Envoi en cours...' : 'Envoyer le message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <footer className="site-footer">
        <div className="footer-left">
          <span className="footer-app-name">{configData.appName || 'Quittance de Loyer'}</span>
          <span className="footer-separator">•</span>
          <span>© {currentYear} DaniCorp° – Application créée par Daniel JOUIN</span>
        </div>
        <div className="footer-right">
          <a href="#mentions-legales">Mentions légales</a>
          <span>·</span>
          <a href="#confidentialite">Politique de confidentialité</a>
          <span>·</span>
          <a href="#cgu">Conditions d’utilisation</a>
        </div>
      </footer>
    </div>
  );
}

export default App;
