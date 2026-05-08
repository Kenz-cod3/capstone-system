import React, { useEffect, useRef } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import CountUp from "react-countup";

export default function StatCard({
    label,
    value,
    change,
    trend,
    rounded = "xl", // rounded: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
}: any) {

    // include Profit
    const isMoney =
        label === "Total Revenue" ||
        label === "Total Expenses" ||
        label === "Total Profit";

    const numericValue =
        isMoney
            ? Number(String(value).replace(/[^\d]/g, ""))
            : 0;

    const prevValueRef = useRef<number>(numericValue);
    const previousValue = prevValueRef.current;

    const shouldAnimate =
        isMoney && previousValue !== numericValue;

    useEffect(() => {
        if (isMoney) {
            prevValueRef.current = numericValue;
        }
    }, [numericValue]);

    // Rounded classes mapping
    const roundedClasses = {
        none: "rounded-none",
        sm: "rounded-sm",
        md: "rounded-md",
        lg: "rounded-lg",
        xl: "rounded-xl",
        "2xl": "rounded-2xl",
        "3xl": "rounded-3xl",
    };

    return (
        <div className={`bg-white ${roundedClasses[rounded as keyof typeof roundedClasses] || roundedClasses.xl} p-4 border border-gray-200 shadow-sm hover:shadow-md transition flex flex-col`}>
            {/* TOP */}
            <div className="flex justify-end">
                <div
                    className={`flex items-center gap-1 text-xs font-medium ${
                        trend === "up"
                            ? "text-emerald-600"
                            : trend === "down"
                            ? "text-red-600"
                            : "text-gray-400"
                    }`}
                >
                    {trend === "up" ? (
                        <ArrowUpRight className="h-3 w-3" />
                    ) : trend === "down" ? (
                        <ArrowDownRight className="h-3 w-3" />
                    ) : null}
                    {change}
                </div>
            </div>

            {/* VALUE */}
            <div className="mt-1">
                <p className="text-2xl relative top-6 font-semibold text-gray-800">
                    {isMoney ? (
                        shouldAnimate ? (
                            <CountUp
                                start={previousValue}
                                end={numericValue}
                                duration={1}
                                separator=","
                                prefix="₱ "
                            />
                        ) : (
                            `₱ ${numericValue.toLocaleString()}`
                        )
                    ) : (
                        value
                    )}
                </p>

                <p className="text-xs text-gray-500 relative top-3">
                    {label}
                </p>
            </div>
        </div>
    );
}