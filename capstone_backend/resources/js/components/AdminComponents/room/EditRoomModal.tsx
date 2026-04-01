import { useEffect, useState, useRef } from "react";
import { updateRoom, uploadRoomImage } from "@/services/roomService";
import { getRoomTypesCached } from "@/services/roomTypeService";
import { X, Upload, AlertCircle, CheckCircle, Trash2 } from "lucide-react";

export default function EditRoomModal({ room, onClose, refresh }: any) {
    const [roomTypes, setRoomTypes] = useState<any[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isDragging, setIsDragging] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({
        room_number: "",
        room_type_id: "",
        status: "available",
    });

    useEffect(() => {
        getRoomTypesCached().then(setRoomTypes);
    }, []);

    // Update form and preview when room changes
    useEffect(() => {
        if (room) {
            setForm({
                room_number: room.room_number || "",
                room_type_id: room.room_type_id?.toString() || "",
                status: room.status || "available",
            });

            // Handle image URL - if it's from backend, use as is
            if (room.image_url) {
                setPreview(room.image_url);
            }
        }

        // Cleanup function for object URLs
        return () => {
            if (preview && preview.startsWith('blob:')) {
                URL.revokeObjectURL(preview);
            }
        };
    }, [room]);

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

    const validateAndSetFile = (file: File) => {
        // Validate file type (match backend mimes)
        const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            setErrors({ ...errors, image: "Please upload a valid image file (JPEG, PNG only)" });
            return false;
        }

        // Validate file size (2MB to match backend max:2048)
        if (file.size > 2 * 1024 * 1024) {
            setErrors({ ...errors, image: "Image size should be less than 2MB" });
            return false;
        }

        return true;
    };

    const handleFileSelect = (selectedFile: File | null) => {
        if (!selectedFile) return;

        if (validateAndSetFile(selectedFile)) {
            setFile(selectedFile);
            // Clean up previous blob URL if it exists
            if (preview && preview.startsWith('blob:')) {
                URL.revokeObjectURL(preview);
            }
            setPreview(URL.createObjectURL(selectedFile));
            setErrors({ ...errors, image: "" });
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0] || null;
        handleFileSelect(selected);
    };

    // Drag and drop handlers
    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            handleFileSelect(droppedFile);
        }
    };

    const removeImage = () => {
        setFile(null);
        if (preview && preview.startsWith('blob:')) {
            URL.revokeObjectURL(preview);
            setPreview(null);
        } else {
            // If it's a server image, just remove preview but keep ability to upload new
            setPreview(null);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            // First update the room details
            await updateRoom(room.id, {
                room_number: form.room_number,
                room_type_id: form.room_type_id ? Number(form.room_type_id) : null,
                status: form.status,
            });

            // If there's a new image, upload it using the dedicated endpoint
            if (file) {
                const fd = new FormData();
                fd.append("room_id", room.id.toString());
                fd.append("image", file);
                fd.append("image_type", "normal");// or whatever type you want

                await uploadRoomImage(fd);
            }

            refresh();
            onClose();
        } catch (err: any) {
            console.error(err.response?.data);

            if (err.response?.data?.errors) {
                const backendErrors = err.response.data.errors;
                const formattedErrors: Record<string, string> = {};

                Object.keys(backendErrors).forEach(key => {
                    formattedErrors[key] = backendErrors[key][0] || backendErrors[key];
                });

                setErrors(formattedErrors);
            } else {
                setErrors({
                    submit: err.response?.data?.message || "Failed to update room. Please try again."
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'available': return 'text-green-600 bg-green-50';
            case 'occupied': return 'text-red-600 bg-red-50';
            case 'maintenance': return 'text-yellow-600 bg-yellow-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    if (!room) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Edit Room</h2>
                        <p className="text-sm text-gray-500 mt-1">Update room #{room.room_number}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Room Number */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Room Number <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${errors.room_number ? 'border-red-500' : 'border-gray-300'
                                }`}
                            placeholder="e.g., 101, A-202"
                            value={form.room_number}
                            onChange={e => {
                                setForm(prev => ({ ...prev, room_number: e.target.value }));
                                if (errors.room_number) setErrors({ ...errors, room_number: "" });
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
                            Room Type <span className="text-red-500">*</span>
                        </label>
                        <select
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${errors.room_type_id ? 'border-red-500' : 'border-gray-300'
                                }`}
                            value={form.room_type_id}
                            onChange={e => {
                                setForm(prev => ({ ...prev, room_type_id: e.target.value }));
                                if (errors.room_type_id) setErrors({ ...errors, room_type_id: "" });
                            }}
                        >
                            <option value="">Select Room Type</option>
                            {roomTypes.map(t => (
                                <option key={t.id} value={t.id}>
                                    {t.type_name} - ₱{t.base_price.toLocaleString()}
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

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Status
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {['available', 'occupied', 'maintenance'].map(status => (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={() => setForm(prev => ({ ...prev, status }))}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-all ${form.status === status
                                            ? `${getStatusColor(status)} ring-2 ring-offset-1 ring-blue-500`
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Room Image with Drag & Drop */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Room Image <span className="text-xs text-gray-400">(Max 2MB, JPEG/PNG only)</span>
                        </label>
                        <div
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-lg p-4 text-center transition-all cursor-pointer ${isDragging
                                    ? 'border-blue-500 bg-blue-50'
                                    : errors.image
                                        ? 'border-red-500 bg-red-50'
                                        : 'border-gray-300 hover:border-blue-500'
                                }`}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept="image/jpeg,image/png,image/jpg"
                                onChange={handleFileChange}
                            />

                            {preview ? (
                                <div className="space-y-3">
                                    <img
                                        src={preview}
                                        alt="Room preview"
                                        className="w-full h-48 object-cover rounded-lg"
                                    />
                                    <div className="flex gap-2 justify-center">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeImage();
                                            }}
                                            className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            {file ? 'Remove new image' : 'Remove current image'}
                                        </button>
                                        {!file && preview && !preview.startsWith('blob:') && (
                                            <span className="text-xs text-gray-400">
                                                Upload new image to replace
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <Upload className={`w-10 h-10 mx-auto mb-2 ${isDragging ? 'text-blue-500' : 'text-gray-400'
                                        }`} />
                                    <p className="text-sm text-gray-600">
                                        {isDragging ? 'Drop your image here' : 'Click to upload or drag and drop'}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        JPEG, PNG up to 2MB
                                    </p>
                                </div>
                            )}
                        </div>
                        {errors.image && (
                            <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                {errors.image}
                            </p>
                        )}
                        {!preview && !errors.image && (
                            <p className="mt-1 text-xs text-gray-400">
                                No image uploaded. Upload one to add a photo of the room.
                            </p>
                        )}
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
                    <div className="flex gap-3 pt-4">
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
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    Update Room
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}