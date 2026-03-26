import { useEffect, useState } from "react";
import api from "@/services/api";
import AdminLayout from "@/layouts/AdminLayout";

export default function Reports() {
    const [data, setData] = useState<any>(null);
    const [statusFilter, setStatusFilter] = useState("all");

    const getFilteredTransactions = () => {
        if (!data?.recent_bookings) return [];

        if (statusFilter === "all") return data.recent_bookings;

        return data.recent_bookings.filter(
            (b: any) => b.booking_status === statusFilter
        );
    };

    const [filters, setFilters] = useState({
        start_date: "",
        end_date: "",
    });

    const fetchReports = async () => {
        try {
            const res = await api.get("/reports", {
                params: filters,
            });
            setData(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    return (
        <div className="space-y-8 pb-8">

            {/* HEADER */}
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Reports Dashboard</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Overview of bookings, revenue, and transactions
                </p>
            </div>

            {/* FILTER */}
            <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-wrap gap-3 items-center">
                <input
                    type="date"
                    value={filters.start_date}
                    onChange={(e) =>
                        setFilters({ ...filters, start_date: e.target.value })
                    }
                    className="border border-gray-300 px-3 py-2 rounded-lg text-sm"
                />

                <input
                    type="date"
                    value={filters.end_date}
                    onChange={(e) =>
                        setFilters({ ...filters, end_date: e.target.value })
                    }
                    className="border border-gray-300 px-3 py-2 rounded-lg text-sm"
                />

                <button
                    onClick={fetchReports}
                    className="bg-mint-600 hover:bg-mint-700 text-white px-4 py-2 rounded-lg text-sm"
                >
                    Apply Filter
                </button>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-xl shadow-sm border">
                    <p className="text-sm text-gray-500">Total Revenue</p>
                    <h2 className="text-2xl font-bold text-emerald-600 mt-2">
                        ₱{data?.total_revenue?.toLocaleString() || 0}
                    </h2>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border">
                    <p className="text-sm text-gray-500">Total Bookings</p>
                    <h2 className="text-2xl font-bold text-gray-800 mt-2">
                        {data?.total_bookings || 0}
                    </h2>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border">
                    <p className="text-sm text-gray-500">Checked In</p>
                    <h2 className="text-2xl font-bold text-blue-600 mt-2">
                        {data?.checked_in || 0}
                    </h2>
                </div>
            </div>

            {/* ALL TRANSACTIONS */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-6">
                <div className="p-5 border-b flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-800">
                        All Transactions
                    </h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setStatusFilter("all")}
                            className={`px-3 py-1 text-sm rounded-lg ${statusFilter === "all"
                                ? "bg-mint-600 text-white"
                                : "bg-gray-100"
                                }`}
                        >
                            All
                        </button>

                        <button
                            onClick={() => setStatusFilter("checked_out")}
                            className={`px-3 py-1 text-sm rounded-lg ${statusFilter === "checked_out"
                                ? "bg-purple-600 text-white"
                                : "bg-gray-100"
                                }`}
                        >
                            Checked
                        </button>

                        <button
                            onClick={() => setStatusFilter("checked_in")}
                            className={`px-3 py-1 text-sm rounded-lg ${statusFilter === "checked_in"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100"
                                }`}
                        >
                            Check In
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <div className="h-[420px] overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-600">
                                <tr>
                                    <th className="px-6 py-3 text-left">Guest</th>
                                    <th className="px-6 py-3 text-left">Type</th>
                                    <th className="px-6 py-3 text-left">Status</th>
                                    <th className="px-6 py-3 text-left">Check In</th>
                                    <th className="px-6 py-3 text-left">Total</th>
                                </tr>
                            </thead>

                            <tbody>
                                {data?.recent_bookings?.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-6 text-gray-500">
                                            No transactions found
                                        </td>
                                    </tr>
                                ) : (
                                    getFilteredTransactions().map((b: any) => (
                                        <tr
                                            key={b.id}
                                            className="border-t hover:bg-gray-50 transition"
                                        >
                                            {/* Guest */}
                                            <td className="px-6 py-4 font-medium text-gray-800">
                                                {b.walk_in_guest?.guest_name ||
                                                    b.user?.name ||
                                                    "Guest"}
                                            </td>

                                            {/* Type */}
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`px-2 py-1 text-xs font-medium rounded-full ${b.booking_type === "walk_in"
                                                        ? "bg-blue-100 text-blue-800"
                                                        : "bg-emerald-100 text-emerald-800"
                                                        }`}
                                                >
                                                    {b.booking_type === "walk_in"
                                                        ? "Walk-in"
                                                        : "Online"}
                                                </span>
                                            </td>

                                            {/* Status */}
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-semibold text-gray-700">
                                                    {b.booking_status?.replace("_", " ").toUpperCase()}
                                                </span>
                                            </td>

                                            {/* Date */}
                                            <td className="px-6 py-4 text-gray-600">
                                                {new Date(b.check_in_date).toLocaleDateString()}
                                            </td>

                                            {/* Total */}
                                            <td className="px-6 py-4 font-semibold text-gray-900">
                                                ₱{b.total_price?.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}