import React from "react";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Legend
} from "recharts";

//-----TYPES----->
interface ChartData {
    name: string;
    revenue: number | string;
    expenses: number | string;
    profit: number | string;
}

//-----HELPER (SAFE NUMBER)----->
const toNumber = (val: number | string) => Number(val) || 0;

//-----COMPONENT----->
export default function RevenueChart({
    data,
}: {
    data: ChartData[];
}) {

    //-----SUMMARY TOTALS (FIXED)----->
    const totalRevenue = data.reduce(
        (sum, item) => sum + toNumber(item.revenue),
        0
    );

    const totalExpenses = data.reduce(
        (sum, item) => sum + toNumber(item.expenses),
        0
    );

    const totalProfit = data.reduce(
        (sum, item) => sum + toNumber(item.profit),
        0
    );

    const profitMargin =
        totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    //-----CHANGE CALCULATION----->
    const first = data[0] || { revenue: 0, expenses: 0, profit: 0 };
    const last = data[data.length - 1] || { revenue: 0, expenses: 0, profit: 0 };

    const calcChange = (current: number, previous: number) => {
        if (previous === 0) {
            return current > 0 ? 100 : 0;
        }
        return ((current - previous) / previous) * 100;
    };

    const revenueChange = calcChange(
        toNumber(last.revenue),
        toNumber(first.revenue)
    );

    const expensesChange = calcChange(
        toNumber(last.expenses),
        toNumber(first.expenses)
    );

    return (
        <div className="bg-white rounded-2xl p-5 text-gray-800 shadow-sm border border-gray-100 flex flex-col h-full">

            {/*-----HEADER----->*/}
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold">
                    Revenue, Expenses & Profit (Last 7 Days)
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

            {/*-----SUMMARY STATS----->*/}
            <div className="grid grid-cols-3 gap-4 mb-6 pb-4 border-b border-gray-100">

                {/* REVENUE */}
                <div>
                    <p className="text-xs text-gray-500 font-medium">Total Revenue</p>
                    <p className="text-xl font-bold text-emerald-600">
                        ₱{totalRevenue.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                        <span className="text-xs text-emerald-600">
                            {revenueChange >= 0 ? "+" : ""}
                            {revenueChange.toFixed(1)}%
                        </span>
                    </div>
                </div>

                {/* EXPENSES */}
                <div>
                    <p className="text-xs text-gray-500 font-medium">Total Expenses</p>
                    <p className="text-xl font-bold text-red-500">
                        ₱{totalExpenses.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                        <TrendingDown className="h-3 w-3 text-red-500" />
                        <span className={`text-xs ${expensesChange > 0 ? "text-red-500" : "text-emerald-600"
                            }`}>
                            {expensesChange >= 0 ? "+" : ""}
                            {expensesChange.toFixed(1)}%
                        </span>
                    </div>
                </div>

                {/* PROFIT */}
                <div>
                    <p className="text-xs text-gray-500 font-medium">Net Profit</p>
                    <p className="text-xl font-bold text-blue-600">
                        ₱{totalProfit.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-blue-600">
                            ₱{profitMargin.toFixed(1)}% margin
                        </span>
                    </div>
                </div>
            </div>

            {/*-----CHART----->*/}
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>

                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#f1f5f9"
                            vertical={false}
                        />

                        <XAxis
                            dataKey="name"
                            stroke="#9ca3af"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                        />

                        <YAxis
                            stroke="#9ca3af"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `₱${value}`}
                        />

                        <Tooltip
                            formatter={(value: any, name: any) => [
                                `₱${Number(value)?.toLocaleString() || 0}`,
                                name ? name.charAt(0).toUpperCase() + name.slice(1) : ''
                            ]}
                            contentStyle={{
                                backgroundColor: "#ffffff",
                                border: "1px solid #e5e7eb",
                                borderRadius: "6px",
                                fontSize: "12px",
                            }}
                            labelStyle={{ color: "#374151" }}
                        />

                        <Legend
                            wrapperStyle={{
                                fontSize: "11px",
                                paddingTop: "12px"
                            }}
                            iconType="circle"
                            iconSize={8}
                        />

                        <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={{ r: 3, fill: "#10b981" }}
                            activeDot={{ r: 5 }}
                        />

                        <Line
                            type="monotone"
                            dataKey="expenses"
                            stroke="#ef4444"
                            strokeWidth={2}
                            dot={{ r: 3, fill: "#ef4444" }}
                            activeDot={{ r: 5 }}
                        />

                        <Line
                            type="monotone"
                            dataKey="profit"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={{ r: 3, fill: "#3b82f6" }}
                            activeDot={{ r: 5 }}
                        />

                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}