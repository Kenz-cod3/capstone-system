import React from "react";
import { DollarSign, Hotel, CalendarDays, Users } from "lucide-react";
import StatCard from "./StatCard";

//---------TYPES---->
interface DashboardStats {
    guests: number;
    rooms: number;
    bookings: number;
    revenue: number;
    expenses: number;
    profit: number;

    revenue_change: number;
    expenses_change: number;
    profit_change: number;
}

//---------COMPONENT---->
export default function StatCardsGrid({
    stats,
    occupancy
}: {
    stats: DashboardStats | undefined;
    occupancy: number;
}) {

    //---------FORMAT CURRENCY---->
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 0
        }).format(amount);
    };

    //---------FORMAT CHANGE (%)---->
    const formatChange = (val: number) => {
        if (val === 0) return "0.0%";
        const sign = val > 0 ? "+" : "";
        return `${sign}${val.toFixed(1)}%`;
    };

    //---------TREND LOGIC (FIXED FOR EXPENSES)---->
    const getTrend = (val: number, label: string) => {

        //---------EXPENSES LOGIC (REVERSED)---->
        if (label === "Total Expenses") {
            if (val > 0) return "down";   
            if (val < 0) return "up";   
            return "neutral";
        }

        //---------DEFAULT LOGIC---->
        if (val > 0) return "up";
        if (val < 0) return "down";
        return "neutral";
    };

    //---------STAT CARDS DATA---->
    const statCards = [
        {
            label: "Total Revenue",
            value: formatCurrency(stats?.revenue ?? 0),
            change: formatChange(stats?.revenue_change ?? 0),
            trend: getTrend(stats?.revenue_change ?? 0, "Total Revenue"),
        },
        {
            label: "Total Expenses",
            value: formatCurrency(stats?.expenses ?? 0),
            change: formatChange(stats?.expenses_change ?? 0),
            trend: getTrend(stats?.expenses_change ?? 0, "Total Expenses"),
        },
        {
            label: "Total Profit",
            value: formatCurrency(stats?.profit ?? 0),
            change: formatChange(stats?.profit_change ?? 0),
            trend: getTrend(stats?.profit_change ?? 0, "Total Profit"),
        },
        {
            label: "Occupancy Rate",
            value: `${occupancy ?? 0}%`,
            change: "+5.2%",
            trend: "up",
        },
        {
            label: "Active Bookings",
            value: (stats?.bookings ?? 0).toString(),
            change: "+23",
            trend: "up",
        },
        {
            label: "Total Guests",
            value: (stats?.guests ?? 0).toString(),
            change: "+8",
            trend: "up",
        }
    ];

    //---------RENDER---->
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
            {statCards.map((stat, index) => (
                <StatCard key={index} {...stat} />
            ))}
        </div>
    );
}