import React from "react";
import {
    useParams,
    useNavigate,
    useLocation,
    useNavigationType,
} from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { message, Modal, Input, Typography } from "antd";
import { Spin } from "antd";
import BookingDetails, {
    type BookingData,
    type RoomDetail,
    type StaffAttribution,
    type TimelineItem,
} from "@/components/AdminComponents/booking/BookingDetailsPage";
import PageLoader from "@/components/PageLoader";
import nProgress from "nprogress";
import "nprogress/nprogress.css";

const { Text } = Typography;

// Configure NProgress
nProgress.configure({
    minimum: 0.2,
    easing: "ease",
    speed: 500,
    showSpinner: false,
    trickleSpeed: 200,
});

// ---- helpers (same logic used in Bookings.tsx) ----

const formatDate = (date: string): string => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

const formatDateTime = (datetime: string): string => {
    if (!datetime) return "-";
    return new Date(datetime).toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const formatTime = (datetime: string): string => {
    if (!datetime) return "-";
    return new Date(datetime).toLocaleTimeString("en-PH", {
        hour: "2-digit",
        minute: "2-digit",
    });
};

const getGuestName = (booking: any): string => {
    if (booking.booking_type === "online") {
        const firstName = booking.user?.first_name ?? "";
        const lastName = booking.user?.last_name ?? "";
        return `${firstName} ${lastName}`.trim() || "N/A";
    }
    return booking.walk_in_guest?.full_name || "Guest";
};

const getGuestPhone = (booking: any): string => {
    if (booking.booking_type === "online") {
        return booking.user?.phone || "N/A";
    }
    return booking.walk_in_guest?.contact_number || "N/A";
};

const getGuestEmail = (booking: any): string | undefined => {
    if (booking.booking_type === "online") {
        return booking.user?.email || undefined;
    }
    return booking.walk_in_guest?.email || undefined;
};

const getGuestAddress = (booking: any): string | undefined => {
    if (booking.booking_type === "online") {
        return booking.user?.address || undefined;
    }
    return booking.walk_in_guest?.address || undefined;
};

const getGuestId = (booking: any): string | undefined => {
    if (booking.booking_type === "online") {
        return booking.user?.id_number || undefined;
    }
    return booking.walk_in_guest?.id_number || undefined;
};

/**
 * Derives the overall booking status from the individual booked_rooms' statuses.
 */
const deriveBookingStatus = (bookedRooms: any[], fallback: string): string => {
    if (!bookedRooms || bookedRooms.length === 0) return fallback;

    const statuses = bookedRooms.map((br) => br.status);

    if (statuses.every((s) => s === "checked_out")) return "checked_out";
    if (statuses.some((s) => s === "checked_in")) return "checked_in";
    if (statuses.every((s) => s === "cancelled")) return "cancelled";
    if (statuses.every((s) => s === "refunded")) return "refunded";
    if (statuses.every((s) => s === "confirmed" || s === "checked_out"))
        return "confirmed";
    if (statuses.some((s) => s === "confirmed")) return "confirmed";

    return fallback;
};

/**
 * Transforms the raw API booking response into the shape
 * required by the <BookingDetails /> component.
 */
const mapBookingToBookingData = (booking: any): BookingData => {
    const bookedRooms = booking.booked_rooms || [];
    const histories = booking.histories || [];

    // Build rooms with refund information
    const rooms: RoomDetail[] = bookedRooms.map((br: any) => {
        const isRefunded = br.status === "refunded";
        const refundAmount = isRefunded ? Number(br.subtotal ?? 0) : 0;

        return {
            id: br.id,
            room_number: br.room?.room_number || "N/A",
            room_type: br.room?.room_type?.type_name || "-",
            rate_plan:
                br.stay_type === "short_stay" ? "Short Stay" : "Overnight",
            rate: Number(br.price_at_time_of_booking ?? br.subtotal ?? 0),
            nights: 1,
            guests: `${booking.user ? 2 : 1} Adults`,
            dates: `${formatDate(br.check_in_date)} - ${formatDate(br.check_out_date)}`,
            status: (br.status || "pending").replace(/_/g, " ").toUpperCase(),
            image_url: br.room?.image_url || undefined,
            original_price: br.room?.room_type?.base_price || undefined,
            refund_amount: refundAmount,
            is_refunded: isRefunded,
        };
    });

    // Build timeline with proper user attribution and status transitions
    const timeline: TimelineItem[] = [];

    // Helper function to format status
    const formatStatus = (status: string): string => {
        if (!status || status === 'none') return 'PENDING';
        return status.replace(/_/g, " ").toUpperCase();
    };

    // 1. Add "Booking Created" event
    let createdBy = "System";
    let createdRole = "";
    if (booking.created_by) {
        createdBy = `${booking.created_by.first_name || ""} ${booking.created_by.last_name || ""}`.trim() || "System";
        createdRole = booking.created_by.role || "";
    }
    
    timeline.push({
        title: "Booking Created",
        description: "Booking request submitted",
        time: formatDateTime(booking.created_at || booking.check_in_date || new Date().toISOString()),
        by: createdBy,
        by_role: createdRole,
        status: "completed",
        old_status: undefined,
        new_status: "PENDING",
        is_override: false,
        override_reason: undefined,
    });

    // 2. Process ALL history entries (NO COMPLEX FILTERING)
    histories.forEach((h: any) => {
        // Skip "none -> pending" entries (these are just the initial creation)
        if (h.old_status === 'none' && h.new_status === 'pending') {
            return;
        }

        let userName = "System";
        let userRole = "";

        if (h.user) {
            userName = `${h.user.first_name || ""} ${h.user.last_name || ""}`.trim() || "System";
            userRole = h.user.role || "";
        } else if (h.changed_by_user) {
            userName = `${h.changed_by_user.first_name || ""} ${h.changed_by_user.last_name || ""}`.trim() || "System";
            userRole = h.changed_by_user.role || "";
        }

        // Format statuses with proper handling of 'none'
        const oldFormatted = h.old_status ? formatStatus(h.old_status) : "PENDING";
        const newFormatted = h.new_status ? formatStatus(h.new_status) : "PENDING";

        let title = "";
        let description = "";

        // Determine title and description based on status change
        const oldStatus = h.old_status === 'none' ? 'pending' : (h.old_status || 'pending');
        const newStatus = h.new_status === 'none' ? 'pending' : (h.new_status || 'pending');

        // Check if this is an archived (trash) entry
        if (newStatus === 'archived') {
            title = "Room Moved to Trash";
            description = `${oldFormatted} → ${newFormatted}`;
        }
        // Check if this is a restore entry
        else if (h.change_note && h.change_note.toLowerCase().includes('restored')) {
            title = "Room Restored";
            description = `${oldFormatted} → ${newFormatted}`;
        }
        // Check if this is an extend entry
        else if (h.change_note && h.change_note.toLowerCase().includes('extended')) {
            title = "Stay Extended";
            description = h.change_note || `${oldFormatted} → ${newFormatted}`;
        }
        // Check status transitions
        else if (oldStatus === "pending" && newStatus === "confirmed") {
            title = "Booking Confirmed";
            description = `${oldFormatted} → ${newFormatted}`;
        } else if (oldStatus === "confirmed" && newStatus === "checked_in") {
            title = "Guest Checked In";
            description = `${oldFormatted} → ${newFormatted}`;
        } else if (oldStatus === "checked_in" && newStatus === "checked_out") {
            title = "Guest Checked Out";
            description = `${oldFormatted} → ${newFormatted}`;
        } else if (newStatus === "cancelled") {
            title = "Booking Cancelled";
            description = oldFormatted !== "PENDING" ? `${oldFormatted} → ${newFormatted}` : newFormatted;
        } else if (newStatus === "refunded") {
            title = "Booking Refunded";
            description = oldFormatted !== "PENDING" ? `${oldFormatted} → ${newFormatted}` : newFormatted;
        } else {
            // Use change_note if available
            title = h.change_note || `Status Updated`;
            description = `${oldFormatted} → ${newFormatted}`;
        }

        // Add override info if present
        if (h.is_override && h.override_reason) {
            description += ` (Override: ${h.override_reason})`;
        }

        // Only add if title is not empty
        if (title) {
            timeline.push({
                title: title,
                description: description,
                time: formatDateTime(h.changed_at || h.created_at || new Date().toISOString()),
                by: userName,
                by_role: userRole,
                status: newStatus === "checked_out" ? "completed" : "pending",
                old_status: h.old_status ? formatStatus(h.old_status) : undefined,
                new_status: h.new_status ? formatStatus(h.new_status) : undefined,
                is_override: h.is_override || false,
                override_reason: h.override_reason || undefined,
            });
        }
    });

    // Sort by time (oldest first)
    timeline.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    // Build staff attribution
    const staffAttribution: StaffAttribution[] = [];

    // 1. Created By / Handled By
    if (booking.created_by) {
        const name =
            `${booking.created_by.first_name || ""} ${booking.created_by.last_name || ""}`.trim() ||
            "System";
        staffAttribution.push({
            label:
                booking.booking_type === "walk_in"
                    ? "Handled By"
                    : "Created By",
            name: name,
            role: booking.created_by.role || undefined,
        });
    }

    // 2. Confirmed By - ONLY for online bookings
    if (booking.booking_type === "online") {
        const confirmedHistory = histories.find((h: any) => {
            return (
                h.new_status === "confirmed" ||
                (h.old_status === "pending" && h.new_status === "confirmed") ||
                h.change_note?.toLowerCase().includes("confirm")
            );
        });

        if (confirmedHistory) {
            let confirmedBy = "System";
            let confirmedRole = "";
            let isOverride = false;
            let overrideReason = "";

            const user =
                confirmedHistory.user ||
                confirmedHistory.changed_by_user ||
                confirmedHistory.performed_by;

            if (user) {
                confirmedBy =
                    `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
                    "System";
                confirmedRole = user.role || "";
                isOverride = confirmedHistory.is_override || false;
                overrideReason = confirmedHistory.override_reason || "";
            }

            staffAttribution.push({
                label: "Confirmed By",
                name: confirmedBy,
                role: confirmedRole,
                is_override: isOverride,
                override_reason: overrideReason,
            });
        } else if (booking.booking_status === "confirmed") {
            const lastHistory =
                histories.length > 0 ? histories[histories.length - 1] : null;
            if (lastHistory && lastHistory.user) {
                const user = lastHistory.user;
                const name =
                    `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
                    "System";
                staffAttribution.push({
                    label: "Confirmed By",
                    name: name,
                    role: user.role || undefined,
                });
            } else if (booking.updated_by) {
                const name =
                    `${booking.updated_by.first_name || ""} ${booking.updated_by.last_name || ""}`.trim() ||
                    "System";
                staffAttribution.push({
                    label: "Confirmed By",
                    name: name,
                    role: booking.updated_by.role || undefined,
                });
            }
        }
    }

    // 3. Checked-in By
    const checkedInHistory = histories.find(
        (h: any) => h.new_status === "checked_in",
    );
    if (checkedInHistory) {
        let checkedInBy = "System";
        let checkedInRole = "";
        let isOverride = false;
        let overrideReason = "";

        const user = checkedInHistory.user || checkedInHistory.changed_by_user;
        if (user) {
            checkedInBy =
                `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
                "System";
            checkedInRole = user.role || "";
            isOverride = checkedInHistory.is_override || false;
            overrideReason = checkedInHistory.override_reason || "";
        }

        staffAttribution.push({
            label: "Checked-in By",
            name: checkedInBy,
            role: checkedInRole,
            is_override: isOverride,
            override_reason: overrideReason,
        });
    }

    // 4. Checked-out By
    const checkedOutHistory = histories.find(
        (h: any) => h.new_status === "checked_out",
    );
    if (checkedOutHistory) {
        let checkedOutBy = "System";
        let checkedOutRole = "";
        let isOverride = false;
        let overrideReason = "";

        const user =
            checkedOutHistory.user || checkedOutHistory.changed_by_user;
        if (user) {
            checkedOutBy =
                `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
                "System";
            checkedOutRole = user.role || "";
            isOverride = checkedOutHistory.is_override || false;
            overrideReason = checkedOutHistory.override_reason || "";
        }

        staffAttribution.push({
            label: "Checked-out By",
            name: checkedOutBy,
            role: checkedOutRole,
            is_override: isOverride,
            override_reason: overrideReason,
        });
    }

    // 5. Override By - find any override entries
    const overrideHistory = histories.find((h: any) => h.is_override === true);
    if (overrideHistory) {
        let overrideBy = "System";
        let overrideRole = "";

        const user = overrideHistory.user || overrideHistory.changed_by_user;
        if (user) {
            overrideBy =
                `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
                "System";
            overrideRole = user.role || "";
        }

        staffAttribution.push({
            label: "Override By",
            name: overrideBy,
            role: overrideRole,
            is_override: true,
            override_reason: overrideHistory.override_reason || undefined,
        });
    }

    // Prefer the latest PAID payment when there are several
    const paidPayment = (booking.payments || []).find(
        (p: any) => p.payment_status === "paid",
    );
    const refundedPayment = (booking.payments || []).find(
        (p: any) => p.payment_status === "refunded",
    );
    const firstPayment = paidPayment || booking.payments?.[0];

    // Payment received by / refunded by
    let paymentReceivedBy: { name: string; role?: string } | undefined;
    let refundedBy: { name: string; role?: string } | undefined;

    if (refundedPayment && refundedPayment.receiver) {
        refundedBy = {
            name:
                `${refundedPayment.receiver.first_name || ""} ${refundedPayment.receiver.last_name || ""}`.trim() ||
                "System",
            role: refundedPayment.receiver.role || undefined,
        };
    } else if (firstPayment && firstPayment.receiver) {
        paymentReceivedBy = {
            name:
                `${firstPayment.receiver.first_name || ""} ${firstPayment.receiver.last_name || ""}`.trim() ||
                "System",
            role: firstPayment.receiver.role || undefined,
        };
    }

    const roomCharges = bookedRooms.reduce(
        (sum: number, br: any) => sum + Number(br.subtotal ?? 0),
        0,
    );
    const addOnTotal = bookedRooms.reduce((sum: number, br: any) => {
        const rowAddOns = (br.booking_add_ons || []).reduce(
            (s: number, addon: any) => s + Number(addon.subtotal ?? 0),
            0,
        );
        return sum + rowAddOns;
    }, 0);
    const totalAmount = booking.total_price || roomCharges + addOnTotal;

    // Calculate total refund amount from refunded rooms
    const totalRefundAmount = bookedRooms.reduce(
        (sum: number, br: any) =>
            sum + (br.status === "refunded" ? Number(br.subtotal ?? 0) : 0),
        0,
    );

    // Derive the badge status from room-level statuses
    const derivedStatus = deriveBookingStatus(
        bookedRooms,
        booking.booking_status || "pending",
    );

    // Get guest details based on booking type
    const guestEmail = getGuestEmail(booking);
    const guestAddress = getGuestAddress(booking);
    const guestId = getGuestId(booking);

    // Build add-ons from booked rooms
    const addOns = bookedRooms.flatMap((br: any) =>
        (br.booking_add_ons || []).map((addon: any) => ({
            id: addon.id,
            name: addon.add_on?.add_on_name || "Unknown",
            price: Number(addon.add_on?.price || 0),
            quantity: addon.quantity || 1,
            subtotal: Number(addon.subtotal || 0),
        })),
    );

    // Check if any room is extended
    const isExtended = bookedRooms.some((br: any) => br.is_extended === true);

    // Calculate overdue days if checked in
    let overdueDays = 0;
    const checkedInRoom = bookedRooms.find(
        (br: any) => br.status === "checked_in",
    );
    if (checkedInRoom && checkedInRoom.check_out_date) {
        const checkoutDate = new Date(checkedInRoom.check_out_date);
        const today = new Date();
        checkoutDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        const diff = today.getTime() - checkoutDate.getTime();
        overdueDays = diff > 0 ? Math.floor(diff / (1000 * 60 * 60 * 24)) : 0;
    }

    return {
        id: String(booking.id),
        reference: booking.booking_reference || `BR-${booking.id}`,
        booked_on: formatDateTime(booking.created_at || booking.check_in_date),
        status: derivedStatus.replace(/_/g, " ").toUpperCase(),
        guest_name: getGuestName(booking),
        guest_phone: getGuestPhone(booking),
        guest_email: guestEmail,
        guest_address: guestAddress,
        guest_id: guestId,
        booking_type: booking.booking_type,
        stay_type:
            booking.stay_type === "short_stay" ? "Short Stay" : "Overnight",
        check_in_date: formatDate(booking.check_in_date),
        check_in_time: formatTime(booking.check_in_date),
        check_out_date: formatDate(booking.check_out_date),
        check_out_time: formatTime(booking.check_out_date),
        total_rooms: bookedRooms.length || 1,
        adults: booking.user ? 2 : 1,
        children: 0,
        total_amount: totalAmount,
        rooms,
        payment_method: firstPayment?.payment_method?.toUpperCase() || "CASH",
        payment_status: (refundedPayment
            ? "REFUNDED"
            : firstPayment?.payment_status || "pending"
        ).toUpperCase(),
        amount_paid: refundedPayment ? refundedPayment.amount : totalAmount,
        paid_on: firstPayment?.payment_date
            ? formatDateTime(firstPayment.payment_date)
            : undefined,
        payment_reference:
            firstPayment?.gcash_reference ||
            firstPayment?.bank_reference ||
            undefined,
        receipt_number: firstPayment?.receipt_number || undefined,
        notes:
            booking.notes || "No special requests or notes for this booking.",
        timeline,
        staff_attribution: staffAttribution,
        payment_received_by: paymentReceivedBy,
        refunded_by: refundedBy,
        is_extended: isExtended,
        overdue_days: overdueDays,
        room_charges: roomCharges,
        add_on_total: addOnTotal,
        add_ons: addOns,
        total_refund_amount: totalRefundAmount,
    };
};

export default function BookingDetailsPageWrapper() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const navigationType = useNavigationType();
    const queryClient = useQueryClient();

    const fromTab = (location.state as any)?.fromTab || "active";
    const [userRole, setUserRole] = React.useState<string>("staff");

    // Start NProgress when component mounts
    React.useEffect(() => {
        nProgress.start();
        return () => {
            nProgress.done();
        };
    }, []);

    // Get user role on mount (needed for admin override flow)
    React.useEffect(() => {
        const getUserRole = async () => {
            try {
                const response = await api.get("/user");
                setUserRole(response.data.role);
            } catch (error) {
                console.error("Failed to get user role:", error);
            }
        };
        getUserRole();
    }, []);

    const {
        data: booking,
        isLoading,
        isError,
    } = useQuery({
        queryKey: ["booking-details", id],
        queryFn: async () => {
            const { data } = await api.get(`/bookings/${id}`);
            return data;
        },
        enabled: !!id,
    });

    // Handle loading state - keep NProgress running
    React.useEffect(() => {
        if (!isLoading) {
            nProgress.done();
        }
    }, [isLoading]);

    /**
     * Resolves the target booked_room id for an action.
     * Supports compound keys like "checkin_room:123" (room-level menu)
     * and falls back to the booking's first/only room for booking-level actions.
     */
    const resolveBookedRoomId = (
        roomIdFromKey: string | undefined,
    ): number | undefined => {
        if (roomIdFromKey) return Number(roomIdFromKey);
        return booking?.booked_rooms?.[0]?.id;
    };

    // Reusable function for actions with admin override
    const handleActionWithOverride = (
        action: (reason?: string) => Promise<void>,
        actionName: string,
        bookingId?: number,
        requiresReason: boolean = true,
    ) => {
        if (userRole === "staff") {
            action();
            return;
        }

        let reason = "";

        const modalContent = (
            <div>
                <Text style={{ fontSize: "11px" }}>
                    You are about to perform an override action:{" "}
                    <strong>{actionName}</strong>
                </Text>
                {requiresReason && (
                    <div style={{ marginTop: 14 }}>
                        <Text style={{ fontSize: "11px" }}>
                            Reason for override (optional):
                        </Text>
                        <Input.TextArea
                            rows={3}
                            placeholder="Enter reason for this override action..."
                            onChange={(e) => (reason = e.target.value)}
                            style={{ marginTop: 6, fontSize: "11px" }}
                        />
                    </div>
                )}
            </div>
        );

        Modal.confirm({
            title: `Admin Override: ${actionName}`,
            content: modalContent,
            okText: "Proceed",
            cancelText: "Cancel",
            okButtonProps: { danger: true },
            centered: true,
            width: 480,
            onOk: async () => {
                if (reason) {
                    console.log(
                        `[ADMIN OVERRIDE] ${actionName} on booking #${bookingId}: ${reason}`,
                    );
                    try {
                        await api
                            .post(`/bookings/${bookingId}/log-override`, {
                                action: actionName,
                                reason: reason,
                                timestamp: new Date().toISOString(),
                                user_role: userRole,
                            })
                            .catch(() => {});
                    } catch (error) {
                        console.error("Failed to log override:", error);
                    }
                }

                await action(reason);

                if (reason) {
                    message.success(
                        `${actionName} completed with override reason logged`,
                    );
                } else {
                    message.success(`${actionName} completed`);
                }
            },
        });
    };

    /** Actually performs the API call for a given (base) action. */
    const performAction = async (
        baseAction: string,
        bookedRoomId: number | undefined,
        reason?: string,
    ) => {
        switch (baseAction) {
            case "confirm":
                await api.put(`/booked-rooms/${bookedRoomId}`, {
                    status: "confirmed",
                    override_reason: reason,
                });
                message.success("Booking confirmed");
                break;

            case "checkin":
            case "checkin_room":
                await api.put(`/booked-rooms/${bookedRoomId}`, {
                    status: "checked_in",
                    override_reason: reason,
                });
                message.success("Check In successful");
                break;

            case "checkout":
            case "checkout_room": {
                if (booking?.booking_type === "walk_in") {
                    await api.post(`/walk-in-guests/${id}/checkout`, {
                        override_reason: reason,
                    });
                } else {
                    await api.put(`/bookings/${id}`, {
                        booking_status: "checked_out",
                        override_reason: reason,
                    });
                }
                message.success("Check Out successful");
                break;
            }

            case "cancel":
                await api.put(`/booked-rooms/${bookedRoomId}`, {
                    status: "cancelled",
                    override_reason: reason,
                });
                message.success("Booking cancelled");
                break;

            case "extend":
                await api.post(`/bookings/${id}/extend/${bookedRoomId}`);
                message.success("Stay extended successfully");
                break;

            case "refund":
                await api.post("/booking-payments/refund", {
                    booking_id: id,
                    booked_room_id: bookedRoomId,
                });
                message.success("Room refunded successfully");
                break;

            case "trash":
            case "remove_room":
                await api.delete(`/bookings/${id}`, {
                    data: {
                        booked_room_id: bookedRoomId,
                        override_reason: reason,
                    },
                });
                message.success("Booking moved to trash");
                navigate(-1);
                return; // don't invalidate below, we're navigating away

            case "restore":
                await api.post(`/booked-rooms/${bookedRoomId}/restore`);
                message.success("Booking restored successfully");
                break;

            case "force_delete":
                await api.delete(`/booked-rooms/${bookedRoomId}/force-delete`);
                message.success("Booking permanently deleted");
                navigate(-1);
                return;

            case "edit":
            case "edit_room":
                message.info("Edit booking feature coming soon");
                return;

            default:
                return;
        }

        queryClient.invalidateQueries({ queryKey: ["booking-details", id] });
        queryClient.invalidateQueries({ queryKey: ["booked-rooms"] });
    };

    const handleAction = async (action: string) => {
        if (!id || !booking) return;

        // Supports compound keys like "checkin_room:123" from per-room menus
        const parts = action.split(":");
        const baseAction: string = parts[0] ?? action;
        const roomIdStr: string | undefined = parts[1];
        const bookedRoomId = resolveBookedRoomId(roomIdStr);

        // Actions that always need explicit confirmation regardless of role
        const dangerousActions = [
            "cancel",
            "trash",
            "remove_room",
            "refund",
            "force_delete",
        ];

        const actionLabels: Record<string, string> = {
            confirm: "Confirm Booking",
            checkin: "Check In",
            checkin_room: "Check In",
            checkout: "Check Out",
            checkout_room: "Check Out",
            cancel: "Cancel Booking",
            extend: "Extend Stay",
            refund: "Refund Payment",
            trash: "Move to Trash",
            remove_room: "Move to Trash",
            restore: "Restore Booking",
            force_delete: "Delete Forever",
        };

        try {
            if (baseAction === "edit" || baseAction === "edit_room") {
                message.info("Edit booking feature coming soon");
                return;
            }

            if (baseAction === "refund") {
                Modal.confirm({
                    title: "Refund Room",
                    content:
                        "Are you sure you want to refund this room? This action cannot be undone.",
                    okText: "Refund",
                    okButtonProps: { danger: true },
                    cancelText: "Cancel",
                    centered: true,
                    onOk: () => performAction("refund", bookedRoomId),
                });
                return;
            }

            if (baseAction === "trash" || baseAction === "remove_room") {
                if (userRole === "staff") {
                    Modal.warning({
                        title: "Access Restricted",
                        content:
                            "Only administrators can move bookings to trash.",
                        okText: "OK",
                        centered: true,
                    });
                    return;
                }
                // Use the new override flow
                const actionFn = async (reason?: string) => {
                    await performAction(baseAction, bookedRoomId, reason);
                };
                handleActionWithOverride(
                    actionFn,
                    actionLabels[baseAction] || "Move to Trash",
                    Number(id),
                    true,
                );
                return;
            }

            if (baseAction === "force_delete") {
                if (userRole === "staff") {
                    Modal.warning({
                        title: "Access Restricted",
                        content:
                            "Only administrators can permanently delete bookings.",
                        okText: "OK",
                        centered: true,
                    });
                    return;
                }
                Modal.confirm({
                    title: "Permanent Deletion",
                    content: (
                        <div>
                            <Text type="danger" style={{ fontSize: "11px" }}>
                                ⚠️ This action cannot be undone!
                            </Text>
                            <br />
                            <Text style={{ fontSize: "11px" }}>
                                Are you sure you want to permanently delete this
                                booking?
                            </Text>
                        </div>
                    ),
                    okText: "Delete Forever",
                    cancelText: "Cancel",
                    okButtonProps: { danger: true },
                    onOk: () => performAction("force_delete", bookedRoomId),
                });
                return;
            }

            if (baseAction === "restore") {
                if (userRole === "staff") {
                    Modal.warning({
                        title: "Access Restricted",
                        content: "Only administrators can restore bookings.",
                        okText: "OK",
                        centered: true,
                    });
                    return;
                }
                // Use the new override flow for restore too
                const actionFn = async (reason?: string) => {
                    await performAction("restore", bookedRoomId, reason);
                };
                handleActionWithOverride(
                    actionFn,
                    "Restore Booking",
                    Number(id),
                    false,
                );
                return;
            }

            if (baseAction === "extend") {
                if (userRole === "staff") {
                    Modal.confirm({
                        title: "Extend Stay",
                        content: "Add 1 hour (₱100)?",
                        okText: "Extend",
                        cancelText: "Cancel",
                        centered: true,
                        onOk: () => performAction("extend", bookedRoomId),
                    });
                } else {
                    const actionFn = async (reason?: string) => {
                        await performAction("extend", bookedRoomId, reason);
                    };
                    handleActionWithOverride(
                        actionFn,
                        "Extend Stay",
                        Number(id),
                        false,
                    );
                }
                return;
            }

            // Default: confirm / checkin / checkout / cancel go through
            // the standard admin-override flow.
            const label = actionLabels[baseAction] || baseAction;
            const requiresReason = dangerousActions.includes(baseAction);

            const actionFn = async (reason?: string) => {
                await performAction(baseAction, bookedRoomId, reason);
            };
            handleActionWithOverride(
                actionFn,
                label,
                Number(id),
                requiresReason,
            );
        } catch (err) {
            console.error(err);
            message.error("Action failed");
        }
    };

    if (isLoading) {
        return <PageLoader />;
    }

    if (isError || !booking) {
        nProgress.done();
        return (
            <div style={{ padding: 40, textAlign: "center" }}>
                <p>Booking not found.</p>
            </div>
        );
    }

    const bookingData = mapBookingToBookingData(booking);
    nProgress.done();

    return (
        <div
            key={location.key}
            className={`page-transition ${navigationType === "POP" ? "slide-ltr" : "slide-rtl"}`}
        >
            <style>
                {`
            @keyframes slideInRTL {
                from { transform: translateX(24px); opacity: 0; }
                to   { transform: translateX(0);    opacity: 1; }
            }
            @keyframes slideInLTR {
                from { transform: translateX(-24px); opacity: 0; }
                to   { transform: translateX(0);     opacity: 1; }
            }
            .page-transition {
                animation-duration: 0.28s;
                animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
                animation-fill-mode: both;
            }
            .page-transition.slide-rtl { animation-name: slideInRTL; }
            .page-transition.slide-ltr { animation-name: slideInLTR; }

            #nprogress .bar {
                background: #10b981 !important;
                height: 3px !important;
            }
            #nprogress .peg {
                box-shadow: 0 0 10px #10b981, 0 0 5px #10b981 !important;
            }
            #nprogress .spinner-icon {
                border-top-color: #10b981 !important;
                border-left-color: #10b981 !important;
            }
        `}
            </style>
            <BookingDetails
                booking={bookingData}
                onAction={handleAction}
                backHref={(location.state as any)?.from || "/bookings"}
                fromTab={fromTab}
                userRole={userRole}
            />
        </div>
    );
}