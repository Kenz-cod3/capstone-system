import React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from "recharts";

interface OccupancyTrendItem {
    day: string;
    occupancy: number;
}

export default function OccupancyTrendChart({
    data,
}: {
    data: OccupancyTrendItem[];
}) {

    // ✅ SAFETY: ensure 0–100 lang
    const safeData = data.map(item => ({
        ...item,
        occupancy: Math.max(0, Math.min(item.occupancy, 100)),
    }));

    return (
        <div className="bg-white rounded-2xl p-5 text-gray-800 shadow-sm border border-gray-100 flex flex-col h-full">

            {/* HEADER */}
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold">
                    Occupancy Trend
                </h2>

                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-gray-500 text-xs hover:text-gray-700"
                >
                    <Calendar className="h-3.5 w-3.5" />
                    Last 7 Days
                </Button>
            </div>

            {/* CHART */}
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={safeData}>

                        {/* GRADIENT */}
                        <defs>
                            <linearGradient id="mintGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>

                        {/* GRID */}
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#f1f5f9"
                            vertical={false}
                        />

                        {/* X AXIS */}
                        <XAxis
                            dataKey="day"
                            stroke="#9ca3af"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                        />

                        {/* Y AXIS */}
                        <YAxis
                            domain={[0, 100]}
                            stroke="#9ca3af"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                        />

                        {/* TOOLTIP */}
                        <Tooltip
                            formatter={(value: any) => [
                                `${value.toFixed(1)}% occupancy`,
                                "Occupancy",
                            ]}
                            contentStyle={{
                                backgroundColor: "#ffffff",
                                border: "1px solid #e5e7eb",
                                borderRadius: "6px",
                                fontSize: "12px",
                            }}
                            labelStyle={{ color: "#374151" }}
                        />

                        {/* AREA */}
                        <Area
                            type="monotoneX"
                            dataKey="occupancy"
                            stroke="#10b981"
                            strokeWidth={2}
                            fill="url(#mintGradient)"
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}