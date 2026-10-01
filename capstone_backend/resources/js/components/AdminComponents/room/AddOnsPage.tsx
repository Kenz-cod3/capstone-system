import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Package,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

import { Skeleton } from "@/components/ui/skeleton";
import api from "@/services/api";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AddOn {
  id: number;
  add_on_name: string;
  price: number;
  stock: number;
}

interface AddOnPayload {
  add_on_name: string;
  price: number;
  stock: number;
}

type SortKey = "add_on_name" | "price" | "stock";
type SortDir = "asc" | "desc";

// Stock at or below this number shows the "low stock" warning
const LOW_STOCK_THRESHOLD = 5;

// ─── Fetch function ──────────────────────────────────────────────────────────

const fetchAddOns = async (): Promise<AddOn[]> => {
  const res = await api.get("/add-ons");
  const data = res.data;
  return Array.isArray(data) ? data : data.data || [];
};

// ─── Stock Badge ─────────────────────────────────────────────────────────────

function StockBadge({ stock }: { stock: number }) {
  const qty = Number(stock);

  if (qty <= 0) {
    return (
      <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">
        Out of stock
      </span>
    );
  }

  if (qty <= LOW_STOCK_THRESHOLD) {
    return (
      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
        {qty} left
      </span>
    );
  }

  return (
    <span className="rounded-full border border-mint-200 bg-mint-50 px-2 py-0.5 text-[11px] font-semibold text-mint-700">
      {qty} in stock
    </span>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AddOnsPage() {
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AddOn | null>(null);
  const [form, setForm] = useState({ add_on_name: "", price: "", stock: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("add_on_name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // ── Query ──────────────────────────────────────────────────────────────────

  const {
    data: addOns = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["addOns"],
    queryFn: fetchAddOns,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const handleServerErrors = (err: any, fallback: string) => {
    const serverErrors = err.response?.data?.errors;
    if (serverErrors) {
      const formatted: Record<string, string> = {};
      Object.keys(serverErrors).forEach((k) => {
        formatted[k] = Array.isArray(serverErrors[k])
          ? serverErrors[k][0]
          : serverErrors[k];
      });
      setFormErrors(formatted);
    } else {
      toast.error(err.response?.data?.message || fallback);
    }
  };

  const createMutation = useMutation({
    mutationFn: (payload: AddOnPayload) => api.post("/add-ons", payload),
    onSuccess: () => {
      toast.success("Add-on created successfully");
      queryClient.invalidateQueries({ queryKey: ["addOns"] });
      closeDialog();
    },
    onError: (err: any) => handleServerErrors(err, "Failed to create add-on"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AddOnPayload }) =>
      api.put(`/add-ons/${id}`, payload),
    onSuccess: () => {
      toast.success("Add-on updated successfully");
      queryClient.invalidateQueries({ queryKey: ["addOns"] });
      closeDialog();
    },
    onError: (err: any) => handleServerErrors(err, "Failed to update add-on"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/add-ons/${id}`),
    onSuccess: () => {
      toast.success("Add-on deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["addOns"] });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message ||
          "Failed to delete. It may be linked to existing bookings.",
      );
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // ── Dialog helpers ─────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditing(null);
    setForm({ add_on_name: "", price: "", stock: "" });
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEdit = (addOn: AddOn) => {
    setEditing(addOn);
    setForm({
      add_on_name: addOn.add_on_name,
      price: addOn.price.toString(),
      stock: addOn.stock.toString(),
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setForm({ add_on_name: "", price: "", stock: "" });
    setFormErrors({});
  };

  const setField = (key: keyof typeof form, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (formErrors[key]) setFormErrors((p) => ({ ...p, [key]: "" }));
  };

  const validate = () => {
    const next: Record<string, string> = {};

    if (!form.add_on_name.trim()) next.add_on_name = "Name is required";
    else if (form.add_on_name.trim().length < 2)
      next.add_on_name = "At least 2 characters";

    const p = parseFloat(form.price);
    if (!form.price) next.price = "Price is required";
    else if (isNaN(p) || p < 0) next.price = "Enter a valid positive price";

    const s = Number(form.stock);
    if (form.stock === "") next.stock = "Stock is required";
    else if (!Number.isInteger(s) || s < 0)
      next.stock = "Enter a whole number (0 or more)";

    setFormErrors(next);
    return Object.keys(next).length === 0;
  };

  const saveAddOn = () => {
    if (!validate()) return;

    const payload: AddOnPayload = {
      add_on_name: form.add_on_name.trim(),
      price: parseFloat(form.price),
      stock: parseInt(form.stock, 10),
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // ── Sort + filter ──────────────────────────────────────────────────────────

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (
      <span className="ml-1 text-xs">{sortDir === "asc" ? "▲" : "▼"}</span>
    ) : (
      <span className="ml-1 text-xs opacity-30">⇅</span>
    );

  const filtered = [...addOns]
    .filter((a) => a.add_on_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortKey === "price") return (a.price - b.price) * mul;
      if (sortKey === "stock") return (a.stock - b.stock) * mul;
      return a.add_on_name.localeCompare(b.add_on_name) * mul;
    });

  const lowStockCount = addOns.filter(
    (a) => Number(a.stock) <= LOW_STOCK_THRESHOLD,
  ).length;

  const inventoryValue = filtered.reduce(
    (sum, a) => sum + Number(a.price) * Number(a.stock),
    0,
  );

  // ── Skeleton Row ──────────────────────────────────────────────────────────

  const SkeletonRow = () => (
    <tr className="border-b border-slate-100">
      <td className="px-4 py-3 pl-8">
        <Skeleton className="h-4 w-40 bg-slate-200" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-20 bg-slate-200" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-5 w-20 rounded-full bg-slate-200" />
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2 pr-4">
          <Skeleton className="h-8 w-16 rounded-lg bg-slate-200" />
          <Skeleton className="h-8 w-16 rounded-lg bg-slate-200" />
        </div>
      </td>
    </tr>
  );

  // ── Empty State ───────────────────────────────────────────────────────────

  const EmptyState = () => (
    <tr>
      <td colSpan={4} className="px-4 py-16 text-center">
        <p className="mt-2 font-semibold text-slate-600">
          {search ? `No results for "${search}"` : "No add-ons yet"}
        </p>
        {!search && (
          <p className="mt-1 text-xs text-slate-400">
            Click "Add Add-on" to get started
          </p>
        )}
      </td>
    </tr>
  );

  // ── Error state ────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-red-200 bg-red-50 p-4">
        <div className="text-center">
          <p className="font-semibold text-red-700">Failed to load add-ons</p>
          <p className="mt-1 text-sm text-red-500">{(error as Error).message}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 rounded-lg bg-mint-600 px-4 py-2 text-sm font-medium text-white hover:bg-mint-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const loading = isLoading || isFetching;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Card header — logo + title + description */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-mint-600 shadow-md shadow-mint-200">
                <Package className="size-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Add-ons</h2>
                <p className="text-xs text-slate-500">
                  {loading
                    ? "Loading add-ons..."
                    : `${addOns.length} ${
                        addOns.length === 1 ? "add-on" : "add-ons"
                      } available`}
                  {!loading && lowStockCount > 0 && (
                    <span className="font-medium text-amber-600">
                      {" "}
                      • {lowStockCount} low or out of stock
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search add-ons..."
                  className="w-[220px] rounded-lg border border-slate-200 py-2 pl-9 pr-8 text-sm text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/30 transition-none"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  >
                    <X className="size-3.5 text-slate-400 hover:text-slate-600" />
                  </button>
                )}
              </div>

              <button
                onClick={openCreate}
                className="flex items-center gap-2 rounded-lg bg-mint-600 px-4 py-2 text-sm font-semibold text-white hover:bg-mint-700 active:scale-95 transition-all"
              >
                <Plus className="size-4" />
                Add Add-on
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th
                    onClick={() => handleSort("add_on_name")}
                    className="cursor-pointer select-none border-b border-slate-200 px-4 py-3 pl-8 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:bg-slate-100"
                  >
                    Name
                    <SortIcon col="add_on_name" />
                  </th>
                  <th
                    onClick={() => handleSort("price")}
                    className="cursor-pointer select-none border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:bg-slate-100"
                  >
                    Price
                    <SortIcon col="price" />
                  </th>
                  <th
                    onClick={() => handleSort("stock")}
                    className="cursor-pointer select-none border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:bg-slate-100"
                  >
                    Stock
                    <SortIcon col="stock" />
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 pr-24 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonRow key={`skeleton-${i}`} />
                  ))
                ) : filtered.length === 0 ? (
                  <EmptyState />
                ) : (
                  filtered.map((addon) => (
                    <tr
                      key={addon.id}
                      className="border-b border-slate-100 transition-colors hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 pl-8 font-medium text-slate-900">
                        {addon.add_on_name}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        ₱
                        {Number(addon.price).toLocaleString("en-PH", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <StockBadge stock={addon.stock} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2 pr-4">
                          <button
                            onClick={() => openEdit(addon)}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
                          >
                            <Pencil className="size-3" />
                            Edit
                          </button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 active:scale-95 transition-all">
                                <Trash2 className="size-3" />
                                Delete
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-white ring-0 border border-gray-200 shadow-lg">
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete "{addon.add_on_name}"?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. The add-on will
                                  be permanently removed.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(addon.id)}
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
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
            <p className="text-xs text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-700">
                {loading ? "..." : filtered.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-700">
                {loading ? "..." : addOns.length}
              </span>{" "}
              {addOns.length === 1 ? "add-on" : "add-ons"}
            </p>
            <p className="text-xs text-slate-500">
              Inventory value:{" "}
              <span className="font-semibold text-mint-700">
                {loading
                  ? "..."
                  : `₱${inventoryValue.toLocaleString("en-PH", {
                      minimumFractionDigits: 2,
                    })}`}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent
          className="max-w-lg bg-white border border-gray-200 shadow-lg outline-none ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 [&>button]:hidden transition-none data-open:animate-none data-closed:animate-none"
          onPointerDownOutside={() => {
            closeDialog();
          }}
          onFocusOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editing ? "Edit Add-on" : "Create New Add-on"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveAddOn();
            }}
            className="mt-2 space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              {/* Name */}
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Add-on Name
                </label>
                <input
                  type="text"
                  value={form.add_on_name}
                  onChange={(e) => setField("add_on_name", e.target.value)}
                  placeholder="e.g. Extra Towel, Foam, Transportation"
                  autoFocus
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/30 transition-none"
                />
                {formErrors.add_on_name && (
                  <p className="text-xs text-red-500">
                    {formErrors.add_on_name}
                  </p>
                )}
              </div>

              {/* Price */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    ₱
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setField("price", e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-200 py-2 pl-7 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-none"
                  />
                </div>
                {formErrors.price && (
                  <p className="text-xs text-red-500">{formErrors.price}</p>
                )}
              </div>

              {/* Stock */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Stock
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={form.stock}
                  onChange={(e) => setField("stock", e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-none"
                />
                {formErrors.stock && (
                  <p className="text-xs text-red-500">{formErrors.stock}</p>
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
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-mint-600 px-4 py-2 text-sm font-semibold text-white hover:bg-mint-700 disabled:opacity-60 disabled:cursor-not-allowed transition-none"
              >
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {editing ? "Update Add-on" : "Create Add-on"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}