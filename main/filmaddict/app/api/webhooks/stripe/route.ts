import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    
    if (session.mode === "subscription" && session.subscription && session.customer) {
      // Charge $1 trial fee immediately
      if (session.metadata?.trial_fee === "100") {
        try {
          await stripe.invoiceItems.create({
            customer: session.customer as string,
            amount: 100, // $1.00 in cents
            currency: "usd",
            description: "3-day trial fee",
          });
          
          // Create and finalize invoice to charge immediately
          const invoice = await stripe.invoices.create({
            customer: session.customer as string,
            collection_method: "charge_automatically",
            auto_advance: true,
          });
          
          await stripe.invoices.finalizeInvoice(invoice.id, {
            auto_advance: true,
          });
        } catch (error) {
          console.error("Error charging trial fee:", error);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}

