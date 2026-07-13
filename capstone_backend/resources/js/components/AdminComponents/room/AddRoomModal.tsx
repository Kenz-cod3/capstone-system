import { useEffect, useState, useRef } from "react";
import { createRoom, uploadRoomImage } from "@/services/roomService";
import { getRoomTypesCached } from "@/services/roomTypeService";
import { X, Upload, AlertCircle, CheckCircle } from "lucide-react";
import api from "@/services/api";

export default function AddRoomModal({ onClose, refresh }: any) {
    const [roomTypes, setRoomTypes] = useState<any[]>([]);
    const [amenities, setAmenities] = useState<any[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [panoramaFile, setPanoramaFile] = useState<File | null>(null);
    const [panoramaPreview, setPanoramaPreview] = useState<string | null>(null);
    const [isDraggingPanorama, setIsDraggingPanorama] = useState(false);
    const panoramaInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({
        room_number: "",
        room_type_id: "",
        status: "available",
        amenities: [] as number[],
    });



    useEffect(() => {
        getRoomTypesCached().then(setRoomTypes);

        api.get("/amenities").then((res) => {
            console.log("Amenities Response:", res.data);

            setAmenities(res.data.data);
        });
    }, []);

    // Cleanup preview URLs on unmount
    useEffect(() => {
        return () => {
            if (preview && preview.startsWith('blob:')) {
                URL.revokeObjectURL(preview);
            }
            if (panoramaPreview && panoramaPreview.startsWith('blob:')) {
                URL.revokeObjectURL(panoramaPreview);
            }
        };
    }, [preview, panoramaPreview]);

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

    const validateAndSetFile = (file: File, isPanorama: boolean = false) => {
        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            setErrors({
                ...errors,
                [isPanorama ? "panorama" : "image"]: "Please upload a valid image file (JPEG, PNG only)"
            });
            return false;
        }

        // Validate file size (5MB for panorama, 2MB for regular images)
        const maxSize = isPanorama ? 5 * 1024 * 1024 : 2 * 1024 * 1024;
        if (file.size > maxSize) {
            setErrors({
                ...errors,
                [isPanorama ? "panorama" : "image"]: `Image size should be less than ${isPanorama ? '5MB' : '2MB'}`
            });
            return false;
        }

        return true;
    };

    const handleFileSelect = (selectedFile: File | null, isPanorama: boolean = false) => {
        if (!selectedFile) return;

        if (validateAndSetFile(selectedFile, isPanorama)) {
            if (isPanorama) {
                if (panoramaPreview && panoramaPreview.startsWith('blob:')) {
                    URL.revokeObjectURL(panoramaPreview);
                }
                setPanoramaFile(selectedFile);
                setPanoramaPreview(URL.createObjectURL(selectedFile));
                setErrors({ ...errors, panorama: "" });
            } else {
                if (preview && preview.startsWith('blob:')) {
                    URL.revokeObjectURL(preview);
                }
                setFile(selectedFile);
                setPreview(URL.createObjectURL(selectedFile));
                setErrors({ ...errors, image: "" });
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isPanorama: boolean = false) => {
        const selected = e.target.files?.[0] || null;
        handleFileSelect(selected, isPanorama);
    };

    // Drag and drop handlers for regular image
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
            handleFileSelect(droppedFile, false);
        }
    };

    // Drag and drop handlers for panorama image
    const handlePanoramaDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingPanorama(true);
    };

    const handlePanoramaDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingPanorama(false);
    };

    const handlePanoramaDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handlePanoramaDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingPanorama(false);

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            handleFileSelect(droppedFile, true);
        }
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            // First create the room
            const res = await createRoom({
                ...form,
                room_type_id: Number(form.room_type_id),
                amenities: form.amenities,
            });

            const roomId = res.data.data.id;

            // Upload regular image if exists
            if (file) {
                const fd = new FormData();
                fd.append("room_id", roomId.toString());
                fd.append("image", file);
                fd.append("image_type", "normal");

                await uploadRoomImage(fd);
            }

            // Upload 360° panorama image if exists
            if (panoramaFile) {
                const fd360 = new FormData();
                fd360.append("room_id", roomId.toString());
                fd360.append("image", panoramaFile);
                fd360.append("image_type", "360");

                await uploadRoomImage(fd360);
            }

            refresh();
            onClose();
        } catch (err: any) {
            console.error(err);

            if (err.response?.data?.errors) {
                const backendErrors = err.response.data.errors;
                const formattedErrors: Record<string, string> = {};

                Object.keys(backendErrors).forEach(key => {
                    formattedErrors[key] = backendErrors[key][0] || backendErrors[key];
                });

                setErrors(formattedErrors);
            } else {
                setErrors({
                    submit: err.response?.data?.message || "Failed to add room. Please try again."
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Add New Room</h2>
                        <p className="text-sm text-gray-500 mt-1">Fill in the details below</p>
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

                    {/* Amenities */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Amenities
                        </label>

                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                            {amenities.map((amenity) => (
                                <label
                                    key={amenity.id}
                                    className="flex items-center gap-2 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={form.amenities.includes(amenity.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setForm(prev => ({
                                                    ...prev,
                                                    amenities: [...prev.amenities, amenity.id],
                                                }));
                                            } else {
                                                setForm(prev => ({
                                                    ...prev,
                                                    amenities: prev.amenities.filter(
                                                        id => id !== amenity.id
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
                                onChange={(e) => handleFileChange(e, false)}
                            />

                            {preview ? (
                                <div className="space-y-3">
                                    <img
                                        src={preview}
                                        alt="Room preview"
                                        className="w-full h-48 object-cover rounded-lg"
                                    />
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFile(null);
                                            if (preview) URL.revokeObjectURL(preview);
                                            setPreview(null);
                                            if (fileInputRef.current) fileInputRef.current.value = '';
                                        }}
                                        className="text-sm text-red-500 hover:text-red-700"
                                    >
                                        Remove image
                                    </button>
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
                    </div>

                    {/* 360° Panorama Image with Drag & Drop */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            360° Panorama Image <span className="text-xs text-gray-400">(Optional, Max 5MB, JPEG/PNG only)</span>
                        </label>
                        <div
                            onDragEnter={handlePanoramaDragEnter}
                            onDragLeave={handlePanoramaDragLeave}
                            onDragOver={handlePanoramaDragOver}
                            onDrop={handlePanoramaDrop}
                            className={`border-2 border-dashed rounded-lg p-4 text-center transition-all cursor-pointer ${isDraggingPanorama
                                ? 'border-purple-500 bg-purple-50'
                                : errors.panorama
                                    ? 'border-red-500 bg-red-50'
                                    : 'border-gray-300 hover:border-purple-500'
                                }`}
                            onClick={() => panoramaInputRef.current?.click()}
                        >
                            <input
                                ref={panoramaInputRef}
                                type="file"
                                className="hidden"
                                accept="image/jpeg,image/png,image/jpg"
                                onChange={(e) => handleFileChange(e, true)}
                            />

                            {panoramaPreview ? (
                                <div className="space-y-3">
                                    <div className="relative">
                                        <img
                                            src={panoramaPreview}
                                            alt="360° panorama preview"
                                            className="w-full h-40 object-cover rounded-lg"
                                        />
                                        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                                            360°
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPanoramaFile(null);
                                            if (panoramaPreview) URL.revokeObjectURL(panoramaPreview);
                                            setPanoramaPreview(null);
                                            if (panoramaInputRef.current) panoramaInputRef.current.value = '';
                                        }}
                                        className="text-sm text-red-500 hover:text-red-700"
                                    >
                                        Remove 360° image
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <div className="relative inline-block">
                                        <Upload className={`w-10 h-10 mx-auto mb-2 ${isDraggingPanorama ? 'text-purple-500' : 'text-gray-400'
                                            }`} />
                                        <span className="absolute -top-1 -right-3 text-xs font-bold bg-purple-500 text-white rounded-full px-1.5 py-0.5">
                                            360
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        {isDraggingPanorama ? 'Drop your 360° image here' : 'Click to upload 360° panorama or drag and drop'}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Equirectangular panorama images recommended (2:1 aspect ratio)
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
                                    Adding...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    Add Room
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
