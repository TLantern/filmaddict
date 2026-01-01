"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function ElegantShape({
    className,
    delay = 0,
    width = 400,
    height = 100,
    rotate = 0,
    gradient = "from-white/[0.08]",
}: {
    className?: string;
    delay?: number;
    width?: number;
    height?: number;
    rotate?: number;
    gradient?: string;
}) {
    return (
        <motion.div
            initial={{
                opacity: 0,
                y: -150,
                rotate: rotate - 15,
            }}
            animate={{
                opacity: 1,
                y: 0,
                rotate: rotate,
            }}
            transition={{
                duration: 2.4,
                delay,
                ease: [0.23, 0.86, 0.39, 0.96],
                opacity: { duration: 1.2 },
            }}
            className={cn("absolute", className)}
        >
            <motion.div
                animate={{
                    y: [0, 15, 0],
                }}
                transition={{
                    duration: 12,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                }}
                style={{
                    width,
                    height,
                }}
                className="relative"
            >
                <div
                    className={cn(
                        "absolute inset-0 rounded-full",
                        "bg-gradient-to-r to-transparent",
                        gradient,
                        "backdrop-blur-[2px] border-2 border-white/[0.15]",
                        "shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]",
                        "after:absolute after:inset-0 after:rounded-full",
                        "after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)]"
                    )}
                />
            </motion.div>
        </motion.div>
    );
}

function HeroGeometric({
    badge = "Design Collective",
    title1 = "Elevate Your Digital Vision",
    title2 = "Crafting Exceptional Websites",
    subtitle,
    children,
}: {
    badge?: string;
    title1?: string;
    title2?: string;
    subtitle?: string;
    children?: React.ReactNode;
}) {
    const fadeUpVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: {
                duration: 1,
                delay: 0.5 + i * 0.2,
                ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number],
            },
        }),
    };

    return (
        <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-gray-900 pt-32 pb-16">
            {/* SaaS UI Background Gradient Pattern - Stronger at top, fading to bottom */}
            <div
                className="absolute inset-0 opacity-70"
                style={{
                    backgroundImage: `
                        radial-gradient(at top left, #1a202c 40%, transparent 70%),
                        radial-gradient(at top center, #805ad5 35%, transparent 65%),
                        radial-gradient(at top right, #319795 45%, transparent 75%),
                        radial-gradient(at center left, #00bcd4 20%, transparent 50%),
                        radial-gradient(at center right, #805ad5 15%, transparent 45%),
                        radial-gradient(at bottom center, rgba(26, 32, 44, 0.1) 10%, transparent 30%)
                    `,
                    backgroundBlendMode: 'saturation'
                }}
            />

            {/* Linear gradient overlay for better text readability */}
            <div
                className="absolute inset-0 opacity-60"
                style={{
                    backgroundImage: 'linear-gradient(0deg, #1a202c 60%, rgba(0, 0, 0, 0) 100%)'
                }}
            />

            <div className="relative z-10 container mx-auto px-4 md:px-6 w-full">
                <div className="max-w-3xl mx-auto text-center mb-8">
                    <motion.div
                        custom={0}
                        variants={fadeUpVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold mb-4 md:mb-6 tracking-tight">
                            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80">
                                {title1}
                            </span>
                            <br />
                            <span
                                className={cn(
                                    "bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/90 to-rose-300 "
                                )}
                            >
                                {title2}
                            </span>
                        </h1>
                        {subtitle && (
                            <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto">
                                {subtitle}
                            </p>
                        )}
                    </motion.div>
                </div>

                {children && (
                    <div className="relative z-10 max-w-2xl mx-auto">
                        {children}
                    </div>
                )}
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-gray-900/80 pointer-events-none" />
        </div>
    );
}

export { HeroGeometric }

