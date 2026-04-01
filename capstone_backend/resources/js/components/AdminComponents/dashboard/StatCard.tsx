import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import CountUp from "react-countup";

export default function StatCard({
    label,
    value,
    change,
    trend,
}: any) {

    // ✅ Convert value to number
    const numericValue =
        label === "Total Revenue"
            ? Number(String(value).replace(/[^\d]/g, ""))
            : 0;

    // ✅ Get stored value (persist across navigation)
    const stored = sessionStorage.getItem("revenue");

    // ✅ Decide if animation should run
    const shouldAnimate =
        label === "Total Revenue" &&
        (!stored || Number(stored) !== numericValue);

    // ✅ Save latest value
    if (label === "Total Revenue") {
        sessionStorage.setItem("revenue", String(numericValue));
    }

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
                                start={0}
                                end={numericValue}
                                duration={1.5}
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