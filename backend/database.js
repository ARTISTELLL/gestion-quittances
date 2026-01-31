const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // On log seulement, on lèvera une erreur au moment de l'utilisation si nécessaire
  console.warn("⚠️ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant. Vérifiez vos variables d'environnement.");
}

// Client Supabase partagé
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

function ensureClient() {
  if (!supabase) {
    throw new Error("Client Supabase non initialisé (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquant).");
  }
  return supabase;
}

// ===================== CONFIG =====================

async function getConfig(userId) {
  const client = ensureClient();
  const { data, error } = await client
    .from('configs')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(`Erreur getConfig: ${error.message}`);

  if (!data) {
    const { error: insertError } = await client
      .from('configs')
      .insert({ user_id: userId });
    if (insertError) throw new Error(`Erreur création config: ${insertError.message}`);
    return getConfig(userId);
  }

  return {
    proprietaire: {
      nom: data.proprietaire_nom || '',
      prenom: data.proprietaire_prenom || '',
      adresse: data.proprietaire_adresse || '',
      signature: data.proprietaire_signature || '',
    },
    email: {
      user: data.email_user || '',
      from: data.email_from || '',
      oauth2: {
        refreshToken: data.email_oauth2_refresh_token || '',
      },
    },
    appName: data.app_name || 'Gestion Quittances',
  };
}

async function updateConfig(userId, config) {
  const client = ensureClient();
  const { error } = await client
    .from('configs')
    .update({
      proprietaire_nom: config.proprietaire?.nom || '',
      proprietaire_prenom: config.proprietaire?.prenom || '',
      proprietaire_adresse: config.proprietaire?.adresse || '',
      proprietaire_signature: config.proprietaire?.signature || '',
      email_user: config.email?.user || '',
      email_from: config.email?.from || '',
      email_oauth2_refresh_token: config.email?.oauth2?.refreshToken || '',
      app_name: config.appName || 'Gestion Quittances',
    })
    .eq('user_id', userId);

  if (error) throw new Error(`Erreur updateConfig: ${error.message}`);
}

// ===================== BIENS =====================

async function getBiens(userId) {
  const client = ensureClient();
  const { data, error } = await client
    .from('biens')
    .select('*')
    .eq('user_id', userId)
    .order('id', { ascending: true });
  if (error) throw new Error(`Erreur getBiens: ${error.message}`);
  return data || [];
}

async function createBien(userId, bien) {
  const client = ensureClient();
  const { data, error } = await client
    .from('biens')
    .insert({
      user_id: userId,
      nom: bien.nom,
      adresse: bien.adresse || '',
    })
    .select('*')
    .single();
  if (error) throw new Error(`Erreur createBien: ${error.message}`);
  return data;
}

async function updateBien(userId, bienId, bien) {
  const client = ensureClient();
  const { error } = await client
    .from('biens')
    .update({
      nom: bien.nom,
      adresse: bien.adresse || '',
    })
    .eq('id', bienId)
    .eq('user_id', userId);
  if (error) throw new Error(`Erreur updateBien: ${error.message}`);
}

async function deleteBien(userId, bienId) {
  const client = ensureClient();
  const { count, error: countError } = await client
    .from('locataires')
    .select('id', { count: 'exact', head: true })
    .eq('bien_id', bienId)
    .eq('user_id', userId);

  if (countError) throw new Error(`Erreur vérification locataires: ${countError.message}`);
  if (typeof count === 'number' && count > 0) {
    throw new Error('Impossible de supprimer ce bien : des locataires y sont associés');
  }

  const { error } = await client
    .from('biens')
    .delete()
    .eq('id', bienId)
    .eq('user_id', userId);
  if (error) throw new Error(`Erreur deleteBien: ${error.message}`);
}

// ===================== LOCATAIRES =====================

async function getLocataires(userId) {
  const client = ensureClient();
  const { data, error } = await client
    .from('locataires')
    .select('*')
    .eq('user_id', userId)
    .order('id', { ascending: true });
  if (error) throw new Error(`Erreur getLocataires: ${error.message}`);
  return data || [];
}

async function createLocataire(userId, locataire) {
  const client = ensureClient();
  const { data, error } = await client
    .from('locataires')
    .insert({
      user_id: userId,
      nom: locataire.nom,
      prenom: locataire.prenom || '',
      email: locataire.email || '',
      loyer: locataire.loyer || 0,
      charges: locataire.charges || 0,
      adresse: locataire.adresse || '',
      bien_id: locataire.bienId || null,
    })
    .select('*')
    .single();
  if (error) throw new Error(`Erreur createLocataire: ${error.message}`);
  return data;
}

async function updateLocataire(userId, locataireId, locataire) {
  const client = ensureClient();
  const { error } = await client
    .from('locataires')
    .update({
      nom: locataire.nom,
      prenom: locataire.prenom || '',
      email: locataire.email || '',
      loyer: locataire.loyer || 0,
      charges: locataire.charges || 0,
      adresse: locataire.adresse || '',
      bien_id: locataire.bienId || null,
    })
    .eq('id', locataireId)
    .eq('user_id', userId);
  if (error) throw new Error(`Erreur updateLocataire: ${error.message}`);
}

async function deleteLocataire(userId, locataireId) {
  const client = ensureClient();
  const { error } = await client
    .from('locataires')
    .delete()
    .eq('id', locataireId)
    .eq('user_id', userId);
  if (error) throw new Error(`Erreur deleteLocataire: ${error.message}`);
}

async function updateLocataireLastSent(userId, locataireId, dateIso) {
  const client = ensureClient();
  const { error } = await client
    .from('locataires')
    .update({ last_quittance_sent_at: dateIso })
    .eq('id', locataireId)
    .eq('user_id', userId);
  if (error) throw new Error(`Erreur updateLocataireLastSent: ${error.message}`);
}

// ===================== USERS =====================

async function createUser(email, passwordHash) {
  const client = ensureClient();
  const { data, error } = await client
    .from('users')
    .insert({ email, password_hash: passwordHash })
    .select('id')
    .single();
  if (error) throw new Error(`Erreur createUser: ${error.message}`);

  const userId = data.id;

  const { error: cfgError } = await client
    .from('configs')
    .insert({ user_id: userId });
  if (cfgError) throw new Error(`Erreur création config par défaut: ${cfgError.message}`);

  const { error: bienError } = await client
    .from('biens')
    .insert({ user_id: userId, nom: 'Bien principal', adresse: '' });
  if (bienError) throw new Error(`Erreur création bien par défaut: ${bienError.message}`);

  return userId;
}

async function updateUserPassword(userId, passwordHash) {
  const client = ensureClient();
  const { error } = await client
    .from('users')
    .update({ password_hash: passwordHash })
    .eq('id', userId);
  if (error) throw new Error(`Erreur updateUserPassword: ${error.message}`);
}

async function getUserByEmail(email) {
  const client = ensureClient();
  let data, error;
  try {
    const result = await client
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    data = result.data;
    error = result.error;
  } catch (err) {
    const cause = err.cause ? ` (${err.cause.message || err.cause})` : '';
    throw new Error(`Erreur getUserByEmail: ${err.message}${cause}. Vérifiez SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY (backend / Vercel).`);
  }
  if (error) throw new Error(`Erreur getUserByEmail: ${error.message}`);
  return data || null;
}

async function getUserById(id) {
  const client = ensureClient();
  const { data, error } = await client
    .from('users')
    .select('id, email, created_at, role')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`Erreur getUserById: ${error.message}`);
  return data || null;
}

async function createPasswordReset(userId, tokenHash, expiresAtIso) {
  const client = ensureClient();
  const { error } = await client
    .from('password_resets')
    .insert({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAtIso
    });
  if (error) throw new Error(`Erreur createPasswordReset: ${error.message}`);
}

async function getPasswordResetByToken(tokenHash) {
  const client = ensureClient();
  const { data, error } = await client
    .from('password_resets')
    .select('*')
    .eq('token_hash', tokenHash)
    .is('used_at', null)
    .maybeSingle();
  if (error) throw new Error(`Erreur getPasswordResetByToken: ${error.message}`);
  return data || null;
}

async function markPasswordResetUsed(resetId) {
  const client = ensureClient();
  const { error } = await client
    .from('password_resets')
    .update({ used_at: new Date().toISOString() })
    .eq('id', resetId);
  if (error) throw new Error(`Erreur markPasswordResetUsed: ${error.message}`);
}

module.exports = {
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
  getUserById,
  updateUserPassword,
  createPasswordReset,
  getPasswordResetByToken,
  markPasswordResetUsed,
};

