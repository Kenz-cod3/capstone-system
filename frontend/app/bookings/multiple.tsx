import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    ActivityIndicator,
    Alert,
    Modal,
} from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api from "@/services/api";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";

const { width } = Dimensions.get("window");

interface Room {
    id: number;
    room_number: string;
    status: string;
    room_type?: {
        id: number;
        type_name: string;
        base_price: number;
        short_stay_price?: number;
        max_occupancy?: number;
    };
}

interface SelectedRoom {
    id: number;
    room_number: string;
    room_type_name: string;
    price_per_unit: number;
    stay_type: "short_stay" | "overnight";
    check_in_date: string;
    check_out_date: string;
    nights: number;
    subtotal: number;
    hours?: number;
}

export default function MultipleBooking() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedRoomsDetails, setSelectedRoomsDetails] = useState<SelectedRoom[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [fetchingRooms, setFetchingRooms] = useState(false);

    // New room form states
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
    const [stayType, setStayType] = useState<"short_stay" | "overnight">("overnight");
    const [selectedHours, setSelectedHours] = useState(3);
    const [checkInDate, setCheckInDate] = useState(new Date());
    const [checkOutDate, setCheckOutDate] = useState(new Date(Date.now() + 86400000));
    const [showCheckInPicker, setShowCheckInPicker] = useState(false);
    const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);
    const [previewAmount, setPreviewAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [gcashReference, setGcashReference] = useState("");
    const [bankReference, setBankReference] = useState("");

    useEffect(() => {
        fetchRooms();
    }, []);

    useEffect(() => {
        // Update preview amount when selection changes
        if (selectedRoomId) {
            const room = rooms.find(r => r.id === selectedRoomId);
            if (room) {
                let amount = 0;
                if (stayType === "short_stay") {
                    amount = room.room_type?.short_stay_price || room.room_type?.base_price || 0;
                } else {
                    const nights = Math.max(1, Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));
                    amount = (room.room_type?.base_price || 0) * nights;
                }
                setPreviewAmount(amount);
            }
        } else {
            setPreviewAmount(0);
        }
    }, [selectedRoomId, stayType, checkInDate, checkOutDate, rooms]);

    const fetchRooms = async () => {
        try {
            setFetchingRooms(true);
            const res = await api.get("/rooms");
            let available = res.data.filter((room: Room) => room.status === "available");
            // Filter out already selected rooms
            available = available.filter((room: Room) => !selectedRoomsDetails.some(r => r.id === room.id));
            setRooms(available);
        } catch (error) {
            console.log("Error fetching rooms:", error);
            Alert.alert("Error", "Failed to load available rooms");
        } finally {
            setLoading(false);
            setFetchingRooms(false);
        }
    };

    const getNightsCount = (checkIn: Date, checkOut: Date) => {
        return Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
    };

    const calculateRoomSubtotal = (room: Room, stayTypeValue: "short_stay" | "overnight", checkIn: Date, checkOut: Date, hours?: number) => {
        const pricePerUnit = stayTypeValue === "short_stay"
            ? (room.room_type?.short_stay_price || room.room_type?.base_price || 0)
            : (room.room_type?.base_price || 0);

        if (stayTypeValue === "short_stay") {
            return pricePerUnit;
        } else {
            const nights = getNightsCount(checkIn, checkOut);
            return pricePerUnit * nights;
        }
    };

    const addRoom = () => {
        if (!selectedRoomId) {
            Alert.alert("Selection Required", "Please select a room");
            return;
        }

        const roomToAdd = rooms.find(r => r.id === selectedRoomId);
        if (!roomToAdd) return;

        if (selectedRoomsDetails.some(r => r.id === roomToAdd.id)) {
            Alert.alert("Duplicate", "Room already selected");
            return;
        }

        const pricePerUnit = stayType === "short_stay"
            ? (roomToAdd.room_type?.short_stay_price || roomToAdd.room_type?.base_price || 0)
            : (roomToAdd.room_type?.base_price || 0);

        const nights = stayType === "short_stay" ? 1 : getNightsCount(checkInDate, checkOutDate);
        const subtotal = calculateRoomSubtotal(roomToAdd, stayType, checkInDate, checkOutDate, selectedHours);

        setSelectedRoomsDetails(prev => [...prev, {
            id: roomToAdd.id,
            room_number: roomToAdd.room_number,
            room_type_name: roomToAdd.room_type?.type_name || "Standard",
            price_per_unit: pricePerUnit,
            stay_type: stayType,
            check_in_date: checkInDate.toISOString().split('T')[0],
            check_out_date: checkOutDate.toISOString().split('T')[0],
            nights: nights,
            subtotal: Number(subtotal),
            hours: stayType === "short_stay" ? selectedHours : undefined,
        }]);

        // Reset form
        setSelectedRoomId(null);
        setPreviewAmount(0);
        setShowAddModal(false);

        // Refresh available rooms
        fetchRooms();
    };

    const removeRoom = (roomId: number) => {
        Alert.alert(
            "Remove Room",
            "Are you sure you want to remove this room?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: () => {
                        setSelectedRoomsDetails(prev => prev.filter(r => r.id !== roomId));
                        // Refresh available rooms after removal
                        setTimeout(() => fetchRooms(), 300);
                    }
                }
            ]
        );
    };

    const calculateTotal = () => {
        return selectedRoomsDetails.reduce(
            (sum, room) => sum + Number(room.subtotal),
            0
        );
    };

    const handleBooking = () => {

        if (
            selectedRoomsDetails.length === 0
        ) {

            Alert.alert(
                "Selection Required",
                "Please add at least one room."
            );

            return;
        }

        router.push({

            pathname:
                "/bookings/payment",

            params: {

                multiple: "true",

                rooms: JSON.stringify(
                    selectedRoomsDetails
                ),
            },
        });
    };

    const formatPrice = (price: number) =>
        new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(price);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getRoomTypeIcon = (type: string) => {
        const icons: any = {
            Standard: "bed-outline",
            Deluxe: "star-outline",
            Suite: "diamond-outline",
            Family: "people-outline",
        };
        return icons[type] || "bed-outline";
    };

    const groupRoomsByType = () => {
        return rooms.reduce((acc, room) => {
            const typeName = room.room_type?.type_name || "Standard";
            if (!acc[typeName]) acc[typeName] = [];
            acc[typeName].push(room);
            return acc;
        }, {} as Record<string, Room[]>);
    };

    // Check if a room is selected
    const isRoomSelected = (roomId: number) => {
        return selectedRoomsDetails.some(r => r.id === roomId);
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-[#faf8f3]">
                <View className="w-16 h-16 rounded-full border border-[#1a4a35]/20 justify-center items-center mb-5">
                    <ActivityIndicator size="large" color="#1a4a35" />
                </View>
                <Text
                    className="text-[#1a4a35] text-base tracking-widest uppercase"
                    style={{ fontFamily: "Georgia" }}
                >
                    Loading rooms...
                </Text>
            </View>
        );
    }

    const groupedRooms = groupRoomsByType();
    const total = calculateTotal();

    return (
        <View className="flex-1 bg-[#faf8f3]">
            <LinearGradient
                colors={["#0d2e1f", "#1a4a35", "#0d2e1f"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ paddingTop: insets.top + 16, paddingBottom: 24, paddingHorizontal: 24 }}
            >
                <View className="flex-row items-center justify-between mb-6">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-10 h-10 rounded-full bg-white/10 border border-white/10 justify-center items-center"
                    >
                        <Ionicons name="arrow-back" size={20} color="#fff" />
                    </TouchableOpacity>
                    <Text className="text-white text-lg tracking-widest uppercase" style={{ fontFamily: "Georgia" }}>
                        New Booking
                    </Text>
                    <TouchableOpacity
                        onPress={() => {
                            if (selectedRoomsDetails.length > 0) {
                                Alert.alert(
                                    "Clear All",
                                    "Are you sure you want to remove all rooms?",
                                    [
                                        { text: "Cancel", style: "cancel" },
                                        {
                                            text: "Clear All",
                                            style: "destructive",
                                            onPress: () => {
                                                setSelectedRoomsDetails([]);
                                                fetchRooms();
                                            }
                                        }
                                    ]
                                );
                            }
                        }}
                        className="px-3 py-2"
                    >
                        <Text className="text-[#c9a96e] text-xs tracking-wider">Clear All</Text>
                    </TouchableOpacity>
                </View>

                <Text className="text-[#c9a96e] text-xs tracking-[4px] uppercase mb-2">Multiple Rooms</Text>
                <Text className="text-white text-3xl leading-tight" style={{ fontFamily: "Georgia" }}>
                    Reserve your stay
                </Text>
                <Text className="text-white/40 text-sm tracking-wide mt-1" style={{ fontFamily: "Georgia", fontStyle: "italic" }}>
                    Add rooms one by one with their own stay type
                </Text>
            </LinearGradient>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
            >
                {/* Add Room Button */}
                <View className="px-6 pt-6">
                    <TouchableOpacity
                        onPress={() => setShowAddModal(true)}
                        className="bg-[#1a4a35] py-4 rounded-2xl flex-row items-center justify-center gap-3"
                    >
                        <Ionicons name="add-circle-outline" size={24} color="#c9a96e" />
                        <Text className="text-white text-base tracking-wider" style={{ fontFamily: "Georgia" }}>
                            Add Room
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Selected Rooms Section */}
                <View className="px-6 mt-8">
                    <View className="flex-row items-center justify-between mb-4">
                        <View className="flex-row items-center gap-2">
                            <View className="w-1 h-6 bg-[#c9a96e] rounded-full" />
                            <Text className="text-[#1a4a35] text-base" style={{ fontFamily: "Georgia" }}>
                                Selected Rooms ({selectedRoomsDetails.length})
                            </Text>
                        </View>
                    </View>

                    {selectedRoomsDetails.length === 0 ? (
                        <View className="items-center py-12 bg-white rounded-2xl border border-[#1a4a35]/10">
                            <Ionicons name="bed-outline" size={48} color="#1a4a35/20" />
                            <Text className="text-[#1a4a35]/40 mt-3 text-sm">No rooms added yet</Text>
                            <Text className="text-[#1a4a35]/30 text-xs mt-1">Tap "Add Room" to start</Text>
                        </View>
                    ) : (
                        selectedRoomsDetails.map((room) => (
                            <View
                                key={room.id}
                                className="mb-4 rounded-2xl overflow-hidden border border-[#1a4a35]/10 bg-white"
                            >
                                <LinearGradient
                                    colors={["#ffffff", "#faf8f3"]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={{ padding: 16 }}
                                >
                                    <View className="flex-row justify-between items-start">
                                        <View className="flex-row items-center gap-3 flex-1">
                                            <View className="w-10 h-10 rounded-full bg-[#1a4a35]/10 justify-center items-center">
                                                <Ionicons
                                                    name={getRoomTypeIcon(room.room_type_name)}
                                                    size={20}
                                                    color="#1a4a35"
                                                />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-[#1a4a35] text-lg font-bold" style={{ fontFamily: "Georgia" }}>
                                                    Room {room.room_number}
                                                </Text>
                                                <Text className="text-[#1a4a35]/50 text-xs">
                                                    {room.room_type_name}
                                                </Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity onPress={() => removeRoom(room.id)} className="p-2">
                                            <Ionicons name="trash-outline" size={20} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>

                                    <View className="mt-3 pt-3 border-t border-[#1a4a35]/10">
                                        <View className="flex-row justify-between mb-2">
                                            <Text className="text-[#1a4a35]/60 text-xs">Stay Type</Text>
                                            <View className={`px-2 py-1 rounded-full ${room.stay_type === "short_stay" ? "bg-orange-100" : "bg-blue-100"}`}>
                                                <Text className={`text-xs ${room.stay_type === "short_stay" ? "text-orange-600" : "text-blue-600"}`}>
                                                    {room.stay_type === "short_stay" ? `Short Stay (${room.hours || 3} hrs)` : `Overnight (${room.nights} night${room.nights > 1 ? 's' : ''})`}
                                                </Text>
                                            </View>
                                        </View>
                                        <View className="flex-row justify-between mb-2">
                                            <Text className="text-[#1a4a35]/60 text-xs">Dates</Text>
                                            <Text className="text-[#1a4a35] text-xs">
                                                {formatDate(room.check_in_date)} → {formatDate(room.check_out_date)}
                                            </Text>
                                        </View>
                                        <View className="flex-row justify-between">
                                            <Text className="text-[#1a4a35]/60 text-xs">Rate</Text>
                                            <Text className="text-[#1a4a35] text-xs">
                                                {formatPrice(room.price_per_unit)}{room.stay_type === "overnight" && "/night"}
                                            </Text>
                                        </View>
                                        <View className="flex-row justify-between mt-2 pt-2 border-t border-[#1a4a35]/10">
                                            <Text className="text-[#1a4a35] font-bold">Subtotal</Text>
                                            <Text className="text-[#c9a96e] font-bold">{formatPrice(room.subtotal)}</Text>
                                        </View>
                                    </View>
                                </LinearGradient>
                            </View>
                        ))
                    )}
                </View>

                {/* Booking Summary */}
                {selectedRoomsDetails.length > 0 && (
                    <View className="mx-6 mt-6 p-5 rounded-2xl bg-white shadow-lg border border-[#1a4a35]/10">
                        <Text className="text-[#1a4a35] text-sm uppercase tracking-wider mb-3" style={{ fontFamily: "Georgia" }}>
                            Booking Summary
                        </Text>
                        <View className="gap-2">
                            <View className="flex-row justify-between">
                                <Text className="text-[#1a4a35]/60">Total Rooms</Text>
                                <Text className="text-[#1a4a35] font-medium">{selectedRoomsDetails.length} room(s)</Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-[#1a4a35]/60">Short Stays</Text>
                                <Text className="text-[#1a4a35] font-medium">
                                    {selectedRoomsDetails.filter(r => r.stay_type === "short_stay").length}
                                </Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-[#1a4a35]/60">Overnight Stays</Text>
                                <Text className="text-[#1a4a35] font-medium">
                                    {selectedRoomsDetails.filter(r => r.stay_type === "overnight").length}
                                </Text>
                            </View>
                            <View className="h-px bg-[#1a4a35]/10 my-2" />
                            <View className="flex-row justify-between">
                                <Text className="text-[#1a4a35] font-bold">Total Amount</Text>
                                <Text className="text-[#c9a96e] text-xl font-bold" style={{ fontFamily: "Georgia" }}>
                                    {formatPrice(total)}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Submit Button */}
                <View className="px-6 mt-8 mb-4">
                    <LinearGradient
                        colors={selectedRoomsDetails.length > 0 ? ["#1a4a35", "#0d2e1f"] : ["#6b8c7a", "#4a6b5a"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ borderRadius: 16, overflow: "hidden" }}
                    >
                        <TouchableOpacity
                            onPress={handleBooking}
                            disabled={selectedRoomsDetails.length === 0 || submitting}
                            className="py-4 flex-row items-center justify-center gap-3"
                        >
                            {submitting ? (
                                <ActivityIndicator size="small" color="#c9a96e" />
                            ) : (
                                <>
                                    <Text className="text-white text-base tracking-widest uppercase" style={{ fontFamily: "Georgia" }}>
                                        Confirm Booking
                                    </Text>
                                    <Ionicons name="arrow-forward" size={18} color="#c9a96e" />
                                </>
                            )}
                        </TouchableOpacity>
                    </LinearGradient>
                </View>
            </ScrollView>

            {/* Add Room Modal */}
            <Modal
                visible={showAddModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowAddModal(false)}
            >
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-[#faf8f3] rounded-t-3xl" style={{ paddingBottom: insets.bottom }}>
                        <View className="px-6 pt-6 pb-4 border-b border-[#1a4a35]/10">
                            <View className="flex-row justify-between items-center">
                                <Text className="text-[#1a4a35] text-xl font-bold" style={{ fontFamily: "Georgia" }}>
                                    Add Room
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setShowAddModal(false)}
                                    className="w-8 h-8 rounded-full bg-[#1a4a35]/10 justify-center items-center"
                                >
                                    <Ionicons name="close" size={20} color="#1a4a35" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <ScrollView className="p-6" showsVerticalScrollIndicator={false}>
                            {/* Room Selection */}
                            <View className="mb-6">
                                <Text className="text-[#1a4a35] font-medium mb-2">Select Room</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
                                    {Object.entries(groupedRooms).map(([typeName, typeRooms]) => (
                                        <View key={typeName}>
                                            {typeRooms.map((room) => (
                                                <TouchableOpacity
                                                    key={room.id}
                                                    onPress={() => setSelectedRoomId(room.id)}
                                                    className={`mb-3 p-4 rounded-2xl border ${selectedRoomId === room.id ? "border-[#c9a96e] bg-[#c9a96e]/10" : "border-[#1a4a35]/10 bg-white"
                                                        }`}
                                                    style={{ minWidth: width - 48 }}
                                                >
                                                    <View className="flex-row justify-between items-center">
                                                        <View>
                                                            <Text className="text-[#1a4a35] font-bold text-lg">Room {room.room_number}</Text>
                                                            <Text className="text-[#1a4a35]/50 text-xs">{typeName}</Text>
                                                        </View>
                                                        <View className="items-end">
                                                            <Text className="text-[#c9a96e] font-bold">
                                                                {formatPrice(room.room_type?.base_price || 0)}/night
                                                            </Text>
                                                            {room.room_type?.short_stay_price && (
                                                                <Text className="text-[#1a4a35]/40 text-xs">
                                                                    or {formatPrice(room.room_type.short_stay_price)} short stay
                                                                </Text>
                                                            )}
                                                        </View>
                                                    </View>
                                                    {isRoomSelected(room.id) && (
                                                        <View className="absolute top-2 right-2">
                                                            <Ionicons name="checkmark-circle" size={24} color="#c9a96e" />
                                                        </View>
                                                    )}
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    ))}
                                </ScrollView>
                                {fetchingRooms && <ActivityIndicator size="small" color="#1a4a35" className="mt-4" />}
                                {rooms.length === 0 && !fetchingRooms && (
                                    <Text className="text-[#1a4a35]/40 text-center py-8">No available rooms</Text>
                                )}
                            </View>

                            {/* Stay Type */}
                            <View className="mb-6">
                                <Text className="text-[#1a4a35] font-medium mb-2">Stay Type</Text>
                                <View className="flex-row gap-3">
                                    <TouchableOpacity
                                        onPress={() => {
                                            setStayType("overnight");
                                            setCheckOutDate(new Date(checkInDate.getTime() + 86400000));
                                        }}
                                        className={`flex-1 py-3 rounded-xl ${stayType === "overnight" ? "bg-[#1a4a35]" : "bg-[#1a4a35]/08"}`}
                                    >
                                        <Text className={`text-center ${stayType === "overnight" ? "text-white" : "text-[#1a4a35]"}`}>
                                            Overnight
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setStayType("short_stay");
                                            setCheckOutDate(checkInDate);
                                        }}
                                        className={`flex-1 py-3 rounded-xl ${stayType === "short_stay" ? "bg-[#1a4a35]" : "bg-[#1a4a35]/08"}`}
                                    >
                                        <Text className={`text-center ${stayType === "short_stay" ? "text-white" : "text-[#1a4a35]"}`}>
                                            Short Stay
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Hours Selector (Short Stay Only) */}
                            {stayType === "short_stay" && (
                                <View className="mb-6">
                                    <Text className="text-[#1a4a35] font-medium mb-2">Duration (Hours)</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
                                        {[3, 6, 9, 12, 18, 24].map((hours) => (
                                            <TouchableOpacity
                                                key={hours}
                                                onPress={() => setSelectedHours(hours)}
                                                className={`px-6 py-3 rounded-2xl ${selectedHours === hours ? "bg-[#1a4a35]" : "bg-[#1a4a35]/08"}`}
                                            >
                                                <Text
                                                    className={`text-center ${selectedHours === hours ? "text-white" : "text-[#1a4a35]"} text-sm`}
                                                    style={{ fontFamily: "Georgia" }}
                                                >
                                                    {hours} {hours === 1 ? "Hour" : "Hours"}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            {/* Check-in Date */}
                            <View className="mb-6">
                                <Text className="text-[#1a4a35] font-medium mb-2">Check-in Date</Text>
                                <TouchableOpacity
                                    onPress={() => setShowCheckInPicker(true)}
                                    className="p-4 rounded-xl bg-white border border-[#1a4a35]/10 flex-row justify-between items-center"
                                >
                                    <Text className="text-[#1a4a35]">
                                        {checkInDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </Text>
                                    <Ionicons name="calendar-outline" size={20} color="#c9a96e" />
                                </TouchableOpacity>
                                {showCheckInPicker && (
                                    <DateTimePicker
                                        value={checkInDate}
                                        mode="date"
                                        display="default"
                                        onChange={(event, selectedDate) => {
                                            setShowCheckInPicker(false);
                                            if (selectedDate) {
                                                setCheckInDate(selectedDate);
                                                if (stayType === "overnight") {
                                                    setCheckOutDate(new Date(selectedDate.getTime() + 86400000));
                                                } else {
                                                    setCheckOutDate(selectedDate);
                                                }
                                            }
                                        }}
                                        minimumDate={new Date()}
                                    />
                                )}
                            </View>

                            {/* Check-out Date (Overnight only) */}
                            {stayType === "overnight" && (
                                <View className="mb-6">
                                    <Text className="text-[#1a4a35] font-medium mb-2">Check-out Date</Text>
                                    <TouchableOpacity
                                        onPress={() => setShowCheckOutPicker(true)}
                                        className="p-4 rounded-xl bg-white border border-[#1a4a35]/10 flex-row justify-between items-center"
                                    >
                                        <Text className="text-[#1a4a35]">
                                            {checkOutDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </Text>
                                        <Ionicons name="calendar-outline" size={20} color="#c9a96e" />
                                    </TouchableOpacity>
                                    {showCheckOutPicker && (
                                        <DateTimePicker
                                            value={checkOutDate}
                                            mode="date"
                                            display="default"
                                            onChange={(event, selectedDate) => {
                                                setShowCheckOutPicker(false);
                                                if (selectedDate && selectedDate > checkInDate) {
                                                    setCheckOutDate(selectedDate);
                                                }
                                            }}
                                            minimumDate={new Date(checkInDate.getTime() + 86400000)}
                                        />
                                    )}
                                </View>
                            )}

                            {/* Preview Amount */}
                            {selectedRoomId && previewAmount > 0 && (
                                <View className="mb-6 p-4 rounded-xl bg-[#c9a96e]/10 border border-[#c9a96e]/20">
                                    <View className="flex-row justify-between items-center">
                                        <Text className="text-[#1a4a35] font-medium">
                                            {stayType === "short_stay" ? "Short Stay Amount:" : `Total for ${getNightsCount(checkInDate, checkOutDate)} night(s):`}
                                        </Text>
                                        <Text className="text-[#c9a96e] text-2xl font-bold" style={{ fontFamily: "Georgia" }}>
                                            {formatPrice(previewAmount)}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {/* Add Button */}
                            <TouchableOpacity
                                onPress={addRoom}
                                disabled={!selectedRoomId}
                                className={`py-4 rounded-2xl mb-4 ${!selectedRoomId ? "bg-[#1a4a35]/50" : "bg-[#1a4a35]"}`}
                            >
                                <Text className="text-white text-center font-bold text-base">Add Room</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}