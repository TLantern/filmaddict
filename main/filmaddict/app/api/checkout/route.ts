import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@clerk/nextjs/server";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-12-15.clover",
  });
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Stripe secret key not configured" }, { status: 500 });
    }

    const stripe = getStripe();

    const { plan } = await request.json();
    
    if (plan !== "monthly" && plan !== "yearly") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : "http://localhost:3000";

    // Use existing products with their existing prices
    const monthlyProductId = "prod_Th91VZrp7AqGqV";
    const yearlyProductId = "prod_Th9l611E4BEzeK";
    const monthlyPriceId = "price_1SjkjHPTrLFdO6j8KmXNatmi"; // $10/month
    const yearlyPriceId = "price_1SjlRePTrLFdO6j8jhuvh6mv"; // $100/year
    
    const productId = plan === "monthly" ? monthlyProductId : yearlyProductId;
    const subscriptionPriceId = plan === "monthly" ? monthlyPriceId : yearlyPriceId;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: subscriptionPriceId,
          quantity: 1,
        },
      ],
      payment_method_collection: "always",
      subscription_data: {
        trial_period_days: 3, // 3 days trial - Stripe will show this
        metadata: {
          clerk_user_id: userId,
          trial_days: "3",
          plan_type: plan,
        },
      },
      success_url: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/upgrade`,
      metadata: {
        clerk_user_id: userId,
        plan_type: plan,
        trial_fee: "100", // $1.00 in cents - charged via webhook
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

