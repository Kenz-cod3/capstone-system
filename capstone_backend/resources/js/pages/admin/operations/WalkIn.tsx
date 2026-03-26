import { useState, useEffect } from "react";
import api from "@/services/api";
import AdminLayout from "@/layouts/AdminLayout";

export default function WalkIn() {
    const [form, setForm] = useState({
        guest_name: "",
        contact_number: "",
        address: "",
        room_id: 0,
        check_in_date: "",
        check_out_date: ""
    });

    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

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
                check_out_date: nextDay.toISOString().slice(0, 10) // ✅ FIX HERE
            }));
        }
    }, [form.check_in_date]);

    const fetchRooms = async () => {
        try {
            const res = await api.get("/rooms");

            const available = res.data.filter(
                (room: any) => room.status === "available"
            );

            setRooms(available);
        } catch (err) {
            console.error("Failed to fetch rooms", err);
        }
    };

    const handleChange = (e: any) => {
        const { name, value } = e.target;

        setForm({
            ...form,
            [name]: name === "room_id" ? Number(value) : value
        });
    };

    // ✅ CALCULATIONS
    const selectedRoom = rooms.find(r => r.id === form.room_id);

    const pricePerNight = Number(selectedRoom?.room_type?.base_price || 0);

    const nights =
        form.check_in_date && form.check_out_date
            ? Math.ceil(
                (new Date(form.check_out_date).getTime() -
                    new Date(form.check_in_date).getTime()) /
                (1000 * 60 * 60 * 24)
            )
            : 0;

    const isInvalidDate = nights <= 0;
    const total = pricePerNight * nights;

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setLoading(true);

        try {
            await api.post("/walk-in-guests", {
                ...form,
                total_amount: total // ✅ OPTIONAL (if backend supports)
            });

            alert("✅ Walk-in successful!");

            const today = new Date().toISOString().slice(0, 10);

            setForm({
                guest_name: "",
                contact_number: "",
                address: "",
                room_id: 0,
                check_in_date: today,
                check_out_date: ""
            });

            fetchRooms();
        } catch (err: any) {
            console.error(err);
            alert("❌ Error: " + (err.response?.data?.message || "Failed"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">

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
                            <label className="text-sm text-gray-600">Guest Name</label>
                            <input
                                type="text"
                                name="guest_name"
                                value={form.guest_name}
                                onChange={handleChange}
                                className="w-full mt-1 border px-3 py-2 rounded-lg"
                                required
                            />
                        </div>

                        {/* Contact */}
                        <div>
                            <label className="text-sm text-gray-600">Contact Number</label>
                            <input
                                type="text"
                                name="contact_number"
                                value={form.contact_number}
                                onChange={handleChange}
                                className="w-full mt-1 border px-3 py-2 rounded-lg"
                            />
                        </div>

                        {/* Address */}
                        <div className="md:col-span-2">
                            <label className="text-sm text-gray-600">Address</label>
                            <input
                                type="text"
                                name="address"
                                value={form.address}
                                onChange={handleChange}
                                className="w-full mt-1 border px-3 py-2 rounded-lg"
                            />
                        </div>

                        {/* Room */}
                        <div>
                            <label className="text-sm text-gray-600">Select Room</label>
                            <select
                                name="room_id"
                                value={form.room_id}
                                onChange={handleChange}
                                className="w-full mt-1 border px-3 py-2 rounded-lg"
                                required
                            >
                                <option value={0}>Select Room</option>
                                {rooms.map((room) => (
                                    <option key={room.id} value={room.id}>
                                        Room {room.room_number} - ₱{room.room_type?.base_price}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Check-in */}
                        <div>
                            <label className="text-sm text-gray-600">Check-in Date</label>
                            <input
                                type="date"
                                name="check_in_date"
                                value={form.check_in_date}
                                onChange={handleChange}
                                className="w-full mt-1 border px-3 py-2 rounded-lg"
                                required
                            />
                        </div>

                        {/* Check-out */}
                        <div>
                            <label className="text-sm text-gray-600">Check-out Date</label>
                            <input
                                type="date"
                                name="check_out_date"
                                value={form.check_out_date}
                                onChange={handleChange}
                                className="w-full mt-1 border px-3 py-2 rounded-lg"
                            />
                            {isInvalidDate && form.check_out_date && (
                                <p className="text-red-500 text-xs mt-1">
                                    Check-out must be after check-in
                                </p>
                            )}
                        </div>

                    </div>

                    {/* TOTAL BOX */}
                    {form.room_id !== 0 && (
                        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Price / Night</span>
                                <span>₱{pricePerNight.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600 mt-1">
                                <span>Nights</span>
                                <span>{nights}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg text-emerald-700 mt-3">
                                <span>Total</span>
                                <span>₱{total.toLocaleString()}</span>
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
                            isInvalidDate
                        }
                        className="w-full bg-emerald-600 hover:bg-emerald-700 transition text-white py-3 rounded-xl font-semibold shadow-sm"
                    >
                        {loading ? "Processing..." : "Check In Guest"}
                    </button>

                </form>
            </div>
        </div>
    );
}