import Stripe from "stripe";

// Ленивая инициализация Stripe. В dev без ключа billing работает в
// "manual" режиме (без реальных платежей), а API всё равно поднимается.

let client: Stripe | null = null;

export function isStripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!client) {
    // apiVersion не пинуем — используем дефолт аккаунта/SDK.
    client = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return client;
}
