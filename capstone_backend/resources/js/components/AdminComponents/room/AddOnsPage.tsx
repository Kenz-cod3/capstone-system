import { useEffect, useState, useRef } from "react";
import {
    Plus,
    Pencil,
    Trash2,
    X,
    AlertCircle,
    CheckCircle,
    Package,
    Search,
    ChevronUp,
    ChevronDown,
    Loader2,
} from "lucide-react";
import api from "@/services/api"; // ← your axios instance

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
} from "@/components/ui/alert-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AddOn {
    id: number;
    add_on_name: string;
    price: number;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const fetchAddOns = async (): Promise<AddOn[]> => {
    const res = await api.get("/add-ons");
    const json = res.data;
    return Array.isArray(json) ? json : json.data ?? [];
};

const createAddOn = async (payload: Omit<AddOn, "id">): Promise<AddOn> => {
    const res = await api.post("/add-ons", payload);
    return res.data.data ?? res.data;
};

const updateAddOn = async (
    id: number,
    payload: Omit<AddOn, "id">,
): Promise<AddOn> => {
    const res = await api.put(`/add-ons/${id}`, payload);
    return res.data.data ?? res.data;
};

const deleteAddOn = async (id: number): Promise<void> => {
    await api.delete(`/add-ons/${id}`);
};

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

interface ModalProps {
    initial?: AddOn | null;
    onClose: () => void;
    onSaved: () => void;
}

function AddOnModal({ initial, onClose, onSaved }: ModalProps) {
    const isEdit = !!initial;
    const [form, setForm] = useState({
        add_on_name: initial?.add_on_name ?? "",
        price: initial?.price?.toString() ?? "",
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const nameRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // slight delay so the dialog's own focus trap settles first
        const t = setTimeout(() => nameRef.current?.focus(), 0);
        return () => clearTimeout(t);
    }, []);

    const validate = () => {
        const next: Record<string, string> = {};
        if (!form.add_on_name.trim()) next.add_on_name = "Name is required";
        else if (form.add_on_name.trim().length < 2)
            next.add_on_name = "At least 2 characters";
        const p = parseFloat(form.price);
        if (!form.price) next.price = "Price is required";
        else if (isNaN(p) || p < 0) next.price = "Enter a valid positive price";
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            const payload = {
                add_on_name: form.add_on_name.trim(),
                price: parseFloat(form.price),
            };
            if (isEdit && initial) {
                await updateAddOn(initial.id, payload);
            } else {
                await createAddOn(payload);
            }
            onSaved();
            onClose();
        } catch (err: any) {
            const backendErrors = err?.response?.data?.errors;
            if (backendErrors) {
                const formatted: Record<string, string> = {};
                Object.keys(backendErrors).forEach((k) => {
                    formatted[k] = Array.isArray(backendErrors[k])
                        ? backendErrors[k][0]
                        : backendErrors[k];
                });
                setErrors(formatted);
            } else {
                setErrors({
                    submit:
                        err?.response?.data?.message ??
                        "Something went wrong. Please try again.",
                });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className="max-w-sm bg-white border border-gray-100 shadow-2xl rounded-2xl p-0 gap-0 overflow-hidden [&>button]:hidden"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                {/* Header */}
                <DialogHeader className="flex-row items-center justify-between space-y-0 px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                            <Package className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-semibold text-gray-900">
                                {isEdit ? "Edit Add-On" : "New Add-On"}
                            </DialogTitle>
                            <p className="text-xs text-gray-400">
                                {isEdit
                                    ? "Update the details below"
                                    : "Fill in the details below"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </DialogHeader>

                <div className="px-6 py-5 space-y-4">
                    {/* Name */}
                    <div>
                        <Label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Add-On Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            ref={nameRef}
                            type="text"
                            className={`w-full px-3.5 py-2.5 h-auto border rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 outline-none transition-all ${
                                errors.add_on_name
                                    ? "border-red-400 bg-red-50"
                                    : "border-gray-200"
                            }`}
                            placeholder="e.g., Extra Towel, Foam, Transportation"
                            value={form.add_on_name}
                            onChange={(e) => {
                                setForm((p) => ({
                                    ...p,
                                    add_on_name: e.target.value,
                                }));
                                if (errors.add_on_name)
                                    setErrors((p) => ({ ...p, add_on_name: "" }));
                            }}
                            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                        />
                        {errors.add_on_name && (
                            <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />{" "}
                                {errors.add_on_name}
                            </p>
                        )}
                    </div>

                    {/* Price */}
                    <div>
                        <Label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Price (₱) <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">
                                ₱
                            </span>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                className={`w-full pl-7 pr-3.5 py-2.5 h-auto border rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                    errors.price
                                        ? "border-red-400 bg-red-50"
                                        : "border-gray-200"
                                }`}
                                placeholder="0.00"
                                value={form.price}
                                onChange={(e) => {
                                    setForm((p) => ({
                                        ...p,
                                        price: e.target.value,
                                    }));
                                    if (errors.price)
                                        setErrors((p) => ({ ...p, price: "" }));
                                }}
                                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                            />
                        </div>
                        {errors.price && (
                            <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" /> {errors.price}
                            </p>
                        )}
                    </div>

                    {errors.submit && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                            <p className="text-xs text-red-600 flex items-center gap-1.5">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />{" "}
                                {errors.submit}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <DialogFooter className="px-6 pb-5 pt-0 flex-row gap-3 sm:justify-start">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 h-auto px-4 py-2.5 border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 h-auto px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {isEdit ? "Saving..." : "Adding..."}
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                {isEdit ? "Save Changes" : "Add Add-On"}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

interface DeleteModalProps {
    addOn: AddOn;
    onClose: () => void;
    onDeleted: () => void;
}

function DeleteModal({ addOn, onClose, onDeleted }: DeleteModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleDelete = async () => {
        setLoading(true);
        try {
            await deleteAddOn(addOn.id);
            onDeleted();
            onClose();
        } catch (err: any) {
            setError(
                err?.response?.data?.message ??
                    "Failed to delete. It may be linked to existing bookings.",
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <AlertDialog open onOpenChange={(open) => !open && onClose()}>
            <AlertDialogContent className="max-w-sm bg-white border border-gray-100 shadow-2xl rounded-2xl p-0 gap-0 overflow-hidden">
                <AlertDialogHeader className="px-6 pt-6 pb-2 text-center space-y-0">
                    <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                        <Trash2 className="w-6 h-6 text-red-500" />
                    </div>
                    <AlertDialogTitle className="text-lg font-semibold text-gray-900">
                        Delete Add-On?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-sm text-gray-500 mt-1">
                        <span className="font-medium text-gray-800">
                            {addOn.add_on_name}
                        </span>{" "}
                        will be permanently removed. This cannot be undone.
                    </AlertDialogDescription>
                    {error && (
                        <p className="mt-3 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg p-2">
                            {error}
                        </p>
                    )}
                </AlertDialogHeader>
                <AlertDialogFooter className="px-6 pb-6 pt-4 flex-row gap-3 sm:justify-start">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 h-auto px-4 py-2.5 border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDelete}
                        disabled={loading}
                        className="flex-1 h-auto px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Trash2 className="w-4 h-4" />
                        )}
                        {loading ? "Deleting..." : "Delete"}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type SortKey = "add_on_name" | "price";
type SortDir = "asc" | "desc";

export default function AddOnsPage() {
    const [addOns, setAddOns] = useState<AddOn[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("add_on_name");
    const [sortDir, setSortDir] = useState<SortDir>("asc");

    const [showAddModal, setShowAddModal] = useState(false);
    const [editTarget, setEditTarget] = useState<AddOn | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<AddOn | null>(null);

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await fetchAddOns();
            setAddOns(data);
        } catch (err: any) {
            // 401 is auto-handled by the axios interceptor (redirect to login)
            setError(
                err?.response?.data?.message ??
                    "Could not load add-ons. Please try again.",
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else {
            setSortKey(key);
            setSortDir("asc");
        }
    };

    const filtered = addOns
        .filter((a) =>
            a.add_on_name.toLowerCase().includes(search.toLowerCase()),
        )
        .sort((a, b) => {
            const mul = sortDir === "asc" ? 1 : -1;
            if (sortKey === "price") return (a.price - b.price) * mul;
            return a.add_on_name.localeCompare(b.add_on_name) * mul;
        });

    const SortIcon = ({ col }: { col: SortKey }) =>
        sortKey === col ? (
            sortDir === "asc" ? (
                <ChevronUp className="w-3.5 h-3.5 text-indigo-600" />
            ) : (
                <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
            )
        ) : (
            <ChevronUp className="w-3.5 h-3.5 text-gray-300" />
        );

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-3xl mx-auto">
                {/* Page Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-200">
                            <Package className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">
                                Add-Ons
                            </h1>
                            <p className="text-sm text-gray-500">
                                {addOns.length} item
                                {addOns.length !== 1 ? "s" : ""} available
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 h-auto px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200"
                    >
                        <Plus className="w-4 h-4" />
                        Add New
                    </Button>
                </div>

                {/* Search */}
                <div className="mb-4 flex justify-end">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

                        <Input
                            type="text"
                            className="w-[250px] h-auto pl-10 pr-10 py-2.5 bg-white border-gray-200 rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 outline-none shadow-sm transition-all"
                            placeholder="Search add-ons..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />

                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2"
                            >
                                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Table Card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-[1fr_160px_100px] px-5 py-3 border-b border-gray-100 bg-gray-50/80">
                        <button
                            onClick={() => toggleSort("add_on_name")}
                            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-indigo-600 transition-colors text-left"
                        >
                            Name <SortIcon col="add_on_name" />
                        </button>
                        <button
                            onClick={() => toggleSort("price")}
                            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-indigo-600 transition-colors text-left"
                        >
                            Price <SortIcon col="price" />
                        </button>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                            Actions
                        </span>
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
                            <p className="text-sm text-gray-400">
                                Loading add-ons...
                            </p>
                        </div>
                    )}

                    {/* Error */}
                    {!loading && error && (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <AlertCircle className="w-8 h-8 text-red-400" />
                            <p className="text-sm text-red-500">{error}</p>
                            <button
                                onClick={load}
                                className="text-sm text-indigo-600 hover:underline font-medium"
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    {/* Empty */}
                    {!loading && !error && filtered.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Package className="w-9 h-9 text-gray-300" />
                            <p className="text-sm text-gray-400">
                                {search
                                    ? `No results for "${search}"`
                                    : "No add-ons yet. Create one!"}
                            </p>
                        </div>
                    )}

                    {/* Rows */}
                    {!loading && !error && filtered.length > 0 && (
                        <div className="divide-y divide-gray-50">
                            {filtered.map((addon) => (
                                <div
                                    key={addon.id}
                                    className="grid grid-cols-[1fr_160px_100px] items-center px-5 py-4 hover:bg-indigo-50/40 transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                            <Package className="w-4 h-4 text-indigo-400" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-800">
                                            {addon.add_on_name}
                                        </span>
                                    </div>

                                    <div>
                                        <Badge className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-semibold hover:bg-emerald-50 shadow-none">
                                            ₱
                                            {Number(
                                                addon.price,
                                            ).toLocaleString("en-PH", {
                                                minimumFractionDigits: 2,
                                            })}
                                        </Badge>
                                    </div>

                                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => setEditTarget(addon)}
                                            className="p-1.5 rounded-lg hover:bg-indigo-100 text-indigo-500 hover:text-indigo-700 transition-colors"
                                            title="Edit"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() =>
                                                setDeleteTarget(addon)
                                            }
                                            className="p-1.5 rounded-lg hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Footer */}
                    {!loading && !error && filtered.length > 0 && (
                        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between">
                            <span className="text-xs text-gray-400">
                                Showing {filtered.length} of {addOns.length}{" "}
                                add-ons
                            </span>
                            <span className="text-xs text-gray-500 font-medium">
                                Total pool value:{" "}
                                <span className="text-emerald-600 font-semibold">
                                    ₱
                                    {filtered
                                        .reduce(
                                            (s, a) => s + Number(a.price),
                                            0,
                                        )
                                        .toLocaleString("en-PH", {
                                            minimumFractionDigits: 2,
                                        })}
                                </span>
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showAddModal && (
                <AddOnModal onClose={() => setShowAddModal(false)} onSaved={load} />
            )}
            {editTarget && (
                <AddOnModal
                    initial={editTarget}
                    onClose={() => setEditTarget(null)}
                    onSaved={load}
                />
            )}
            {deleteTarget && (
                <DeleteModal
                    addOn={deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                    onDeleted={load}
                />
            )}
        </div>
    );
}