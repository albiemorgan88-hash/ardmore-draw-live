import Stripe from 'stripe';

let client: Stripe | undefined;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe payments are not configured in this environment');
  return client ??= new Stripe(key);
}

// Importing a route during a preview build must not require payment credentials.
// Actual payment operations still fail closed if the environment has no key.
export const stripe = new Proxy({} as Stripe, {
  get(_target, property) {
    const instance = getStripe();
    const value = Reflect.get(instance, property);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});
