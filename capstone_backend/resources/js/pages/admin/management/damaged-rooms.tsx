import { useEffect, useState } from "react";
import api from "@/services/api";

export default function DamagedRooms() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [repairingId, setRepairingId] = useState<number | null>(null);

  // 🔥 NEW STATE FOR IMAGE PREVIEW
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const getDamagedRooms = async () => {
    try {
      setLoading(true);
      const res = await api.get("/rooms/damaged");

      const data = Array.isArray(res.data)
        ? res.data
        : res.data?.data || [];

      setRooms(data);
    } catch (err) {
      console.log("Error fetching damaged rooms:", err);
    } finally {
      setLoading(false);
    }
  };

  const repairRoom = async (id: number) => {
    try {
      setRepairingId(id);
      await api.post(`/rooms/${id}/repair`);
      await getDamagedRooms();
    } catch (err) {
      console.log("Repair error:", err);
    } finally {
      setRepairingId(null);
    }
  };

  useEffect(() => {
    getDamagedRooms();
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        🛠 Damaged Rooms
      </h1>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : rooms.length === 0 ? (
        <p className="text-gray-500">No damaged rooms</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rooms.map((room) => {
            const cleanerName = room.cleaner
              ? `${room.cleaner.first_name} ${room.cleaner.last_name}`
              : "N/A";

            const guestName =
              room.damage_summary?.guest || "N/A";

            const bookingDisplay =
              room.damage_summary?.booking_reference &&
              room.damage_summary?.booking_id
                ? `${room.damage_summary.booking_reference} - ${room.damage_summary.booking_id}`
                : "N/A";

            return (
              <div
                key={room.id}
                className="bg-white rounded-2xl shadow-md p-5 border hover:shadow-lg transition"
              >
                {/* HEADER */}
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-gray-800">
                    Room {room.room_number}
                  </h2>

                  <span className="text-xs px-3 py-1 bg-red-100 text-red-600 rounded-full font-semibold">
                    Damaged
                  </span>
                </div>

                {/* NOTE */}
                {room.damage_note && (
                  <p className="mt-2 text-gray-700 text-sm italic">
                    "{room.damage_note}"
                  </p>
                )}

                {/* 🔥 CLICKABLE IMAGE */}
                {room.damage_photo_url && (
                  <img
                    src={room.damage_photo_url}
                    alt="Damage"
                    onClick={() =>
                      setPreviewImage(room.damage_photo_url)
                    }
                    className="w-full h-40 object-cover mt-3 rounded-xl border cursor-pointer hover:opacity-80 transition"
                  />
                )}

                {/* INFO */}
                <div className="mt-4 text-sm space-y-1">
                  <p className="text-gray-500">
                    Reported By:{" "}
                    <span className="font-medium text-gray-800">
                      {cleanerName}
                    </span>
                  </p>

                  <p className="text-gray-500">
                    Date:{" "}
                    <span className="font-medium text-gray-800">
                      {room.completed_at
                        ? new Date(
                            room.completed_at
                          ).toLocaleString()
                        : "N/A"}
                    </span>
                  </p>
                </div>

                {/* BOOKING */}
                <div className="mt-4 p-3 bg-gray-50 rounded-xl border">
                  <p className="font-semibold text-gray-600 mb-1">
                    Booking Info
                  </p>

                  <p className="text-sm text-gray-500">
                    Guest:{" "}
                    <span className="font-medium text-gray-800">
                      {guestName}
                    </span>
                  </p>

                  <p className="text-sm text-gray-500">
                    Ref ID:{" "}
                    <span className="font-medium text-gray-800">
                      {bookingDisplay}
                    </span>
                  </p>
                </div>

                {/* BUTTON */}
                <button
                  onClick={() => repairRoom(room.id)}
                  disabled={repairingId === room.id}
                  className={`mt-4 w-full py-2 rounded-xl text-white font-semibold ${
                    repairingId === room.id
                      ? "bg-gray-400"
                      : "bg-green-500 hover:bg-green-600"
                  }`}
                >
                  {repairingId === room.id
                    ? "Repairing..."
                    : "✔ Mark as Repaired"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 🔥 IMAGE PREVIEW MODAL */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl w-full p-4">
            {/* CLOSE BUTTON */}
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 text-white text-2xl font-bold"
            >
              ✖
            </button>

            {/* FULL IMAGE */}
            <img
              src={previewImage}
              alt="Preview"
              className="w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}