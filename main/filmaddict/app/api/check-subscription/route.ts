import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth, currentUser } from "@clerk/nextjs/server";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-12-15.clover",
  });
}

// Email that bypasses subscription check
const BYPASS_EMAIL = "teniowojori@gmail.com";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ hasSubscription: false, error: "Unauthorized" }, { status: 401 });
    }

    // COMMENTED OUT: Stripe paywall - always return true to bypass
    // if (!process.env.STRIPE_SECRET_KEY) {
    //   const stripeVars = Object.keys(process.env).filter(k => k.includes("STRIPE") || k.includes("stripe"));
    //   console.error("❌ STRIPE_SECRET_KEY is missing!");
    //   console.error("📋 Available STRIPE-related env vars:", stripeVars.length > 0 ? stripeVars : "NONE FOUND");
    //   console.error("💡 Make sure .env.local exists in main/filmaddict/ with STRIPE_SECRET_KEY and restart dev server");
    //   return NextResponse.json({ hasSubscription: false, error: "Stripe not configured - check server logs" }, { status: 500 });
    // }

    // const stripe = getStripe();

    // // Check if user email is in bypass list
    // const user = await currentUser();
    // if (user?.emailAddresses?.[0]?.emailAddress === BYPASS_EMAIL) {
    //   return NextResponse.json({ hasSubscription: true, bypassed: true });
    // }

    // // Search for customer with this Clerk user ID
    // const customers = await stripe.customers.search({
    //   query: `metadata['clerk_user_id']:'${userId}'`,
    //   limit: 1,
    // });

    // if (customers.data.length === 0) {
    //   return NextResponse.json({ hasSubscription: false });
    // }

    // const customer = customers.data[0];

    // // Check for active subscriptions
    // const subscriptions = await stripe.subscriptions.list({
    //   customer: customer.id,
    //   status: "active",
    //   limit: 1,
    // });

    // // Also check for trialing subscriptions (during trial period)
    // if (subscriptions.data.length === 0) {
    //   const trialingSubscriptions = await stripe.subscriptions.list({
    //     customer: customer.id,
    //     status: "trialing",
    //     limit: 1,
    //   });

    //   if (trialingSubscriptions.data.length > 0) {
    //     return NextResponse.json({ 
    //       hasSubscription: true, 
    //       status: "trialing",
    //       subscriptionId: trialingSubscriptions.data[0].id,
    //     });
    //   }

    //   return NextResponse.json({ hasSubscription: false });
    // }

    // const subscription = subscriptions.data[0];
    // return NextResponse.json({ 
    //   hasSubscription: true,
    //   status: subscription.status,
    //   subscriptionId: subscription.id,
    // });

    // Always return true to bypass paywall
    return NextResponse.json({ hasSubscription: true, bypassed: true });
  } catch (error) {
    console.error("Error checking subscription:", error);
    // On error, still return true to bypass paywall
    return NextResponse.json({ hasSubscription: true, bypassed: true });
  }
}

