import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

interface RoomStatusItem {
    name: string;
    value: number;
    color: string;
}

const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
}: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;

    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text
            x={x}
            y={y}
            fill="#ffffff"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={12}
            fontWeight="bold"
        >
            {(percent * 100).toFixed(0)}%
        </text>
    );
};

export default function RoomStatusChart({
    data = [],
    selectedDate,
    onDateChange,
    emptyMessage,
}: {
    data: RoomStatusItem[];
    selectedDate?: string;
    onDateChange?: (date: string) => void;
    emptyMessage?: string;
}) {
    const totalRooms = data.reduce((sum, item) => sum + item.value, 0);
    const today = new Date().toISOString().slice(0, 10);

    return (
        <div className="bg-white rounded-2xl p-5 text-gray-800 shadow-sm border border-gray-200 flex flex-col h-full">
            {/* HEADER */}
            <div className="flex justify-between items-center mb-3 gap-2">
                <h2 className="text-lg font-semibold">
                    Room Status Distribution
                </h2>

                <div className="flex items-center gap-2">
                    {onDateChange && (
                        <input
                            type="date"
                            value={selectedDate ?? today}
                            max={today}
                            onChange={(e) => onDateChange(e.target.value)}
                            className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-300"
                        />
                    )}

                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
                    >
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* CONTENT */}
            {data.length === 0 || totalRooms === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center text-sm text-gray-400 py-10 px-4">
                    {emptyMessage ??
                        "No room status data recorded for this date."}
                </div>
            ) : (
                <div className="flex items-center justify-between gap-4 flex-1">
                    {/* CHART LEFT */}
                    <div className="w-1/2 h-[220px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    dataKey="value"
                                    labelLine={false}
                                    label={false}
                                    stroke="#ffffff"
                                    strokeWidth={1.2}
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={index} fill={entry.color} />
                                    ))}
                                </Pie>

                                <Tooltip
                                    formatter={(
                                        value: any,
                                        name: any,
                                        props: any,
                                    ) => {
                                        const total = data.reduce(
                                            (sum, item) => sum + item.value,
                                            0,
                                        );
                                        const percent = (
                                            (value / total) *
                                            100
                                        ).toFixed(0);

                                        return [`${percent}%`, name];
                                    }}
                                    contentStyle={{
                                        backgroundColor: "#ffffff",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: "6px",
                                        fontSize: "12px",
                                    }}
                                    labelStyle={{ color: "#374151" }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="w-1/2 flex flex-col justify-between">
                        {/* LEGEND LIST */}
                        <div className="grid gap-2">
                            {data.map((item) => (
                                <div
                                    key={item.name}
                                    className="flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-2 h-2 rounded-sm"
                                            style={{
                                                backgroundColor: item.color,
                                            }}
                                        />
                                        <span className="text-sm text-gray-600">
                                            {item.name} :
                                        </span>
                                    </div>

                                    <span className="text-sm font-semibold text-gray-800">
                                        {item.value}{" "}
                                        {item.value <= 1 ? "room" : "rooms"}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* TOTAL */}
                        <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between">
                            <span className="text-sm font-medium text-gray-600">
                                Total Rooms :
                            </span>

                            <span className="text-sm font-semibold text-gray-900">
                                {totalRooms}{" "}
                                {totalRooms <= 1 ? "room" : "rooms"}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}