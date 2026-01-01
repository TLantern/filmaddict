"use client";

import { useState } from "react";
import Image from "next/image";
import { useUser, SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import { Card, CardBody } from "@heroui/react";
import CheckoutForm from "@/components/checkout-form";

export default function UpgradePage() {
  const { isLoaded } = useUser();
  const [selectedPlan, setSelectedPlan] = useState<"yearly" | "monthly">("yearly");
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutData, setCheckoutData] = useState<{
    clientSecret: string;
    customerId: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleStartTrial = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create payment intent");
      }

      const data = await response.json();
      setCheckoutData({
        clientSecret: data.clientSecret,
        customerId: data.customerId,
      });
      setShowCheckout(true);
    } catch (error) {
      console.error("Error starting trial:", error);
      alert(error instanceof Error ? error.message : "Failed to start trial. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <SignedIn>
        <div className="min-h-screen bg-black relative overflow-hidden flex items-center">
          {/* Gold gradient spots */}
          <div 
            className="absolute top-0 left-0 w-96 h-96 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"
            style={{
              background: 'radial-gradient(circle, rgba(255, 216, 115, 0.3) 0%, rgba(255, 216, 115, 0.1) 50%, transparent 100%)'
            }}
          />
          <div 
            className="absolute top-1/2 right-0 w-96 h-96 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"
            style={{
              background: 'radial-gradient(circle, rgba(255, 216, 115, 0.3) 0%, rgba(255, 216, 115, 0.1) 50%, transparent 100%)'
            }}
          />
          <div 
            className="absolute bottom-0 left-1/3 w-96 h-96 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2"
            style={{
              background: 'radial-gradient(circle, rgba(255, 216, 115, 0.3) 0%, rgba(255, 216, 115, 0.1) 50%, transparent 100%)'
            }}
          />
          
          <div className="relative w-full pt-8 pb-8 px-4 md:px-6 lg:px-8">
            <div className="container mx-auto max-w-lg">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center mb-4">
                  <Image
                    src="/logo.png"
                    alt="YKlipp"
                    width={96}
                    height={96}
                    className="w-24 h-24 object-contain"
                    priority
                    unoptimized
                  />
                  <span className="text-3xl font-bold text-white -ml-3">YKlipp</span>
                </div>
                <p className="text-gray-400 text-lg">
                Turn 2-hour edits into 2 minutes. AI that clips the moments and removes fluff automatically.                </p>
              </div>

              {!showCheckout ? (
                <>
                  <div className="space-y-4 mb-4">
                    <Card
                      isPressable
                      isHoverable
                      onPress={() => setSelectedPlan("yearly")}
                      classNames={{
                        base: `w-full rounded-xl transition-all hover:scale-105 bg-white hover:shadow-lg hover:shadow-[#FFD873]/50 ${
                        selectedPlan === "yearly"
                            ? "border-[#FFD873] border-4 shadow-lg shadow-[#FFD873]/50"
                            : "border-gray-300 border-2"
                        }`
                      }}
                    >
                      <CardBody className="p-4">
                      <div className="flex items-center justify-between">
                          <div>
                            <div className="text-left">
                              <span className="font-bold text-xl text-black">
                                Yearly – $100 USD
                              </span>
                              <span className="ml-3 px-3 py-1 bg-[#FFD873] rounded-full text-black text-sm font-bold">
                                Best value
                                </span>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600 text-right">
                            $100 USD yearly
                          </div>
                        </div>
                      </CardBody>
                    </Card>

                    <Card
                      isPressable
                      isHoverable
                      onPress={() => setSelectedPlan("monthly")}
                      classNames={{
                        base: `w-full rounded-xl transition-all hover:scale-105 bg-white hover:shadow-lg hover:shadow-[#FFD873]/50 ${
                        selectedPlan === "monthly"
                            ? "border-[#FFD873] border-4"
                            : "border-gray-300 border-2"
                        }`
                      }}
                    >
                      <CardBody className="p-4">
                      <div className="flex items-center justify-between">
                          <div>
                            <div className="text-left">
                              <span className="font-bold text-xl text-black">
                                Monthly – $10 USD
                              </span>
                            </div>
                            </div>
                          <div className="text-sm text-gray-600 text-right">
                            $10 USD monthly
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </div>

                  <button
                    onClick={handleStartTrial}
                    disabled={isLoading}
                    className="w-full py-3 bg-[#FFD873] hover:bg-[#FFC857] text-black font-bold text-lg rounded-xl transition-all hover:scale-105 mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Loading..." : "Start my $1 USD trial"}
                  </button>

                  <p className="text-center text-gray-400 text-sm mb-4">
                    <span className="text-white font-bold">$1 USD for 3 days</span>, then {selectedPlan === "monthly" ? "$10/month" : "$100/year"} starting after trial • Cancel anytime
                  </p>
                </>
              ) : (
                checkoutData && (
                  <div className="bg-white rounded-xl p-6">
                    <h2 className="text-2xl font-bold text-black mb-2 text-center">
                      $1 USD for 3 days
                    </h2>
                    <p className="text-gray-600 text-center mb-6">
                      Then {selectedPlan === "monthly" ? "$10/month" : "$100/year"} starting after trial
                    </p>
                    <CheckoutForm
                      clientSecret={checkoutData.clientSecret}
                      customerId={checkoutData.customerId}
                      plan={selectedPlan}
                      onCancel={() => {
                        setShowCheckout(false);
                        setCheckoutData(null);
                      }}
                    />
                  </div>
                )
              )}

              <div className="text-center text-gray-500 text-sm">
                <a href="/terms" className="hover:text-gray-300">
                  Terms
                </a>
                <span className="mx-2">|</span>
                <a href="/privacy" className="hover:text-gray-300">
                  Privacy
                </a>
              </div>
            </div>
          </div>
        </div>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

