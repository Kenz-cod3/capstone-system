// pages/admin/operations/WalkIn.tsx
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import AdminLayout from "@/layouts/AdminLayout";

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

    // ✅ LOAD ROOMS + DEFAULT DATE
    useEffect(() => {
        const today = new Date().toISOString().slice(0, 10);
        
        setForm((prev) => ({
            ...prev,
            check_in_date: today
        }));
        
        fetchRooms();
    }, []);

    // ✅ AUTO SET CHECKOUT (NEXT DAY)
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

    // ✅ CALCULATIONS
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

    // ✅ Handle form submission with dashboard invalidation
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Additional validation
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
            // Create the walk-in guest
            const response = await api.post("/walk-in-guests", {
                ...form,
                total_amount: total,
                status: "checked_in",
                check_in_time: new Date().toISOString()
            });

            // ✅ CRITICAL: Invalidate dashboard query to trigger refresh
            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
            
            // Also invalidate rooms query since room status changed
            queryClient.invalidateQueries({ queryKey: ["rooms"] });
            
            // Invalidate bookings query if it exists
            queryClient.invalidateQueries({ queryKey: ["bookings"] });
            
            // Show success message
            alert(`✅ Walk-in successful! Guest checked into Room ${selectedRoom?.room_number}`);
            
            // Reset form with today's date
            const today = new Date().toISOString().slice(0, 10);
            setForm({
                guest_name: "",
                contact_number: "",
                address: "",
                room_id: 0,
                check_in_date: today,
                check_out_date: ""
            });
            
            // Refresh available rooms
            await fetchRooms();
            
        } catch (err: any) {
            console.error("Walk-in error:", err);
            
            // Handle specific error cases
            if (err.response?.status === 409) {
                alert("Room is no longer available. Please select another room.");
                await fetchRooms(); // Refresh room list
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

    return (
            <div className="max-w-4xl mx-auto pt-10 space-y-6">
                
                {/* HEADER */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Walk-In Guest</h1>
                    <p className="text-gray-500 text-sm">
                        Register and assign a room for walk-in guests
                    </p>
                </div>
                
                {/* CARD */}
                <div className="bg-white rounded-2xl shadow-sm border p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* GRID FORM */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            {/* Guest Name */}
                            <div>
                                <label className="text-sm text-gray-600 font-medium">
                                    Guest Name *
                                </label>
                                <input
                                    type="text"
                                    name="guest_name"
                                    value={form.guest_name}
                                    onChange={handleChange}
                                    placeholder="Enter guest full name"
                                    className="w-full mt-1 border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                                    required
                                />
                            </div>
                            
                            {/* Contact */}
                            <div>
                                <label className="text-sm text-gray-600 font-medium">
                                    Contact Number
                                </label>
                                <input
                                    type="tel"
                                    name="contact_number"
                                    value={form.contact_number}
                                    onChange={handleChange}
                                    placeholder="e.g., 09123456789"
                                    className="w-full mt-1 border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                                />
                            </div>
                            
                            {/* Address */}
                            <div className="md:col-span-2">
                                <label className="text-sm text-gray-600 font-medium">
                                    Address
                                </label>
                                <input
                                    type="text"
                                    name="address"
                                    value={form.address}
                                    onChange={handleChange}
                                    placeholder="Enter guest address"
                                    className="w-full mt-1 border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                                />
                            </div>
                            
                            {/* Room */}
                            <div>
                                <label className="text-sm text-gray-600 font-medium">
                                    Select Room *
                                </label>
                                <select
                                    name="room_id"
                                    value={form.room_id}
                                    onChange={handleChange}
                                    className="w-full mt-1 border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                                    required
                                    disabled={fetchingRooms}
                                >
                                    <option value={0}>
                                        {fetchingRooms ? "Loading rooms..." : "Select Room"}
                                    </option>
                                    {rooms.map((room) => (
                                        <option key={room.id} value={room.id}>
                                            Room {room.room_number} - ₱{room.room_type?.base_price?.toLocaleString() || 0} / night
                                        </option>
                                    ))}
                                </select>
                                {rooms.length === 0 && !fetchingRooms && (
                                    <p className="text-amber-600 text-xs mt-1">
                                        No available rooms at the moment
                                    </p>
                                )}
                            </div>
                            
                            {/* Check-in */}
                            <div>
                                <label className="text-sm text-gray-600 font-medium">
                                    Check-in Date *
                                </label>
                                <input
                                    type="date"
                                    name="check_in_date"
                                    value={form.check_in_date}
                                    onChange={handleChange}
                                    min={new Date().toISOString().slice(0, 10)}
                                    className="w-full mt-1 border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                                    required
                                />
                            </div>
                            
                            {/* Check-out */}
                            <div>
                                <label className="text-sm text-gray-600 font-medium">
                                    Check-out Date *
                                </label>
                                <input
                                    type="date"
                                    name="check_out_date"
                                    value={form.check_out_date}
                                    onChange={handleChange}
                                    min={form.check_in_date}
                                    className="w-full mt-1 border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                                    required
                                />
                                {isInvalidDate && form.check_out_date && (
                                    <p className="text-red-500 text-xs mt-1">
                                        Check-out must be after check-in
                                    </p>
                                )}
                            </div>
                            
                        </div>
                        
                        {/* TOTAL BOX */}
                        {form.room_id !== 0 && pricePerNight > 0 && nights > 0 && (
                            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Price per Night</span>
                                    <span>₱{pricePerNight.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-600 mt-1">
                                    <span>Number of Nights</span>
                                    <span>{nights} {nights === 1 ? 'night' : 'nights'}</span>
                                </div>
                                <div className="border-t border-emerald-200 mt-3 pt-3">
                                    <div className="flex justify-between font-bold text-lg text-emerald-700">
                                        <span>Total Amount</span>
                                        <span>₱{total.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* BUTTON */}
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
                            className={`w-full py-3 rounded-xl font-semibold shadow-sm transition-all duration-200
                                ${loading || form.room_id === 0 || !form.check_out_date || isInvalidDate || !form.guest_name.trim() || fetchingRooms
                                    ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-md'
                                }`}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Processing...
                                </span>
                            ) : "Check In Guest"}
                        </button>
                        
                    </form>
                </div>
            </div>
    );
}