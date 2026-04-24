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
    Loader2,
    Trash2,
    Bed,
    Hotel,
    CreditCard,
    Receipt,
    Building2
} from "lucide-react";
import logo from "../../../../images/logo.png";

interface Room {
    id: number;
    room_number: string;
    status: string;
    room_type?: {
        base_price: number;
        short_stay_price?: number;
        name?: string;
    };
}

interface SelectedRoom {
    id: number;
    room_number: string;
    room_type_name: string;
    price_per_unit: number;
    subtotal: number;
}

interface WalkInFormData {
    guest_name: string;
    contact_number: string;
    address: string;
    room_ids: number[];
    stay_type: "short_stay" | "overnight";
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
        room_ids: [],
        stay_type: "overnight",
        check_in_date: "",
        check_out_date: ""
    });

    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedRoomsDetails, setSelectedRoomsDetails] = useState<SelectedRoom[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchingRooms, setFetchingRooms] = useState(false);
    const [tempSelectedRoomId, setTempSelectedRoomId] = useState<number>(0);

    // Check if date and stay type are selected (required before adding rooms)
    const isDateAndStayTypeSelected = form.check_in_date && form.check_out_date && form.stay_type;

    // Load rooms and set default date
    useEffect(() => {
        const today = new Date().toISOString().slice(0, 10);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        setForm((prev) => ({
            ...prev,
            check_in_date: today,
            check_out_date: tomorrow.toISOString().slice(0, 10)
        }));

        fetchRooms();
    }, []);

    // Auto set checkout (next day) for overnight stays
    useEffect(() => {
        if (form.stay_type === "overnight" && form.check_in_date && !form.check_out_date) {
            const nextDay = new Date(form.check_in_date);
            nextDay.setDate(nextDay.getDate() + 1);
            setForm(prev => ({
                ...prev,
                check_out_date: nextDay.toISOString().slice(0, 10)
            }));
        }
    }, [form.check_in_date, form.stay_type]);

    // Reset checkout date when switching to short stay
    useEffect(() => {
        if (form.stay_type === "short_stay") {
            setForm(prev => ({
                ...prev,
                check_out_date: prev.check_in_date
            }));
        }
    }, [form.stay_type, form.check_in_date]);

    const fetchRooms = async () => {
        try {
            setFetchingRooms(true);
            const res = await api.get("/rooms");
            
            let available = res.data.filter(
                (room: Room) => room.status === "available"
            );
            
            // Filter out already selected rooms
            available = available.filter(
                (room: Room) => !form.room_ids.includes(room.id)
            );
            
            setRooms(available);
        } catch (err) {
            console.error("Failed to fetch rooms", err);
            alert("Failed to load available rooms. Please refresh the page.");
        } finally {
            setFetchingRooms(false);
        }
    };

    useEffect(() => {
        fetchRooms();
    }, [form.room_ids]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm({
            ...form,
            [name]: value
        });
    };

    const getNightsCount = () => {
        if (form.check_in_date && form.check_out_date && form.stay_type === "overnight") {
            return Math.max(1, Math.ceil(
                (new Date(form.check_out_date).getTime() - new Date(form.check_in_date).getTime()) /
                (1000 * 60 * 60 * 24)
            ));
        }
        return 1;
    };

    const addRoom = () => {
        if (!isDateAndStayTypeSelected) {
            alert("Please select stay type and dates first before adding rooms.");
            return;
        }

        if (tempSelectedRoomId === 0) {
            alert("Please select a room");
            return;
        }

        const roomToAdd = rooms.find(r => r.id === tempSelectedRoomId);
        if (!roomToAdd) return;

        if (form.room_ids.includes(roomToAdd.id)) {
            alert("Room already selected");
            return;
        }

        const pricePerUnit = form.stay_type === "short_stay" 
            ? (roomToAdd.room_type?.short_stay_price || roomToAdd.room_type?.base_price || 0)
            : (roomToAdd.room_type?.base_price || 0);

        let subtotal = 0;
        if (form.stay_type === "short_stay") {
            subtotal = pricePerUnit;
        } else {
            const nights = getNightsCount();
            subtotal = pricePerUnit * nights;
        }

        setSelectedRoomsDetails(prev => [...prev, {
            id: roomToAdd.id,
            room_number: roomToAdd.room_number,
            room_type_name: roomToAdd.room_type?.name || "Standard",
            price_per_unit: pricePerUnit,
            subtotal: subtotal
        }]);

        setForm(prev => ({
            ...prev,
            room_ids: [...prev.room_ids, roomToAdd.id]
        }));

        setTempSelectedRoomId(0);
        fetchRooms();
    };

    const removeRoom = (roomId: number) => {
        setSelectedRoomsDetails(prev => prev.filter(r => r.id !== roomId));
        setForm(prev => ({
            ...prev,
            room_ids: prev.room_ids.filter(id => id !== roomId)
        }));
        setTimeout(() => fetchRooms(), 100);
    };

    const nights = getNightsCount();
    const isInvalidDate = form.stay_type === "overnight" && 
        form.check_out_date && 
        new Date(form.check_out_date) <= new Date(form.check_in_date);

    const calculateTotal = () => {
        return selectedRoomsDetails.reduce((sum, room) => sum + room.subtotal, 0);
    };

    const total = calculateTotal();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.guest_name.trim()) {
            alert("Please enter guest name");
            return;
        }

        if (form.room_ids.length === 0) {
            alert("Please select at least one room");
            return;
        }

        if (!form.check_in_date || !form.check_out_date) {
            alert("Please select check-in and check-out dates");
            return;
        }

        if (isInvalidDate) {
            alert("Check-out date must be after check-in date");
            return;
        }

        setLoading(true);

        try {
            const payload = {
                guest_name: form.guest_name,
                contact_number: form.contact_number,
                address: form.address,
                room_ids: form.room_ids,
                stay_type: form.stay_type,
                check_in_date: form.check_in_date,
                check_out_date: form.check_out_date
            };

            await api.post("/walk-in-guests", payload);

            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
            queryClient.invalidateQueries({ queryKey: ["rooms"] });
            queryClient.invalidateQueries({ queryKey: ["bookings"] });

            const roomNumbers = selectedRoomsDetails.map(r => r.room_number).join(", ");
            alert(`✅ Walk-in successful! Guest checked into: ${roomNumbers}\nStay Type: ${form.stay_type === "short_stay" ? "Short Stay (3 hours)" : "Overnight"}\nTotal: ${formatCurrency(total)}`);

            const today = new Date().toISOString().slice(0, 10);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            setForm({
                guest_name: "",
                contact_number: "",
                address: "",
                room_ids: [],
                stay_type: "overnight",
                check_in_date: today,
                check_out_date: tomorrow.toISOString().slice(0, 10)
            });
            setSelectedRoomsDetails([]);
            setTempSelectedRoomId(0);
            await fetchRooms();

        } catch (err: any) {
            console.error("Walk-in error:", err);

            if (err.response?.status === 409) {
                alert("Some rooms are no longer available. Please refresh and try again.");
                await fetchRooms();
                setSelectedRoomsDetails([]);
                setForm(prev => ({ ...prev, room_ids: [] }));
            } else if (err.response?.status === 400) {
                alert(err.response?.data?.message || "Invalid data. Please check your inputs.");
            } else {
                alert(err.response?.data?.message || "❌ Failed to check in guest. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

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

    // Group rooms by room type
    const roomsByType = rooms.reduce((acc, room) => {
        const typeName = room.room_type?.name || "Standard";
        if (!acc[typeName]) acc[typeName] = [];
        acc[typeName].push(room);
        return acc;
    }, {} as Record<string, Room[]>);

    return (
        <div className="h-screen overflow-hidden relative">
            {/* Full Screen Logo Background */}
            <div className="fixed inset-0 z-0 bg-white">
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

            {/* Content */}
            <div className="relative z-10 h-full overflow-hidden flex items-center justify-center p-4">
                <div className="w-full max-w-5xl">
                    {/* Header */}
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-2">
                            <Users className="w-8 h-8 text-gray-800 drop-shadow-lg" />
                            <h1 className="text-2xl font-bold text-gray-800 drop-shadow-lg">Walk-In Guest Registration</h1>
                        </div>
                        <p className="text-gray-800/90 text-sm drop-shadow">
                            Register and assign multiple rooms for walk-in guests
                        </p>
                    </div>

                    {/* Main Card */}
                    <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 overflow-hidden">
                        <div className="p-6 max-h-[calc(100vh-180px)] overflow-y-auto custom-scrollbar">
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Guest Information Section */}
                                <div>
                                    <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                        <User className="w-4 h-4" />
                                        Guest Information
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white/90"
                                                    required
                                                />
                                            </div>
                                        </div>

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
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white/90"
                                                />
                                            </div>
                                        </div>

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
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white/90"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Stay Details Section */}
                                <div>
                                    <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        Stay Period & Type
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Stay Type <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                name="stay_type"
                                                value={form.stay_type}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white/90"
                                            >
                                                <option value="overnight">Overnight</option>
                                                <option value="short_stay">Short Stay (3 hours)</option>
                                            </select>
                                        </div>

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
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white/90"
                                                    required
                                                />
                                            </div>
                                        </div>

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
                                                    disabled={form.stay_type === "short_stay"}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white/90 disabled:bg-gray-100 disabled:cursor-not-allowed"
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

                                {/* Room Selection Section */}
                                <div>
                                    <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                        <Building2 className="w-4 h-4" />
                                        Room Selection
                                    </h2>
                                    
                                    {/* Selected Rooms List */}
                                    {selectedRoomsDetails.length > 0 && (
                                        <div className="mb-4 space-y-2">
                                            <label className="block text-xs font-medium text-gray-700">
                                                Selected Rooms ({selectedRoomsDetails.length})
                                            </label>
                                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                                {selectedRoomsDetails.map((room) => (
                                                    <div key={room.id} className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                                                        <div className="flex items-center justify-between flex-wrap gap-3">
                                                            <div className="flex items-center gap-3">
                                                                <Bed className="w-4 h-4 text-emerald-600" />
                                                                <div>
                                                                    <div className="font-medium text-sm text-gray-800">
                                                                        Room {room.room_number}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">
                                                        {room.room_type_name}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <div className="text-right">
                                                                    <div className="text-sm text-gray-500">
                                                                        {form.stay_type === "short_stay" 
                                                                            ? `${formatCurrency(room.price_per_unit)} fixed`
                                                                            : `${formatCurrency(room.price_per_unit)} × ${nights}`}
                                                                    </div>
                                                                    <div className="font-bold text-emerald-600">
                                                                        {formatCurrency(room.subtotal)}
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeRoom(room.id)}
                                                                    className="p-1 hover:bg-red-100 rounded-lg transition"
                                                                >
                                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Add Room Selector */}
                                    <div className="space-y-3">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Add Room
                                        </label>
                                        <div className="flex gap-3">
                                            <select
                                                value={tempSelectedRoomId}
                                                onChange={(e) => setTempSelectedRoomId(Number(e.target.value))}
                                                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white/90"
                                                disabled={fetchingRooms || !isDateAndStayTypeSelected}
                                            >
                                                <option value={0}>
                                                    {fetchingRooms ? "Loading rooms..." : "Select a room"}
                                                </option>
                                                {Object.entries(roomsByType).map(([typeName, typeRooms]) => (
                                                    <optgroup key={typeName} label={`${typeName} Rooms`}>
                                                        {typeRooms.map((room) => (
                                                            <option key={room.id} value={room.id}>
                                                                Room {room.room_number} - {formatCurrency(
                                                                    form.stay_type === "short_stay"
                                                                        ? (room.room_type?.short_stay_price || room.room_type?.base_price || 0)
                                                                        : (room.room_type?.base_price || 0)
                                                                )}
                                                                {form.stay_type === "overnight" ? "/night" : " (3 hrs)"}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={addRoom}
                                                disabled={!isDateAndStayTypeSelected || tempSelectedRoomId === 0 || fetchingRooms}
                                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>

                                    {rooms.length === 0 && !fetchingRooms && selectedRoomsDetails.length === 0 && (
                                        <p className="text-amber-600 text-xs mt-3 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            No available rooms at the moment
                                        </p>
                                    )}
                                    
                                    {!isDateAndStayTypeSelected && selectedRoomsDetails.length === 0 && (
                                        <p className="text-amber-600 text-xs mt-3 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            Please select stay type and dates first before adding rooms
                                        </p>
                                    )}
                                </div>

                                {/* Price Breakdown */}
                                {selectedRoomsDetails.length > 0 && (
                                    <div className="bg-gradient-to-r from-emerald-50/90 to-green-50/90 backdrop-blur-sm border border-emerald-200 rounded-lg p-4">
                                        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                            <Receipt className="w-4 h-4" />
                                            Price Breakdown
                                        </h3>
                                        
                                        <div className="space-y-2 mb-3">
                                            {selectedRoomsDetails.map((room) => (
                                                <div key={room.id} className="flex justify-between items-center text-sm py-1 border-b border-emerald-100">
                                                    <span className="text-gray-600">
                                                        Room {room.room_number} ({room.room_type_name})
                                                    </span>
                                                    <span className="font-medium text-gray-800">
                                                        {formatCurrency(room.subtotal)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        
                                        <div className="border-t border-emerald-200 pt-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-base font-semibold text-gray-800">
                                                    Total Amount ({selectedRoomsDetails.length} Room{selectedRoomsDetails.length > 1 ? 's' : ''})
                                                </span>
                                                <span className="text-xl font-bold text-emerald-700">
                                                    {formatCurrency(total)}
                                                </span>
                                            </div>
                                            {form.stay_type === "overnight" && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    * Based on {nights} night{nights > 1 ? 's' : ''} of stay
                                                </p>
                                            )}
                                            {form.stay_type === "short_stay" && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    * 3-hour short stay rate
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={
                                        loading ||
                                        form.room_ids.length === 0 ||
                                        !form.check_out_date ||
                                        !form.check_in_date ||
                                        isInvalidDate ||
                                        !form.guest_name.trim() ||
                                        fetchingRooms
                                    }
                                    className={`w-full py-2.5 rounded-lg font-semibold shadow-sm transition-all duration-200 flex items-center justify-center gap-2 text-sm
                                        ${loading || form.room_ids.length === 0 || !form.check_out_date || !form.check_in_date || isInvalidDate || !form.guest_name.trim() || fetchingRooms
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
                                                <CreditCard className="w-4 h-4" />
                                                Complete Check-in {form.room_ids.length > 0 && `(${form.room_ids.length} Room${form.room_ids.length > 1 ? 's' : ''})`}
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