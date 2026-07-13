import { useEffect, useState, useMemo, useRef } from "react";
import {
    useQuery,
    useQueryClient,
    keepPreviousData,
} from "@tanstack/react-query";
import debounce from "lodash/debounce";
import {
    MoreOutlined,
    CloseOutlined,
    UserOutlined,
    PhoneOutlined,
    EnvironmentOutlined,
    CalendarOutlined,
    TagOutlined,
    ClockCircleOutlined,
    HistoryOutlined,
    DeleteOutlined,
    CheckCircleOutlined,
    SearchOutlined,
} from "@ant-design/icons";
import {
    Table,
    Tabs,
    Input,
    Button,
    message,
    Modal,
    Tag,
    Dropdown,
    Alert,
    Typography,
    Drawer,
    Descriptions,
    Space,
    Divider,
    Card,
    Badge,
    Timeline,
} from "antd";
import type { MenuProps, TabsProps } from "antd";
import api from "@/services/api";
import { useLocation, useNavigate } from "react-router-dom";

const { Title, Text } = Typography;

interface AddOn {
    id: number;
    add_on_name: string;
    price: number;
    pivot?: {
        quantity: number;
        subtotal: number;
    };
}

interface Room {
    id: number;
    room_number: string;
    room_type?: {
        type_name?: string;
        base_price?: number;
        short_stay_price?: number;
    };
    pivot?: {
        subtotal: number;
        price_at_time_of_booking: number;
        stay_type?: "short_stay" | "overnight";
        check_in_date?: string;
        check_out_date?: string;
        check_out_time?: string;
    };
}

interface BookingPayment {
    id: number;
    amount: number;
    payment_method: "cash" | "gcash" | "bank";
    payment_status: "pending" | "paid" | "refunded" | "failed";
    gcash_reference?: string;
    bank_reference?: string;
    receipt_number?: string;
    payment_date: string;
    received_by?: number;
    receiver?: {
        id: number;
        first_name: string;
        last_name: string;
    };
}

interface BookedRoom {
    id: number;
    room: Room;
    status:
        | "pending"
        | "confirmed"
        | "checked_in"
        | "checked_out"
        | "cancelled"
        | "refunded";
    stay_type: "overnight" | "short_stay";
    check_in_date: string;
    check_out_date: string;
    check_in_time?: string | null;
    check_out_time?: string | null;
    subtotal: number;
    price_at_time_of_booking: number;
    is_extended: boolean;
    booking_add_ons?: {
        id: number;
        quantity: number;
        subtotal: number;
        add_on: {
            id: number;
            add_on_name: string;
            price: number;
        };
    }[];
    booking?: {
        id: number;
        booking_reference: string;
        booking_type: "online" | "walk_in";
        booking_status: string;
        stay_type: string;
        check_in_date: string;
        check_out_date: string;
        total_price: number;
        created_at?: string;
        deleted_at?: string | null;
        user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            email?: string;
            phone?: string;
            address?: string;
        };
        walk_in_guest?: {
            id: number;
            first_name: string;
            last_name: string;
            full_name?: string;
            contact_number?: string;
            address?: string;
        };
        payments?: BookingPayment[];
        histories?: {
            id: number;
            old_status: string;
            new_status: string;
            change_note: string;
            override_reason?: string;
            is_override?: boolean;
            changed_at: string;
            changed_by?: number;
            user?: {
                first_name?: string;
                last_name?: string;
            };
        }[];
        created_by?: {
            id: number;
            first_name?: string;
            last_name?: string;
            role?: string;
        };
    };
    booking_reference?: string;
    booking_type?: "online" | "walk_in";
    total_price?: number;
    created_at?: string;
    deleted_at?: string | null;
    user?: {
        id: number;
        first_name?: string;
        last_name?: string;
        email?: string;
        phone?: string;
        address?: string;
    };
    walk_in_guest?: {
        id: number;
        first_name: string;
        last_name: string;
        full_name?: string;
        contact_number?: string;
        address?: string;
    };
    payments?: BookingPayment[];
    histories?: {
        id: number;
        old_status: string;
        new_status: string;
        change_note: string;
        override_reason?: string;
        is_override?: boolean;
        changed_at: string;
        changed_by?: number;
        user?: {
            first_name?: string;
            last_name?: string;
        };
    }[];
    created_by?: {
        id: number;
        first_name?: string;
        last_name?: string;
        role?: string;
    };
}

interface History {
    id: number;
    old_status: string;
    new_status: string;
    change_note: string;
    override_reason?: string;
    is_override?: boolean;
    changed_at: string;
    changed_by?: number;
    user?: {
        first_name?: string;
        last_name?: string;
    };
}

interface User {
    id: number;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    address?: string;
}

interface WalkInGuest {
    id: number;
    first_name: string;
    middle_name?: string;
    last_name: string;
    full_name?: string;
    contact_number?: string;
    address?: string;
}

interface CreatedByUser {
    id: number;
    first_name?: string;
    last_name?: string;
    role?: string;
}

interface Booking {
    id: number;
    payment_method?: string;
    gcash_reference?: string;
    bank_reference?: string;
    add_ons?: AddOn[];
    booking_reference: string;
    booking_type: "online" | "walk_in";
    booking_status:
        | "pending"
        | "confirmed"
        | "checked_in"
        | "checked_out"
        | "cancelled"
        | "refunded";
    stay_type: "short_stay" | "overnight";
    check_in_date: string;
    check_out_date: string;
    check_in_time?: string;
    check_out_time?: string;
    total_price: number;
    created_at?: string;
    deleted_at?: string | null;
    user?: User;
    walk_in_guest?: WalkInGuest;
    booked_rooms?: BookedRoom[];
    histories?: History[];
    created_by?: CreatedByUser;
    payments?: BookingPayment[];
}

interface BookingRow extends Booking {
    booked_room_id: number;
    room?: Room;
    status: string;
    stay_type: "overnight" | "short_stay";
    subtotal: number;
    is_extended: boolean;
    check_in_date: string;
    check_out_date: string;
}

interface ExtendResponse {
    total_price: number;
    booked_room: BookedRoom;
}

interface GuestDetails {
    name: string;
    email?: string | undefined;
    phone?: string | undefined;
    address?: string | undefined;
}

interface PaginatedResponse {
    data: BookedRoom[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

// Helper function to check if object is BookedRoom
const isBookedRoom = (obj: any): obj is BookedRoom => {
    return obj && typeof obj === "object" && "room" in obj && "status" in obj;
};

// Helper function to convert BookedRoom to Booking
const bookedRoomToBooking = (bookedRoom: BookedRoom): Booking => {
    const bookingData = bookedRoom.booking;

    return {
        id: bookingData?.id || bookedRoom.id,
        booking_reference:
            bookingData?.booking_reference || `BR-${bookedRoom.id}`,
        booking_type:
            (bookingData?.booking_type as "online" | "walk_in") || "walk_in",
        booking_status:
            (bookingData?.booking_status as Booking["booking_status"]) ||
            bookedRoom.status,
        stay_type:
            (bookingData?.stay_type as "short_stay" | "overnight") ||
            bookedRoom.stay_type,
        check_in_date: bookingData?.check_in_date || bookedRoom.check_in_date,
        check_out_date:
            bookingData?.check_out_date || bookedRoom.check_out_date,
        total_price:
            bookingData?.total_price ||
            bookedRoom.total_price ||
            bookedRoom.subtotal ||
            0,
        created_at: bookingData?.created_at || bookedRoom.created_at,
        deleted_at: bookingData?.deleted_at || bookedRoom.deleted_at || null,
        user: bookingData?.user || bookedRoom.user,
        walk_in_guest: bookingData?.walk_in_guest || bookedRoom.walk_in_guest,
        payments: bookingData?.payments || bookedRoom.payments || [],
        histories: bookingData?.histories || bookedRoom.histories || [],
        created_by: bookingData?.created_by || bookedRoom.created_by,
        booked_rooms: [bookedRoom],
    };
};

export default function Bookings() {
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [total, setTotal] = useState<number>(0);
    const [activeTab, setActiveTab] = useState<string>("active");
    const [searchInput, setSearchInput] = useState("");
    const [searchText, setSearchText] = useState("");
    const [detailsVisible, setDetailsVisible] = useState<boolean>(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(
        null,
    );
    const [selectedBookingRow, setSelectedBookingRow] =
        useState<BookingRow | null>(null);
    const [selectedBookedRoomId, setSelectedBookedRoomId] = useState<
        number | null
    >(null);
    const [userRole, setUserRole] = useState<string>("staff");
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

    const location = useLocation();
    const navigate = useNavigate();

    const bookingId = location.state?.bookingId;
    const bookedRoomId = location.state?.bookedRoomId;

    useEffect(() => {
        setCurrentPage(1);
        setSearchText("");
    }, [activeTab]);

    // Get user role on mount
    useEffect(() => {
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

    const queryClient = useQueryClient();

    // Fetch all booked rooms based on active tab using the booked-rooms endpoints
    const bookingQuery = useQuery({
        queryKey: ["booked-rooms", activeTab, currentPage, pageSize, searchText],
        queryFn: async () => {
            let endpoint = "/booked-rooms";

            if (activeTab === "history") {
                endpoint = "/booked-rooms/history";
            }

            if (activeTab === "trash") {
                endpoint = "/booked-rooms/trash";
            }

            // Add pagination and search parameters
            const params = new URLSearchParams({
                page: currentPage.toString(),
                per_page: pageSize.toString(),
            });

            if (searchText.trim()) {
                params.append('search', searchText.trim());
            }

            const { data } = await api.get<PaginatedResponse>(`${endpoint}?${params.toString()}`);
            
            // Update total from response
            setTotal(data.total || 0);
            
            return data.data || [];
        },
        staleTime: 30000,
        gcTime: 300000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        placeholderData: keepPreviousData,
    });

    const bookings = bookingQuery.data ?? [];

    // Remove client-side filtering since we're doing server-side pagination
    const filteredData = bookings;

    // Remove client-side pagination since we're doing server-side pagination
    const paginatedData = filteredData;

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchText, activeTab]);

    // Transform BookedRoom data to BookingRow for table display
    const tableData: BookingRow[] = paginatedData.map((bookedRoom) => {
        const bookingData = bookedRoom.booking;

        if (!bookingData) {
            return {
                id: bookedRoom.id,
                booked_room_id: bookedRoom.id,
                room: bookedRoom.room,
                status: bookedRoom.status,
                stay_type: bookedRoom.stay_type,
                subtotal: Number(bookedRoom.subtotal ?? 0),
                is_extended: bookedRoom.is_extended,
                check_in_date: bookedRoom.check_in_date,
                check_out_date: bookedRoom.check_out_date,
                booking_reference: `BR-${bookedRoom.id}`,
                booking_type: "walk_in" as const,
                booking_status: bookedRoom.status as Booking["booking_status"],
                total_price: Number(bookedRoom.subtotal ?? 0),
                payments: [],
                histories: [],
                created_at: undefined,
                deleted_at: null,
            } as BookingRow;
        }

        return {
            id: bookingData.id || bookedRoom.id,
            booking_reference: bookingData.booking_reference,
            booking_type: bookingData.booking_type,
            booking_status: bookingData.booking_status,

            stay_type: bookedRoom.stay_type,

            check_in_date: bookedRoom.check_in_date,
            check_out_date: bookedRoom.check_out_date,

            total_price: bookingData.total_price || bookedRoom.subtotal,

            created_at: bookingData.created_at,
            deleted_at: bookingData.deleted_at,

            user: bookingData.user,
            walk_in_guest: bookingData.walk_in_guest,
            payments: bookingData.payments || [],
            histories: bookingData.histories || [],
            created_by: bookingData.created_by,

            booked_room_id: bookedRoom.id,
            room: bookedRoom.room,
            status: bookedRoom.status,
            subtotal: Number(bookedRoom.subtotal),
            is_extended: bookedRoom.is_extended,
        } as BookingRow;
    });

    // Get the selected booked room
    const selectedBookedRoom = (() => {
        if (selectedBooking?.booked_rooms) {
            const found = selectedBooking.booked_rooms.find(
                (br) => br.id === selectedBookedRoomId,
            );
            if (found) return found;
        }
        const row = tableData.find(
            (r) => r.booked_room_id === selectedBookedRoomId,
        );
        if (row && isBookedRoom(row)) {
            return row;
        }
        return bookings.find((b) => b.id === selectedBookedRoomId);
    })();

    // Safely get booking_add_ons
    const getBookingAddOns = (): {
        id: number;
        quantity: number;
        subtotal: number;
        add_on: { id: number; add_on_name: string; price: number };
    }[] => {
        if (!selectedBookedRoom) return [];
        if (isBookedRoom(selectedBookedRoom)) {
            return (selectedBookedRoom as any).booking_add_ons || [];
        }
        return [];
    };

    // Safely get payments
    const getPayments = (): BookingPayment[] => {
        if (selectedBooking?.payments) {
            return selectedBooking.payments;
        }
        if (
            selectedBookedRoom &&
            isBookedRoom(selectedBookedRoom) &&
            (selectedBookedRoom as any).payments
        ) {
            return (selectedBookedRoom as any).payments;
        }
        return [];
    };

    const roomCharges = Number((selectedBookedRoom as any)?.subtotal ?? 0);

    const addOnTotal = getBookingAddOns().reduce(
        (total, addon) => total + Number(addon.subtotal ?? 0),
        0,
    );

    const paymentSubtotal = roomCharges + addOnTotal;

    const firstPayment = getPayments()[0];

    const hasOpenedFromNavigation = useRef(false);

    useEffect(() => {
        if (hasOpenedFromNavigation.current) return;

        if (!bookingId || !bookedRoomId) return;

        const row = tableData.find(
            (r) => r.id === bookingId && r.booked_room_id === bookedRoomId,
        );

        if (!row) return;

        hasOpenedFromNavigation.current = true;

        setSelectedBookedRoomId(bookedRoomId);

        showDetails(row);

        navigate(location.pathname, {
            replace: true,
            state: null,
        });
    }, [bookingId, bookedRoomId, tableData]);

    const totalRows = total;

    const debouncedSearch = useMemo(
        () =>
            debounce((value: string) => {
                setSearchText(value);
            }, 500),
        [],
    );

    useEffect(() => {
        return () => {
            debouncedSearch.cancel();
        };
    }, [debouncedSearch]);

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
                <Text style={{ fontSize: "13px" }}>
                    You are about to perform an override action:{" "}
                    <strong>{actionName}</strong>
                </Text>
                {requiresReason && (
                    <div style={{ marginTop: 16 }}>
                        <Text style={{ fontSize: "13px" }}>
                            Reason for override (optional):
                        </Text>
                        <Input.TextArea
                            rows={3}
                            placeholder="Enter reason for this override action..."
                            onChange={(e) => (reason = e.target.value)}
                            style={{ marginTop: 8, fontSize: "13px" }}
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
            width: 500,
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

    const handleUpdateStatus = async (
        id: number,
        status: string,
        actionName: string,
    ) => {
        const action = async (reason?: string) => {
            try {
                const response = await api.put(`/booked-rooms/${id}`, {
                    status: status,
                    override_reason: reason,
                });

                // Update local state
                queryClient.setQueryData(
                    ["booked-rooms", activeTab, currentPage, pageSize, searchText],
                    (old: BookedRoom[] | undefined) => {
                        if (!old) return old;
                        return old.map((bookedRoom) =>
                            bookedRoom.id === id
                                ? {
                                      ...bookedRoom,
                                      status: status as BookedRoom["status"],
                                      ...(status === "checked_in"
                                          ? {
                                                check_in_time:
                                                    new Date().toISOString(),
                                            }
                                          : {}),
                                      ...(status === "checked_out"
                                          ? {
                                                check_out_time:
                                                    new Date().toISOString(),
                                            }
                                          : {}),
                                      ...response.data.data,
                                  }
                                : bookedRoom,
                        );
                    },
                );

                message.success(`${actionName} successful`);
                queryClient.invalidateQueries({ queryKey: ["booked-rooms"] });
            } catch (err) {
                console.error(err);
                message.error(`${actionName} failed`);
            }
        };

        if (userRole === "admin") {
            let overrideReason = "";
            Modal.confirm({
                title: `Admin Override: ${actionName}`,
                centered: true,
                width: 500,
                okText: "Proceed",
                cancelText: "Cancel",
                content: (
                    <Input.TextArea
                        rows={3}
                        placeholder="Enter reason..."
                        onChange={(e) => (overrideReason = e.target.value)}
                        style={{ fontSize: "13px" }}
                    />
                ),
                onOk: () => action(overrideReason),
            });
        } else {
            await action();
        }
    };

    const handleCheckoutAction = async (bookingId: number) => {
        console.log("Checkout clicked:", bookingId);
        const action = async (reason?: string) => {
            const booking = bookings.find((b) => b.id === bookingId);

            if (!booking) return;

            const bookingType =
                booking.booking_type ||
                (booking.booking?.booking_type as "online" | "walk_in") ||
                "walk_in";

            if (bookingType === "walk_in") {
                await api.post(`/walk-in-guests/${bookingId}/checkout`, {
                    override_reason: reason,
                });
            } else {
                await api.put(`/bookings/${bookingId}`, {
                    booking_status: "checked_out",
                    override_reason: reason,
                });
            }

            // Update local state
            queryClient.setQueryData(
                ["booked-rooms", activeTab, currentPage, pageSize, searchText],
                (old: BookedRoom[] | undefined) => {
                    if (!old) return old;
                    return old.filter((b) => b.id !== bookingId);
                },
            );

            // Move to history tab
            const checkedOutBooking = bookings.find((b) => b.id === bookingId);
            if (checkedOutBooking) {
                const updatedBookedRoom: BookedRoom = {
                    ...checkedOutBooking,
                    status: "checked_out" as BookedRoom["status"],
                };
                queryClient.setQueryData(
                    ["booked-rooms", "history", currentPage, pageSize, searchText],
                    (old: BookedRoom[] | undefined) => {
                        return [updatedBookedRoom, ...(old || [])];
                    },
                );
            }

            message.success("Check Out successful");
            queryClient.invalidateQueries({ queryKey: ["booked-rooms"] });
        };

        await handleActionWithOverride(action, "Check Out", bookingId, true);
    };

    const handleExtendAction = async (booking: BookingRow) => {
        const action = async () => {
            const res = await api.post<ExtendResponse>(
                `/bookings/${booking.id}/extend/${booking.booked_room_id}`,
            );

            queryClient.setQueryData(
                ["booked-rooms", activeTab, currentPage, pageSize, searchText],
                (old: BookedRoom[] | undefined) => {
                    if (!old) return old;
                    return old.map((b) =>
                        b.id === booking.id
                            ? { ...b, total_price: res.data.total_price }
                            : b,
                    );
                },
            );

            message.success("Stay extended successfully");
            queryClient.invalidateQueries({ queryKey: ["booked-rooms"] });
        };

        await handleActionWithOverride(
            action,
            "Extend Stay",
            booking.id,
            false,
        );
    };

    const handleExtend = (booking: BookingRow) => {
        if (userRole === "staff") {
            Modal.confirm({
                title: "Extend Stay",
                content: "Add 1 hour (₱100)?",
                okText: "Extend",
                cancelText: "Cancel",
                centered: true,
                onOk: async () => {
                    try {
                        const res = await api.post<ExtendResponse>(
                            `/bookings/${booking.id}/extend/${booking.booked_room_id}`,
                        );

                        queryClient.setQueryData(
                            ["booked-rooms", activeTab, currentPage, pageSize, searchText],
                            (old: BookedRoom[] | undefined) => {
                                if (!old) return old;
                                return old.map((b) =>
                                    b.id === booking.id
                                        ? {
                                              ...b,
                                              total_price: res.data.total_price,
                                          }
                                        : b,
                                );
                            },
                        );

                        message.success("Stay extended successfully");
                        queryClient.invalidateQueries({
                            queryKey: ["booked-rooms"],
                        });
                    } catch (err) {
                        console.error(err);
                        message.error("Failed to extend stay");
                    }
                },
            });
        } else {
            handleExtendAction(booking);
        }
    };

    const handleRefund = async (record: BookingRow) => {
        Modal.confirm({
            title: "Refund Room",
            content:
                "Are you sure you want to refund this room? This action cannot be undone.",
            okText: "Refund",
            okButtonProps: {
                danger: true,
            },
            cancelText: "Cancel",
            centered: true,
            onOk: async () => {
                try {
                    await api.post("/booking-payments/refund", {
                        booking_id: record.id,
                        booked_room_id: record.booked_room_id,
                    });

                    message.success("Room refunded successfully");

                    queryClient.invalidateQueries({
                        queryKey: ["booked-rooms"],
                    });
                } catch (error) {
                    console.error(error);
                    message.error("Failed to refund room");
                }
            },
        });
    };

    const handleDeleteAction = async (record: BookingRow) => {
        const action = async (reason?: string) => {
            await api.delete(`/bookings/${record.id}`, {
                data: {
                    booked_room_id: record.booked_room_id,
                    override_reason: reason,
                },
            });

            queryClient.setQueryData(
                ["booked-rooms", activeTab, currentPage, pageSize, searchText],
                (old: BookedRoom[] | undefined) => {
                    if (!old) return old;
                    return old.filter((b) => b.id !== record.id);
                },
            );

            const deletedItem = bookings.find((b) => b.id === record.id);
            if (deletedItem) {
                queryClient.setQueryData(
                    ["booked-rooms", "trash", currentPage, pageSize, searchText],
                    (old: BookedRoom[] | undefined) => {
                        return [deletedItem, ...(old || [])];
                    },
                );
            }

            if (selectedBooking && selectedBooking.id === record.id) {
                setDetailsVisible(false);
                setSelectedBooking(null);
            }

            message.success("Booking moved to trash");
            queryClient.invalidateQueries({ queryKey: ["booked-rooms"] });
        };

        if (userRole === "staff") {
            Modal.warning({
                title: "Access Restricted",
                content: "Only administrators can move bookings to trash.",
                okText: "OK",
                centered: true,
            });
            return;
        }

        await handleActionWithOverride(
            action,
            "Move to Trash",
            record.id,
            true,
        );
    };

    const handleRestore = async (record: BookingRow) => {
        try {
            await api.post(`/booked-rooms/${record.booked_room_id}/restore`);

            queryClient.setQueryData(
                ["booked-rooms", "trash", currentPage, pageSize, searchText],
                (old: BookedRoom[] | undefined) => {
                    if (!old) return old;
                    return old.filter((b) => b.id !== record.id);
                },
            );

            const restoredItem = bookings.find((b) => b.id === record.id);
            if (restoredItem) {
                const cleanRestored = {
                    ...restoredItem,
                    deleted_at: undefined,
                };
                delete cleanRestored.deleted_at;
                queryClient.setQueryData(
                    ["booked-rooms", "active", currentPage, pageSize, searchText],
                    (old: BookedRoom[] | undefined) => {
                        return [cleanRestored, ...(old || [])];
                    },
                );
            }

            message.success("Booking restored successfully");
            queryClient.invalidateQueries({ queryKey: ["booked-rooms"] });
        } catch (err) {
            console.error(err);
            message.error("Failed to restore booking");
        }
    };

    const handleForceDelete = async (record: BookingRow) => {
        Modal.confirm({
            title: "Permanent Deletion",
            content: (
                <div>
                    <Text type="danger" style={{ fontSize: "13px" }}>
                        ⚠️ This action cannot be undone!
                    </Text>
                    <br />
                    <Text style={{ fontSize: "13px" }}>
                        Are you sure you want to permanently delete this
                        booking?
                    </Text>
                </div>
            ),
            okText: "Delete Forever",
            cancelText: "Cancel",
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    await api.delete(
                        `/booked-rooms/${record.booked_room_id}/force-delete`,
                    );

                    queryClient.setQueryData(
                        ["booked-rooms", "trash", currentPage, pageSize, searchText],
                        (old: BookedRoom[] | undefined) => {
                            if (!old) return old;
                            return old.filter((b) => b.id !== record.id);
                        },
                    );

                    if (selectedBooking && selectedBooking.id === record.id) {
                        setDetailsVisible(false);
                        setSelectedBooking(null);
                    }

                    message.success(`Booking permanently deleted`);
                    queryClient.invalidateQueries({
                        queryKey: ["booked-rooms"],
                    });
                } catch (err) {
                    console.error(err);
                    message.error("Failed to delete booking permanently");
                }
            },
        });
    };

    const showDetails = (record: BookingRow) => {
        const bookedRoom = bookings.find((b) => b.id === record.booked_room_id);

        if (bookedRoom && bookedRoom.booking) {
            const fullBooking: Booking = {
                ...bookedRoom.booking,
                booked_rooms: [bookedRoom],
                id: bookedRoom.booking.id || bookedRoom.id,
            } as Booking;
            setSelectedBooking(fullBooking);
        } else if (bookedRoom) {
            const fullBooking = bookedRoomToBooking(bookedRoom);
            setSelectedBooking(fullBooking);
        } else {
            const minimalBooking: Booking = {
                id: record.id,
                booking_reference:
                    record.booking_reference || `BR-${record.id}`,
                booking_type: record.booking_type || "walk_in",
                booking_status: record.status as Booking["booking_status"],
                stay_type: record.stay_type as Booking["stay_type"],
                check_in_date: record.check_in_date,
                check_out_date: record.check_out_date,
                total_price: record.total_price || record.subtotal,
                created_at: record.created_at,
                deleted_at: record.deleted_at || null,
                user: record.user,
                walk_in_guest: record.walk_in_guest,
                booked_rooms: [
                    {
                        id: record.booked_room_id,
                        room: record.room!,
                        status: record.status as BookedRoom["status"],
                        stay_type: record.stay_type,
                        check_in_date: record.check_in_date,
                        check_out_date: record.check_out_date,
                        subtotal: record.subtotal,
                        price_at_time_of_booking: record.subtotal,
                        is_extended: record.is_extended,
                        booking_add_ons: [],
                    },
                ],
                payments: record.payments || [],
                histories: record.histories || [],
                created_by: record.created_by,
            };
            setSelectedBooking(minimalBooking);
        }

        setSelectedBookingRow(record);
        setSelectedBookedRoomId(record.booked_room_id);
        setDetailsVisible(true);
    };

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

    const getExpectedCheckoutDate = (bookedRoom?: BookedRoom): string => {
        if (!bookedRoom?.check_out_date) {
            return "-";
        }
        return formatDate(bookedRoom.check_out_date);
    };

    const getStatusColor = (status: string): string => {
        const colors: Record<string, string> = {
            pending: "orange",
            confirmed: "green",
            checked_in: "blue",
            checked_out: "default",
            cancelled: "red",
            refunded: "purple",
        };
        return colors[status] || "default";
    };

    const getStatusBadgeColor = (status: string): string => {
        const colors: Record<string, string> = {
            pending: "#faad14",
            confirmed: "#52c41a",
            checked_in: "#1890ff",
            checked_out: "#8c8c8c",
            cancelled: "#ff4d4f",
            refunded: "#722ed1",
        };
        return colors[status] || "#8c8c8c";
    };

    const getPaymentStatusColor = (status: string): string => {
        const colors: Record<string, string> = {
            paid: "green",
            pending: "orange",
            refunded: "purple",
            failed: "red",
        };
        return colors[status] || "default";
    };

    const getOverdueDays = (bookedRoom?: BookedRoom): number => {
        if (
            !bookedRoom ||
            bookedRoom.status !== "checked_in" ||
            !bookedRoom.check_out_date
        ) {
            return 0;
        }

        const checkoutDate = new Date(bookedRoom.check_out_date);
        const today = new Date();
        checkoutDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        const diff = today.getTime() - checkoutDate.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        return days > 0 ? days : 0;
    };

    const getGuestName = (booking: Booking): string => {
        if (booking.booking_type === "online") {
            const firstName = booking.user?.first_name ?? "";
            const lastName = booking.user?.last_name ?? "";
            return `${firstName} ${lastName}`.trim() || "N/A";
        } else {
            return booking.walk_in_guest?.full_name || "Guest";
        }
    };

    const getGuestDetails = (booking: Booking): GuestDetails => {
        if (booking.booking_type === "online") {
            const result: GuestDetails = {
                name: `${booking.user?.first_name ?? ""} ${booking.user?.last_name ?? ""}`.trim(),
            };
            if (booking.user?.email !== undefined)
                result.email = booking.user.email;
            if (booking.user?.phone !== undefined)
                result.phone = booking.user.phone;
            if (booking.user?.address !== undefined)
                result.address = booking.user.address;
            return result;
        } else {
            const result: GuestDetails = {
                name: booking.walk_in_guest?.full_name || "Guest",
            };
            if (booking.walk_in_guest?.contact_number !== undefined)
                result.phone = booking.walk_in_guest.contact_number;
            if (booking.walk_in_guest?.address !== undefined)
                result.address = booking.walk_in_guest.address;
            return result;
        }
    };

    const getActionMenu = (record: BookingRow, type: string): MenuProps => {
        const items: MenuProps["items"] = [];

        if (type === "active") {
            // Pending
            if (record.status === "pending") {
                items.push(
                    {
                        key: "confirm",
                        label: "Confirm",
                        onClick: () =>
                            handleUpdateStatus(
                                record.booked_room_id,
                                "confirmed",
                                "Confirm Booking",
                            ),
                    },
                    {
                        key: "cancel",
                        label: "Cancel Booking",
                        danger: true,
                        onClick: () =>
                            handleUpdateStatus(
                                record.booked_room_id,
                                "cancelled",
                                "Cancel Booking",
                            ),
                    },
                );
            }

            // Confirmed
            if (record.status === "confirmed") {
                items.push(
                    {
                        key: "checkin",
                        label: "Check In",
                        onClick: () =>
                            handleUpdateStatus(
                                record.booked_room_id,
                                "checked_in",
                                "Check In",
                            ),
                    },
                    {
                        key: "cancel",
                        label: "Cancel Booking",
                        danger: true,
                        onClick: () =>
                            handleUpdateStatus(
                                record.booked_room_id,
                                "cancelled",
                                "Cancel Booking",
                            ),
                    },
                );
            }

            // Checked In
            if (record.status === "checked_in") {
                items.push(
                    {
                        key: "checkout",
                        label: "Check Out",
                        onClick: () =>
                            handleUpdateStatus(
                                record.booked_room_id,
                                "checked_out",
                                "Check Out",
                            ),
                    },
                    {
                        key: "extend",
                        label: "Extend Stay",
                        onClick: () => handleExtend(record),
                    },
                    {
                        key: "refund",
                        label: "Refund Room",
                        danger: true,
                        onClick: () => handleRefund(record),
                    },
                );
            }

            // Cancelled
            if (record.status === "cancelled") {
                items.push({
                    key: "refund",
                    label: "Refund Room",
                    danger: true,
                    onClick: () => handleRefund(record),
                });
            }

            // Move to Trash
            items.push({
                key: "trash",
                label: "Move to Trash",
                danger: true,
                onClick: () => handleDeleteAction(record),
            });
        } else if (type === "history") {
            items.push({
                key: "trash",
                label: "Move to Trash",
                danger: true,
                onClick: () => handleDeleteAction(record),
            });
        } else if (type === "trash") {
            items.push(
                {
                    key: "restore",
                    label: "Restore",
                    onClick: () => {
                        if (userRole === "staff") {
                            Modal.warning({
                                title: "Access Restricted",
                                content:
                                    "Only administrators can restore bookings.",
                                okText: "OK",
                                centered: true,
                            });
                            return;
                        }

                        handleRestore(record);
                    },
                },
                {
                    key: "delete",
                    label: "Delete Forever",
                    danger: true,
                    onClick: () => {
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

                        handleForceDelete(record);
                    },
                },
            );
        }

        return { items };
    };

    const handleActionClick = (e: React.MouseEvent, record: Booking) => {
        e.stopPropagation();
    };

    const columns = [
        {
            title: (
                <span style={{ fontSize: "13px", fontWeight: 600 }}>
                    Booking Reference
                </span>
            ),
            key: "booking_id",
            width: "12%",
            render: (_: any, record: BookingRow) => (
                <Text style={{ fontSize: "13px", fontWeight: 500 }}>
                    {record.booking_reference}
                </Text>
            ),
        },
        {
            title: (
                <span style={{ fontSize: "13px", fontWeight: 600 }}>
                    Guest Name
                </span>
            ),
            key: "guest_name",
            width: "13%",
            align: "left" as const,
            render: (_: any, record: BookingRow) => (
                <Button
                    type="link"
                    style={{
                        color: "black",
                        padding: 0,
                        fontSize: "13px",
                        fontWeight: 400,
                    }}
                    onClick={() => showDetails(record)}
                >
                    {getGuestName(record)}
                </Button>
            ),
        },
        {
            title: (
                <span style={{ fontSize: "13px", fontWeight: 600 }}>Room</span>
            ),
            key: "room",
            width: "5%",
            align: "center" as const,
            render: (_: any, record: BookingRow) => (
                <Text style={{ fontSize: "13px" }}>
                    {record.room?.room_number ?? "N/A"}
                </Text>
            ),
        },
        {
            title: (
                <span style={{ fontSize: "13px", fontWeight: 600 }}>Type</span>
            ),
            key: "type",
            width: "8%",
            align: "center" as const,
            render: (_: any, record: BookingRow) => (
                <Tag
                    color={record.booking_type === "walk_in" ? "blue" : "green"}
                    style={{
                        fontSize: "12px",
                        padding: "4px 12px",
                        borderRadius: "6px",
                    }}
                >
                    {record.booking_type === "walk_in" ? "Walk-in" : "Online"}
                </Tag>
            ),
        },
        {
            title: (
                <span style={{ fontSize: "13px", fontWeight: 600 }}>
                    Status
                </span>
            ),
            key: "status",
            width: "10%",
            align: "center" as const,
            render: (_: any, record: BookingRow) => (
                <Tag
                    color={getStatusColor(record.status)}
                    style={{
                        fontSize: "12px",
                        padding: "4px 12px",
                        borderRadius: "6px",
                    }}
                >
                    {record.status?.replace(/_/g, " ").toUpperCase()}
                </Tag>
            ),
        },
        {
            title: (
                <span style={{ fontSize: "13px", fontWeight: 600 }}>
                    Stay Type
                </span>
            ),
            key: "stay_type",
            width: "12%",
            align: "center" as const,
            render: (_: any, record: BookingRow) => {
                const type = record.room?.pivot?.stay_type ?? record.stay_type;
                return (
                    <Tag
                        color={type === "short_stay" ? "purple" : "cyan"}
                        style={{ fontSize: "12px", borderRadius: "6px" }}
                    >
                        {type === "short_stay" ? "Short Stay" : "Overnight"}
                    </Tag>
                );
            },
        },
        {
            title: (
                <span style={{ fontSize: "13px", fontWeight: 600 }}>
                    Check In
                </span>
            ),
            key: "check_in",
            width: "8%",
            render: (_: any, record: BookingRow) => (
                <Text style={{ fontSize: "13px" }}>
                    {formatDate(record.check_in_date)}
                </Text>
            ),
        },
        {
            title: (
                <span style={{ fontSize: "13px", fontWeight: 600 }}>
                    Check Out
                </span>
            ),
            key: "check_out",
            width: "8%",
            render: (_: any, record: BookingRow) => (
                <Text style={{ fontSize: "13px" }}>
                    {formatDate(record.check_out_date)}
                </Text>
            ),
        },
        {
            title: (
                <span style={{ fontSize: "13px", fontWeight: 600 }}>
                    Payment
                </span>
            ),
            key: "payment_status",
            width: "9%",
            align: "center" as const,
            render: (_: any, record: BookingRow) => {
                const payment = record.payments?.[0];
                const status = payment?.payment_status ?? "pending";
                return (
                    <Tag
                        color={getPaymentStatusColor(status)}
                        style={{ fontSize: "12px", borderRadius: "6px" }}
                    >
                        {status.toUpperCase()}
                    </Tag>
                );
            },
        },
        {
            title: (
                <span style={{ fontSize: "13px", fontWeight: 600 }}>
                    Amount
                </span>
            ),
            key: "subtotal",
            width: "8%",
            render: (_: any, record: BookingRow) => {
                const addOnTotal =
                    record.booked_rooms
                        ?.find((br) => br.id === record.booked_room_id)
                        ?.booking_add_ons?.reduce(
                            (sum, addon) => sum + Number(addon.subtotal ?? 0),
                            0,
                        ) ?? 0;

                const total = Number(record.subtotal) + addOnTotal;

                return (
                    <Text
                        strong
                        style={{
                            color: "#52c41a",
                            fontSize: "13px",
                            fontWeight: 600,
                        }}
                    >
                        ₱
                        {total.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}
                    </Text>
                );
            },
        },
        {
            title: (
                <span style={{ fontSize: "13px", fontWeight: 600 }}>
                    Action
                </span>
            ),
            key: "action",
            width: "5%",
            align: "center" as const,
            render: (_: any, record: BookingRow) => (
                <div onClick={(e) => handleActionClick(e, record)}>
                    <Dropdown
                        menu={getActionMenu(record, activeTab)}
                        trigger={["click"]}
                    >
                        <Button
                            type="text"
                            icon={<MoreOutlined />}
                            size="small"
                        />
                    </Dropdown>
                </div>
            ),
        },
    ];

    const rowProps = (record: BookingRow) => {
        const bookedRoom = record.booked_rooms?.find(
            (br) => br.id === record.booked_room_id,
        );
        const overdueDays = getOverdueDays(bookedRoom);

        return {
            onClick: () => showDetails(record),
            className:
                selectedBookedRoomId === record.booked_room_id
                    ? "selected-booking-row"
                    : overdueDays >= 3
                      ? "critical-overdue-row"
                      : overdueDays >= 1
                        ? "warning-overdue-row"
                        : "clickable-row",
        };
    };

    const renderTable = () => (
        <Table<BookingRow>
            className="premium-table"
            columns={columns}
            dataSource={tableData}
            rowKey={(record) => record.booked_room_id}
            loading={bookingQuery.isLoading}
            size="middle"
            bordered={false}
            pagination={false}
            onRow={rowProps}
        />
    );

    const renderPagination = () => {
        const totalPages = Math.ceil(totalRows / pageSize) || 1;
        
        return (
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 20,
                    flexWrap: "wrap",
                    gap: 16,
                    padding: "12px 0",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Button
                        size="small"
                        disabled={currentPage === 1 || bookingQuery.isLoading}
                        onClick={() => setCurrentPage((prev: number) => prev - 1)}
                        style={{ borderRadius: "8px" }}
                    >
                        Prev
                    </Button>

                    <Text style={{ fontSize: "12px" }}>
                        Page {currentPage} of {totalPages}
                    </Text>

                    <Button
                        size="small"
                        disabled={
                            currentPage >= totalPages ||
                            bookingQuery.isLoading
                        }
                        onClick={() => setCurrentPage((prev: number) => prev + 1)}
                        style={{ borderRadius: "8px" }}
                    >
                        Next
                    </Button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <Text style={{ fontSize: "13px" }}>Total: {totalRows}</Text>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Text style={{ fontSize: "13px" }}>Rows:</Text>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            style={{
                                padding: "6px 12px",
                                borderRadius: "8px",
                                border: "1px solid #e5e7eb",
                                fontSize: "13px",
                                backgroundColor: "white",
                                cursor: "pointer",
                                outline: "none",
                            }}
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <Text style={{ fontSize: "13px" }}>/ page</Text>
                    </div>
                </div>
            </div>
        );
    };

    const tabItems: TabsProps["items"] = [
        {
            key: "active",
            label: (
                <Space size={6}>
                    <CheckCircleOutlined style={{ fontSize: "13px" }} />
                    <span style={{ fontSize: "13px", fontWeight: 500 }}>
                        Active
                    </span>
                </Space>
            ),
            children: (
                <>
                    {renderTable()}
                    {renderPagination()}
                </>
            ),
        },
        {
            key: "history",
            label: (
                <Space size={6}>
                    <HistoryOutlined style={{ fontSize: "13px" }} />
                    <span style={{ fontSize: "13px", fontWeight: 500 }}>
                        History
                    </span>
                </Space>
            ),
            children: (
                <>
                    {renderTable()}
                    {renderPagination()}
                </>
            ),
        },
        {
            key: "trash",
            label: (
                <Space size={6}>
                    <DeleteOutlined style={{ fontSize: "13px" }} />
                    <span style={{ fontSize: "13px", fontWeight: 500 }}>
                        Trash
                    </span>
                </Space>
            ),
            children: (
                <>
                    {bookings.length > 0 && (
                        <Alert
                            message="Warning"
                            description="Items in trash will be permanently deleted. Use 'Delete Forever' with caution."
                            type="warning"
                            showIcon
                            closable
                            style={{
                                marginBottom: 16,
                                fontSize: "12px",
                                borderRadius: "10px",
                            }}
                        />
                    )}
                    {renderTable()}
                    {renderPagination()}
                </>
            ),
        },
    ];

    const renderBookingDetails = () => {
        if (!selectedBooking) return null;

        const guestDetails = getGuestDetails(selectedBooking);
        const guestName = getGuestName(selectedBooking);
        const status =
            (selectedBookedRoom as any)?.status ??
            selectedBooking?.booking_status ??
            "pending";
        const statusColor = getStatusBadgeColor(status);
        const histories = selectedBooking.histories || [];

        const confirmedBy = histories.find((h) => h.new_status === "confirmed");
        const checkedInBy = histories.find(
            (h) => h.new_status === "checked_in",
        );
        const checkedOutBy = histories.find(
            (h) => h.new_status === "checked_out",
        );
        const override = histories.find((h) => h.is_override);

        const overdueDays =
            selectedBookedRoom && isBookedRoom(selectedBookedRoom)
                ? getOverdueDays(selectedBookedRoom)
                : 0;

        const displayAddOns = getBookingAddOns();
        const displayPayments = getPayments();
        const firstPayment = displayPayments[0];

        return (
            <Drawer
                title={
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <Space size={8}>
                            <Text
                                strong
                                style={{ fontSize: "14px", fontWeight: 600 }}
                            >
                                {guestName}
                            </Text>
                        </Space>
                    </div>
                }
                placement="right"
                open={detailsVisible}
                onClose={() => {
                    setDetailsVisible(false);
                    setSelectedBookedRoomId(null);
                }}
                width={500}
                closable={true}
                closeIcon={<CloseOutlined style={{ fontSize: "14px" }} />}
                extra={
                    <Dropdown
                        menu={
                            selectedBookingRow
                                ? getActionMenu(selectedBookingRow, activeTab)
                                : { items: [] }
                        }
                        trigger={["click"]}
                    >
                        <Button
                            type="primary"
                            icon={<MoreOutlined />}
                            size="middle"
                            style={{ borderRadius: "8px" }}
                        >
                            Actions
                        </Button>
                    </Dropdown>
                }
            >
                <div style={{ marginBottom: 24, textAlign: "center" }}>
                    <Badge
                        color={statusColor}
                        text={
                            <Text
                                strong
                                style={{
                                    fontSize: "14px",
                                    color: statusColor,
                                    fontWeight: 600,
                                }}
                            >
                                {status.replace(/_/g, " ").toUpperCase()}
                            </Text>
                        }
                    />
                </div>

                {overdueDays > 0 && (
                    <Alert
                        type="error"
                        showIcon
                        style={{
                            marginBottom: 16,
                            borderRadius: "12px",
                            alignItems: "center",
                        }}
                        message={`Overdue by ${overdueDays} day${overdueDays > 1 ? "s" : ""}`}
                        description="Guest exceeded expected checkout date."
                    />
                )}

                <Card
                    title={
                        <Space size={6}>
                            <UserOutlined style={{ fontSize: "13px" }} />
                            <span style={{ fontSize: "13px", fontWeight: 600 }}>
                                Guest Information
                            </span>
                        </Space>
                    }
                    size="small"
                    style={{
                        marginBottom: 16,
                        borderRadius: "12px",
                        border: "1px solid #f0f0f0",
                    }}
                >
                    <Descriptions column={1} size="small">
                        <Descriptions.Item
                            label={
                                <span
                                    style={{
                                        fontSize: "12px",
                                        fontWeight: 500,
                                    }}
                                >
                                    Name
                                </span>
                            }
                        >
                            <Text strong style={{ fontSize: "13px" }}>
                                {guestDetails.name}
                            </Text>
                        </Descriptions.Item>
                        {guestDetails.email !== undefined && (
                            <Descriptions.Item
                                label={
                                    <span
                                        style={{
                                            fontSize: "12px",
                                            fontWeight: 500,
                                        }}
                                    >
                                        Email
                                    </span>
                                }
                            >
                                <Text style={{ fontSize: "13px" }}>
                                    {guestDetails.email}
                                </Text>
                            </Descriptions.Item>
                        )}
                        {guestDetails.phone !== undefined && (
                            <Descriptions.Item
                                label={
                                    <span
                                        style={{
                                            fontSize: "12px",
                                            fontWeight: 500,
                                        }}
                                    >
                                        Phone
                                    </span>
                                }
                            >
                                <Space size={4}>
                                    <PhoneOutlined
                                        style={{ fontSize: "12px" }}
                                    />
                                    <Text style={{ fontSize: "13px" }}>
                                        {guestDetails.phone}
                                    </Text>
                                </Space>
                            </Descriptions.Item>
                        )}
                        {guestDetails.address !== undefined && (
                            <Descriptions.Item
                                label={
                                    <span
                                        style={{
                                            fontSize: "12px",
                                            fontWeight: 500,
                                        }}
                                    >
                                        Address
                                    </span>
                                }
                            >
                                <Space size={4}>
                                    <EnvironmentOutlined
                                        style={{ fontSize: "12px" }}
                                    />
                                    <Text style={{ fontSize: "13px" }}>
                                        {guestDetails.address}
                                    </Text>
                                </Space>
                            </Descriptions.Item>
                        )}
                    </Descriptions>
                </Card>

                <Card
                    title={
                        <Space size={6}>
                            <CalendarOutlined style={{ fontSize: "13px" }} />
                            <span style={{ fontSize: "13px", fontWeight: 600 }}>
                                Booking Details
                            </span>
                        </Space>
                    }
                    size="small"
                    style={{
                        marginBottom: 16,
                        borderRadius: "12px",
                        border: "1px solid #f0f0f0",
                    }}
                >
                    <Descriptions column={1} size="small">
                        <Descriptions.Item
                            label={
                                <span
                                    style={{
                                        fontSize: "12px",
                                        fontWeight: 500,
                                    }}
                                >
                                    Booking Type
                                </span>
                            }
                        >
                            <Tag
                                color={
                                    selectedBooking.booking_type === "walk_in"
                                        ? "blue"
                                        : "green"
                                }
                                style={{
                                    fontSize: "12px",
                                    borderRadius: "6px",
                                }}
                            >
                                {selectedBooking.booking_type === "walk_in"
                                    ? "Walk-in"
                                    : "Online"}
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item
                            label={
                                <span
                                    style={{
                                        fontSize: "12px",
                                        fontWeight: 500,
                                    }}
                                >
                                    Stay Type
                                </span>
                            }
                        >
                            {(() => {
                                const type =
                                    (selectedBookedRoom as any)?.stay_type ??
                                    selectedBooking.stay_type;
                                return (
                                    <Tag
                                        color={
                                            type === "short_stay"
                                                ? "purple"
                                                : "cyan"
                                        }
                                        style={{
                                            fontSize: "12px",
                                            borderRadius: "6px",
                                        }}
                                    >
                                        {type === "short_stay"
                                            ? "Short Stay"
                                            : "Overnight"}
                                    </Tag>
                                );
                            })()}
                        </Descriptions.Item>
                        <Descriptions.Item
                            label={
                                <span
                                    style={{
                                        fontSize: "12px",
                                        fontWeight: 500,
                                    }}
                                >
                                    Booking Reference
                                </span>
                            }
                        >
                            <Text code style={{ fontSize: "12px" }}>
                                {selectedBooking.booking_reference}
                            </Text>
                        </Descriptions.Item>

                        {(() => {
                            const isWalkIn =
                                selectedBooking.booking_type === "walk_in";
                            const formatUser = (user: any) => {
                                if (!user) return "N/A";
                                return (
                                    <>
                                        {user.first_name} {user.last_name}
                                        {user.role && (
                                            <Text
                                                type="secondary"
                                                style={{ marginLeft: 6 }}
                                            >
                                                ({user.role})
                                            </Text>
                                        )}
                                    </>
                                );
                            };

                            return (
                                <>
                                    {isWalkIn ? (
                                        <Descriptions.Item label="Handled By">
                                            {formatUser(
                                                selectedBooking.created_by,
                                            )}
                                        </Descriptions.Item>
                                    ) : (
                                        <>
                                            <Descriptions.Item label="Created By">
                                                {selectedBooking.created_by
                                                    ? formatUser(
                                                          selectedBooking.created_by,
                                                      )
                                                    : "Customer"}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Confirmed By">
                                                {confirmedBy?.user ? (
                                                    formatUser(confirmedBy.user)
                                                ) : (
                                                    <Text type="secondary">
                                                        Not confirmed
                                                    </Text>
                                                )}
                                            </Descriptions.Item>
                                        </>
                                    )}
                                    {checkedInBy?.user && (
                                        <Descriptions.Item label="Checked-in By">
                                            {formatUser(checkedInBy.user)}
                                        </Descriptions.Item>
                                    )}
                                    {checkedOutBy?.user && (
                                        <Descriptions.Item label="Checked-out By">
                                            {formatUser(checkedOutBy.user)}
                                        </Descriptions.Item>
                                    )}
                                    {override?.user && (
                                        <Descriptions.Item label="Override By">
                                            <Text type="danger">
                                                {formatUser(override.user)}
                                            </Text>
                                        </Descriptions.Item>
                                    )}
                                </>
                            );
                        })()}

                        <Descriptions.Item
                            label={
                                <span
                                    style={{
                                        fontSize: "12px",
                                        fontWeight: 500,
                                    }}
                                >
                                    Created At
                                </span>
                            }
                        >
                            <Space size={4}>
                                <CalendarOutlined
                                    style={{ fontSize: "12px" }}
                                />
                                <Text style={{ fontSize: "13px" }}>
                                    {formatDateTime(
                                        selectedBooking.created_at || "",
                                    )}
                                </Text>
                            </Space>
                        </Descriptions.Item>
                        <Descriptions.Item
                            label={
                                <span
                                    style={{
                                        fontSize: "12px",
                                        fontWeight: 500,
                                    }}
                                >
                                    Check-in Date
                                </span>
                            }
                        >
                            <Space size={4}>
                                <CalendarOutlined
                                    style={{ fontSize: "12px" }}
                                />
                                <Text style={{ fontSize: "13px" }}>
                                    {formatDate(
                                        (selectedBookedRoom as any)
                                            ?.check_in_date || "",
                                    )}
                                </Text>
                            </Space>
                        </Descriptions.Item>
                        <Descriptions.Item
                            label={
                                <span
                                    style={{
                                        fontSize: "12px",
                                        fontWeight: 500,
                                    }}
                                >
                                    Expected Check-out
                                </span>
                            }
                        >
                            <Space size={4}>
                                <CalendarOutlined
                                    style={{ fontSize: "12px" }}
                                />
                                <Text style={{ fontSize: "13px" }}>
                                    {formatDate(
                                        (selectedBookedRoom as any)
                                            ?.check_out_date || "",
                                    )}
                                </Text>
                            </Space>
                        </Descriptions.Item>
                        <Descriptions.Item
                            label={
                                <span
                                    style={{
                                        fontSize: "12px",
                                        fontWeight: 500,
                                    }}
                                >
                                    Check-in Time
                                </span>
                            }
                        >
                            <Space size={4}>
                                <ClockCircleOutlined
                                    style={{ fontSize: "12px" }}
                                />
                                <Text style={{ fontSize: "13px" }}>
                                    {formatTime(
                                        (selectedBookedRoom as any)
                                            ?.check_in_time || "",
                                    )}
                                </Text>
                            </Space>
                        </Descriptions.Item>
                        <Descriptions.Item
                            label={
                                <span
                                    style={{
                                        fontSize: "12px",
                                        fontWeight: 500,
                                    }}
                                >
                                    Check-out Time
                                </span>
                            }
                        >
                            <Space size={4}>
                                <ClockCircleOutlined
                                    style={{ fontSize: "12px" }}
                                />
                                <Text style={{ fontSize: "13px" }}>
                                    {formatTime(
                                        (selectedBookedRoom as any)
                                            ?.check_out_time || "",
                                    )}
                                </Text>
                            </Space>
                        </Descriptions.Item>
                    </Descriptions>
                </Card>

                <Card
                    title={
                        <Space size={6}>
                            <TagOutlined style={{ fontSize: "13px" }} />
                            <span style={{ fontSize: "13px", fontWeight: 600 }}>
                                Rooms
                            </span>
                        </Space>
                    }
                    size="small"
                    style={{
                        marginBottom: 16,
                        borderRadius: "12px",
                        border: "1px solid #f0f0f0",
                    }}
                >
                    {selectedBookedRoom ? (
                        <div>
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "10px 14px",
                                    background: "#f8fafc",
                                    borderRadius: "10px",
                                    border: "1px solid #e2e8f0",
                                }}
                            >
                                <Space size={8}>
                                    <Tag
                                        color="blue"
                                        style={{
                                            fontSize: "12px",
                                            borderRadius: "6px",
                                        }}
                                    >
                                        Room{" "}
                                        {(selectedBookedRoom as any).room
                                            ?.room_number || "N/A"}
                                    </Tag>
                                    <Text
                                        type="secondary"
                                        style={{ fontSize: "12px" }}
                                    >
                                        {(selectedBookedRoom as any).room
                                            ?.room_type?.type_name ?? "-"}
                                    </Text>
                                </Space>
                                <Space
                                    direction="vertical"
                                    size={0}
                                    align="end"
                                >
                                    {(selectedBookedRoom as any).room?.room_type
                                        ?.base_price && (
                                        <Text
                                            type="secondary"
                                            style={{ fontSize: "11px" }}
                                        >
                                            Original: ₱
                                            {Number(
                                                (selectedBookedRoom as any).room
                                                    .room_type.base_price ?? 0,
                                            ).toLocaleString()}
                                        </Text>
                                    )}
                                    <Text
                                        strong
                                        style={{
                                            color: "#52c41a",
                                            fontSize: "13px",
                                            fontWeight: 600,
                                        }}
                                    >
                                        {(selectedBookedRoom as any)
                                            .stay_type === "short_stay"
                                            ? "Short Stay"
                                            : "Overnight"}
                                        : ₱
                                        {Number(
                                            (selectedBookedRoom as any)
                                                .subtotal ??
                                                (selectedBookedRoom as any)
                                                    .price_at_time_of_booking,
                                        ).toLocaleString()}
                                    </Text>
                                </Space>
                            </div>
                        </div>
                    ) : (
                        <Text type="secondary" style={{ fontSize: "13px" }}>
                            No rooms assigned
                        </Text>
                    )}
                </Card>

                <Card
                    title={
                        <Space size={6}>
                            <TagOutlined style={{ fontSize: "13px" }} />
                            <span style={{ fontSize: "13px", fontWeight: 600 }}>
                                Add-ons
                            </span>
                        </Space>
                    }
                    size="small"
                    style={{
                        marginBottom: 16,
                        borderRadius: "12px",
                        border: "1px solid #f0f0f0",
                    }}
                >
                    {displayAddOns.length > 0 ? (
                        displayAddOns.map((addon) => (
                            <div
                                key={addon.id}
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "10px 14px",
                                    background: "#f8fafc",
                                    borderRadius: "10px",
                                    border: "1px solid #e2e8f0",
                                    marginBottom: 10,
                                }}
                            >
                                <div>
                                    <div
                                        style={{
                                            fontWeight: 600,
                                            fontSize: "13px",
                                        }}
                                    >
                                        {addon.add_on?.add_on_name}
                                    </div>
                                    <div
                                        style={{
                                            color: "#64748b",
                                            fontSize: "12px",
                                        }}
                                    >
                                        ₱
                                        {Number(
                                            addon.add_on?.price ?? 0,
                                        ).toLocaleString()}{" "}
                                        × {addon.quantity}
                                    </div>
                                </div>
                                <div
                                    style={{
                                        color: "#52c41a",
                                        fontWeight: 700,
                                        fontSize: "13px",
                                    }}
                                >
                                    ₱{Number(addon.subtotal).toLocaleString()}
                                </div>
                            </div>
                        ))
                    ) : (
                        <Text type="secondary">No add-ons purchased</Text>
                    )}
                </Card>

                <Card
                    title={
                        <Space size={6}>
                            <span style={{ fontSize: "13px", fontWeight: 600 }}>
                                Payment Summary
                            </span>
                        </Space>
                    }
                    size="small"
                    style={{
                        marginBottom: 16,
                        borderRadius: "12px",
                        border: "1px solid #f0f0f0",
                    }}
                >
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ marginBottom: 8 }}>
                            <Text type="secondary">Payment Method:</Text>
                            <Tag color="green" style={{ marginLeft: 8 }}>
                                {firstPayment?.payment_method?.toUpperCase() ||
                                    "N/A"}
                            </Tag>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                            <Text type="secondary">Payment Status:</Text>
                            <Tag
                                color={getPaymentStatusColor(
                                    firstPayment?.payment_status ?? "pending",
                                )}
                                style={{ marginLeft: 8 }}
                            >
                                {(firstPayment?.payment_status ?? "pending")
                                    .replace(/_/g, " ")
                                    .toUpperCase()}
                            </Tag>
                        </div>
                        {firstPayment?.payment_method !== "cash" && (
                            <div>
                                <Text type="secondary">Reference:</Text>
                                <Text strong style={{ marginLeft: 8 }}>
                                    {firstPayment?.gcash_reference ||
                                        firstPayment?.bank_reference ||
                                        "N/A"}
                                </Text>
                            </div>
                        )}
                        {firstPayment?.receipt_number && (
                            <div style={{ marginTop: 8 }}>
                                <Text type="secondary">Receipt Number:</Text>
                                <Text strong style={{ marginLeft: 8 }}>
                                    {firstPayment.receipt_number}
                                </Text>
                            </div>
                        )}
                        {firstPayment?.payment_date && (
                            <div style={{ marginTop: 8 }}>
                                <Text type="secondary">Payment Date:</Text>
                                <Text strong style={{ marginLeft: 8 }}>
                                    {formatDateTime(firstPayment.payment_date)}
                                </Text>
                            </div>
                        )}
                        {firstPayment?.receiver && (
                            <div style={{ marginTop: 8 }}>
                                <Text type="secondary">Received By:</Text>
                                <Text strong style={{ marginLeft: 8 }}>
                                    {firstPayment.receiver.first_name}{" "}
                                    {firstPayment.receiver.last_name}
                                </Text>
                            </div>
                        )}
                        {displayPayments.length > 1 && (
                            <div style={{ marginTop: 8 }}>
                                <Text type="secondary">Total Payments:</Text>
                                <Text
                                    strong
                                    style={{ marginLeft: 8, color: "#52c41a" }}
                                >
                                    ₱
                                    {displayPayments
                                        .reduce(
                                            (sum, p) => sum + Number(p.amount),
                                            0,
                                        )
                                        .toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                </Text>
                            </div>
                        )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ marginBottom: 8 }}>
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: 6,
                                }}
                            >
                                <Text
                                    type="secondary"
                                    style={{ fontSize: "12px" }}
                                >
                                    Room Charges
                                </Text>
                                <Text style={{ fontSize: "13px" }}>
                                    ₱
                                    {roomCharges.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                </Text>
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: 6,
                                }}
                            >
                                <Text
                                    type="secondary"
                                    style={{ fontSize: "12px" }}
                                >
                                    Add-ons
                                </Text>
                                <Text style={{ fontSize: "13px" }}>
                                    ₱
                                    {addOnTotal.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                </Text>
                            </div>
                            {(selectedBookedRoom as any)?.is_extended && (
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        marginBottom: 6,
                                    }}
                                >
                                    <Text
                                        type="secondary"
                                        style={{ fontSize: "12px" }}
                                    >
                                        Extended
                                    </Text>
                                    <Text
                                        strong
                                        style={{
                                            fontSize: "13px",
                                            color: "#52c41a",
                                        }}
                                    >
                                        Yes
                                    </Text>
                                </div>
                            )}
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                }}
                            >
                                <Text
                                    type="secondary"
                                    style={{ fontSize: "12px" }}
                                >
                                    Subtotal:
                                </Text>
                                <Text
                                    strong
                                    style={{
                                        fontSize: "14px",
                                        color: "#52c41a",
                                        marginLeft: 16,
                                        fontWeight: 700,
                                    }}
                                >
                                    ₱
                                    {paymentSubtotal.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                </Text>
                            </div>
                        </div>
                        <Divider style={{ margin: "8px 0" }} />
                        <div>
                            <Text
                                strong
                                style={{ fontSize: "13px", fontWeight: 600 }}
                            >
                                Total:
                            </Text>
                            <Text
                                strong
                                style={{
                                    fontSize: "14px",
                                    color: "#52c41a",
                                    marginLeft: 16,
                                    fontWeight: 700,
                                }}
                            >
                                ₱
                                {paymentSubtotal.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </Text>
                        </div>
                    </div>
                </Card>

                {selectedBooking.histories &&
                    selectedBooking.histories.length > 0 && (
                        <Card
                            title={
                                <span
                                    style={{
                                        fontSize: "13px",
                                        fontWeight: 600,
                                    }}
                                >
                                    Activity Log
                                </span>
                            }
                            size="small"
                            style={{
                                borderRadius: "12px",
                                border: "1px solid #f0f0f0",
                            }}
                        >
                            <Timeline
                                items={selectedBooking.histories.map(
                                    (history: History) => ({
                                        color:
                                            history.new_status === "checked_out"
                                                ? "green"
                                                : "blue",
                                        children: (
                                            <div>
                                                <Text
                                                    strong
                                                    style={{
                                                        fontSize: "12px",
                                                        color: history.is_override
                                                            ? "red"
                                                            : undefined,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {history.change_note ||
                                                        "Status Updated"}
                                                </Text>
                                                {history.is_override &&
                                                    history.override_reason && (
                                                        <>
                                                            <br />
                                                            <Text
                                                                type="danger"
                                                                style={{
                                                                    fontSize:
                                                                        "11px",
                                                                }}
                                                            >
                                                                Override Reason:{" "}
                                                                {
                                                                    history.override_reason
                                                                }
                                                            </Text>
                                                        </>
                                                    )}
                                                <br />
                                                <Text
                                                    type="secondary"
                                                    style={{ fontSize: "11px" }}
                                                >
                                                    From: {history.old_status} →
                                                    To: {history.new_status}
                                                </Text>
                                                <br />
                                                <Text
                                                    type="secondary"
                                                    style={{ fontSize: "11px" }}
                                                >
                                                    {formatDateTime(
                                                        history.changed_at,
                                                    )}
                                                </Text>
                                            </div>
                                        ),
                                    }),
                                )}
                            />
                        </Card>
                    )}
            </Drawer>
        );
    };

    return (
        <div className="space-y-1 pb-6">
            <style>
                {`
                    .clickable-row { cursor: pointer; }
                    .selected-booking-row td { background: #ecfdf5 !important; }
                    .selected-booking-row:hover td { background: #d1fae5 !important; }
                    .selected-booking-row td:first-child { border-left: 4px solid #10b981 !important; }
                    .warning-overdue-row td:first-child { border-left: 4px solid #faad14 !important; }
                    .critical-overdue-row td:first-child { border-left: 4px solid #ff4d4f !important; }
                    
                    .mint-tabs .ant-tabs-tab-active .ant-tabs-tab-btn { color: #10b981 !important; }
                    .mint-tabs .ant-tabs-ink-bar { background: #10b981 !important; }
                    .mint-tabs .ant-tabs-tab { font-size: 13px !important; padding: 12px 0 !important; }
                    
                    .premium-table .ant-table { background: white; border-radius: 16px; overflow: visible; }
                    .premium-table .ant-table-thead > tr > th {
                        font-size: 13px !important;
                        font-weight: 600 !important;
                        padding: 14px 8px !important;
                        background-color: #f8fafc !important;
                        border-bottom: 1px solid #e2e8f0 !important;
                        color: #1e293b !important;
                    }
                    .premium-table .ant-table-tbody > tr > td {
                        font-size: 13px !important;
                        padding: 12px 8px !important;
                        border-bottom: 1px solid #f1f5f9 !important;
                        color: #334155 !important;
                    }
                    .premium-table .ant-table-tbody > tr:last-child > td { border-bottom: none !important; }
                    
                    .ant-descriptions-item-label { font-size: 12px !important; font-weight: 500 !important; color: #64748b !important; }
                    .ant-descriptions-item-content { font-size: 13px !important; color: #1e293b !important; }
                    .ant-card-head-title { font-size: 13px !important; font-weight: 600 !important; color: #1e293b !important; }
                    .ant-timeline-item-content { font-size: 12px !important; }
                    .ant-tag { font-size: 12px !important; border-radius: 6px !important; padding: 4px 12px !important; }
                    .ant-btn { font-size: 13px !important; border-radius: 8px !important; }
                    .ant-modal-content { border-radius: 16px !important; }
                    .ant-modal-header { border-radius: 16px 16px 0 0 !important; }
                    
                    @media (max-width: 768px) {
                        .ant-table { font-size: 12px; }
                        .ant-table-thead > tr > th { font-size: 12px !important; }
                        .ant-table-tbody > tr > td { font-size: 12px !important; }
                    }
                `}
            </style>
            <div
                style={{
                    marginBottom: 24,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 16,
                }}
            >
                <div>
                    <Title
                        level={5}
                        style={{
                            margin: 0,
                            fontSize: "24px",
                            fontWeight: 700,
                            color: "#0f172a",
                        }}
                    >
                        Booking List
                    </Title>
                    <Text
                        type="secondary"
                        style={{ fontSize: "12px", color: "#64748b" }}
                    >
                        Manage and track all reservations
                    </Text>
                </div>
            </div>

            <Tabs
                className="mint-tabs"
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
                size="middle"
                centered={false}
                tabBarExtraContent={
                    <Input
                        className="mint-search-input"
                        placeholder="Search by name, ID, or type..."
                        allowClear
                        value={searchInput}
                        onChange={(e) => {
                            const value = e.target.value;
                            setSearchInput(value);
                            debouncedSearch(value);
                        }}
                        prefix={
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                }}
                            >
                                <SearchOutlined
                                    style={{ color: "#94a3b8", fontSize: 16 }}
                                />
                                <div
                                    style={{
                                        width: 2,
                                        height: 18,
                                        background: "#d1d5db",
                                        borderRadius: 999,
                                    }}
                                />
                            </div>
                        }
                        style={{
                            width: 300,
                            height: 40,
                            borderRadius: 10,
                            bottom: 10,
                        }}
                    />
                }
            />

            {renderBookingDetails()}
        </div>
    );
}   