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

    const { customerId, paymentMethodId, plan } = await request.json();
    
    if (plan !== "monthly" && plan !== "yearly") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const monthlyPriceId = "price_1SjkjHPTrLFdO6j8KmXNatmi"; // $10/month
    const yearlyPriceId = "price_1SjlRePTrLFdO6j8jhuvh6mv"; // $100/year
    const subscriptionPriceId = plan === "monthly" ? monthlyPriceId : yearlyPriceId;

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Set as default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Create subscription with 3-day trial
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: subscriptionPriceId,
        },
      ],
      trial_period_days: 3,
      metadata: {
        clerk_user_id: userId,
        trial_days: "3",
        plan_type: plan,
      },
    });

    return NextResponse.json({ 
      subscriptionId: subscription.id,
      status: subscription.status,
    });
  } catch (error) {
    console.error("Error creating subscription:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

