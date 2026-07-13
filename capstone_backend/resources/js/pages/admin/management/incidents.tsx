import { useEffect, useState } from "react";
import api, { API_BASE } from "@/services/api";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&display=swap');

  .dr-root {
    padding: 32px;
    min-height: 100vh;
    font-family: 'DM Sans', sans-serif;
    animation: dr-fade-in-page 0.5s ease;
  }

  @keyframes dr-fade-in-page {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
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
    animation: dr-slide-up 0.5s ease;
  }

  @keyframes dr-slide-up {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .dr-card-header {
    padding: 22px 28px 20px;
    border-bottom: 1px solid #eeece6;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
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
    animation: dr-badge-pop 0.3s ease;
  }

  @keyframes dr-badge-pop {
    from { transform: scale(0.8); opacity: 0; }
    to   { transform: scale(1); opacity: 1; }
  }

  .dr-header-controls {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  /* Page size dropdown */
  .dr-page-size-select {
    padding: 6px 32px 6px 12px;
    border-radius: 8px;
    border: 1px solid #e0ddd6;
    background: #fff;
    font-size: 12px;
    font-family: 'DM Sans', sans-serif;
    font-weight: 500;
    color: #1a1a18;
    cursor: pointer;
    outline: none;
    transition: all 0.2s ease;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%238a8878'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    min-width: 90px;
  }

  .dr-page-size-select:hover {
    border-color: #3eb489;
  }

  .dr-page-size-select:focus {
    border-color: #3eb489;
    box-shadow: 0 0 0 3px rgba(62,180,137,0.1);
  }

  .dr-page-size-select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Pagination */
  .dr-pagination {
    padding: 16px 28px;
    border-top: 1px solid #f2f0eb;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    animation: dr-fade-in 0.3s ease;
  }

  @keyframes dr-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .dr-pagination-info {
    font-size: 12.5px;
    color: #8a8878;
  }

  .dr-pagination-controls {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .dr-page-btn {
    height: 34px;
    min-width: 34px;
    padding: 0 10px;
    border-radius: 8px;
    border: 1px solid #e0ddd6;
    background: transparent;
    color: #6b6960;
    font-size: 13px;
    font-weight: 500;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .dr-page-btn:hover:not(:disabled):not(.dr-page-active) {
    border-color: #3eb489;
    color: #3eb489;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(62,180,137,0.15);
  }

  .dr-page-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
    transform: none !important;
  }

  .dr-page-active {
    background: #3eb489;
    border-color: #3eb489;
    color: #fff;
    animation: dr-page-pulse 0.3s ease;
  }

  @keyframes dr-page-pulse {
    0%   { transform: scale(0.9); }
    50%  { transform: scale(1.05); }
    100% { transform: scale(1); }
  }

  .dr-page-ellipsis {
    padding: 0 4px;
    color: #8a8878;
    font-size: 13px;
  }

  /* Empty / Loading states */
  .dr-state {
    padding: 60px 28px;
    text-align: center;
    color: #8a8878;
    font-size: 14px;
    animation: dr-fade-in 0.4s ease;
  }

  .dr-state-icon {
    font-size: 36px;
    margin-bottom: 12px;
    display: block;
  }

  /* Table */
  .dr-table-wrap {
    overflow-x: auto;
    position: relative;
  }

  .dr-table {
    width: 100%;
    border-collapse: collapse;
    font-family: 'DM Sans', sans-serif;
    font-size: 13.5px;
    min-width: 1200px;
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
    position: sticky;
    top: 0;
    background: #f8f7f4;
    z-index: 2;
  }

  .dr-table tbody tr {
    border-bottom: 1px solid #f2f0eb;
    transition: all 0.2s ease;
    animation: dr-row-slide 0.35s ease forwards;
    opacity: 0;
  }

  .dr-table tbody tr:nth-child(1) { animation-delay: 0.015s; }
  .dr-table tbody tr:nth-child(2) { animation-delay: 0.03s; }
  .dr-table tbody tr:nth-child(3) { animation-delay: 0.045s; }
  .dr-table tbody tr:nth-child(4) { animation-delay: 0.06s; }
  .dr-table tbody tr:nth-child(5) { animation-delay: 0.075s; }
  .dr-table tbody tr:nth-child(6) { animation-delay: 0.09s; }
  .dr-table tbody tr:nth-child(7) { animation-delay: 0.105s; }
  .dr-table tbody tr:nth-child(8) { animation-delay: 0.12s; }
  .dr-table tbody tr:nth-child(9) { animation-delay: 0.135s; }
  .dr-table tbody tr:nth-child(10) { animation-delay: 0.15s; }
  .dr-table tbody tr:nth-child(11) { animation-delay: 0.165s; }
  .dr-table tbody tr:nth-child(12) { animation-delay: 0.18s; }
  .dr-table tbody tr:nth-child(13) { animation-delay: 0.195s; }
  .dr-table tbody tr:nth-child(14) { animation-delay: 0.21s; }
  .dr-table tbody tr:nth-child(15) { animation-delay: 0.225s; }
  .dr-table tbody tr:nth-child(16) { animation-delay: 0.24s; }
  .dr-table tbody tr:nth-child(17) { animation-delay: 0.255s; }
  .dr-table tbody tr:nth-child(18) { animation-delay: 0.27s; }
  .dr-table tbody tr:nth-child(19) { animation-delay: 0.285s; }
  .dr-table tbody tr:nth-child(20) { animation-delay: 0.30s; }

  @keyframes dr-row-slide {
    from { opacity: 0; transform: translateX(-10px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  .dr-table tbody tr:last-child {
    border-bottom: none;
  }

  .dr-table tbody tr:hover {
    background: #f9f8f5;
    transform: scale(1.001);
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
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

  /* Type badges with hover animation */
  .dr-badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 6px;
    font-size: 11.5px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    white-space: nowrap;
    transition: all 0.2s ease;
  }

  .dr-badge:hover {
    transform: scale(1.05);
  }

  .dr-badge-damaged  { background: #fdeaea; color: #b54040; }
  .dr-badge-lost     { background: #fef8e1; color: #9a6e00; }
  .dr-badge-found    { background: #e8f5ee; color: #1e7a45; }

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
    transition: all 0.25s ease;
  }

  .dr-photo-thumb:hover {
    border-color: #3eb489;
    transform: scale(1.12) rotate(-2deg);
    box-shadow: 0 4px 12px rgba(62,180,137,0.25);
    z-index: 3;
    position: relative;
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
    transition: all 0.2s ease;
  }

  .dr-ref:hover {
    background: #3eb489;
    color: #fff;
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
    transition: all 0.25s ease;
    white-space: nowrap;
    box-shadow: 0 1px 4px rgba(62,180,137,0.25);
    position: relative;
    overflow: hidden;
  }

  .dr-btn-resolve::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%);
    transform: translateX(-100%);
    transition: transform 0.6s ease;
  }

  .dr-btn-resolve:hover:not(:disabled)::after {
    transform: translateX(100%);
  }

  .dr-btn-resolve:hover:not(:disabled) {
    background: #31a07a;
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 4px 14px rgba(62,180,137,0.4);
  }

  .dr-btn-resolve:active:not(:disabled) {
    transform: scale(0.95);
  }

  .dr-btn-resolve:disabled {
    background: #c8c4bc;
    cursor: not-allowed;
    box-shadow: none;
    transform: none !important;
  }

  .dr-resolved-label {
    font-size: 12px;
    font-weight: 600;
    color: #1e7a45;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    animation: dr-check-pop 0.4s ease;
  }

  @keyframes dr-check-pop {
    0%   { transform: scale(0.5); opacity: 0; }
    60%  { transform: scale(1.2); }
    100% { transform: scale(1); opacity: 1; }
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
    animation: dr-fade-in 0.2s ease;
  }

  .dr-modal-inner {
    position: relative;
    max-width: 860px;
    width: calc(100% - 48px);
    animation: dr-scale-in 0.25s ease;
  }

  @keyframes dr-scale-in {
    from { opacity: 0; transform: scale(0.92) translateY(10px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
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
    transition: all 0.25s ease;
  }

  .dr-modal-close:hover {
    background: #1a1a18;
    color: #fff;
    transform: rotate(90deg) scale(1.05);
  }

  /* Loading skeleton pulse - smooth like transactions */
  .dr-loading {
    padding: 48px 28px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .dr-skeleton-row {
    height: 52px;
    border-radius: 10px;
    background: linear-gradient(90deg, #f2f0eb 20%, #e8e6df 40%, #f2f0eb 60%);
    background-size: 300% 100%;
    animation: dr-shimmer 1.8s ease-in-out infinite;
    opacity: 0.6;
    transition: opacity 0.3s ease;
  }

  .dr-skeleton-row:nth-child(odd) {
    opacity: 0.7;
  }

  .dr-skeleton-row:nth-child(even) {
    opacity: 0.5;
  }

  @keyframes dr-shimmer {
    0%   { background-position: 300% 0; }
    100% { background-position: -300% 0; }
  }

  /* Content transition for page changes */
  .dr-content-transition {
    transition: opacity 0.3s ease;
  }

  .dr-content-loading {
    opacity: 0.5;
    pointer-events: none;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .dr-root {
      padding: 16px;
    }
    .dr-card-header {
      flex-direction: column;
      align-items: stretch;
    }
    .dr-header-controls {
      flex-wrap: wrap;
    }
    .dr-pagination {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
  }
`;

interface RoomIncident {
  id: number;
  room_id: number;
  cleaner_id: number | null;
  booking_id: number | null;
  report_type: 'damaged' | 'lost' | 'found';
  status: 'pending' | 'repairing' | 'resolved';
  note: string | null;
  photos: string[];
  reported_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  room: {
    id: number;
    room_number: string;
  } | null;
  cleaner: {
    id: number;
    first_name: string;
    last_name: string;
  } | null;
  resolvedBy: {
    id: number;
    first_name: string;
    last_name: string;
  } | null;
  booking: {
    id: number;
    booking_reference: string;
    guest_name: string | null;
    user: {
      id: number;
      first_name: string;
      last_name: string;
    } | null;
    walkInGuest: {
      id: number;
      first_name: string;
      middle_name: string | null;
      last_name: string;
    } | null;
  } | null;
}

export default function DamagedRooms() {
  const [rooms, setRooms] = useState<RoomIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [repairingId, setRepairingId] = useState<number | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isChangingPage, setIsChangingPage] = useState(false);

  const getDamagedRooms = async (page: number = 1, size: number = 10) => {
    try {
      setLoading(true);
      const res = await api.get("/housekeeper/incidents", {
        params: { page, per_page: size }
      });
      
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setRooms(data);
      
      if (res.data?.total !== undefined) {
        setTotalRecords(res.data.total);
        setTotalPages(res.data.last_page || 1);
      } else {
        setTotalRecords(data.length);
        setTotalPages(Math.ceil(data.length / size));
      }
      setCurrentPage(page);
    } catch (err) {
      console.log("Error fetching reports:", err);
    } finally {
      setLoading(false);
      setIsChangingPage(false);
    }
  };

  const markResolved = async (id: number) => {
    try {
      setRepairingId(id);
      await api.put(`/housekeeper/incidents/${id}/status`, { status: "resolved" });
      await getDamagedRooms(currentPage, pageSize);
    } catch (err) {
      console.log("Resolve error:", err);
    } finally {
      setRepairingId(null);
    }
  };

  useEffect(() => { 
    getDamagedRooms(1, pageSize); 
  }, []);

  const handlePageChange = (page: number) => {
    if (page === currentPage || page < 1 || page > totalPages) return;
    setIsChangingPage(true);
    setCurrentPage(page);
    getDamagedRooms(page, pageSize);
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const size = parseInt(e.target.value);
    if (size === pageSize) return;
    setPageSize(size);
    setCurrentPage(1);
    getDamagedRooms(1, size);
  };

  const getTypeBadgeClass = (type: string) => {
    if (type === "damaged") return "dr-badge dr-badge-damaged";
    if (type === "lost") return "dr-badge dr-badge-lost";
    return "dr-badge dr-badge-found";
  };

  const getStatusBadgeClass = (status: string) => {
    if (status === "resolved") return "dr-badge dr-status-resolved";
    if (status === "repairing") return "dr-badge dr-status-repairing";
    return "dr-badge dr-status-pending";
  };

  const startRange = totalRecords > 0 ? Math.min((currentPage - 1) * pageSize + 1, totalRecords) : 0;
  const endRange = totalRecords > 0 ? Math.min(currentPage * pageSize, totalRecords) : 0;

  const showSkeleton = loading && !isChangingPage;

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
            <div className="dr-header-controls">
              {!showSkeleton && (
                <span className="dr-count-badge">{totalRecords} records</span>
              )}
              <select
                className="dr-page-size-select"
                value={pageSize}
                onChange={handlePageSizeChange}
                disabled={showSkeleton}
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
          </div>

          {showSkeleton ? (
            <div className="dr-loading">
              {[...Array(Math.min(pageSize, 20))].map((_, i) => (
                <div
                  key={i}
                  className="dr-skeleton-row"
                  style={{ animationDelay: `${i * 0.04}s` }}
                />
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <div className="dr-state">
              No room incidents found
            </div>
          ) : (
            <>
              <div className={`dr-table-wrap ${isChangingPage ? 'dr-content-loading' : ''}`}>
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

                      let guestName: string | null = null;
                      if (report.booking) {
                        if (report.booking.guest_name) {
                          guestName = report.booking.guest_name;
                        } else if (report.booking.user) {
                          guestName = `${report.booking.user.first_name} ${report.booking.user.last_name}`;
                        } else if (report.booking.walkInGuest) {
                          const wg = report.booking.walkInGuest;
                          guestName = `${wg.first_name} ${wg.middle_name ? wg.middle_name + ' ' : ''}${wg.last_name}`;
                        }
                      }

                      const bookingRef = report.booking?.booking_reference || null;

                      return (
                        <tr key={report.id}>
                          <td>
                            <span className="dr-room-num">
                              {report.room?.room_number ?? "—"}
                            </span>
                          </td>

                          <td>
                            <span className={getTypeBadgeClass(report.report_type)}>
                              {report.report_type}
                            </span>
                          </td>

                          <td>
                            <span className={getStatusBadgeClass(report.status)}>
                              {report.status}
                            </span>
                          </td>

                          <td>
                            {report.note
                              ? <span className="dr-note">"{report.note}"</span>
                              : <span className="dr-na">—</span>
                            }
                          </td>

                          <td>
                            {report.photos && report.photos.length > 0 ? (
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

                          <td>
                            {cleanerName
                              ? <span className="dr-person">{cleanerName}</span>
                              : <span className="dr-na">—</span>
                            }
                          </td>

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

                          <td>
                            {guestName
                              ? <span className="dr-person">{guestName}</span>
                              : <span className="dr-na">—</span>
                            }
                          </td>

                          <td>
                            {bookingRef
                              ? <span className="dr-ref">{bookingRef}</span>
                              : <span className="dr-na">—</span>
                            }
                          </td>

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

              {/* Pagination */}
              <div className="dr-pagination">
                <span className="dr-pagination-info">
                  {totalRecords > 0 
                    ? `Showing ${startRange}–${endRange} of ${totalRecords} incidents`
                    : "No incidents found"
                  }
                </span>

                <div className="dr-pagination-controls">
                  <button
                    className="dr-page-btn"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                  >
                    ‹
                  </button>

                  {(() => {
                    const pages: (number | string)[] = [];
                    const total = totalPages;
                    
                    if (total <= 7) {
                      for (let i = 1; i <= total; i++) {
                        pages.push(i);
                      }
                    } else if (currentPage <= 4) {
                      for (let i = 1; i <= 5; i++) {
                        pages.push(i);
                      }
                      pages.push('...');
                      pages.push(total);
                    } else if (currentPage >= total - 3) {
                      pages.push(1);
                      pages.push('...');
                      for (let i = total - 4; i <= total; i++) {
                        pages.push(i);
                      }
                    } else {
                      pages.push(1);
                      pages.push('...');
                      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                        pages.push(i);
                      }
                      pages.push('...');
                      pages.push(total);
                    }
                    
                    return pages.map((p, index) => {
                      if (p === '...') {
                        return (
                          <span key={`ellipsis-${index}`} className="dr-page-ellipsis">…</span>
                        );
                      }
                      const pageNum = p as number;
                      return (
                        <button
                          key={pageNum}
                          className={`dr-page-btn ${currentPage === pageNum ? "dr-page-active" : ""}`}
                          onClick={() => handlePageChange(pageNum)}
                          disabled={loading}
                        >
                          {pageNum}
                        </button>
                      );
                    });
                  })()}

                  <button
                    className="dr-page-btn"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0 || loading}
                  >
                    ›
                  </button>
                </div>
              </div>
            </>
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