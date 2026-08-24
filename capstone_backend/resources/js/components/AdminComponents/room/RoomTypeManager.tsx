import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
    ArrowLeft,
    Plus,
    Pencil,
    Trash2,
    Loader2,
    ChevronsUpDown,
    Check,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Amenities from "./Amenities";
import AddOnsPage from "./AddOnsPage";
import api from "@/services/api";

// ─── Types ──────────────────────────────────────────────────────────────────

interface RoomType {
    id: number;
    type_name: string;
    description: string | null;
    max_occupancy: number;
    base_price: number;
    short_stay_price: number | null;
}

interface RoomTypePayload {
    type_name: string;
    description: string | null;
    max_occupancy: number;
    base_price: number;
    short_stay_price: number | null;
}

interface PaginationMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
}

interface PaginatedResponse {
    data: RoomType[];
    meta: PaginationMeta;
}

interface RoomTypeManagerProps {
    onClose: () => void;
    onRefresh?: () => void;
}

interface FormValues {
    type_name: string;
    description?: string;
    max_occupancy: number;
    base_price: number;
    short_stay_price?: number | string;
}

// ─── Table Columns Configuration ──────────────────────────────────────────

const TABLE_COLUMNS = [
    { key: "type_name", label: "Type Name" },
    { key: "description", label: "Description", noSort: true },
    { key: "max_occupancy", label: "Occupancy", center: true },
    { key: "base_price", label: "Base Price" },
    { key: "short_stay_price", label: "Short Stay" },
    { key: "actions", label: "Actions", noSort: true, center: true },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function RoomTypeManager({
    onClose,
    onRefresh,
}: RoomTypeManagerProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRoomType, setEditingRoomType] = useState<RoomType | null>(
        null,
    );

    const [sortKey, setSortKey] = useState("type_name");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [activeTab, setActiveTab] = useState<
        "roomTypes" | "amenities" | "addons"
    >("roomTypes");

    const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

    useEffect(() => {
        const el = tabRefs.current[activeTab];
        if (el) {
            setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth });
        }
    }, [activeTab]);

    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors },
    } = useForm<FormValues>();

    // Slide-in animation for the main panel only
    useEffect(() => {
        document.body.style.overflow = "hidden";
        const t = setTimeout(() => setIsVisible(true), 10);
        return () => {
            document.body.style.overflow = "";
            clearTimeout(t);
        };
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300);
    };

    // ── Query ──────────────────────────────────────────────────────────────────

    const { data, isLoading, isFetching, error, refetch } =
        useQuery<PaginatedResponse>({
            queryKey: [
                "roomTypes",
                currentPage,
                itemsPerPage,
                sortKey,
                sortDir,
            ],
            queryFn: async () => {
                const res = await api.get("/room-types", {
                    params: {
                        page: currentPage,
                        per_page: itemsPerPage,
                        sort_by: sortKey,
                        sort_dir: sortDir,
                    },
                });
                return res.data;
            },
            placeholderData: (prev) => prev,
            staleTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
        });

    const roomTypes = data?.data ?? [];
    const meta = data?.meta;

    const handleValidationErrors = (e: any) => {
        const errors = e.response?.data?.errors;

        if (errors) {
            Object.keys(errors).forEach((field) => {
                setError(field as keyof FormValues, {
                    type: "server",
                    message: errors[field][0],
                });
            });
        } else {
            toast.error(e.response?.data?.message || "Something went wrong.");
        }
    };

    // ── Mutations ──────────────────────────────────────────────────────────────

    const createMutation = useMutation({
        mutationFn: (values: RoomTypePayload) =>
            api.post("/room-types", values),
        onSuccess: () => {
            toast.success("Room type created");
            refetch();
            onRefresh?.();
            closeDialog();
        },
        onError: (e: any) => {
            handleValidationErrors(e);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, values }: { id: number; values: RoomTypePayload }) =>
            api.put(`/room-types/${id}`, values),
        onSuccess: () => {
            toast.success("Room type updated");
            refetch();
            onRefresh?.();
            closeDialog();
        },
        onError: (e: any) => {
            handleValidationErrors(e);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/room-types/${id}`),
        onSuccess: () => {
            toast.success("Room type deleted");
            refetch();
            onRefresh?.();
        },
        onError: (e: any) => {
            if (e.response?.status === 400)
                toast.error(
                    "Cannot delete: this room type is assigned to existing rooms",
                );
            else
                toast.error(
                    e.response?.data?.message ?? "Failed to delete room type",
                );
        },
    });

    const isSaving = createMutation.isPending || updateMutation.isPending;

    // ── Dialog helpers ─────────────────────────────────────────────────────────

    const openCreate = () => {
        setEditingRoomType(null);
        reset({});
        setDialogOpen(true);
    };

    const openEdit = (rt: RoomType) => {
        setEditingRoomType(rt);
        reset({
            type_name: rt.type_name,
            description: rt.description ?? "",
            max_occupancy: rt.max_occupancy,
            base_price: rt.base_price,
            short_stay_price: rt.short_stay_price ?? "",
        });
        setDialogOpen(true);
    };

    const closeDialog = () => {
        setDialogOpen(false);
        setEditingRoomType(null);
        reset({});
    };

    // ── Form submit ────────────────────────────────────────────────────────────

    const onSubmit = (values: FormValues) => {
        const payload: RoomTypePayload = {
            type_name: values.type_name,
            description: values.description?.trim() || null,
            max_occupancy: Number(values.max_occupancy),
            base_price: Number(values.base_price),
            short_stay_price:
                values.short_stay_price !== "" &&
                values.short_stay_price !== undefined
                    ? Number(values.short_stay_price)
                    : null,
        };

        if (editingRoomType) {
            updateMutation.mutate({ id: editingRoomType.id, values: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    // ── Sort ───────────────────────────────────────────────────────────────────

    const handleSort = (key: string) => {
        if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else {
            setSortKey(key);
            setSortDir("asc");
        }
        setCurrentPage(1);
    };

    const SortIcon = ({ col }: { col: string }) =>
        sortKey === col ? (
            <span className="ml-1 text-xs">
                {sortDir === "asc" ? "▲" : "▼"}
            </span>
        ) : (
            <span className="ml-1 text-xs opacity-30">⇅</span>
        );

    // ── Pagination ─────────────────────────────────────────────────────────────

    const getPageNumbers = (): (number | "…")[] => {
        if (!meta) return [];
        const total = meta.last_page;
        const cur = meta.current_page;
        if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
        const pages: (number | "…")[] = [1];
        if (cur > 3) pages.push("…");
        for (
            let i = Math.max(2, cur - 1);
            i <= Math.min(total - 1, cur + 1);
            i++
        )
            pages.push(i);
        if (cur < total - 2) pages.push("…");
        pages.push(total);
        return pages;
    };

    // ── Skeleton Row ──────────────────────────────────────────────────────────

    const SkeletonRow = () => (
        <tr className="border-b border-slate-100">
            <td className="px-4 py-3">
                <Skeleton className="h-4 w-28 bg-slate-200" />
            </td>
            <td className="px-4 py-3">
                <Skeleton className="h-4 w-44 bg-slate-200" />
            </td>
            <td className="px-4 py-3 text-center">
                <Skeleton className="mx-auto h-5 w-16 rounded-full bg-slate-200" />
            </td>
            <td className="px-4 py-3">
                <Skeleton className="h-4 w-20 bg-slate-200" />
            </td>
            <td className="px-4 py-3">
                <Skeleton className="h-4 w-20 bg-slate-200" />
            </td>
            <td className="px-4 py-3">
                <div className="flex justify-center gap-2">
                    <Skeleton className="h-8 w-16 rounded-lg bg-slate-200" />
                    <Skeleton className="h-8 w-16 rounded-lg bg-slate-200" />
                </div>
            </td>
        </tr>
    );

    // ── Empty State ───────────────────────────────────────────────────────────

    const EmptyState = () => (
        <tr>
            <td colSpan={6} className="px-4 py-16 text-center">
                <div className="text-3xl">🏨</div>
                <p className="mt-2 font-semibold text-slate-600">
                    No room types yet
                </p>
                <p className="mt-1 text-xs text-slate-400">
                    Click "Add Room Type" to get started
                </p>
            </td>
        </tr>
    );

    // ── Error state ────────────────────────────────────────────────────────────

    if (error) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white p-4">
                <div className="w-full max-w-sm rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                    <p className="font-semibold text-red-700">
                        Failed to load room types
                    </p>
                    <p className="mt-1 text-sm text-red-500">
                        {(error as Error).message}
                    </p>
                    <div className="mt-4 flex justify-center gap-2">
                        <button
                            onClick={handleClose}
                            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Go back
                        </button>
                        <button
                            onClick={() => refetch()}
                            className="rounded-lg bg-mint-600 px-4 py-2 text-sm font-medium text-white hover:bg-mint-700"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={handleClose}
                className={`fixed inset-0 z-50 bg-black transition-opacity duration-300 ${
                    isVisible ? "opacity-40" : "pointer-events-none opacity-0"
                }`}
            />

            {/* Panel */}
            <div
                className={`fixed inset-0 z-50 flex flex-col overflow-hidden bg-slate-50 transition-transform duration-300 ease-out ${
                    isVisible ? "translate-y-0" : "translate-y-full"
                }`}
            >
                {/* Header */}
                <header
                    className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm"
                    style={{ height: 64 }}
                >
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleClose}
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        >
                            <ArrowLeft className="size-4" />
                            Back to Rooms
                        </button>
                        <div className="h-6 w-px bg-slate-200" />
                        <h1 className="text-base font-bold text-slate-900">
                            Manage Room
                        </h1>
                    </div>
                    {/* <span className="rounded-full border border-mint-200 bg-mint-50 px-3 py-1 text-xs font-semibold text-mint-600">
                        {meta?.total ?? 0} types
                    </span> */}
                </header>

                <div className="border-b bg-white px-6 py-3">
                    <Tabs
                        value={activeTab}
                        onValueChange={(v) =>
                            setActiveTab(v as typeof activeTab)
                        }
                        className="flex justify-center"
                    >
                        <TabsList className="relative h-auto bg-transparent p-0 gap-6">
                            <TabsTrigger
                                ref={(el) => {
                                    tabRefs.current.roomTypes = el;
                                }}
                                value="roomTypes"
                                className="rounded-none bg-transparent px-1 py-2 text-sm font-semibold text-slate-500 shadow-none data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:shadow-none hover:bg-transparent"
                            >
                                Room Types
                            </TabsTrigger>
                            <TabsTrigger
                                ref={(el) => {
                                    tabRefs.current.amenities = el;
                                }}
                                value="amenities"
                                className="rounded-none bg-transparent px-1 py-2 text-sm font-semibold text-slate-500 shadow-none data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:shadow-none hover:bg-transparent"
                            >
                                Amenities
                            </TabsTrigger>
                            <TabsTrigger
                                ref={(el) => {
                                    tabRefs.current.addons = el;
                                }}
                                value="addons"
                                className="rounded-none bg-transparent px-1 py-2 text-sm font-semibold text-slate-500 shadow-none data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:shadow-none hover:bg-transparent"
                            >
                                Add-ons
                            </TabsTrigger>

                            {/* Sliding underline indicator */}
                            <div
                                className="absolute bottom-0 h-0.5 rounded-full bg-mint-600 transition-all duration-300 ease-out"
                                style={{
                                    left: indicatorStyle.left,
                                    width: indicatorStyle.width,
                                }}
                            />
                        </TabsList>
                    </Tabs>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === "roomTypes" ? (
                        <>
                            <div className="mx-auto max-w-7xl">
                                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                    {/* Card header */}
                                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-slate-800">
                                                Room Types
                                            </span>
                                            {/* <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                    {meta?.total ?? 0}
                  </span> */}
                                        </div>
                                        <button
                                            onClick={openCreate}
                                            className="flex items-center gap-2 rounded-lg bg-mint-600 px-4 py-2 text-sm font-semibold text-white hover:bg-mint-700 active:scale-95 transition-all"
                                        >
                                            <Plus className="size-4" />
                                            Add Room Type
                                        </button>
                                    </div>

                                    {/* Table */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-slate-50 text-left">
                                                    {TABLE_COLUMNS.map(
                                                        ({
                                                            key,
                                                            label,
                                                            noSort,
                                                            center,
                                                        }) => (
                                                            <th
                                                                key={key}
                                                                onClick={() =>
                                                                    !noSort &&
                                                                    handleSort(
                                                                        key,
                                                                    )
                                                                }
                                                                className={`border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${
                                                                    center
                                                                        ? "text-center"
                                                                        : ""
                                                                } ${!noSort ? "cursor-pointer select-none hover:bg-slate-100" : ""}`}
                                                            >
                                                                {label}
                                                                {!noSort && (
                                                                    <SortIcon
                                                                        col={
                                                                            key
                                                                        }
                                                                    />
                                                                )}
                                                            </th>
                                                        ),
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(() => {
                                                    const isLoadingState =
                                                        isLoading || isFetching;
                                                    const rowCount =
                                                        isLoadingState
                                                            ? itemsPerPage
                                                            : Math.max(
                                                                  roomTypes.length,
                                                                  1,
                                                              );

                                                    return Array.from({
                                                        length: rowCount,
                                                    }).map((_, i) => {
                                                        if (isLoadingState) {
                                                            return (
                                                                <SkeletonRow
                                                                    key={`skeleton-${i}`}
                                                                />
                                                            );
                                                        }

                                                        if (
                                                            roomTypes.length ===
                                                            0
                                                        ) {
                                                            return i === 0 ? (
                                                                <EmptyState key="empty" />
                                                            ) : null;
                                                        }

                                                        const rt = roomTypes[i];
                                                        if (!rt) return null;

                                                        return (
                                                            <tr
                                                                key={rt.id}
                                                                className="border-b border-slate-100 transition-colors hover:bg-slate-50"
                                                            >
                                                                <td className="px-4 py-3 font-semibold text-slate-900">
                                                                    {
                                                                        rt.type_name
                                                                    }
                                                                </td>
                                                                <td className="max-w-xs truncate px-4 py-3 text-slate-500">
                                                                    {rt.description || (
                                                                        <span className="text-slate-300">
                                                                            —
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <span className="rounded-full border border-mint-200 bg-mint-50 px-2.5 py-0.5 text-xs font-semibold text-mint-700">
                                                                        {
                                                                            rt.max_occupancy
                                                                        }{" "}
                                                                        {rt.max_occupancy ===
                                                                        1
                                                                            ? "person"
                                                                            : "persons"}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 font-medium text-slate-800">
                                                                    ₱
                                                                    {rt.base_price?.toLocaleString()}
                                                                    <span className="ml-1 text-xs text-slate-400">
                                                                        / night
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 font-medium text-slate-800">
                                                                    {rt.short_stay_price !=
                                                                    null ? (
                                                                        <>
                                                                            ₱
                                                                            {rt.short_stay_price.toLocaleString()}
                                                                            <span className="ml-1 text-xs text-slate-400">
                                                                                /
                                                                                3hrs
                                                                            </span>
                                                                        </>
                                                                    ) : (
                                                                        <span className="text-slate-300">
                                                                            —
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <button
                                                                            onClick={() =>
                                                                                openEdit(
                                                                                    rt,
                                                                                )
                                                                            }
                                                                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
                                                                        >
                                                                            <Pencil className="size-3" />
                                                                            Edit
                                                                        </button>

                                                                        <AlertDialog>
                                                                            <AlertDialogTrigger
                                                                                asChild
                                                                            >
                                                                                <button className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 active:scale-95 transition-all">
                                                                                    <Trash2 className="size-3" />
                                                                                    Delete
                                                                                </button>
                                                                            </AlertDialogTrigger>
                                                                            <AlertDialogContent className="bg-white ring-0 border border-gray-200 shadow-lg">
                                                                                <AlertDialogHeader>
                                                                                    <AlertDialogTitle>
                                                                                        Delete
                                                                                        "
                                                                                        {
                                                                                            rt.type_name
                                                                                        }
                                                                                        "?
                                                                                    </AlertDialogTitle>
                                                                                    <AlertDialogDescription>
                                                                                        This
                                                                                        action
                                                                                        cannot
                                                                                        be
                                                                                        undone.
                                                                                        The
                                                                                        room
                                                                                        type
                                                                                        will
                                                                                        be
                                                                                        permanently
                                                                                        removed.
                                                                                    </AlertDialogDescription>
                                                                                </AlertDialogHeader>
                                                                                <AlertDialogFooter>
                                                                                    <AlertDialogCancel>
                                                                                        Cancel
                                                                                    </AlertDialogCancel>
                                                                                    <AlertDialogAction
                                                                                        onClick={() =>
                                                                                            deleteMutation.mutate(
                                                                                                rt.id,
                                                                                            )
                                                                                        }
                                                                                        className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                                                                                    >
                                                                                        {deleteMutation.isPending ? (
                                                                                            <Loader2 className="size-4 animate-spin" />
                                                                                        ) : (
                                                                                            "Delete"
                                                                                        )}
                                                                                    </AlertDialogAction>
                                                                                </AlertDialogFooter>
                                                                            </AlertDialogContent>
                                                                        </AlertDialog>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    });
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination */}
                                    {meta && meta.total > 0 && (
                                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
                                            <p className="text-xs text-slate-500">
                                                Showing{" "}
                                                <span className="font-semibold text-slate-700">
                                                    {meta.from}–{meta.to}
                                                </span>{" "}
                                                of{" "}
                                                <span className="font-semibold text-slate-700">
                                                    {meta.total}
                                                </span>{" "}
                                                entries
                                            </p>

                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    disabled={
                                                        meta.current_page === 1
                                                    }
                                                    onClick={() =>
                                                        setCurrentPage(
                                                            (p) => p - 1,
                                                        )
                                                    }
                                                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    ← Prev
                                                </button>

                                                {getPageNumbers().map((p, i) =>
                                                    p === "…" ? (
                                                        <span
                                                            key={`e-${i}`}
                                                            className="px-1 text-slate-400"
                                                        >
                                                            …
                                                        </span>
                                                    ) : (
                                                        <button
                                                            key={p}
                                                            onClick={() =>
                                                                setCurrentPage(
                                                                    p as number,
                                                                )
                                                            }
                                                            className={`min-w-[32px] rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                                                                p ===
                                                                meta.current_page
                                                                    ? "border-mint-500 bg-mint-50 text-mint-700"
                                                                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                                            }`}
                                                        >
                                                            {p}
                                                        </button>
                                                    ),
                                                )}

                                                <button
                                                    disabled={
                                                        meta.current_page ===
                                                        meta.last_page
                                                    }
                                                    onClick={() =>
                                                        setCurrentPage(
                                                            (p) => p + 1,
                                                        )
                                                    }
                                                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    Next →
                                                </button>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        asChild
                                                    >
                                                        <button className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                                                            {itemsPerPage} /
                                                            page
                                                            <ChevronsUpDown className="size-3 opacity-50" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent
                                                        align="end"
                                                        className="min-w-[130px] bg-white border border-gray-200 shadow-md ring-0"
                                                    >
                                                        {[10, 20, 30, 50].map(
                                                            (v) => (
                                                                <DropdownMenuItem
                                                                    key={v}
                                                                    onClick={() => {
                                                                        setItemsPerPage(
                                                                            v,
                                                                        );
                                                                        setCurrentPage(
                                                                            1,
                                                                        );
                                                                    }}
                                                                    className="flex items-center justify-between"
                                                                >
                                                                    {v} per page
                                                                    {itemsPerPage ===
                                                                        v && (
                                                                        <Check className="size-3.5 text-mint-600" />
                                                                    )}
                                                                </DropdownMenuItem>
                                                            ),
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : activeTab === "amenities" ? (
                        <Amenities />
                    ) : (
                        <AddOnsPage />
                    )}
                </div>
            </div>

            {/* ── Create / Edit Dialog ── */}
            <Dialog open={dialogOpen} onOpenChange={closeDialog}>
                <DialogContent
                    className="max-w-lg bg-white border border-gray-200 shadow-lg outline-none ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 [&>button]:hidden transition-none data-open:animate-none data-closed:animate-none"
                    onPointerDownOutside={(e) => {
                        closeDialog();
                    }}
                    onFocusOutside={(e) => e.preventDefault()}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    onCloseAutoFocus={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {editingRoomType
                                ? "Edit Room Type"
                                : "Create New Room Type"}
                        </DialogTitle>
                    </DialogHeader>

                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="mt-2 space-y-4"
                    >
                        <div className="grid grid-cols-2 gap-4">
                            {/* Type Name */}
                            <div className="col-span-2 space-y-1">
                                <label className="text-xs font-semibold text-slate-700">
                                    Room Type Name
                                </label>
                                <input
                                    {...register("type_name", {
                                        required: "Required",
                                        minLength: {
                                            value: 2,
                                            message: "At least 2 characters",
                                        },
                                        maxLength: {
                                            value: 50,
                                            message: "Max 50 characters",
                                        },
                                    })}
                                    placeholder="e.g. Standard, Deluxe, Suite"
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-none"
                                />
                                {errors.type_name && (
                                    <p className="text-xs text-red-500">
                                        {errors.type_name.message}
                                    </p>
                                )}
                            </div>

                            {/* Max Occupancy */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700">
                                    Max Occupancy
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={20}
                                    {...register("max_occupancy", {
                                        required: "Required",
                                        min: {
                                            value: 1,
                                            message: "At least 1",
                                        },
                                        max: { value: 20, message: "Max 20" },
                                    })}
                                    placeholder="e.g. 2"
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-none"
                                />
                                {errors.max_occupancy && (
                                    <p className="text-xs text-red-500">
                                        {errors.max_occupancy.message}
                                    </p>
                                )}
                            </div>

                            {/* Base Price */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700">
                                    Base Price / Night
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                                        ₱
                                    </span>
                                    <input
                                        type="number"
                                        min={0}
                                        step={100}
                                        {...register("base_price", {
                                            required: "Required",
                                            min: {
                                                value: 0,
                                                message: "Must be positive",
                                            },
                                        })}
                                        placeholder="0"
                                        className="w-full rounded-lg border border-slate-200 py-2 pl-7 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-none"
                                    />
                                </div>
                                {errors.base_price && (
                                    <p className="text-xs text-red-500">
                                        {errors.base_price.message}
                                    </p>
                                )}
                            </div>

                            {/* Short Stay */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700">
                                    Short Stay / 3hrs
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                                        ₱
                                    </span>
                                    <input
                                        type="number"
                                        min={0}
                                        step={50}
                                        {...register("short_stay_price", {
                                            min: {
                                                value: 0,
                                                message: "Must be positive",
                                            },
                                        })}
                                        placeholder="Optional"
                                        className="w-full rounded-lg border border-slate-200 py-2 pl-7 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-none"
                                    />
                                </div>
                                {errors.short_stay_price && (
                                    <p className="text-xs text-red-500">
                                        {errors.short_stay_price.message}
                                    </p>
                                )}
                            </div>

                            {/* Description */}
                            <div className="col-span-2 space-y-1">
                                <label className="text-xs font-semibold text-slate-700">
                                    Description{" "}
                                    <span className="font-normal text-slate-400">
                                        (optional)
                                    </span>
                                </label>
                                <textarea
                                    {...register("description", {
                                        maxLength: {
                                            value: 500,
                                            message: "Max 500 characters",
                                        },
                                    })}
                                    rows={3}
                                    placeholder="Describe the room type features and amenities…"
                                    className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/30 transition-none"
                                />
                                {errors.description && (
                                    <p className="text-xs text-red-500">
                                        {errors.description.message}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                            <button
                                type="button"
                                onClick={closeDialog}
                                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-none"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex items-center gap-2 rounded-lg bg-mint-600 px-4 py-2 text-sm font-semibold text-white hover:bg-mint-700 disabled:opacity-60 disabled:cursor-not-allowed transition-none"
                            >
                                {isSaving && (
                                    <Loader2 className="size-4 animate-spin" />
                                )}
                                {editingRoomType
                                    ? "Update Room Type"
                                    : "Create Room Type"}
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
