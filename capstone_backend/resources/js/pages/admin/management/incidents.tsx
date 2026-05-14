import { useEffect, useState } from "react";
import api, { API_BASE } from "@/services/api";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&display=swap');

  .dr-root {
    padding: 32px;
    min-height: 100vh;
    font-family: 'DM Sans', sans-serif;
  }

  .dr-page-header {
    margin-bottom: 32px;
  }

  .dr-page-title {
    font-family: 'Playfair Display', serif;
    font-size: 28px;
    font-weight: 700;
    color: #1a1a18;
    margin: 0 0 4px 0;
    letter-spacing: -0.5px;
  }

  .dr-page-subtitle {
    font-size: 13px;
    color: #8a8878;
    font-weight: 400;
    letter-spacing: 0.02em;
  }

  /* Card */
  .dr-card {
    background: #ffffff;
    border-radius: 16px;
    border: 1px solid #e8e6df;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04);
    overflow: hidden;
  }

  .dr-card-header {
    padding: 22px 28px 20px;
    border-bottom: 1px solid #eeece6;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .dr-card-title {
    font-family: 'Playfair Display', serif;
    font-size: 16px;
    font-weight: 600;
    color: #1a1a18;
    margin: 0;
  }

  .dr-count-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 9px;
    border-radius: 12px;
    background: #3eb489;
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    letter-spacing: 0.04em;
  }

  /* Empty / Loading states */
  .dr-state {
    padding: 60px 28px;
    text-align: center;
    color: #8a8878;
    font-size: 14px;
  }

  .dr-state-icon {
    font-size: 36px;
    margin-bottom: 12px;
    display: block;
  }

  /* Table */
  .dr-table-wrap {
    overflow-x: auto;
  }

  .dr-table {
    width: 100%;
    border-collapse: collapse;
    font-family: 'DM Sans', sans-serif;
    font-size: 13.5px;
  }

  .dr-table thead tr {
    background: #f8f7f4;
    border-bottom: 1px solid #e8e6df;
  }

  .dr-table thead th {
    padding: 12px 16px;
    text-align: left;
    font-size: 10.5px;
    font-weight: 700;
    color: #8a8878;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .dr-table tbody tr {
    border-bottom: 1px solid #f2f0eb;
    transition: background 0.12s ease;
  }

  .dr-table tbody tr:last-child {
    border-bottom: none;
  }

  .dr-table tbody tr:hover {
    background: #f9f8f5;
  }

  .dr-table tbody td {
    padding: 14px 16px;
    color: #1a1a18;
    vertical-align: middle;
  }

  /* Room number */
  .dr-room-num {
    font-family: 'Playfair Display', serif;
    font-size: 15px;
    font-weight: 700;
    color: #1a1a18;
    white-space: nowrap;
  }

  /* Type badges */
  .dr-badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 6px;
    font-size: 11.5px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    white-space: nowrap;
  }

  .dr-badge-damaged  { background: #fdeaea; color: #b54040; }
  .dr-badge-lost     { background: #fef8e1; color: #9a6e00; }
  .dr-badge-other    { background: #e8f5ee; color: #1e7a45; }

  /* Status badges */
  .dr-status-resolved  { background: #e8f5ee; color: #1e7a45; }
  .dr-status-repairing { background: #e8f0ff; color: #3b5bdb; }
  .dr-status-pending   { background: #fff2e5; color: #c05e00; }

  /* Note */
  .dr-note {
    font-size: 12.5px;
    font-style: italic;
    color: #6b6960;
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Photos */
  .dr-photos {
    display: flex;
    gap: 5px;
    align-items: center;
  }

  .dr-photo-thumb {
    height: 38px;
    width: 38px;
    object-fit: cover;
    border-radius: 8px;
    border: 1.5px solid #e8e6df;
    cursor: pointer;
    transition: all 0.14s ease;
  }

  .dr-photo-thumb:hover {
    border-color: #3eb489;
    transform: scale(1.06);
    box-shadow: 0 2px 8px rgba(62,180,137,0.2);
  }

  .dr-photo-more {
    font-size: 11px;
    font-weight: 600;
    color: #8a8878;
    background: #f2f0eb;
    border-radius: 6px;
    padding: 2px 7px;
    white-space: nowrap;
  }

  .dr-no-photos {
    font-size: 12px;
    color: #b0ae9f;
    font-style: italic;
  }

  /* Person / date */
  .dr-person {
    font-size: 13px;
    font-weight: 500;
    color: #2e2e2c;
    white-space: nowrap;
  }

  .dr-date {
    font-size: 12px;
    color: #6b6960;
    white-space: nowrap;
  }

  .dr-ref {
    font-size: 12px;
    color: #6b6960;
    font-family: monospace;
    background: #f2f0eb;
    padding: 2px 7px;
    border-radius: 5px;
    white-space: nowrap;
  }

  .dr-na {
    font-size: 12px;
    color: #b0ae9f;
  }

  /* Action buttons */
  .dr-btn-resolve {
    height: 32px;
    padding: 0 14px;
    border-radius: 8px;
    border: none;
    background: #3eb489;
    color: #fff;
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.16s ease;
    white-space: nowrap;
    box-shadow: 0 1px 4px rgba(62,180,137,0.25);
  }

  .dr-btn-resolve:hover:not(:disabled) {
    background: #31a07a;
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(62,180,137,0.35);
  }

  .dr-btn-resolve:disabled {
    background: #c8c4bc;
    cursor: not-allowed;
    box-shadow: none;
  }

  .dr-resolved-label {
    font-size: 12px;
    font-weight: 600;
    color: #1e7a45;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  /* Modal */
  .dr-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(10,10,8,0.82);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999;
    backdrop-filter: blur(4px);
    animation: dr-fade-in 0.18s ease;
  }

  @keyframes dr-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .dr-modal-inner {
    position: relative;
    max-width: 860px;
    width: calc(100% - 48px);
    animation: dr-scale-in 0.2s ease;
  }

  @keyframes dr-scale-in {
    from { opacity: 0; transform: scale(0.95); }
    to   { opacity: 1; transform: scale(1); }
  }

  .dr-modal-img {
    width: 100%;
    max-height: 88vh;
    object-fit: contain;
    border-radius: 14px;
    box-shadow: 0 24px 64px rgba(0,0,0,0.6);
  }

  .dr-modal-close {
    position: absolute;
    top: -14px;
    right: -14px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #fff;
    border: none;
    font-size: 16px;
    font-weight: 700;
    color: #1a1a18;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 12px rgba(0,0,0,0.3);
    transition: all 0.14s ease;
  }

  .dr-modal-close:hover {
    background: #1a1a18;
    color: #fff;
  }

  /* Loading skeleton pulse */
  .dr-loading {
    padding: 48px 28px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .dr-skeleton-row {
    height: 48px;
    border-radius: 8px;
    background: linear-gradient(90deg, #f2f0eb 25%, #e8e6df 50%, #f2f0eb 75%);
    background-size: 200% 100%;
    animation: dr-shimmer 1.4s infinite;
  }

  @keyframes dr-shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

export default function DamagedRooms() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [repairingId, setRepairingId] = useState<number | null>(null);

  const getDamagedRooms = async () => {
    try {
      setLoading(true);
      const res = await api.get("/housekeeper/incidents");
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
      await api.put(`/housekeeper/incidents/${id}/status`, { status: "resolved" });
      await getDamagedRooms();
    } catch (err) {
      console.log("Resolve error:", err);
    } finally {
      setRepairingId(null);
    }
  };

  useEffect(() => { getDamagedRooms(); }, []);

  const getTypeBadgeClass = (type: string) => {
    if (type === "damaged") return "dr-badge dr-badge-damaged";
    if (type === "lost") return "dr-badge dr-badge-lost";
    return "dr-badge dr-badge-other";
  };

  const getStatusBadgeClass = (status: string) => {
    if (status === "resolved") return "dr-badge dr-status-resolved";
    if (status === "repairing") return "dr-badge dr-status-repairing";
    return "dr-badge dr-status-pending";
  };

  return (
    <>
      <style>{styles}</style>
      <div className="dr-root">
        {/* Header */}
        <div className="dr-page-header">
          <h1 className="dr-page-title">Room Incidents</h1>
          <p className="dr-page-subtitle">Track and manage room incidents</p>
        </div>

        {/* Card */}
        <div className="dr-card">
          <div className="dr-card-header">
            <h2 className="dr-card-title">All Incidents</h2>
            {!loading && (
              <span className="dr-count-badge">{rooms.length} records</span>
            )}
          </div>

          {loading ? (
            <div className="dr-loading">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="dr-skeleton-row"
                  style={{ animationDelay: `${i * 0.08}s`, opacity: 1 - i * 0.15 }}
                />
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <div className="dr-state">
              <span className="dr-state-icon">📋</span>
              No room incidents found
            </div>
          ) : (
            <div className="dr-table-wrap">
              <table className="dr-table">
                <thead>
                  <tr>
                    <th>Room</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Note</th>
                    <th>Photos</th>
                    <th>Reported By</th>
                    <th>Date</th>
                    <th>Guest</th>
                    <th>Booking Ref</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((report) => {
                    const cleanerName = report.cleaner
                      ? `${report.cleaner.first_name} ${report.cleaner.last_name}`
                      : null;

                    const guestName = report.booking?.guest_name || null;

                    const bookingRef = report.booking
                      ? `${report.booking.booking_reference}`
                      : null;

                    return (
                      <tr key={report.id}>
                        {/* Room */}
                        <td>
                          <span className="dr-room-num">
                            {report.room?.room_number ?? "—"}
                          </span>
                        </td>

                        {/* Type */}
                        <td>
                          <span className={getTypeBadgeClass(report.report_type)}>
                            {report.report_type}
                          </span>
                        </td>

                        {/* Status */}
                        <td>
                          <span className={getStatusBadgeClass(report.status)}>
                            {report.status}
                          </span>
                        </td>

                        {/* Note */}
                        <td>
                          {report.note
                            ? <span className="dr-note">"{report.note}"</span>
                            : <span className="dr-na">—</span>
                          }
                        </td>

                        {/* Photos */}
                        <td>
                          {report.photos?.length > 0 ? (
                            <div className="dr-photos">
                              {report.photos.slice(0, 3).map((photo: string, index: number) => (
                                <img
                                  key={index}
                                  src={`${API_BASE}/storage/${photo}`}
                                  alt="Damage"
                                  className="dr-photo-thumb"
                                  onClick={() => setPreviewImage(`${API_BASE}/storage/${photo}`)}
                                />
                              ))}
                              {report.photos.length > 3 && (
                                <span className="dr-photo-more">+{report.photos.length - 3}</span>
                              )}
                            </div>
                          ) : (
                            <span className="dr-no-photos">No photos</span>
                          )}
                        </td>

                        {/* Reported By */}
                        <td>
                          {cleanerName
                            ? <span className="dr-person">{cleanerName}</span>
                            : <span className="dr-na">—</span>
                          }
                        </td>

                        {/* Date */}
                        <td>
                          {report.reported_at
                            ? <span className="dr-date">
                              {new Date(report.reported_at).toLocaleString("en-PH", {
                                month: "short", day: "numeric", year: "numeric",
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </span>
                            : <span className="dr-na">—</span>
                          }
                        </td>

                        {/* Guest */}
                        <td>
                          {guestName
                            ? <span className="dr-person">{guestName}</span>
                            : <span className="dr-na">—</span>
                          }
                        </td>

                        {/* Booking Ref */}
                        <td>
                          {bookingRef
                            ? <span className="dr-ref">{bookingRef}</span>
                            : <span className="dr-na">—</span>
                          }
                        </td>

                        {/* Action */}
                        <td>
                          {report.status !== "resolved" ? (
                            <button
                              className="dr-btn-resolve"
                              onClick={() => markResolved(report.id)}
                              disabled={repairingId === report.id}
                            >
                              {repairingId === report.id ? "Updating..." : "Mark Resolved"}
                            </button>
                          ) : (
                            <span className="dr-resolved-label">
                              ✔ Resolved
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="dr-modal-backdrop"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="dr-modal-inner"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="dr-modal-close"
              onClick={() => setPreviewImage(null)}
            >
              ✕
            </button>
            <img
              src={previewImage}
              alt="Damage preview"
              className="dr-modal-img"
            />
          </div>
        </div>
      )}
    </>
  );
}