let stripeClient = null;

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY manquant dans les variables d’environnement Stripe.');
  }
  if (!stripeClient) {
    // Initialisation lazy pour éviter de planter au chargement si la clé manque
    // eslint-disable-next-line global-require
    const stripe = require('stripe');
    stripeClient = stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

async function createCheckoutSession({ priceId, successUrl, cancelUrl, customerEmail }) {
  if (!priceId) {
    throw new Error('Identifiant de prix Stripe manquant (priceId).');
  }

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    customer_email: customerEmail || undefined,
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true
  });

  return session;
}

module.exports = {
  createCheckoutSession
};

