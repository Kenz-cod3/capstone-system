import React from "react";
import { DollarSign, Hotel, CalendarDays, Users } from "lucide-react";
import StatCard from "./StatCard";

interface DashboardStats {
    guests: number;
    rooms: number;
    bookings: number;
    revenue: number;
}

export default function StatCardsGrid({
    stats,
    occupancy
}: {
    stats: DashboardStats | undefined;
    occupancy: number;
}) {

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const statCards = [
        {
            label: "Total Revenue",
            value: formatCurrency(stats?.revenue ?? 0),
            change: "+12.5%",
            trend: "up",
            icon: "₱",
            color: "#059669",
            bgColor: "#ecfdf5",
        },
        {
            label: "Occupancy Rate",
            value: `${occupancy ?? 0}%`,
            change: "+5.2%",
            trend: "up",
            icon: Hotel,
            color: "#3b82f6",
            bgColor: "#eff6ff",
        },
        {
            label: "Active Bookings",
            value: (stats?.bookings ?? 0).toString(),
            change: "+23",
            trend: "up",
            icon: CalendarDays,
            color: "#3b82f6",
            bgColor: "#eff6ff",
        },
        {
            label: "Total Guests",
            value: (stats?.guests ?? 0).toString(),
            change: "+8",
            trend: "up",
            icon: Users,
            color: "#059669",
            bgColor: "#ecfdf5",
        }
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {statCards.map((stat, index) => (
                <StatCard key={index} {...stat} />
            ))}
        </div>
    );
}