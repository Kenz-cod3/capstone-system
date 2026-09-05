import { useEffect, useState, useMemo, useRef } from "react";
import {
    useQuery,
    useQueryClient,
    keepPreviousData,
} from "@tanstack/react-query";
import debounce from "lodash/debounce";
import {
    MoreOutlined,
    DeleteOutlined,
    CheckCircleOutlined,
    SearchOutlined,
    HomeOutlined,
    DollarOutlined,
    TeamOutlined,
    CalendarOutlined as CalendarIcon,
    CheckOutlined,
    CloseCircleOutlined,
    SyncOutlined,
    CopyOutlined,
    FilterOutlined,
    HistoryOutlined,
} from "@ant-design/icons";
import {
    Table,
    Input,
    Button,
    message,
    Modal,
    Tag,
    Dropdown,
    Alert,
    Typography,
    Card,
    Row,
    Col,
    Avatar,
    Popover,
} from "antd";
import type { MenuProps } from "antd";
import api from "@/services/api";
import { useLocation, useNavigate, useNavigationType } from "react-router-dom";

const { Title, Text } = Typography;

const MINT_GREEN = "#10b981";
const MINT_GREEN_LIGHT = "#d1fae5";
const MINT_GREEN_BG = "#ecfdf5";
const MINT_GREEN_HOVER = "#059669";
const MINT_GREEN_DARK = "#065f46";

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
        role?: string;
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
}

interface ExtendResponse {
    total_price: number;
    booked_room: BookedRoom;
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

export default function Bookings() {
    const location = useLocation();
    const navigate = useNavigate();
    const navigationType = useNavigationType();

    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [total, setTotal] = useState<number>(0);
    const [activeTab, setActiveTab] = useState<string>(
        (location.state as any)?.activeTab || "active",
    );
    const [searchInput, setSearchInput] = useState("");
    const [searchText, setSearchText] = useState("");
    const [userRole, setUserRole] = useState<string>("staff");
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [filterPaymentStatus, setFilterPaymentStatus] =
        useState<string>("all");
    const [filterPopoverOpen, setFilterPopoverOpen] = useState<boolean>(false);

    const bookingId = location.state?.bookingId;

    // Read tab from location state when coming back from details
    useEffect(() => {
        const state = location.state as any;
        if (state?.activeTab) {
            setActiveTab(state.activeTab);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state]);

    // Refs for tab animation
    const tabContainerRef = useRef<HTMLDivElement>(null);
    const activeTabRef = useRef<HTMLButtonElement>(null);
    const [indicatorStyle, setIndicatorStyle] = useState<{
        left: number;
        width: number;
    }>({ left: 0, width: 0 });

    useEffect(() => {
        setCurrentPage(1);
        setSearchText("");
        setFilterStatus("all");
        setFilterPaymentStatus("all");
    }, [activeTab]);

    // Update indicator position when active tab changes
    useEffect(() => {
        if (activeTabRef.current && tabContainerRef.current) {
            const tabRect = activeTabRef.current.getBoundingClientRect();
            const containerRect =
                tabContainerRef.current.getBoundingClientRect();
            setIndicatorStyle({
                left: tabRect.left - containerRect.left,
                width: tabRect.width,
            });
        }
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

    // Get filter options based on active tab
    const getFilterOptions = () => {
        if (activeTab === "active") {
            return {
                type: "status" as const,
                options: [
                    { value: "all", label: "All Status" },
                    { value: "pending", label: "Pending" },
                    { value: "confirmed", label: "Confirmed" },
                    { value: "checked_in", label: "Checked In" },
                    { value: "cancelled", label: "Cancelled" },
                ],
            };
        } else if (activeTab === "history") {
            return {
                type: "both" as const,
                statusOptions: [
                    { value: "all", label: "All Booking Status" },
                    { value: "checked_out", label: "Checked Out" },
                    { value: "refunded", label: "Refunded" },
                ],
                paymentOptions: [
                    { value: "all", label: "All Payment Status" },
                    { value: "paid", label: "Paid" },
                    { value: "pending", label: "Pending Payment" },
                    { value: "refunded", label: "Refunded Payment" },
                    { value: "failed", label: "Failed" },
                ],
            };
        } else {
            // trash
            return {
                type: "status" as const,
                options: [
                    { value: "all", label: "All" },
                    { value: "archived", label: "Archived" },
                ],
            };
        }
    };

    // Fetch all booked rooms based on active tab
    const bookingQuery = useQuery({
        queryKey: [
            "booked-rooms",
            activeTab,
            currentPage,
            pageSize,
            searchText,
            filterStatus,
            filterPaymentStatus,
        ],
        queryFn: async () => {
            let endpoint = "/booked-rooms";

            if (activeTab === "history") {
                endpoint = "/booked-rooms/history";
            }

            if (activeTab === "trash") {
                endpoint = "/booked-rooms/trash";
            }

            const params = new URLSearchParams({
                page: currentPage.toString(),
                per_page: pageSize.toString(),
            });

            if (searchText.trim()) {
                params.append("search", searchText.trim());
            }

            if (filterStatus !== "all") {
                params.append("status", filterStatus);
            }

            if (activeTab === "history" && filterPaymentStatus !== "all") {
                params.append("payment_status", filterPaymentStatus);
            }

            const { data } = await api.get<PaginatedResponse>(
                `${endpoint}?${params.toString()}`,
            );

            setTotal(data.total || 0);
            return data.data || [];
        },
        staleTime: 0,
        gcTime: 300000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        placeholderData: keepPreviousData,
    });

    const bookings = bookingQuery.data ?? [];

    useEffect(() => {
        bookingQuery.refetch();
    }, [activeTab, filterStatus, filterPaymentStatus]);

    const filteredData = bookings;
    const paginatedData = filteredData;

    useEffect(() => {
        setCurrentPage(1);
    }, [searchText, activeTab, filterStatus, filterPaymentStatus]);

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
            booking_add_ons: bookedRoom.booking_add_ons || [],
        } as BookingRow;
    });

    // Calculate statistics
    const stats = useMemo(() => {
        const activeBookings = bookings.filter(
            (b) =>
                b.status === "checked_in" ||
                b.status === "confirmed" ||
                b.status === "pending",
        );
        const checkedIn = bookings.filter((b) => b.status === "checked_in");
        const upcoming = bookings.filter((b) => {
            if (b.status !== "confirmed") return false;
            const checkIn = new Date(b.check_in_date);
            const today = new Date();
            return checkIn >= today;
        });
        const totalRevenue = bookings
            .filter(
                (b) => b.status === "checked_in" || b.status === "checked_out",
            )
            .reduce((sum, b) => sum + Number(b.subtotal || 0), 0);

        return {
            totalActive: activeBookings.length,
            checkedIn: checkedIn.length,
            upcoming: upcoming.length,
            totalRevenue: totalRevenue,
        };
    }, [bookings]);

    const hasOpenedFromNavigation = useRef(false);

    useEffect(() => {
        if (hasOpenedFromNavigation.current) return;
        if (!bookingId) return;

        hasOpenedFromNavigation.current = true;
        navigate(`/booking-details/${bookingId}`, { replace: true });
    }, [bookingId]);

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

                queryClient.setQueryData(
                    [
                        "booked-rooms",
                        activeTab,
                        currentPage,
                        pageSize,
                        searchText,
                        filterStatus,
                        filterPaymentStatus,
                    ],
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
                width: 480,
                okText: "Proceed",
                cancelText: "Cancel",
                content: (
                    <Input.TextArea
                        rows={3}
                        placeholder="Enter reason..."
                        onChange={(e) => (overrideReason = e.target.value)}
                        style={{ fontSize: "11px" }}
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

            queryClient.setQueryData(
                [
                    "booked-rooms",
                    activeTab,
                    currentPage,
                    pageSize,
                    searchText,
                    filterStatus,
                    filterPaymentStatus,
                ],
                (old: BookedRoom[] | undefined) => {
                    if (!old) return old;
                    return old.filter((b) => b.id !== bookingId);
                },
            );

            const checkedOutBooking = bookings.find((b) => b.id === bookingId);
            if (checkedOutBooking) {
                const updatedBookedRoom: BookedRoom = {
                    ...checkedOutBooking,
                    status: "checked_out" as BookedRoom["status"],
                };
                queryClient.setQueryData(
                    [
                        "booked-rooms",
                        "history",
                        currentPage,
                        pageSize,
                        searchText,
                        filterStatus,
                        filterPaymentStatus,
                    ],
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
                [
                    "booked-rooms",
                    activeTab,
                    currentPage,
                    pageSize,
                    searchText,
                    filterStatus,
                    filterPaymentStatus,
                ],
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
                            [
                                "booked-rooms",
                                activeTab,
                                currentPage,
                                pageSize,
                                searchText,
                                filterStatus,
                                filterPaymentStatus,
                            ],
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
                [
                    "booked-rooms",
                    activeTab,
                    currentPage,
                    pageSize,
                    searchText,
                    filterStatus,
                    filterPaymentStatus,
                ],
                (old: BookedRoom[] | undefined) => {
                    if (!old) return old;
                    return old.filter((b) => b.id !== record.id);
                },
            );

            const deletedItem = bookings.find((b) => b.id === record.id);
            if (deletedItem) {
                queryClient.setQueryData(
                    [
                        "booked-rooms",
                        "trash",
                        currentPage,
                        pageSize,
                        searchText,
                        filterStatus,
                        filterPaymentStatus,
                    ],
                    (old: BookedRoom[] | undefined) => {
                        return [deletedItem, ...(old || [])];
                    },
                );
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
                [
                    "booked-rooms",
                    "trash",
                    currentPage,
                    pageSize,
                    searchText,
                    filterStatus,
                    filterPaymentStatus,
                ],
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
                    [
                        "booked-rooms",
                        "active",
                        currentPage,
                        pageSize,
                        searchText,
                        filterStatus,
                        filterPaymentStatus,
                    ],
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
            onOk: async () => {
                try {
                    await api.delete(
                        `/booked-rooms/${record.booked_room_id}/force-delete`,
                    );

                    queryClient.setQueryData(
                        [
                            "booked-rooms",
                            "trash",
                            currentPage,
                            pageSize,
                            searchText,
                            filterStatus,
                            filterPaymentStatus,
                        ],
                        (old: BookedRoom[] | undefined) => {
                            if (!old) return old;
                            return old.filter((b) => b.id !== record.id);
                        },
                    );

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
        navigate(location.pathname, {
            replace: true,
            state: { activeTab },
        });
        navigate(`/booking-details/${record.id}`, {
            state: { from: location.pathname, fromTab: activeTab },
        });
    };

    const formatDate = (date: string): string => {
        if (!date) return "-";
        return new Date(date).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const formatTime = (datetime: string): string => {
        if (!datetime) return "-";
        return new Date(datetime).toLocaleTimeString("en-PH", {
            hour: "2-digit",
            minute: "2-digit",
        });
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

    const copyToClipboard = (text: string) => {
        navigator.clipboard
            .writeText(text)
            .then(() => {
                message.success("Copied to clipboard!");
            })
            .catch(() => {
                message.error("Failed to copy");
            });
    };

    const getActionMenu = (record: BookingRow, type: string): MenuProps => {
        const items: MenuProps["items"] = [];

        if (type === "active") {
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

            if (record.status === "cancelled") {
                items.push({
                    key: "refund",
                    label: "Refund Room",
                    danger: true,
                    onClick: () => handleRefund(record),
                });
            }

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

    // Updated columns with copy icon on reference
    const columns = [
        {
            title: (
                <span
                    style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                    }}
                >
                    Booking Reference
                </span>
            ),
            key: "booking_id",
            width: "14%",
            render: (_: any, record: BookingRow) => (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div>
                        <Text
                            strong
                            style={{ fontSize: "12px", color: "#0f172a" }}
                        >
                            {record.booking_reference}
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: "8.5px" }}>
                            Booked on{" "}
                            {formatDate(
                                record.created_at || record.check_in_date,
                            )}
                        </Text>
                    </div>
                    <Button
                        type="text"
                        size="small"
                        icon={
                            <CopyOutlined
                                style={{ fontSize: "12px", color: "#94a3b8" }}
                            />
                        }
                        onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(record.booking_reference);
                        }}
                        style={{ padding: "2px 4px", height: "auto" }}
                    />
                </div>
            ),
        },
        {
            title: (
                <span
                    style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                    }}
                >
                    Guest
                </span>
            ),
            key: "guest",
            width: "16%",
            render: (_: any, record: BookingRow) => {
                const name = getGuestName(record);
                const initials = name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);
                let phone: string | undefined;

                if (record.user) {
                    phone = record.user.phone;
                } else if (record.walk_in_guest) {
                    phone = record.walk_in_guest.contact_number;
                }

                return (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                        }}
                    >
                        <Avatar
                            style={{
                                backgroundColor: MINT_GREEN_LIGHT,
                                color: MINT_GREEN,
                                fontSize: "10px",
                                fontWeight: 600,
                                flexShrink: 0,
                            }}
                            size={28}
                        >
                            {initials || "G"}
                        </Avatar>
                        <div>
                            <Text
                                strong
                                style={{ fontSize: "11px", color: "#0f172a" }}
                            >
                                {name}
                            </Text>
                            {phone && (
                                <div
                                    style={{
                                        fontSize: "8.5px",
                                        color: "#64748b",
                                    }}
                                >
                                    {phone}
                                </div>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            title: (
                <span
                    style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                    }}
                >
                    Room
                </span>
            ),
            key: "room",
            width: "12%",
            render: (_: any, record: BookingRow) => (
                <div>
                    <Text strong style={{ fontSize: "12px", color: "#0f172a" }}>
                        {record.room?.room_number ?? "N/A"}
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: "8.5px" }}>
                        {record.room?.room_type?.type_name || "-"}
                    </Text>
                </div>
            ),
        },
        {
            title: (
                <span
                    style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                    }}
                >
                    Status
                </span>
            ),
            key: "status",
            width: "10%",
            render: (_: any, record: BookingRow) => {
                const statusMap: Record<
                    string,
                    {
                        color: string;
                        bg: string;
                        label: string;
                        icon: React.ReactNode;
                    }
                > = {
                    pending: {
                        color: "#faad14",
                        bg: "#fff7e6",
                        label: "PENDING",
                        icon: <SyncOutlined style={{ fontSize: "10px" }} />,
                    },
                    confirmed: {
                        color: MINT_GREEN,
                        bg: MINT_GREEN_BG,
                        label: "CONFIRMED",
                        icon: <CheckOutlined style={{ fontSize: "10px" }} />,
                    },
                    checked_in: {
                        color: "#1890ff",
                        bg: "#e6f7ff",
                        label: "CHECKED IN",
                        icon: (
                            <CheckCircleOutlined style={{ fontSize: "10px" }} />
                        ),
                    },
                    checked_out: {
                        color: "#8c8c8c",
                        bg: "#f5f5f5",
                        label: "CHECKED OUT",
                        icon: <CheckOutlined style={{ fontSize: "10px" }} />,
                    },
                    cancelled: {
                        color: "#ff4d4f",
                        bg: "#fff1f0",
                        label: "CANCELLED",
                        icon: (
                            <CloseCircleOutlined style={{ fontSize: "10px" }} />
                        ),
                    },
                    refunded: {
                        color: "#722ed1",
                        bg: "#f9f0ff",
                        label: "REFUNDED",
                        icon: <CheckOutlined style={{ fontSize: "10px" }} />,
                    },
                };
                const defaultStatus = {
                    color: "#faad14",
                    bg: "#fff7e6",
                    label: "PENDING",
                    icon: <SyncOutlined style={{ fontSize: "10px" }} />,
                };
                const status =
                    statusMap[record.status as string] || defaultStatus;
                return (
                    <div
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "3px 10px",
                            borderRadius: "16px",
                            backgroundColor: status.bg,
                            color: status.color,
                            fontSize: "8.5px",
                            fontWeight: 600,
                            letterSpacing: "0.5px",
                        }}
                    >
                        {status.icon}
                        {status.label}
                    </div>
                );
            },
        },
        {
            title: (
                <span
                    style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                    }}
                >
                    Stay Type
                </span>
            ),
            key: "stay_type",
            width: "10%",
            render: (_: any, record: BookingRow) => {
                const type = record.room?.pivot?.stay_type ?? record.stay_type;
                const isWalkIn = record.booking_type === "walk_in";
                return (
                    <div>
                        <Tag
                            color={type === "short_stay" ? "purple" : "cyan"}
                            style={{
                                fontSize: "8.5px",
                                borderRadius: "3px",
                                padding: "1px 8px",
                                margin: 0,
                                lineHeight: 1.5,
                            }}
                        >
                            {type === "short_stay" ? "Short Stay" : "Overnight"}
                        </Tag>
                        <br />
                        <Text type="secondary" style={{ fontSize: "8.5px" }}>
                            {isWalkIn ? "Walk-in" : "Online"}
                        </Text>
                    </div>
                );
            },
        },
        {
            title: (
                <span
                    style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                    }}
                >
                    Check In
                </span>
            ),
            key: "check_in",
            width: "12%",
            render: (_: any, record: BookingRow) => (
                <div>
                    <Text style={{ fontSize: "11px", color: "#0f172a" }}>
                        {formatDate(record.check_in_date)}
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: "8.5px" }}>
                        {formatTime(record.check_in_date)}
                    </Text>
                </div>
            ),
        },
        {
            title: (
                <span
                    style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                    }}
                >
                    Check Out
                </span>
            ),
            key: "check_out",
            width: "12%",
            render: (_: any, record: BookingRow) => (
                <div>
                    <Text style={{ fontSize: "11px", color: "#0f172a" }}>
                        {formatDate(record.check_out_date)}
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: "8.5px" }}>
                        {formatTime(record.check_out_date)}
                    </Text>
                </div>
            ),
        },
        {
            title: (
                <span
                    style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                    }}
                >
                    Payment
                </span>
            ),
            key: "payment",
            width: "8%",
            render: (_: any, record: BookingRow) => {
                const payment = record.payments?.[0];
                const status = payment?.payment_status ?? "pending";
                const color = status === "paid" ? "green" : "orange";
                const icon =
                    status === "paid" ? (
                        <CheckCircleOutlined style={{ fontSize: "10px" }} />
                    ) : (
                        <SyncOutlined style={{ fontSize: "10px" }} />
                    );
                return (
                    <Tag
                        color={color}
                        style={{
                            fontSize: "8.5px",
                            borderRadius: "3px",
                            padding: "1px 10px",
                            fontWeight: 500,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                        }}
                    >
                        {icon}
                        {status.toUpperCase()}
                    </Tag>
                );
            },
        },
        {
            title: (
                <span
                    style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                    }}
                >
                    Amount
                </span>
            ),
            key: "amount",
            width: "10%",
            render: (_: any, record: BookingRow) => {
                const addOnTotal =
                    record.booking_add_ons?.reduce(
                        (sum, addon) => sum + Number(addon.subtotal ?? 0),
                        0,
                    ) ?? 0;
                const total = Number(record.subtotal) + addOnTotal;
                return (
                    <Text
                        strong
                        style={{
                            color: MINT_GREEN,
                            fontSize: "12px",
                            fontWeight: 700,
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
                <span
                    style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                    }}
                >
                    Action
                </span>
            ),
            key: "action",
            width: "6%",
            align: "center" as const,
            render: (_: any, record: BookingRow) => (
                <div onClick={(e) => e.stopPropagation()}>
                    <Dropdown
                        menu={getActionMenu(record, activeTab)}
                        trigger={["click"]}
                    >
                        <Button
                            type="text"
                            icon={<MoreOutlined />}
                            size="small"
                            style={{ fontSize: "14px" }}
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
                overdueDays >= 3
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
                    marginTop: 14,
                    flexWrap: "wrap",
                    gap: 12,
                    padding: "8px 0",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Button
                        size="small"
                        disabled={currentPage === 1 || bookingQuery.isLoading}
                        onClick={() =>
                            setCurrentPage((prev: number) => prev - 1)
                        }
                        style={{ borderRadius: "6px", fontSize: "10px" }}
                    >
                        Prev
                    </Button>

                    <Text style={{ fontSize: "10px" }}>
                        Page {currentPage} of {totalPages}
                    </Text>

                    <Button
                        size="small"
                        disabled={
                            currentPage >= totalPages || bookingQuery.isLoading
                        }
                        onClick={() =>
                            setCurrentPage((prev: number) => prev + 1)
                        }
                        style={{ borderRadius: "6px", fontSize: "10px" }}
                    >
                        Next
                    </Button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Text style={{ fontSize: "10px" }}>Total: {totalRows}</Text>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                        }}
                    >
                        <Text style={{ fontSize: "10px" }}>Rows:</Text>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            style={{
                                padding: "4px 10px",
                                borderRadius: "6px",
                                border: "1px solid #e5e7eb",
                                fontSize: "10px",
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
                        <Text style={{ fontSize: "10px" }}>/ page</Text>
                    </div>
                </div>
            </div>
        );
    };

    // Render statistics cards
    const renderStats = () => (
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} lg={6}>
                <Card
                    style={{
                        borderRadius: "10px",
                        border: "1px solid #e8edf2",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                        }}
                    >
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: "8px",
                                backgroundColor: MINT_GREEN_BG,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                            }}
                        >
                            <HomeOutlined
                                style={{ fontSize: 16, color: MINT_GREEN }}
                            />
                        </div>
                        <div>
                            <Text
                                type="secondary"
                                style={{
                                    fontSize: "10px",
                                    letterSpacing: "0.3px",
                                    textTransform: "uppercase",
                                }}
                            >
                                Total Active
                            </Text>
                            <div
                                style={{
                                    fontSize: "18px",
                                    fontWeight: 700,
                                    color: "#0f172a",
                                    lineHeight: 1.2,
                                }}
                            >
                                {stats.totalActive}
                            </div>
                            <Text
                                type="secondary"
                                style={{ fontSize: "8.5px" }}
                            >
                                Currently active reservations
                            </Text>
                        </div>
                    </div>
                </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <Card
                    style={{
                        borderRadius: "10px",
                        border: "1px solid #e8edf2",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                        }}
                    >
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: "8px",
                                backgroundColor: MINT_GREEN_BG,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                            }}
                        >
                            <TeamOutlined
                                style={{ fontSize: 16, color: MINT_GREEN }}
                            />
                        </div>
                        <div>
                            <Text
                                type="secondary"
                                style={{
                                    fontSize: "10px",
                                    letterSpacing: "0.3px",
                                    textTransform: "uppercase",
                                }}
                            >
                                Checked In
                            </Text>
                            <div
                                style={{
                                    fontSize: "18px",
                                    fontWeight: 700,
                                    color: "#0f172a",
                                    lineHeight: 1.2,
                                }}
                            >
                                {stats.checkedIn}
                            </div>
                            <Text
                                type="secondary"
                                style={{ fontSize: "8.5px" }}
                            >
                                Guests currently staying
                            </Text>
                        </div>
                    </div>
                </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <Card
                    style={{
                        borderRadius: "10px",
                        border: "1px solid #e8edf2",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                        }}
                    >
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: "8px",
                                backgroundColor: MINT_GREEN_BG,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                            }}
                        >
                            <CalendarIcon
                                style={{ fontSize: 16, color: MINT_GREEN }}
                            />
                        </div>
                        <div>
                            <Text
                                type="secondary"
                                style={{
                                    fontSize: "10px",
                                    letterSpacing: "0.3px",
                                    textTransform: "uppercase",
                                }}
                            >
                                Upcoming
                            </Text>
                            <div
                                style={{
                                    fontSize: "18px",
                                    fontWeight: 700,
                                    color: "#0f172a",
                                    lineHeight: 1.2,
                                }}
                            >
                                {stats.upcoming}
                            </div>
                            <Text
                                type="secondary"
                                style={{ fontSize: "8.5px" }}
                            >
                                Arriving today or later
                            </Text>
                        </div>
                    </div>
                </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <Card
                    style={{
                        borderRadius: "10px",
                        border: "1px solid #e8edf2",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                        }}
                    >
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: "8px",
                                backgroundColor: MINT_GREEN_BG,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                            }}
                        >
                            <DollarOutlined
                                style={{ fontSize: 16, color: MINT_GREEN }}
                            />
                        </div>
                        <div>
                            <Text
                                type="secondary"
                                style={{
                                    fontSize: "10px",
                                    letterSpacing: "0.3px",
                                    textTransform: "uppercase",
                                }}
                            >
                                Total Revenue
                            </Text>
                            <div
                                style={{
                                    fontSize: "16px",
                                    fontWeight: 700,
                                    color: "#0f172a",
                                    lineHeight: 1.2,
                                }}
                            >
                                ₱{stats.totalRevenue.toLocaleString()}
                            </div>
                            <Text
                                type="secondary"
                                style={{ fontSize: "8.5px" }}
                            >
                                From active bookings
                            </Text>
                        </div>
                    </div>
                </Card>
            </Col>
        </Row>
    );

    // Render filter content based on active tab
    const renderFilterContent = () => {
        const filterOptions = getFilterOptions();

        if (filterOptions.type === "both") {
            return (
                <div style={{ minWidth: 200 }}>
                    <div
                        style={{
                            padding: "8px 0 4px 0",
                            fontWeight: 600,
                            fontSize: "11px",
                            color: "#64748b",
                        }}
                    >
                        Booking Status
                    </div>
                    {filterOptions.statusOptions.map((option) => (
                        <div
                            key={option.value}
                            className={`filter-option ${filterStatus === option.value ? "active" : ""}`}
                            onClick={() => {
                                setFilterStatus(option.value);
                                setFilterPopoverOpen(false);
                            }}
                        >
                            {option.label}
                        </div>
                    ))}

                    <div
                        style={{
                            padding: "8px 0 4px 0",
                            marginTop: 8,
                            fontWeight: 600,
                            fontSize: "11px",
                            color: "#64748b",
                            borderTop: "1px solid #e8edf2",
                        }}
                    >
                        Payment Status
                    </div>
                    {filterOptions.paymentOptions.map((option) => (
                        <div
                            key={option.value}
                            className={`filter-option ${filterPaymentStatus === option.value ? "active" : ""}`}
                            onClick={() => {
                                setFilterPaymentStatus(option.value);
                                setFilterPopoverOpen(false);
                            }}
                        >
                            {option.label}
                        </div>
                    ))}
                </div>
            );
        }

        // Type is "status", so options is available
        return (
            <div style={{ minWidth: 150 }}>
                {filterOptions.options.map((option) => (
                    <div
                        key={option.value}
                        className={`filter-option ${filterStatus === option.value ? "active" : ""}`}
                        onClick={() => {
                            setFilterStatus(option.value);
                            setFilterPopoverOpen(false);
                        }}
                    >
                        {option.label}
                    </div>
                ))}
            </div>
        );
    };

    // Get filter badge count
    const getFilterBadge = () => {
        if (activeTab === "history") {
            if (filterStatus !== "all" && filterPaymentStatus !== "all") {
                return "2";
            } else if (
                filterStatus !== "all" ||
                filterPaymentStatus !== "all"
            ) {
                return "1";
            }
            return null;
        }
        return filterStatus !== "all" ? "1" : null;
    };

    return (
        <div
            key={location.key}
            className={`page-transition ${navigationType === "POP" ? "slide-ltr" : "slide-rtl"}`}
            style={{
                padding: "0 0 24px 0",
                background: "#f8fafc",
                minHeight: "100vh",
            }}
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

                        .clickable-row { cursor: pointer; transition: background 0.15s; }
                        .clickable-row:hover td { background: #f1f5f9 !important; }
                        
                        .selected-booking-row td { background: ${MINT_GREEN_BG} !important; }
                        .selected-booking-row:hover td { background: ${MINT_GREEN_LIGHT} !important; }
                        .selected-booking-row td:first-child { border-left: 3px solid ${MINT_GREEN} !important; }
                        .warning-overdue-row td:first-child { border-left: 3px solid #faad14 !important; }
                        .critical-overdue-row td:first-child { border-left: 3px solid #ff4d4f !important; }
                        
                        .premium-table .ant-table {
                            background: white;
                            border-radius: 12px;
                            overflow: hidden;
                            box-shadow: 0 1px 2px rgba(0,0,0,0.04);
                        }
                        .premium-table .ant-table-thead > tr > th {
                            font-size: 10px !important;
                            font-weight: 600 !important;
                            padding: 10px 10px !important;
                            background-color: #fafbfc !important;
                            border-bottom: 1px solid #e8edf2 !important;
                            color: #64748b !important;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        }
                        .premium-table .ant-table-tbody > tr > td {
                            font-size: 11px !important;
                            padding: 10px 10px !important;
                            border-bottom: 1px solid #f1f5f9 !important;
                            color: #0f172a !important;
                            vertical-align: middle;
                        }
                        .premium-table .ant-table-tbody > tr:last-child > td {
                            border-bottom: none !important;
                        }
                        
                        .ant-card {
                            border-radius: 10px !important;
                        }
                        .ant-card-body {
                            padding: 14px !important;
                        }
                        .ant-card-head-title {
                            font-size: 11px !important;
                            font-weight: 600 !important;
                            color: #1e293b !important;
                        }
                        
                        .ant-descriptions-item-label {
                            font-size: 10px !important;
                            font-weight: 500 !important;
                            color: #64748b !important;
                        }
                        .ant-descriptions-item-content {
                            font-size: 11px !important;
                            color: #1e293b !important;
                        }
                        .ant-timeline-item-content {
                            font-size: 10px !important;
                        }
                        .ant-tag {
                            font-size: 10px !important;
                            border-radius: 4px !important;
                            padding: 2px 10px !important;
                        }
                        .ant-badge-status-text {
                            font-size: 11px !important;
                        }
                        .ant-btn {
                            font-size: 11px !important;
                            border-radius: 6px !important;
                        }
                        .ant-btn-primary {
                            background: ${MINT_GREEN} !important;
                            border-color: ${MINT_GREEN} !important;
                        }
                        .ant-btn-primary:hover {
                            background: ${MINT_GREEN_HOVER} !important;
                            border-color: ${MINT_GREEN_HOVER} !important;
                        }
                        .ant-modal-content {
                            border-radius: 12px !important;
                        }
                        .ant-modal-header {
                            border-radius: 12px 12px 0 0 !important;
                        }
                        
                        .ant-select-selector {
                            border-radius: 8px !important;
                            border-color: #e2e8f0 !important;
                            font-size: 11px !important;
                            height: 38px !important;
                        }
                        .ant-select-selection-item {
                            font-size: 11px !important;
                            line-height: 36px !important;
                        }
                        
                        /* shadcn-style tabs - sliding indicator */
                        .tabs-container {
                            position: relative;
                            display: flex;
                            gap: 4px;
                            padding: 4px;
                            background: #f1f5f9;
                            border-radius: 10px;
                            width: fit-content;
                        }
                        .tab-indicator {
                            position: absolute;
                            top: 4px;
                            bottom: 4px;
                            background: ${MINT_GREEN};
                            border-radius: 8px;
                            transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                            box-shadow: 0 1px 3px rgba(16, 185, 129, 0.3);
                            z-index: 0;
                        }
                        .shadcn-tabs-trigger {
                            position: relative;
                            z-index: 1;
                            padding: 8px 18px;
                            font-size: 13px;
                            font-weight: 500;
                            color: #64748b;
                            background: transparent;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                            transition: color 0.2s ease;
                            font-family: inherit;
                        }
                        .shadcn-tabs-trigger:hover {
                            color: #0f172a;
                        }
                        .shadcn-tabs-trigger.active {
                            color: #ffffff !important;
                            font-weight: 600;
                        }
                        .shadcn-tabs-trigger.active .anticon {
                            color: #ffffff !important;
                        }
                        .shadcn-tabs-content {
                            display: block;
                        }

                        /* Filter popover */
                        .filter-popover .ant-popover-inner {
                            border-radius: 10px;
                            padding: 8px;
                            min-width: 160px;
                        }
                        .filter-option {
                            padding: 6px 12px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 12px;
                            transition: all 0.15s ease;
                        }
                        .filter-option:hover {
                            background: #f1f5f9;
                        }
                        .filter-option.active {
                            background: ${MINT_GREEN_BG};
                            color: ${MINT_GREEN};
                            font-weight: 500;
                        }
                        .filter-option.active:hover {
                            background: ${MINT_GREEN_LIGHT};
                        }

                        .filter-btn {
                            border-radius: 8px !important;
                            border: 1px solid #e2e8f0 !important;
                            height: 38px !important;
                            display: flex !important;
                            align-items: center !important;
                            gap: 4px !important;
                            color: #64748b !important;
                            background: white !important;
                        }
                        .filter-btn:hover {
                            border-color: ${MINT_GREEN} !important;
                            color: ${MINT_GREEN} !important;
                        }
                        .filter-btn.active {
                            border-color: ${MINT_GREEN} !important;
                            color: white !important;
                            background: ${MINT_GREEN} !important;
                        }
                        .filter-btn.active:hover {
                            background: ${MINT_GREEN_HOVER} !important;
                            border-color: ${MINT_GREEN_HOVER} !important;
                        }
                        .filter-badge {
                            font-size: 8px;
                            background: white;
                            color: ${MINT_GREEN};
                            border-radius: 50%;
                            width: 16px;
                            height: 16px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-weight: 600;
                        }
                        .filter-btn.active .filter-badge {
                            background: white;
                            color: ${MINT_GREEN};
                        }
                        
                        @media (max-width: 768px) {
                            .ant-table { font-size: 10px; }
                            .ant-table-thead > tr > th { font-size: 9px !important; }
                            .ant-table-tbody > tr > td { font-size: 10px !important; }
                            .shadcn-tabs-trigger {
                                padding: 6px 12px;
                                font-size: 11px;
                            }
                            .tabs-container {
                                flex-wrap: wrap;
                                width: 100%;
                            }
                            .search-filter-wrapper {
                                flex-wrap: wrap;
                                width: 100%;
                            }
                        }
                    `}
            </style>

            {/* Header */}
            <div
                style={{
                    padding: "16px 0 14px 0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                }}
            >
                <div>
                    <Title
                        level={4}
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

            {/* shadcn-style Tabs with sliding indicator */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                }}
            >
                <div className="tabs-container" ref={tabContainerRef}>
                    <div
                        className="tab-indicator"
                        style={{
                            left: indicatorStyle.left,
                            width: indicatorStyle.width,
                        }}
                    />
                    <button
                        ref={activeTab === "active" ? activeTabRef : null}
                        className={`shadcn-tabs-trigger ${activeTab === "active" ? "active" : ""}`}
                        onClick={() => {
                            setActiveTab("active");
                            setCurrentPage(1);
                        }}
                    >
                        <CheckCircleOutlined style={{ fontSize: "14px" }} />
                        Overview
                    </button>
                    <button
                        ref={activeTab === "history" ? activeTabRef : null}
                        className={`shadcn-tabs-trigger ${activeTab === "history" ? "active" : ""}`}
                        onClick={() => {
                            setActiveTab("history");
                            setCurrentPage(1);
                        }}
                    >
                        <HistoryOutlined style={{ fontSize: "14px" }} />
                        History
                    </button>
                    <button
                        ref={activeTab === "trash" ? activeTabRef : null}
                        className={`shadcn-tabs-trigger ${activeTab === "trash" ? "active" : ""}`}
                        onClick={() => {
                            setActiveTab("trash");
                            setCurrentPage(1);
                        }}
                    >
                        <DeleteOutlined style={{ fontSize: "14px" }} />
                        Trash
                    </button>
                </div>

                {/* Right side - Search with gap and Filter on the right with mint green */}
                <div
                    className="search-filter-wrapper"
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                    <Input
                        placeholder="Search by name, ID, or type..."
                        allowClear
                        value={searchInput}
                        onChange={(e) => {
                            const value = e.target.value;
                            setSearchInput(value);
                            debouncedSearch(value);
                        }}
                        prefix={
                            <SearchOutlined
                                style={{ color: "#94a3b8", fontSize: 14 }}
                            />
                        }
                        style={{
                            width: 280,
                            borderRadius: "8px",
                            border: "1px solid #e2e8f0",
                            fontSize: "11px",
                            height: 38,
                        }}
                    />
                    <Popover
                        content={renderFilterContent()}
                        trigger="click"
                        open={filterPopoverOpen}
                        onOpenChange={setFilterPopoverOpen}
                        placement="bottomRight"
                        overlayClassName="filter-popover"
                    >
                        <Button
                            className={`filter-btn ${filterStatus !== "all" || filterPaymentStatus !== "all" ? "active" : ""}`}
                            onClick={() =>
                                setFilterPopoverOpen(!filterPopoverOpen)
                            }
                            style={{
                                borderRadius: "8px",
                                border: "1px solid #e2e8f0",
                                height: 38,
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                color:
                                    filterStatus !== "all" ||
                                    filterPaymentStatus !== "all"
                                        ? "white"
                                        : "#64748b",
                                borderColor:
                                    filterStatus !== "all" ||
                                    filterPaymentStatus !== "all"
                                        ? MINT_GREEN
                                        : "#e2e8f0",
                                background:
                                    filterStatus !== "all" ||
                                    filterPaymentStatus !== "all"
                                        ? MINT_GREEN
                                        : "white",
                            }}
                        >
                            <FilterOutlined style={{ fontSize: 14 }} />
                            {(filterStatus !== "all" ||
                                filterPaymentStatus !== "all") && (
                                <span className="filter-badge">
                                    {getFilterBadge()}
                                </span>
                            )}
                        </Button>
                    </Popover>
                </div>
            </div>

            {/* Tab Content */}
            <div className="shadcn-tabs-content" style={{ marginTop: 16 }}>
                {activeTab === "active" && (
                    <>
                        {renderStats()}
                        {renderTable()}
                        {renderPagination()}
                    </>
                )}
                {activeTab === "history" && (
                    <>
                        {renderTable()}
                        {renderPagination()}
                    </>
                )}
                {activeTab === "trash" && (
                    <>
                        {bookings.length > 0 && (
                            <Alert
                                message="Warning"
                                description="Items in trash will be permanently deleted. Use 'Delete Forever' with caution."
                                type="warning"
                                showIcon
                                closable
                                style={{
                                    marginBottom: 12,
                                    fontSize: "10px",
                                    borderRadius: "8px",
                                }}
                            />
                        )}
                        {renderTable()}
                        {renderPagination()}
                    </>
                )}
            </div>
        </div>
    );
}
