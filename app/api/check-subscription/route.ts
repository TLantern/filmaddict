import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth, currentUser } from "@clerk/nextjs/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

// Email that bypasses subscription check
const BYPASS_EMAIL = "teniowojori@gmail.com";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ hasSubscription: false, error: "Unauthorized" }, { status: 401 });
    }

    // Check if user email is in bypass list
    const user = await currentUser();
    if (user?.emailAddresses?.[0]?.emailAddress === BYPASS_EMAIL) {
      return NextResponse.json({ hasSubscription: true, bypassed: true });
    }

    // Search for customer with this Clerk user ID
    const customers = await stripe.customers.search({
      query: `metadata['clerk_user_id']:'${userId}'`,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return NextResponse.json({ hasSubscription: false });
    }

    const customer = customers.data[0];

    // Check for active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 1,
    });

    // Also check for trialing subscriptions (during trial period)
    if (subscriptions.data.length === 0) {
      const trialingSubscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: "trialing",
        limit: 1,
      });

      if (trialingSubscriptions.data.length > 0) {
        return NextResponse.json({ 
          hasSubscription: true, 
          status: "trialing",
          subscriptionId: trialingSubscriptions.data[0].id,
        });
      }

      return NextResponse.json({ hasSubscription: false });
    }

    const subscription = subscriptions.data[0];
    return NextResponse.json({ 
      hasSubscription: true,
      status: subscription.status,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    console.error("Error checking subscription:", error);
    return NextResponse.json(
      { hasSubscription: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

