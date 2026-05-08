import { useEffect, useState } from "react";
import api, { API_BASE } from "@/services/api";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function DamagedRooms() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [repairingId, setRepairingId] = useState<number | null>(null);

  const getDamagedRooms = async () => {
    try {
      setLoading(true);
      const res = await api.get("/housekeeper/damage-reports");
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setRooms(data);
    } catch (err) {
      console.log("Error fetching reports:", err);
    } finally {
      setLoading(false);
    }
  };

  const markResolved = async (id: number) => {
    try {
      setRepairingId(id);
      await api.put(`/housekeeper/damage-reports/${id}/status`, {
        status: "resolved",
      });
      await getDamagedRooms();
    } catch (err) {
      console.log("Resolve error:", err);
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
        🛠 Room Damage Reports
      </h1>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : rooms.length === 0 ? (
        <p className="text-gray-500">No reports found</p>
      ) : (
        <div className="rounded-md bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="font-semibold text-gray-700">Room</TableHead>
                <TableHead className="font-semibold text-gray-700">Type</TableHead>
                <TableHead className="font-semibold text-gray-700">Status</TableHead>
                <TableHead className="font-semibold text-gray-700">Note</TableHead>
                <TableHead className="font-semibold text-gray-700">Photos</TableHead>
                <TableHead className="font-semibold text-gray-700">Reported By</TableHead>
                <TableHead className="font-semibold text-gray-700">Date</TableHead>
                <TableHead className="font-semibold text-gray-700">Guest</TableHead>
                <TableHead className="font-semibold text-gray-700">Booking Ref</TableHead>
                <TableHead className="font-semibold text-gray-700">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rooms.map((report) => {
                const cleanerName = report.cleaner
                  ? `${report.cleaner.first_name} ${report.cleaner.last_name}`
                  : "N/A";

                const guestName = report.booking?.user
                  ? `${report.booking.user.first_name} ${report.booking.user.last_name}`
                  : report.booking?.walk_in_guest?.guest_name || "N/A";

                const bookingDisplay = report.booking
                  ? `${report.booking.booking_reference} - ${report.booking.id}`
                  : "N/A";

                return (
                  <TableRow key={report.id} className="hover:bg-gray-50 transition">
                    {/* ROOM */}
                    <TableCell className="font-bold text-gray-800">
                      Room {report.room?.room_number}
                    </TableCell>

                    {/* TYPE */}
                    <TableCell>
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-semibold ${report.report_type === "damaged"
                          ? "bg-red-100 text-red-600"
                          : report.report_type === "lost"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                          }`}
                      >
                        {report.report_type}
                      </span>
                    </TableCell>

                    {/* STATUS */}
                    <TableCell>
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-semibold ${report.status === "resolved"
                          ? "bg-green-100 text-green-700"
                          : report.status === "repairing"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-orange-100 text-orange-700"
                          }`}
                      >
                        {report.status}
                      </span>
                    </TableCell>

                    {/* NOTE */}
                    <TableCell className="text-sm italic text-gray-600 max-w-[180px] truncate">
                      "{report.note}"
                    </TableCell>

                    {/* PHOTOS */}
                    <TableCell>
                      {report.photos?.length > 0 ? (
                        <div className="flex gap-1">
                          {report.photos.slice(0, 3).map(
                            (photo: string, index: number) => (
                              <img
                                key={index}
                                src={`${API_BASE}/storage/${photo}`}
                                alt="Damage"
                                onClick={() =>
                                  setPreviewImage(`${API_BASE}/storage/${photo}`)
                                }
                                className="h-10 w-10 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition"
                              />
                            )
                          )}
                          {report.photos.length > 3 && (
                            <span className="text-xs text-gray-400 self-center ml-1">
                              +{report.photos.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No photos</span>
                      )}
                    </TableCell>

                    {/* REPORTED BY */}
                    <TableCell className="text-sm text-gray-700">
                      {cleanerName}
                    </TableCell>

                    {/* DATE */}
                    <TableCell className="text-sm text-gray-700 whitespace-nowrap">
                      {report.reported_at
                        ? new Date(report.reported_at).toLocaleString()
                        : "N/A"}
                    </TableCell>

                    {/* GUEST */}
                    <TableCell className="text-sm text-gray-700">
                      {guestName}
                    </TableCell>

                    {/* BOOKING REF */}
                    <TableCell className="text-sm text-gray-700">
                      {bookingDisplay}
                    </TableCell>

                    {/* ACTION */}
                    <TableCell>
                      {report.status !== "resolved" ? (
                        <button
                          onClick={() => markResolved(report.id)}
                          disabled={repairingId === report.id}
                          className={`px-3 py-1.5 rounded-lg text-white text-xs font-semibold whitespace-nowrap transition ${repairingId === report.id
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-green-500 hover:bg-green-600"
                            }`}
                        >
                          {repairingId === report.id ? "Updating..." : "✔ Mark Resolved"}
                        </button>
                      ) : (
                        <span className="text-xs text-green-600 font-semibold">
                          ✔ Resolved
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* IMAGE MODAL */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl w-full p-4">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 text-white text-2xl font-bold"
            >
              ✖
            </button>
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