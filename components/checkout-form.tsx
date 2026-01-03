"use client";

import { useState, useEffect } from "react";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useRouter } from "next/navigation";

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

interface CheckoutFormProps {
  clientSecret: string;
  customerId: string;
  plan: "monthly" | "yearly";
  onCancel: () => void;
}

function CheckoutFormInner({ clientSecret, customerId, plan, onCancel }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Confirm payment for $1 trial fee
      const { error: paymentError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard`,
        },
        redirect: "if_required",
      });

      if (paymentError) {
        setError(paymentError.message || "Payment failed");
        setIsLoading(false);
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        // Get payment method from the payment intent
        const retrievedPaymentIntent = await stripe.retrievePaymentIntent(clientSecret);
        const paymentMethodId = retrievedPaymentIntent.paymentIntent?.payment_method;
        
        if (!paymentMethodId || typeof paymentMethodId !== "string") {
          throw new Error("Payment method not found");
        }

        // Create subscription with trial
        const response = await fetch("/api/create-subscription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customerId,
            paymentMethodId,
            plan,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create subscription");
        }

        // Redirect to dashboard
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <div className="text-red-500 text-sm mt-2">{error}</div>
      )}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isLoading}
          className="flex-1 py-3 px-4 bg-[#FFD873] hover:bg-[#FFC857] text-black font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Processing..." : `Pay $1 USD`}
        </button>
      </div>
      <p className="text-center text-black text-sm">
        3 days for $1, then {plan === "monthly" ? "$10/month" : "$100/year"} starting after trial
      </p>
    </form>
  );
}

export default function CheckoutForm(props: CheckoutFormProps) {
  if (!stripePromise) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-800 font-bold mb-2">Stripe Configuration Error</p>
        <p className="text-red-600 text-sm">
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set. Please add it to your .env.local file.
        </p>
        <p className="text-red-500 text-xs mt-2">
          Get your publishable key from: https://dashboard.stripe.com/apikeys
        </p>
      </div>
    );
  }

  const options: StripeElementsOptions = {
    clientSecret: props.clientSecret,
    appearance: {
      theme: "stripe",
      variables: {
        colorPrimary: "#FFD873",
        colorBackground: "#ffffff",
        colorText: "#000000",
        colorDanger: "#df1b41",
        fontFamily: "system-ui, sans-serif",
        spacingUnit: "4px",
        borderRadius: "8px",
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutFormInner {...props} />
    </Elements>
  );
}

