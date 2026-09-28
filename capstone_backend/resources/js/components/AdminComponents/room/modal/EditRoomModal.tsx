import { useEffect, useState, useRef } from "react";
import {
    updateRoom,
    uploadRoomImage,
    deleteRoomImage,
} from "@/services/roomService";
import { getRoomTypesCached } from "@/services/roomTypeService";
import {
    X,
    Upload,
    AlertCircle,
    CheckCircle,
    Trash2,
    Plus,
} from "lucide-react";
import api from "@/services/api";

/* ───────────────────────── Config ───────────────────────── */

const MAX_IMAGES = 10; // max room photos per room
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB each
const MAX_PANORAMA_SIZE = 5 * 1024 * 1024; // 5MB
const VALID_TYPES = ["image/jpeg", "image/png", "image/jpg"];

interface ExistingImage {
    id: number;
    url: string;
}

interface NewImage {
    uid: string;
    file: File;
    preview: string;
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// The list endpoint and the details endpoint may name the URL field differently
const imageUrl = (img: any): string =>
    img?.url ?? img?.image_url ?? img?.path ?? "";

// Slim scrollbar (no arrows). Works in Chrome/Edge/Safari and Firefox.
const SLIM_SCROLL_CSS = `
.slim-scroll { scrollbar-width: thin; scrollbar-color: #d1d5db transparent; }
@supports selector(::-webkit-scrollbar) {
    .slim-scroll { scrollbar-width: auto; scrollbar-color: auto; }
    .slim-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
    .slim-scroll::-webkit-scrollbar-track { background: transparent; }
    .slim-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 9999px; }
    .slim-scroll::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
    .slim-scroll::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
}
`;

/* ───────────────────────── Component ───────────────────────── */

export default function EditRoomModal({ room, onClose, refresh }: any) {
    const [roomTypes, setRoomTypes] = useState<any[]>([]);
    const [amenities, setAmenities] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});

    // ── Room images (multiple) ──
    const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
    const [serverImages, setServerImages] = useState<any[]>([]);
    const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);
    const [newImages, setNewImages] = useState<NewImage[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── 360° panorama (single) ──
    const [panoramaFile, setPanoramaFile] = useState<File | null>(null);
    const [panoramaPreview, setPanoramaPreview] = useState<string | null>(null);
    const [panoramaRemoved, setPanoramaRemoved] = useState(false);
    const [isDraggingPanorama, setIsDraggingPanorama] = useState(false);
    const panoramaInputRef = useRef<HTMLInputElement>(null);

    // Keep latest blob URLs in refs so we can revoke them on unmount
    const newImagesRef = useRef<NewImage[]>([]);
    newImagesRef.current = newImages;
    const panoramaPreviewRef = useRef<string | null>(null);
    panoramaPreviewRef.current = panoramaPreview;

    const [form, setForm] = useState({
        room_number: "",
        room_type_id: "",
        status: "available",
        amenities: [] as number[],
    });

    const totalImages = existingImages.length + newImages.length;
    const existingPanoramaId: number | undefined = serverImages.find(
        (img: any) => img.image_type === "360",
    )?.id;

    /* ── Load lookups ── */
    useEffect(() => {
        getRoomTypesCached().then(setRoomTypes);
        api.get("/amenities").then((res) => setAmenities(res.data.data));
    }, []);

    /* ── Fill the form from the room ── */
    useEffect(() => {
        if (!room) return undefined;

        setForm({
            room_number: room.room_number || "",
            room_type_id: room.room_type_id?.toString() || "",
            status: room.status || "available",
            amenities: room.amenities?.map((a: any) => a.id) ?? [],
        });

        const applyImages = (list: any[]) => {
            setServerImages(list);
            setExistingImages(
                list
                    .filter((img: any) => img.image_type !== "360")
                    .map((img: any) => ({ id: img.id, url: imageUrl(img) })),
            );
        };

        // room.images comes from the backend with { id, image_type, url }
        applyImages(room.images ?? []);
        setRemovedImageIds([]);
        setPanoramaRemoved(false);
        setPanoramaPreview(room.panorama_url || null);

        return undefined;
    }, [room]);

    /* ── Revoke blob URLs when the modal closes ── */
    useEffect(() => {
        return () => {
            newImagesRef.current.forEach((n) => URL.revokeObjectURL(n.preview));
            const p = panoramaPreviewRef.current;
            if (p && p.startsWith("blob:")) URL.revokeObjectURL(p);
        };
    }, []);

    /* ───────────────────────── Validation ───────────────────────── */

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!form.room_number.trim()) {
            newErrors.room_number = "Room number is required";
        } else if (form.room_number.trim().length < 2) {
            newErrors.room_number = "Room number must be at least 2 characters";
        }

        if (!form.room_type_id) {
            newErrors.room_type_id = "Please select a room type";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    /* ───────────────────────── Room images ───────────────────────── */

    const addImageFiles = (list: FileList | File[]) => {
        const incoming = Array.from(list);
        if (incoming.length === 0) return;

        const problems: string[] = [];
        const accepted: NewImage[] = [];
        const slots = MAX_IMAGES - totalImages;

        for (const f of incoming) {
            if (!VALID_TYPES.includes(f.type)) {
                problems.push(`${f.name}: only JPEG or PNG allowed`);
                continue;
            }
            if (f.size > MAX_IMAGE_SIZE) {
                problems.push(`${f.name}: larger than 2MB`);
                continue;
            }
            const duplicate =
                newImages.some(
                    (n) =>
                        n.file.name === f.name &&
                        n.file.size === f.size &&
                        n.file.lastModified === f.lastModified,
                ) ||
                accepted.some(
                    (n) => n.file.name === f.name && n.file.size === f.size,
                );
            if (duplicate) {
                problems.push(`${f.name}: already added`);
                continue;
            }
            if (accepted.length >= slots) {
                problems.push(
                    `${f.name}: limit of ${MAX_IMAGES} images reached`,
                );
                continue;
            }
            accepted.push({
                uid: uid(),
                file: f,
                preview: URL.createObjectURL(f),
            });
        }

        if (accepted.length > 0) {
            setNewImages((prev) => [...prev, ...accepted]);
        }
        setErrors((prev) => ({ ...prev, image: problems.join("\n") }));
    };

    const removeNewImage = (uidToRemove: string) => {
        setNewImages((prev) => {
            const target = prev.find((n) => n.uid === uidToRemove);
            if (target) URL.revokeObjectURL(target.preview);
            return prev.filter((n) => n.uid !== uidToRemove);
        });
        setErrors((prev) => ({ ...prev, image: "" }));
    };

    // Existing images are only deleted on the server when "Update Room" is pressed
    const removeExistingImage = (id: number) => {
        setExistingImages((prev) => prev.filter((img) => img.id !== id));
        setRemovedImageIds((prev) => [...prev, id]);
        setErrors((prev) => ({ ...prev, image: "" }));
    };

    const openImagePicker = () => {
        if (totalImages < MAX_IMAGES) fileInputRef.current?.click();
    };

    /* ───────────────────────── Panorama ───────────────────────── */

    const handlePanoramaSelect = (selected: File | null) => {
        if (!selected) return;

        if (!VALID_TYPES.includes(selected.type)) {
            setErrors((prev) => ({
                ...prev,
                panorama: "Please upload a valid image file (JPEG, PNG only)",
            }));
            return;
        }
        if (selected.size > MAX_PANORAMA_SIZE) {
            setErrors((prev) => ({
                ...prev,
                panorama: "Image size should be less than 5MB",
            }));
            return;
        }

        if (panoramaPreview && panoramaPreview.startsWith("blob:")) {
            URL.revokeObjectURL(panoramaPreview);
        }
        setPanoramaFile(selected);
        setPanoramaPreview(URL.createObjectURL(selected));
        setErrors((prev) => ({ ...prev, panorama: "" }));
    };

    const removePanorama = () => {
        if (panoramaFile) {
            // Discard the newly picked file and fall back to the current one (if any)
            if (panoramaPreview && panoramaPreview.startsWith("blob:")) {
                URL.revokeObjectURL(panoramaPreview);
            }
            setPanoramaFile(null);
            setPanoramaPreview(
                !panoramaRemoved && room.panorama_url
                    ? room.panorama_url
                    : null,
            );
        } else {
            setPanoramaPreview(null);
            if (room.panorama_url) setPanoramaRemoved(true);
        }

        if (panoramaInputRef.current) panoramaInputRef.current.value = "";
    };

    /* ───────────────────────── Drag & drop helper ───────────────────────── */

    const dragHandlers = (
        setDrag: (v: boolean) => void,
        onFiles: (files: FileList) => void,
    ) => ({
        onDragEnter: (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setDrag(true);
        },
        onDragLeave: (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setDrag(false);
        },
        onDragOver: (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
        },
        onDrop: (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setDrag(false);
            if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
        },
    });

    /* ───────────────────────── Submit ───────────────────────── */

    const handleSubmit = async (e: any) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);
        setUploadStatus("");

        try {
            await updateRoom(room.id, {
                room_number: form.room_number,
                room_type_id: form.room_type_id
                    ? Number(form.room_type_id)
                    : null,
                status: form.status,
                amenities: form.amenities,
            });

            // 1) Delete images the user removed
            const idsToDelete = [...removedImageIds];
            if (panoramaRemoved && existingPanoramaId) {
                idsToDelete.push(existingPanoramaId);
            }
            if (idsToDelete.length > 0) {
                setUploadStatus("Removing images...");
                await Promise.all(idsToDelete.map((id) => deleteRoomImage(id)));
            }

            // 2) Upload new room images one by one (keeps the order)
            for (let i = 0; i < newImages.length; i++) {
                const item = newImages[i];
                if (!item) continue;

                setUploadStatus(`Uploading ${i + 1}/${newImages.length}...`);
                const fd = new FormData();
                fd.append("room_id", room.id.toString());
                fd.append("image", item.file);
                fd.append("image_type", "normal");
                await uploadRoomImage(fd);
            }

            // 3) Upload new 360° image
            if (panoramaFile) {
                setUploadStatus("Uploading 360°...");
                const fd360 = new FormData();
                fd360.append("room_id", room.id.toString());
                fd360.append("image", panoramaFile);
                fd360.append("image_type", "360");
                await uploadRoomImage(fd360);
            }

            refresh();
            onClose();
        } catch (err: any) {
            console.error(err.response?.data);

            if (err.response?.data?.errors) {
                const backendErrors = err.response.data.errors;
                const formattedErrors: Record<string, string> = {};

                Object.keys(backendErrors).forEach((key) => {
                    formattedErrors[key] =
                        backendErrors[key][0] || backendErrors[key];
                });

                setErrors(formattedErrors);
            } else {
                setErrors({
                    submit:
                        err.response?.data?.message ||
                        "Failed to update room. Please try again.",
                });
            }
        } finally {
            setLoading(false);
            setUploadStatus("");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case "available":
                return "bg-green-50 text-green-700 border-green-300 ring-green-400 hover:bg-green-100";
            case "reserved":
                return "bg-yellow-50 text-yellow-700 border-yellow-300 ring-yellow-400 hover:bg-yellow-100";
            case "occupied":
                return "bg-blue-50 text-blue-700 border-blue-300 ring-blue-400 hover:bg-blue-100";
            case "maintenance":
                return "bg-red-50 text-red-700 border-red-300 ring-red-400 hover:bg-red-100";
            case "preparing":
                return "bg-purple-50 text-purple-700 border-purple-300 ring-purple-400 hover:bg-purple-100";
            case "ongoing":
                return "bg-amber-50 text-amber-700 border-amber-300 ring-amber-400 hover:bg-amber-100";
            default:
                return "bg-gray-50 text-gray-700 border-gray-300 ring-gray-400 hover:bg-gray-100";
        }
    };

    if (!room) return null;

    const atLimit = totalImages >= MAX_IMAGES;
    const imageDrag = dragHandlers(setIsDragging, addImageFiles);
    const panoramaDrag = dragHandlers(setIsDraggingPanorama, (files) =>
        handlePanoramaSelect(files[0] ?? null),
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <style>{SLIM_SCROLL_CSS}</style>
            <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                            Edit Room
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Update room #{room.room_number}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(90vh-90px)] overflow-hidden"
                >
                    {/* LEFT COLUMN: form fields */}
                    <div className="flex flex-col gap-5 overflow-y-auto slim-scroll pr-2">
                        {/* Room Number */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Room Number{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${errors.room_number ? "border-red-500" : "border-gray-300"}`}
                                placeholder="e.g., 101, A-202"
                                value={form.room_number}
                                onChange={(e) => {
                                    setForm((prev) => ({
                                        ...prev,
                                        room_number: e.target.value,
                                    }));
                                    if (errors.room_number)
                                        setErrors((p) => ({
                                            ...p,
                                            room_number: "",
                                        }));
                                }}
                            />
                            {errors.room_number && (
                                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4" />
                                    {errors.room_number}
                                </p>
                            )}
                        </div>

                        {/* Room Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Room Type{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <select
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${errors.room_type_id ? "border-red-500" : "border-gray-300"}`}
                                value={form.room_type_id}
                                onChange={(e) => {
                                    setForm((prev) => ({
                                        ...prev,
                                        room_type_id: e.target.value,
                                    }));
                                    if (errors.room_type_id)
                                        setErrors((p) => ({
                                            ...p,
                                            room_type_id: "",
                                        }));
                                }}
                            >
                                <option value="">Select Room Type</option>
                                {roomTypes.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.type_name} - ₱
                                        {t.base_price.toLocaleString()}
                                    </option>
                                ))}
                            </select>
                            {errors.room_type_id && (
                                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4" />
                                    {errors.room_type_id}
                                </p>
                            )}
                        </div>

                        {/* Amenities */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Amenities
                            </label>
                            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto slim-scroll border rounded-lg p-3">
                                {amenities.map((amenity) => (
                                    <label
                                        key={amenity.id}
                                        className="flex items-center gap-2 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={form.amenities.includes(
                                                amenity.id,
                                            )}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        amenities: [
                                                            ...prev.amenities,
                                                            amenity.id,
                                                        ],
                                                    }));
                                                } else {
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        amenities:
                                                            prev.amenities.filter(
                                                                (id) =>
                                                                    id !==
                                                                    amenity.id,
                                                            ),
                                                    }));
                                                }
                                            }}
                                        />
                                        <span>{amenity.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Status
                            </label>
                            <div className="px-3 grid grid-cols-3 gap-2">
                                {[
                                    "available",
                                    "reserved",
                                    "occupied",
                                    "maintenance",
                                    "preparing",
                                    "ongoing",
                                ].map((status) => (
                                    <button
                                        key={status}
                                        type="button"
                                        onClick={() =>
                                            setForm((prev) => ({
                                                ...prev,
                                                status,
                                            }))
                                        }
                                        className={`px-3 py-2 rounded-lg border text-sm font-medium capitalize transition-all ${getStatusColor(
                                            status,
                                        )} ${
                                            form.status === status
                                                ? "ring-2 ring-offset-1 shadow-md scale-105"
                                                : "opacity-80 hover:opacity-100"
                                        }`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Submit Error */}
                        {errors.submit && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-600 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    {errors.submit}
                                </p>
                            </div>
                        )}

                        {/* Buttons */}
                        <div className="flex gap-3 pt-4 mt-auto">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        {uploadStatus || "Updating..."}
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4" />
                                        Update Room
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: images */}
                    <div className="flex flex-col gap-5 min-h-0 overflow-y-auto slim-scroll pl-1 pr-2">
                        {/* ── Room Images (multiple) ── */}
                        <div className="flex-shrink-0">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Room Images{" "}
                                    <span className="text-xs text-gray-400">
                                        (Max 2MB each, JPEG/PNG only)
                                    </span>
                                </label>
                                <span
                                    className={`text-xs font-medium ${atLimit ? "text-red-500" : "text-gray-500"}`}
                                >
                                    {totalImages}/{MAX_IMAGES}
                                </span>
                            </div>

                            <p className="text-xs text-gray-400 mb-2 -mt-1">
                                The first image is the main photo shown on the
                                room card.
                            </p>

                            {/* Dropzone */}
                            <div
                                {...imageDrag}
                                onClick={openImagePicker}
                                className={`border-2 border-dashed rounded-lg px-4 py-6 text-center transition-all flex-shrink-0 ${
                                    atLimit
                                        ? "border-gray-200 bg-gray-50 cursor-not-allowed"
                                        : isDragging
                                          ? "border-blue-500 bg-blue-50 cursor-pointer"
                                          : errors.image
                                            ? "border-red-500 bg-red-50 cursor-pointer"
                                            : "border-gray-300 hover:border-blue-500 cursor-pointer"
                                }`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    className="hidden"
                                    accept="image/jpeg,image/png,image/jpg"
                                    onChange={(e) => {
                                        if (e.target.files)
                                            addImageFiles(e.target.files);
                                        e.target.value = ""; // allow re-selecting the same file
                                    }}
                                />
                                <Upload
                                    className={`w-9 h-9 mx-auto mb-2 ${isDragging ? "text-blue-500" : "text-gray-400"}`}
                                />
                                <p className="text-sm text-gray-600">
                                    {atLimit
                                        ? `Image limit reached (${MAX_IMAGES})`
                                        : isDragging
                                          ? "Drop your images here"
                                          : "Click to upload or drag and drop multiple images"}
                                </p>
                            </div>

                            {errors.image && (
                                <p className="mt-1 text-sm text-red-500 flex items-start gap-1 whitespace-pre-line">
                                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span>{errors.image}</span>
                                </p>
                            )}

                            {/* Thumbnails */}
                            {totalImages > 0 ? (
                                <div className="grid grid-cols-3 gap-3 mt-3 content-start h-72 overflow-y-auto slim-scroll p-3 rounded-lg border border-gray-200 bg-gray-50">
                                    {existingImages.map((img, idx) => (
                                        <div
                                            key={`old-${img.id}`}
                                            className="relative aspect-[4/3] rounded-lg overflow-hidden border border-gray-200 bg-gray-100"
                                        >
                                            <img
                                                src={img.url}
                                                alt="Room"
                                                className="w-full h-full object-cover"
                                            />
                                            {idx === 0 && (
                                                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-blue-600 text-white">
                                                    Main
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeExistingImage(img.id)
                                                }
                                                title="Remove image"
                                                className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 hover:bg-red-600 text-white transition"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}

                                    {newImages.map((n, nIdx) => (
                                        <div
                                            key={n.uid}
                                            className="relative aspect-[4/3] rounded-lg overflow-hidden border-2 border-emerald-400 bg-gray-100"
                                        >
                                            <img
                                                src={n.preview}
                                                alt={n.file.name}
                                                className="w-full h-full object-cover"
                                            />
                                            <span
                                                className={`absolute bottom-1 left-1 px-1.5 py-0.5 text-[10px] font-semibold rounded text-white ${
                                                    existingImages.length ===
                                                        0 && nIdx === 0
                                                        ? "bg-blue-600"
                                                        : "bg-emerald-500"
                                                }`}
                                            >
                                                {existingImages.length === 0 &&
                                                nIdx === 0
                                                    ? "Main · New"
                                                    : "New"}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeNewImage(n.uid)
                                                }
                                                title="Remove image"
                                                className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 hover:bg-red-600 text-white transition"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}

                                    {!atLimit && (
                                        <button
                                            type="button"
                                            onClick={openImagePicker}
                                            className="aspect-[4/3] rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 text-gray-400 hover:text-blue-500 flex flex-col items-center justify-center gap-1 transition"
                                        >
                                            <Plus className="w-5 h-5" />
                                            <span className="text-xs font-medium">
                                                Add more
                                            </span>
                                        </button>
                                    )}
                                </div>
                            ) : (
                                !errors.image && (
                                    <p className="mt-2 text-xs text-gray-400">
                                        No images yet. Upload photos of the
                                        room.
                                    </p>
                                )
                            )}

                            {(removedImageIds.length > 0 ||
                                newImages.length > 0) && (
                                <p className="mt-2 text-xs text-gray-500">
                                    {newImages.length > 0 &&
                                        `${newImages.length} new to upload`}
                                    {newImages.length > 0 &&
                                        removedImageIds.length > 0 &&
                                        " · "}
                                    {removedImageIds.length > 0 &&
                                        `${removedImageIds.length} to remove`}
                                    {" — applied when you press Update Room."}
                                </p>
                            )}
                        </div>

                        {/* ── 360° Panorama Image (fixed, does not scroll) ── */}
                        <div className="flex-shrink-0">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                360° Panorama Image{" "}
                                <span className="text-xs text-gray-400">
                                    (Optional, Max 5MB, JPEG/PNG only)
                                </span>
                            </label>
                            <div
                                {...panoramaDrag}
                                onClick={() =>
                                    panoramaInputRef.current?.click()
                                }
                                className={`border-2 border-dashed rounded-lg p-5 text-center transition-all cursor-pointer ${
                                    isDraggingPanorama
                                        ? "border-purple-500 bg-purple-50"
                                        : errors.panorama
                                          ? "border-red-500 bg-red-50"
                                          : "border-gray-300 hover:border-purple-500"
                                }`}
                            >
                                <input
                                    ref={panoramaInputRef}
                                    type="file"
                                    className="hidden"
                                    accept="image/jpeg,image/png,image/jpg"
                                    onChange={(e) => {
                                        handlePanoramaSelect(
                                            e.target.files?.[0] || null,
                                        );
                                        e.target.value = "";
                                    }}
                                />

                                {panoramaPreview ? (
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <img
                                                src={panoramaPreview}
                                                alt="360° panorama preview"
                                                className="w-full h-52 object-cover rounded-lg"
                                            />
                                            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                                                360°
                                            </div>
                                        </div>
                                        <div className="flex gap-2 justify-center">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removePanorama();
                                                }}
                                                className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                {panoramaFile
                                                    ? "Remove new 360° image"
                                                    : "Remove current 360° image"}
                                            </button>
                                            {!panoramaFile && (
                                                <span className="text-xs text-gray-400">
                                                    Click to replace
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="relative inline-block">
                                            <Upload
                                                className={`w-10 h-10 mx-auto mb-2 ${isDraggingPanorama ? "text-purple-500" : "text-gray-400"}`}
                                            />
                                            <span className="absolute -top-1 -right-3 text-xs font-bold bg-purple-500 text-white rounded-full px-1.5 py-0.5">
                                                360
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600">
                                            {isDraggingPanorama
                                                ? "Drop your 360° image here"
                                                : "Click to upload 360° panorama or drag and drop"}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Equirectangular panorama images
                                            recommended (2:1 aspect ratio)
                                        </p>
                                    </div>
                                )}
                            </div>
                            {errors.panorama && (
                                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4" />
                                    {errors.panorama}
                                </p>
                            )}
                            {!panoramaPreview && !errors.panorama && (
                                <p className="mt-1 text-xs text-gray-400">
                                    Optional: Add a 360° panorama view of the
                                    room
                                </p>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
