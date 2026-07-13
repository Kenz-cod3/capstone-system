import { useState } from "react";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
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

interface Amenity {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

// ─── Fetch function ──────────────────────────────────────────────────────────

const fetchAmenities = async (): Promise<Amenity[]> => {
  const res = await api.get("/amenities");
  const data = res.data;
  return Array.isArray(data) ? data : data.data || [];
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function Amenities() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Amenity | null>(null);
  const [name, setName] = useState("");

  // ── Query ──────────────────────────────────────────────────────────────────

  const {
    data: amenities = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["amenities"],
    queryFn: fetchAmenities,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (name: string) => api.post("/amenities", { name }),
    onSuccess: () => {
      toast.success("Amenity created successfully");
      queryClient.invalidateQueries({ queryKey: ["amenities"] });
      closeDialog();
    },
    onError: (err: any) => {
      const message = err.response?.data?.message || "Failed to create amenity";
      toast.error(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      api.put(`/amenities/${id}`, { name }),
    onSuccess: () => {
      toast.success("Amenity updated successfully");
      queryClient.invalidateQueries({ queryKey: ["amenities"] });
      closeDialog();
    },
    onError: (err: any) => {
      const message = err.response?.data?.message || "Failed to update amenity";
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/amenities/${id}`),
    onSuccess: () => {
      toast.success("Amenity deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["amenities"] });
    },
    onError: (err: any) => {
      const message = err.response?.data?.message || "Failed to delete amenity";
      toast.error(message);
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // ── Dialog helpers ─────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDialogOpen(true);
  };

  const openEdit = (amenity: Amenity) => {
    setEditing(amenity);
    setName(amenity.name);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setName("");
  };

  const saveAmenity = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Please enter an amenity name");
      return;
    }

    if (editing) {
      updateMutation.mutate({ id: editing.id, name: trimmedName });
    } else {
      createMutation.mutate(trimmedName);
    }
  };

  // ── Skeleton Row ──────────────────────────────────────────────────────────

  const SkeletonRow = () => (
    <tr className="border-b border-slate-100">
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-40 bg-slate-200" />
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
      <td colSpan={2} className="px-4 py-16 text-center">
        <p className="mt-2 font-semibold text-slate-600">No amenities yet</p>
        <p className="mt-1 text-xs text-slate-400">
          Click "Add Amenity" to get started
        </p>
      </td>
    </tr>
  );

  // ── Error state ────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-red-200 bg-red-50 p-4">
        <div className="text-center">
          <p className="font-semibold text-red-700">Failed to load amenities</p>
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
          {/* Card header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800">Amenities</span>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-lg bg-mint-600 px-4 py-2 text-sm font-semibold text-white hover:bg-mint-700 active:scale-95 transition-all"
            >
              <Plus className="size-4" />
              Add Amenity
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="border-b border-slate-200 px-4 py-3 pl-8 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Name
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
                ) : amenities.length === 0 ? (
                  <EmptyState />
                ) : (
                  amenities.map((amenity) => (
                    <tr
                      key={amenity.id}
                      className="border-b border-slate-100 transition-colors hover:bg-slate-50"
                    >
                      <td className="pl-8 px-4 py-3 font-medium text-slate-900">
                        {amenity.name}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2 pr-4">
                          <button
                            onClick={() => openEdit(amenity)}
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
                                  Delete "{amenity.name}"?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. The amenity will be
                                  permanently removed.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(amenity.id)}
                                  className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                                >
                                  {deleteMutation.isPending ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : "Delete"}
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
                {loading ? "..." : amenities.length}
              </span>{" "}
              {amenities.length === 1 ? "amenity" : "amenities"}
            </p>
            <p className="text-xs text-slate-400">
              {loading ? "Loading..." : `${amenities.length} total`}
            </p>
          </div>
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
              {editing ? "Edit Amenity" : "Create New Amenity"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveAmenity();
            }}
            className="mt-2 space-y-4"
          >
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Amenity Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. WiFi, Coffe, Parking"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/30 [appearance:textfield] transition-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    saveAmenity();
                  }
                }}
              />
              <p className="text-xs text-slate-400">
                Enter a unique amenity name
              </p>
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
                {editing ? "Update Amenity" : "Create Amenity"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}