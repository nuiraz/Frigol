// Webhook Stripe → active le Premium automatiquement après chaque paiement.
// Secrets (Supabase → Edge Functions → Secrets) : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
// À déployer SANS vérification JWT (« Verify JWT » désactivé) : c'est Stripe qui appelle, pas l'app.
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '');
const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

async function activate(email: string | null | undefined, until: Date) {
  if (!email) return;
  const { error } = await admin.rpc('premium_from_stripe', { p_email: email, p_until: until.toISOString() });
  if (error) console.error('Activation impossible pour', email, error.message);
}

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature ?? '', Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '');
  } catch (e) {
    return new Response(`Signature invalide : ${(e as Error).message}`, { status: 400 });
  }

  // Un jour de marge après la fin de la période payée, le temps du prochain prélèvement.
  const margin = (seconds: number) => new Date(seconds * 1000 + 864e5);

  if (event.type === 'invoice.paid') {
    const invoice = event.data.object as Stripe.Invoice;
    const end = invoice.lines.data[0]?.period?.end ?? Math.floor(Date.now() / 1000) + 31 * 86400;
    await activate(invoice.customer_email, margin(end));
  } else if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    await activate(session.customer_details?.email ?? session.customer_email, margin(Math.floor(Date.now() / 1000) + 31 * 86400));
  }
  return new Response(JSON.stringify({ received: true }), { headers: { 'content-type': 'application/json' } });
});
