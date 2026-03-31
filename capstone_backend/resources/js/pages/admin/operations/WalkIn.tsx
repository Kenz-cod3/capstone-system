// pages/admin/operations/WalkIn.tsx
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import {
    User,
    Phone,
    MapPin,
    Calendar,
    CalendarDays,
    Users,
    CheckCircle,
    AlertCircle,
    Loader2
} from "lucide-react";
import logo from "../../../../images/logo.png";

interface Room {
    id: number;
    room_number: string;
    status: string;
    room_type?: {
        base_price: number;
        name?: string;
    };
}

interface WalkInFormData {
    guest_name: string;
    contact_number: string;
    address: string;
    room_id: number;
    check_in_date: string;
    check_out_date: string;
}

export default function WalkIn() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const [form, setForm] = useState<WalkInFormData>({
        guest_name: "",
        contact_number: "",
        address: "",
        room_id: 0,
        check_in_date: "",
        check_out_date: ""
    });

    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchingRooms, setFetchingRooms] = useState(false);

    // Load rooms and set default date
    useEffect(() => {
        const today = new Date().toISOString().slice(0, 10);

        setForm((prev) => ({
            ...prev,
            check_in_date: today
        }));

        fetchRooms();
    }, []);

    // Auto set checkout (next day)
    useEffect(() => {
        if (form.check_in_date && !form.check_out_date) {
            const nextDay = new Date(form.check_in_date);
            nextDay.setDate(nextDay.getDate() + 1);

            setForm(prev => ({
                ...prev,
                check_out_date: nextDay.toISOString().slice(0, 10)
            }));
        }
    }, [form.check_in_date]);

    const fetchRooms = async () => {
        try {
            setFetchingRooms(true);
            const res = await api.get("/rooms");

            const available = res.data.filter(
                (room: Room) => room.status === "available"
            );

            setRooms(available);
        } catch (err) {
            console.error("Failed to fetch rooms", err);
            alert("Failed to load available rooms. Please refresh the page.");
        } finally {
            setFetchingRooms(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        setForm({
            ...form,
            [name]: name === "room_id" ? Number(value) : value
        });
    };

    // Calculations
    const selectedRoom = rooms.find(r => r.id === form.room_id);
    const pricePerNight = Number(selectedRoom?.room_type?.base_price || 0);

    const nights = form.check_in_date && form.check_out_date
        ? Math.ceil(
            (new Date(form.check_out_date).getTime() -
                new Date(form.check_in_date).getTime()) /
            (1000 * 60 * 60 * 24)
        )
        : 0;

    const isInvalidDate = nights <= 0;
    const total = pricePerNight * nights;

    // Handle form submission with dashboard invalidation
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.guest_name.trim()) {
            alert("Please enter guest name");
            return;
        }

        if (form.room_id === 0) {
            alert("Please select a room");
            return;
        }

        if (isInvalidDate) {
            alert("Check-out date must be after check-in date");
            return;
        }

        setLoading(true);

        try {
            const response = await api.post("/walk-in-guests", {
                ...form,
                total_amount: total,
                status: "checked_in",
                check_in_time: new Date().toISOString()
            });

            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
            queryClient.invalidateQueries({ queryKey: ["rooms"] });
            queryClient.invalidateQueries({ queryKey: ["bookings"] });

            alert(`✅ Walk-in successful! Guest checked into Room ${selectedRoom?.room_number}`);

            const today = new Date().toISOString().slice(0, 10);
            setForm({
                guest_name: "",
                contact_number: "",
                address: "",
                room_id: 0,
                check_in_date: today,
                check_out_date: ""
            });

            await fetchRooms();

        } catch (err: any) {
            console.error("Walk-in error:", err);

            if (err.response?.status === 409) {
                alert("Room is no longer available. Please select another room.");
                await fetchRooms();
            } else if (err.response?.status === 400) {
                alert(err.response?.data?.message || "Invalid data. Please check your inputs.");
            } else {
                alert(err.response?.data?.message || "❌ Failed to check in guest. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    // Auto-refresh rooms every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            if (!loading) {
                fetchRooms();
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [loading]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2
        }).format(amount);
    };

    return (
        <div className="h-screen overflow-hidden relative">
            {/* Full Screen Logo Background */}
            <div className="fixed inset-0 z-0 bg-white">
                {/* Large centered logo with high visibility */}
                <div className="fixed inset-0 flex items-center justify-center translate-x-10 pointer-events-none">
                    <img
                        src={logo}
                        alt="Logo Background"
                        className="w-[80vw] h-[80vw] max-w-[1800px] max-h-[1800px] object-contain opacity-5"
                        onError={(e) => {
                            console.error("Logo failed to load");
                            e.currentTarget.style.display = "none";
                        }}
                    />
                </div>
            </div>

            {/* Content - No Scroll */}
            <div className="relative z-10 h-full overflow-hidden flex items-center justify-center p-4">
                <div className="w-full max-w-5xl">
                    {/* Header */}
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-2">
                            <Users className="w-8 h-8 text-gray-800 drop-shadow-lg" />
                            <h1 className="text-2xl font-bold text-gray-800 drop-shadow-lg">Walk-In Guest</h1>
                        </div>
                        <p className="text-gray-800/90 text-sm drop-shadow">
                            Register and assign a room for walk-in guests
                        </p>
                    </div>

                    {/* Main Card */}
                    <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 overflow-hidden">
                        <div className="p-6 max-h-[calc(100vh-180px)] overflow-y-auto custom-scrollbar">
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Guest Information Section */}
                                <div>
                                    <h2 className="text-base font-semibold text-gray-800 mb-3">
                                        Guest Information
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {/* Guest Name */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Guest Name <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    name="guest_name"
                                                    value={form.guest_name}
                                                    onChange={handleChange}
                                                    placeholder="Enter guest full name"
                                                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white/90"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {/* Contact Number */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Contact Number
                                            </label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="tel"
                                                    name="contact_number"
                                                    value={form.contact_number}
                                                    onChange={handleChange}
                                                    placeholder="e.g., 09123456789"
                                                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white/90"
                                                />
                                            </div>
                                        </div>

                                        {/* Address */}
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Address
                                            </label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    name="address"
                                                    value={form.address}
                                                    onChange={handleChange}
                                                    placeholder="Enter guest address"
                                                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white/90"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Room & Stay Details Section */}
                                <div>
                                    <h2 className="text-base font-semibold text-gray-800 mb-3">
                                        Room & Stay Details
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {/* Room Selection */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Select Room <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                name="room_id"
                                                value={form.room_id}
                                                onChange={handleChange}
                                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white/90"
                                                required
                                                disabled={fetchingRooms}
                                            >
                                                <option value={0}>
                                                    {fetchingRooms ? "Loading rooms..." : "Select Room"}
                                                </option>
                                                {rooms.map((room) => (
                                                    <option key={room.id} value={room.id}>
                                                        Room {room.room_number} - ₱{room.room_type?.base_price?.toLocaleString() || 0}/night
                                                    </option>
                                                ))}
                                            </select>
                                            {rooms.length === 0 && !fetchingRooms && (
                                                <p className="text-amber-600 text-xs mt-1 flex items-center gap-1">
                                                    <AlertCircle className="w-3 h-3" />
                                                    No available rooms at the moment
                                                </p>
                                            )}
                                        </div>

                                        {/* Check-in Date */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Check-in Date <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="date"
                                                    name="check_in_date"
                                                    value={form.check_in_date}
                                                    onChange={handleChange}
                                                    min={new Date().toISOString().slice(0, 10)}
                                                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white/90"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {/* Check-out Date */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Check-out Date <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <CalendarDays className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="date"
                                                    name="check_out_date"
                                                    value={form.check_out_date}
                                                    onChange={handleChange}
                                                    min={form.check_in_date}
                                                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white/90"
                                                    required
                                                />
                                            </div>
                                            {isInvalidDate && form.check_out_date && (
                                                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                                    <AlertCircle className="w-3 h-3" />
                                                    Check-out must be after check-in
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Price Breakdown */}
                                {form.room_id !== 0 && pricePerNight > 0 && nights > 0 && (
                                    <div className="bg-gradient-to-r from-emerald-50/90 to-green-50/90 backdrop-blur-sm border border-emerald-200 rounded-lg p-3">
                                        <h3 className="text-sm font-semibold text-gray-800 mb-2">
                                            Price Breakdown
                                        </h3>
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-gray-600">Price per Night</span>
                                                <span className="font-medium text-gray-800">
                                                    {formatCurrency(pricePerNight)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-gray-600">Number of Nights</span>
                                                <span className="font-medium text-gray-800">
                                                    {nights} {nights === 1 ? 'night' : 'nights'}
                                                </span>
                                            </div>
                                            <div className="border-t border-emerald-200 pt-2 mt-1">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-semibold text-gray-800">Total Amount</span>
                                                    <span className="text-lg font-bold text-emerald-700">
                                                        {formatCurrency(total)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={
                                        loading ||
                                        form.room_id === 0 ||
                                        !form.check_out_date ||
                                        isInvalidDate ||
                                        !form.guest_name.trim() ||
                                        fetchingRooms
                                    }
                                    className={`w-full py-2 rounded-lg font-semibold shadow-sm transition-all duration-200 flex items-center justify-center gap-2 text-sm
                                        ${loading || form.room_id === 0 || !form.check_out_date || isInvalidDate || !form.guest_name.trim() || fetchingRooms
                                            ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                                            : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white hover:shadow-md'
                                        }`}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-4 h-4" />
                                            Check In Guest
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
