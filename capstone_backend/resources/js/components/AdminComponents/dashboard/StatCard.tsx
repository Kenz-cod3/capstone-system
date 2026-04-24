import React, { useEffect, useRef } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import CountUp from "react-countup";

export default function StatCard({
    label,
    value,
    change,
    trend,
}: any) {

    const numericValue =
        label === "Total Revenue"
            ? Number(String(value).replace(/[^\d]/g, ""))
            : 0;

    // 🔥 store previous value in ref (NOT sessionStorage directly)
    const prevValueRef = useRef<number>(numericValue);

    const previousValue = prevValueRef.current;

    const shouldAnimate =
        label === "Total Revenue" && previousValue !== numericValue;

    // ✅ update AFTER render
    useEffect(() => {
        if (label === "Total Revenue") {
            prevValueRef.current = numericValue;
        }
    }, [numericValue]);

    return (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col">

            {/* TOP */}
            <div className="flex justify-end">
                <div
                    className={`flex items-center gap-1 text-xs font-medium ${
                        trend === "up" ? "text-emerald-600" : "text-red-600"
                    }`}
                >
                    {trend === "up" ? (
                        <ArrowUpRight className="h-3 w-3" />
                    ) : (
                        <ArrowDownRight className="h-3 w-3" />
                    )}
                    {change}
                </div>
            </div>

            {/* VALUE */}
            <div className="mt-3">
                <p className="text-3xl font-semibold text-gray-800">
                    {label === "Total Revenue" ? (
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

                <p className="text-xs text-gray-500 mt-1">
                    {label}
                </p>
            </div>
        </div>
    );
}