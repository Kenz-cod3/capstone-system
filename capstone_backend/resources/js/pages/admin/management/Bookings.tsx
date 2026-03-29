import { useEffect, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import api from "@/services/api";

export default function Bookings() {
    const [active, setActive] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [trash, setTrash] = useState<any[]>([]);
    const [view, setView] = useState<"active" | "history" | "trash">("active");
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [toast, setToast] = useState<string | null>(null);
    const [openDropdown, setOpenDropdown] = useState<number | null>(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

    useEffect(() => {
        const cached = sessionStorage.getItem("bookings_cache");

        if (cached) {
            const data = JSON.parse(cached);

            setActive(data.active);
            setHistory(data.history);
            setTrash(data.trash);

            // 🔥 silent fetch (no loading UI)
            fetchAll(true);
        } else {
            fetchAll(); // normal loading
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = () => {
            setOpenDropdown(null);
        };

        window.addEventListener("click", handleClickOutside);

        return () => window.removeEventListener("click", handleClickOutside);
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            setOpenDropdown(null);
        };

        window.addEventListener("scroll", handleScroll, true);

        return () => window.removeEventListener("scroll", handleScroll, true);
    }, []);

    const fetchAll = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [a, h, t] = await Promise.all([
                api.get("/bookings/active"),
                api.get("/bookings/history"),
                api.get("/bookings/trash")
            ]);

            setActive(a.data);
            setHistory(h.data);
            setTrash(t.data);

            // ✅ SAVE CACHE
            sessionStorage.setItem("bookings_cache", JSON.stringify({
                active: a.data,
                history: h.data,
                trash: t.data
            }));

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filterData = (data: any[]) => {
        return data.filter((b) => {
            const name =
                b.booking_type === "online"
                    ? `${b.user?.first_name ?? ""} ${b.user?.last_name ?? ""}`.trim()
                    : b.walk_in_guest?.guest_name ?? "";

            return (
                name.toLowerCase().includes(search.toLowerCase()) ||
                b.booking_type.toLowerCase().includes(search.toLowerCase()) ||
                String(b.id).includes(search)
            );
        });
    };

    const handleUpdateStatus = async (id: number, status: string) => {
        try {
            await api.put(`/bookings/${id}`, {
                booking_status: status
            });

            setActive(prev => {
                const updated = prev.find(b => b.id === id);
                if (!updated) return prev;

                const updatedBooking = { ...updated, booking_status: status };

                // 🔥 if checkout → move to history
                if (status === "checked_out" || status === "cancelled") {
                    setHistory(h => [updatedBooking, ...h]);
                    return prev.filter(b => b.id !== id);
                }

                // 🔥 else update normally
                return prev.map(b =>
                    b.id === id ? updatedBooking : b
                );
            });

            setToast(`✅ Booking #${id} status updated to ${status}`);
            setTimeout(() => setToast(null), 3000);

        } catch (err) {
            console.error(err);
            setToast("❌ Failed to update status");
            setTimeout(() => setToast(null), 3000);
        }
    };

    const handleCheckout = async (bookingId: number) => {
        try {
            await api.post(`/walk-in-guests/${bookingId}/checkout`);

            // Find the booking being checked out
            const checkedOutBooking = active.find(b => b.id === bookingId);

            if (checkedOutBooking) {
                const updatedBooking = { ...checkedOutBooking, booking_status: "checked_out" };
                setHistory(prev => [updatedBooking, ...prev]);
                setActive(prev => prev.filter(b => b.id !== bookingId));
            }

            setToast(`✅ Booking #${bookingId} checked out successfully`);
            setTimeout(() => setToast(null), 3000);

        } catch (error) {
            console.error(error);
            setToast("❌ Checkout failed");
            setTimeout(() => setToast(null), 3000);
        }
    };

    const handleDelete = async (id: number) => {
        const confirmDelete = confirm("Move this booking to trash?");
        if (!confirmDelete) return;

        try {
            await api.delete(`/bookings/${id}`);

            // ✅ GET THE DELETED ITEM
            const deleted =
                active.find(b => b.id === id) ||
                history.find(b => b.id === id);

            // ✅ REMOVE FROM ACTIVE + HISTORY
            setActive(prev => prev.filter(b => b.id !== id));
            setHistory(prev => prev.filter(b => b.id !== id));

            // ✅ ADD TO TRASH (IMPORTANT)
            if (deleted) {
                setTrash(prev => [deleted, ...prev]);
            }

            setToast(`✅ Booking #${id} moved to trash`);
            setTimeout(() => setToast(null), 3000);

        } catch (err) {
            console.error(err);
            setToast("❌ Failed to move booking to trash");
            setTimeout(() => setToast(null), 3000);
        }
    };

    const handleRestore = async (id: number) => {
        try {
            await api.post(`/bookings/${id}/restore`);

            const restored = trash.find(b => b.id === id);

            setTrash(prev => prev.filter(b => b.id !== id));

            if (restored) {
                if (restored.booking_status === "checked_out" || restored.booking_status === "cancelled") {
                    setHistory(prev => [restored, ...prev]);
                } else {
                    setActive(prev => [restored, ...prev]);
                }
            }

            setToast("✅ Booking restored successfully");
            setTimeout(() => setToast(null), 3000);

        } catch (err) {
            console.error(err);
            setToast("❌ Failed to restore booking");
            setTimeout(() => setToast(null), 3000);
        }
    };

    const handleForceDelete = async (id: number) => {
        const confirmDelete = confirm(
            "⚠️ WARNING: This will permanently delete the booking.\n\nThis action cannot be undone.\n\nAre you absolutely sure?"
        );

        if (!confirmDelete) return;

        try {
            await api.delete(`/bookings/${id}/force-delete`);

            setTrash(prev => prev.filter(b => b.id !== id));

            setToast(`✅ Booking #${id} permanently deleted`);
            setTimeout(() => setToast(null), 3000);

        } catch (err) {
            console.error(err);
            setToast("❌ Failed to delete booking permanently");
            setTimeout(() => setToast(null), 3000);
        }
    };

    const formatDate = (date: string) => {
        if (!date) return "-";
        return new Date(date).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            pending: "bg-amber-100 text-amber-800",
            confirmed: "bg-emerald-100 text-emerald-800",
            checked_in: "bg-blue-100 text-blue-800",
            checked_out: "bg-purple-100 text-purple-800",
            cancelled: "bg-rose-100 text-rose-800"
        };
        return colors[status] || "bg-gray-100 text-gray-800";
    };

    const getGuestName = (booking: any) => {
        if (booking.booking_type === "online") {
            const firstName = booking.user?.first_name ?? "";
            const lastName = booking.user?.last_name ?? "";
            return `${firstName} ${lastName}`.trim() || "N/A";
        } else {
            // Walk-in guest name
            return booking.walk_in_guest?.guest_name || "Guest";
        }
    };

    const renderTable = (data: any[], type: string) => (
        <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-mint-200 max-h-[460px] overflow-y-auto relative">
            <table className="w-full">
                <thead className="bg-mint-50 border-b border-mint-200 sticky top-0 z-10">
                    <tr>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">ID</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">Guest Name</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">Room</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">Check In</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">Check Out</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">Total</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                    {loading ? (
                        <tr>
                            <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                                <div className="flex items-center justify-center space-x-2">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-mint-600"></div>
                                    <span>Loading...</span>
                                </div>
                            </td>
                        </tr>
                    ) : data.length === 0 ? (
                        <tr>
                            <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                                No bookings found
                            </td>
                        </tr>
                    ) : (
                        data.map((b: any) => (
                            <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                                {/* ID */}
                                <td className="px-4 py-4 text-sm text-gray-900 text-center">#{b.id}</td>

                                {/* Guest Name */}
                                <td className="px-2 py-4 min-w-[180px] text-center">
                                    <div className="font-medium text-gray-900 whitespace-nowrap text-center">
                                        {getGuestName(b)}
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-700 min-w-[80px] text-center">
                                    {b.rooms?.length
                                        ? b.rooms.map((r: any) => r.room_number).join(", ")
                                        : "N/A"}
                                </td>

                                {/* TYPE */}
                                <td className="px-6 py-4 text-center">
                                    <span
                                        className={`px-2 py-1 text-xs font-medium rounded-full ${b.booking_type === "walk_in"
                                            ? "bg-blue-100 text-blue-800"
                                            : "bg-emerald-100 text-emerald-800"
                                            }`}
                                    >
                                        {b.booking_type === "walk_in" ? "Walk-in" : "Online"}
                                    </span>
                                </td>

                                {/* STATUS */}
                                <td className="px-6 py-4 text-center">
                                    <span
                                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(b.booking_status)}`}
                                    >
                                        {b.booking_status?.replace(/_/g, " ").toUpperCase()}
                                    </span>
                                </td>

                                {/* Dates */}
                                <td className="px-6 py-4 text-sm text-gray-600 text-center">
                                    {formatDate(b.check_in_date)}
                                </td>

                                <td className="px-6 py-4 text-sm text-gray-600 text-center">
                                    {formatDate(b.check_out_date)}
                                </td>

                                {/* Total */}
                                <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-center">
                                    ₱ {b.total_price?.toLocaleString()}
                                </td>

                                {/* Actions */}
                                <td className="px-6 py-4 relative text-center">
                                    <div className="relative group inline-block">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const rect = e.currentTarget.getBoundingClientRect();

                                                const dropdownWidth = 180;

                                                let left = rect.right - dropdownWidth;

                                                // prevent overflow sa right
                                                if (left + dropdownWidth > window.innerWidth) {
                                                    left = window.innerWidth - dropdownWidth - 10;
                                                }

                                                // prevent overflow sa left
                                                if (left < 10) {
                                                    left = 10;
                                                }

                                                setDropdownPos({
                                                    top: rect.bottom + 5,
                                                    left,
                                                });

                                                setOpenDropdown(openDropdown === b.id ? null : b.id);
                                            }}
                                            className="p-2 rounded hover:bg-gray-100"
                                        >
                                            <MoreHorizontal className="w-5 h-5 text-gray-600" />
                                        </button>

                                        {/* Dropdown */}
                                        {openDropdown === b.id && (
                                            <div
                                                style={{
                                                    position: "fixed",
                                                    top: dropdownPos.top,
                                                    left: dropdownPos.left,
                                                }}
                                                className="z-50 w-44 bg-white border rounded-lg shadow-lg"
                                            >
                                                {/* 🔥 ARROW */}
                                                <div className="absolute -top-2 right-4 w-3 h-3 bg-white border-l border-t rotate-45"></div>
                                                {type === "active" && (
                                                    <>
                                                        <button onClick={() => handleUpdateStatus(b.id, "confirmed")} className="dropdown">
                                                            Confirm
                                                        </button>
                                                        <button onClick={() => handleUpdateStatus(b.id, "checked_in")} className="dropdown">
                                                            Check In
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (b.booking_type === "walk_in") handleCheckout(b.id);
                                                                else handleUpdateStatus(b.id, "checked_out");
                                                            }}
                                                            className="dropdown"
                                                        >
                                                            Check Out
                                                        </button>
                                                        <button onClick={() => handleDelete(b.id)} className="dropdown text-rose-600">
                                                            Move to Trash
                                                        </button>
                                                    </>
                                                )}

                                                {type === "history" && (
                                                    <button onClick={() => handleDelete(b.id)} className="dropdown text-rose-600">
                                                        Move to Trash
                                                    </button>
                                                )}

                                                {type === "trash" && (
                                                    <>
                                                        <button onClick={() => handleRestore(b.id)} className="dropdown">
                                                            Restore
                                                        </button>
                                                        <button onClick={() => handleForceDelete(b.id)} className="dropdown text-rose-600">
                                                            Delete Forever
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );

    const getTabClass = (tabName: string) => {
        const baseClass = "px-6 py-2.5 text-sm font-medium rounded-lg transition-all duration-200";
        if (view === tabName) {
            return `${baseClass} bg-mint-600 text-white shadow-sm`;
        }
        return `${baseClass} bg-white text-gray-600 hover:bg-gray-50 border border-gray-200`;
    };

    return (
        <div className="pt-4 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Bookings Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage and track all reservations</p>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        placeholder="Search bookings..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-mint-500"
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200 pb-2">
                <button
                    onClick={() => setView("active")}
                    className={getTabClass("active")}
                >
                    Active Bookings
                    {active.length > 0 && view === "active" && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-white text-mint-600 rounded-full">
                            {active.length}
                        </span>
                    )}
                </button>

                <button
                    onClick={() => setView("history")}
                    className={getTabClass("history")}
                >
                    History
                    {history.length > 0 && view === "history" && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-white text-mint-600 rounded-full">
                            {history.length}
                        </span>
                    )}
                </button>

                <button
                    onClick={() => setView("trash")}
                    className={getTabClass("trash")}
                >
                    Trash
                    {trash.length > 0 && view === "trash" && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-white text-rose-600 rounded-full">
                            {trash.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Warning Banner for Trash */}
            {view === "trash" && trash.length > 0 && (
                <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-md">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-rose-700">
                                <span className="font-medium">Warning:</span> Items in trash will be permanently deleted. Use "Delete Forever" with caution.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Table Content */}
            <div className="animate-fadeIn">
                {view === "active" && renderTable(filterData(active), "active")}
                {view === "history" && renderTable(filterData(history), "history")}
                {view === "trash" && renderTable(filterData(trash), "trash")}
            </div>

            {toast && (
                <div className="fixed bottom-5 right-5 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg animate-fadeIn z-50">
                    {toast}
                </div>
            )}
        </div>
    );
}
