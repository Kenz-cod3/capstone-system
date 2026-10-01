import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  useWindowDimensions,
  Alert,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";

import api from "@/services/api";

// =========================================================
// TYPES
// =========================================================

type BookingType = "overnight" | "short";

interface BookingRange {
  check_in_date: string;
  check_out_date: string;
}

interface SelectedBookingRoom {
  id: number;
  room_type_id?: number;
  room_number: string;
  room_type_name: string;

  base_price: number;
  short_stay_price: number;

  stay_type: BookingType;

  check_in_date: string;
  check_out_date: string;

  expected_check_in_time: string;
  expected_check_out_time: string;

  nights: number;

  subtotal: number;
}

interface RoomType {
  id?: number;
  type_name?: string;
  base_price?: number;
  short_stay_price?: number;
}

interface Room {
  id: number;
  room_type_id?: number;
  room_number: string;
  status?: string;
  room_type?: RoomType;
  image_url?: string | null;
}

// =========================================================
// MODULE-LEVEL CACHE
// =========================================================

const bookedDatesCache: Map<number, BookingRange[]> = new Map();

// =========================================================
// COMPONENT
// =========================================================

export default function CreateBooking() {
  const { room } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  // =======================================================
  // RESPONSIVE HELPERS
  // =======================================================

  const isSmallDevice = width < 375;
  const isMediumDevice = width >= 375 && width < 414;

  const heroHeight = Math.min(480, height * 0.6);

  const titleFontSize = isSmallDevice ? 32 : isMediumDevice ? 40 : 48;

  const horizontalPadding = isSmallDevice ? 16 : 24;

  // =======================================================
  // PARSED ROOM
  // =======================================================

  const parsedRoom: Room | null = useMemo(() => {
    try {
      if (!room) return null;

      return JSON.parse(room as string);
    } catch (error) {
      console.log("Failed to parse room:", error);
      return null;
    }
  }, [room]);

  // =======================================================
  // BASIC HELPERS
  // =======================================================

  const getToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  const getTomorrow = () => {
    const tomorrow = getToday();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  };

  // =======================================================
  // BASIC STATES
  // =======================================================

  const [checkInDate, setCheckInDate] = useState<Date | null>(getToday());
  const [checkOutDate, setCheckOutDate] = useState<Date | null>(getTomorrow());
  const [bookingType, setBookingType] = useState<BookingType>("overnight");
  const [expectedCheckInTime, setExpectedCheckInTime] = useState("2:00 PM");
  const [expectedCheckOutTime, setExpectedCheckOutTime] = useState("11:00 AM");

  const [availableCheckInTimes, setAvailableCheckInTimes] = useState<string[]>(
    [],
  );
  const [availableCheckOutTimes, setAvailableCheckOutTimes] = useState<
    string[]
  >([]);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // =======================================================
  // MAIN ROOM CALENDAR
  // =======================================================

  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showCheckOut, setShowCheckOut] = useState(false);

  const [bookedRanges, setBookedRanges] = useState<BookingRange[]>(() => {
    if (parsedRoom?.id && bookedDatesCache.has(parsedRoom.id)) {
      return bookedDatesCache.get(parsedRoom.id) ?? [];
    }
    return [];
  });

  const [loadingBookedDates, setLoadingBookedDates] = useState(false);
  const bookedDatesRequestRef = useRef(0);

  // =======================================================
  // SUGGESTED AVAILABLE DATE RANGES
  // =======================================================

  interface SuggestedDateRange {
    checkIn: Date;
    checkOut: Date;
    nights: number;
  }

  const [suggestedDates, setSuggestedDates] = useState<SuggestedDateRange[]>(
    [],
  );

  // =======================================================
  // MULTIPLE ROOM STATES
  // =======================================================

  const [selectedRooms, setSelectedRooms] = useState<SelectedBookingRoom[]>([]);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [addingRoom, setAddingRoom] = useState(false);

  // =======================================================
  // DRAFT ROOM
  // =======================================================

  const [draftRoom, setDraftRoom] = useState<Room | null>(null);
  const [draftCheckInDate, setDraftCheckInDate] = useState<Date | null>(null);
  const [draftCheckOutDate, setDraftCheckOutDate] = useState<Date | null>(null);
  const [draftBookingType, setDraftBookingType] =
    useState<BookingType>("overnight");
  const [draftBookedRanges, setDraftBookedRanges] = useState<BookingRange[]>(
    [],
  );

  // =======================================================
  // DRAFT — EXPECTED STAY TIME
  // =======================================================

  const [draftExpectedCheckInTime, setDraftExpectedCheckInTime] =
    useState("2:00 PM");
  const [draftExpectedCheckOutTime, setDraftExpectedCheckOutTime] =
    useState("6:00 PM");
  const [showDraftTimePicker, setShowDraftTimePicker] = useState(false);
  const [draftPickerHour, setDraftPickerHour] = useState("2");
  const [draftPickerMinute, setDraftPickerMinute] = useState("00");
  const [draftPickerPeriod, setDraftPickerPeriod] = useState<"AM" | "PM">("PM");
  const [draftLoadingDates, setDraftLoadingDates] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [showDraftCheckIn, setShowDraftCheckIn] = useState(false);
  const [showDraftCheckOut, setShowDraftCheckOut] = useState(false);

  // =======================================================
  // INITIAL LOAD
  // =======================================================

  useEffect(() => {
    if (!parsedRoom?.id) return;
    fetchBookedDates();
  }, [parsedRoom?.id]);

  // =======================================================
  // REFRESH — ONLY REFRESHES ROOM LIST
  // =======================================================

  const handleRefresh = async () => {
    if (refreshing || !parsedRoom) return;
    try {
      setRefreshing(true);
      await fetchAvailableRooms();
    } catch (error) {
      console.log("Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // =======================================================
  // NO ROOM
  // =======================================================

  if (!parsedRoom) {
    return (
      <View className="flex-1 justify-center items-center bg-[#faf8f3]">
        <Text className="text-[#1a4a35]/50" style={{ fontFamily: "Georgia" }}>
          No room selected
        </Text>
      </View>
    );
  }

  // =======================================================
  // DATE HELPERS
  // =======================================================

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (date: Date | null) => {
    if (!date) return null;
    return date.toLocaleDateString("en-PH", {
      weekday: "short",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatShortDate = (date: Date | null) => {
    if (!date) return "";
    return date.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const parseDate = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const dateToNumber = (date: Date) => {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    ).getTime();
  };

  // =======================================================
  // SHORT STAY — ADD 4 HOURS
  // =======================================================

  const addHoursToTime = (time: string, hours: number) => {
    const [timePart, period] = time.split(" ");
    let [hour, minute] = timePart.split(":").map(Number);

    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;

    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    date.setHours(date.getHours() + hours);

    let newHour = date.getHours();
    const newMinute = String(date.getMinutes()).padStart(2, "0");
    const newPeriod = newHour >= 12 ? "PM" : "AM";

    if (newHour === 0) newHour = 12;
    else if (newHour > 12) newHour -= 12;

    return `${newHour}:${newMinute} ${newPeriod}`;
  };

  // =======================================================
  // EDIT ROOM — SHORT STAY TIME PICKER
  // =======================================================

  const openDraftTimePicker = () => {
    const currentTime = draftExpectedCheckInTime.trim();
    const match = currentTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

    if (match) {
      setDraftPickerHour(match[1]);
      setDraftPickerMinute(match[2]);
      setDraftPickerPeriod(match[3].toUpperCase() as "AM" | "PM");
    } else {
      setDraftPickerHour("2");
      setDraftPickerMinute("00");
      setDraftPickerPeriod("PM");
    }

    setShowDraftTimePicker(true);
  };

  const applyDraftTimePicker = () => {
    const hour = Number(draftPickerHour);
    const minute = Number(draftPickerMinute);

    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
      Alert.alert("Invalid Time", "Please select a valid time.");
      return;
    }

    const formattedTime = `${hour}:${String(minute).padStart(2, "0")} ${draftPickerPeriod}`;
    setDraftExpectedCheckInTime(formattedTime);
    setDraftExpectedCheckOutTime(addHoursToTime(formattedTime, 4));
    setShowDraftTimePicker(false);
  };

  const changeDraftPickerHour = (direction: "up" | "down") => {
    setDraftPickerHour((current) => {
      let hour = Number(current);
      if (direction === "up") {
        hour += 1;
        if (hour > 12) hour = 1;
      } else {
        hour -= 1;
        if (hour < 1) hour = 12;
      }
      return String(hour);
    });
  };

  const changeDraftPickerMinute = (direction: "up" | "down") => {
    setDraftPickerMinute((current) => {
      let minute = Number(current);
      if (direction === "up") {
        minute += 1;
        if (minute > 59) minute = 0;
      } else {
        minute -= 1;
        if (minute < 0) minute = 59;
      }
      return String(minute).padStart(2, "0");
    });
  };

  const toggleDraftPickerPeriod = (period: "AM" | "PM") => {
    setDraftPickerPeriod(period);
  };

  const isValidExpectedCheckInTime = (time: string) => {
    const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return false;

    const hour = Number(match[1]);
    const minute = Number(match[2]);
    return hour >= 1 && hour <= 12 && minute >= 0 && minute <= 59;
  };

  // =======================================================
  // NIGHT CALCULATION
  // =======================================================

  const calculateNights = (start: Date | null, end: Date | null) => {
    if (!start || !end || end <= start) return 0;
    return Math.round(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
  };

  const getNights = () => calculateNights(checkInDate, checkOutDate);

  // =======================================================
  // PRICE HELPERS
  // =======================================================

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(price);

  const basePrice = Number(parsedRoom.room_type?.base_price || 0);
  const shortStayPrice = Number(parsedRoom.room_type?.short_stay_price || 0);
  const nights = getNights();
  const overnightTotal = nights * basePrice;
  const shortTotal = shortStayPrice;
  const total = bookingType === "overnight" ? overnightTotal : shortTotal;

  // =======================================================
  // FIND SUGGESTED AVAILABLE DATES
  // =======================================================

  const findSuggestedDates = (
    ranges: BookingRange[],
    numberOfSuggestions = 3,
  ): SuggestedDateRange[] => {
    const isBooked = (date: Date) => {
      const target = dateToNumber(date);
      return ranges.some((range) => {
        const start = dateToNumber(parseDate(range.check_in_date));
        const end = dateToNumber(parseDate(range.check_out_date));
        return target >= start && target < end;
      });
    };

    const suggestions: SuggestedDateRange[] = [];
    let current = getToday();

    for (let i = 0; i < 365 && suggestions.length < numberOfSuggestions; i++) {
      if (isBooked(current)) {
        current = new Date(current);
        current.setDate(current.getDate() + 1);
        continue;
      }

      let nextBookedDate: Date | null = null;
      for (let j = 1; j <= 365; j++) {
        const testDate = new Date(current);
        testDate.setDate(testDate.getDate() + j);
        if (isBooked(testDate)) {
          nextBookedDate = testDate;
          break;
        }
      }

      if (!nextBookedDate) {
        const checkOut = new Date(current);
        checkOut.setDate(checkOut.getDate() + 3);
        suggestions.push({ checkIn: new Date(current), checkOut, nights: 3 });
        current = new Date(checkOut);
        current.setDate(current.getDate() + 1);
        continue;
      }

      const availableNights = Math.round(
        (dateToNumber(nextBookedDate) - dateToNumber(current)) /
          (1000 * 60 * 60 * 24),
      );

      if (availableNights >= 1) {
        const nights = Math.min(3, availableNights);
        const checkOut = new Date(current);
        checkOut.setDate(checkOut.getDate() + nights);
        suggestions.push({ checkIn: new Date(current), checkOut, nights });
        current = new Date(checkOut);
        current.setDate(current.getDate() + 1);
        continue;
      }

      current = new Date(current);
      current.setDate(current.getDate() + 1);
    }

    return suggestions;
  };

  const findAutomaticDates = (ranges: BookingRange[]) => {
    const suggestions = findSuggestedDates(ranges, 1);
    if (suggestions.length > 0) {
      return {
        checkIn: suggestions[0].checkIn,
        checkOut: suggestions[0].checkOut,
      };
    }
    return { checkIn: getToday(), checkOut: getTomorrow() };
  };

  // =======================================================
  // FETCH BOOKED DATES
  // =======================================================

  async function fetchBookedDates() {
    if (!parsedRoom?.id) return;

    const roomId = parsedRoom.id;
    const requestId = ++bookedDatesRequestRef.current;
    const hasCache = bookedDatesCache.has(roomId);

    try {
      if (!hasCache) setLoadingBookedDates(true);

      const response = await api.get(`/rooms/${roomId}/booked-dates`);

      if (requestId !== bookedDatesRequestRef.current) return;

      const data = response.data?.data ?? response.data ?? [];
      if (!Array.isArray(data)) {
        console.log("Invalid booked dates response:", data);
        return;
      }

      const ranges: BookingRange[] = data;
      bookedDatesCache.set(roomId, ranges);
      setBookedRanges(ranges);

      const suggestions = findSuggestedDates(ranges, 3);
      setSuggestedDates(suggestions);

      // AUTO-PICK FIRST AVAILABLE RANGE
      if (suggestions.length > 0) {
        setCheckInDate(suggestions[0].checkIn);

        if (bookingType === "overnight") {
          setCheckOutDate(suggestions[0].checkOut);
        } else {
          setCheckOutDate(null);
        }
      } else {
        const automatic = findAutomaticDates(ranges);
        setCheckInDate(automatic.checkIn);
        setCheckOutDate(
          bookingType === "overnight" ? automatic.checkOut : null,
        );
      }
    } catch (error: any) {
      if (requestId !== bookedDatesRequestRef.current) return;
      console.log(
        "Failed to fetch booked dates:",
        error?.response?.data || error,
      );
    } finally {
      if (requestId === bookedDatesRequestRef.current)
        setLoadingBookedDates(false);
    }
  }

  // =======================================================
  // MAIN ROOM DATE AVAILABILITY
  // =======================================================

  const isDateBooked = (date: Date) => {
    const target = dateToNumber(date);
    return bookedRanges.some((range) => {
      const checkIn = dateToNumber(parseDate(range.check_in_date));
      const checkOut = dateToNumber(parseDate(range.check_out_date));
      return target >= checkIn && target < checkOut;
    });
  };

  const hasDateRangeConflict = (startDate: Date, endDate: Date) => {
    const selectedStart = dateToNumber(startDate);
    const selectedEnd = dateToNumber(endDate);
    return bookedRanges.some((range) => {
      const bookedStart = dateToNumber(parseDate(range.check_in_date));
      const bookedEnd = dateToNumber(parseDate(range.check_out_date));
      return selectedStart < bookedEnd && selectedEnd > bookedStart;
    });
  };

  // =======================================================
  // MAIN ROOM MARKED DATES
  // =======================================================

  const bookedMarkedDates = useMemo(() => {
    const marked: Record<string, any> = {};
    bookedRanges.forEach((range) => {
      const start = parseDate(range.check_in_date);
      const end = parseDate(range.check_out_date);
      const current = new Date(start);

      while (current < end) {
        const key = formatDate(current);
        if (key) {
          marked[key] = {
            disabled: true,
            disableTouchEvent: true,
            customStyles: {
              container: {
                backgroundColor: "#FDE2E2",
                borderWidth: 1,
                borderColor: "#B91C1C",
                borderRadius: 20,
              },
              text: { color: "#B91C1C", fontWeight: "600" },
            },
          };
        }
        current.setDate(current.getDate() + 1);
      }
    });
    return marked;
  }, [bookedRanges]);

  const checkInMarkedDates = useMemo(() => {
    const marked = { ...bookedMarkedDates };
    if (checkInDate) {
      const key = formatDate(checkInDate);
      if (key && !isDateBooked(checkInDate)) {
        marked[key] = {
          ...(marked[key] || {}),
          disabled: false,
          disableTouchEvent: false,
          customStyles: {
            container: {
              backgroundColor: "#DDEFE7",
              borderWidth: 1,
              borderColor: "#1A4A35",
              borderRadius: 20,
            },
            text: { color: "#1A4A35", fontWeight: "600" },
          },
        };
      }
    }
    return marked;
  }, [bookedMarkedDates, checkInDate]);

  const checkOutMarkedDates = useMemo(() => {
    const marked = { ...bookedMarkedDates };
    if (checkOutDate) {
      const key = formatDate(checkOutDate);
      if (key) {
        marked[key] = {
          ...(marked[key] || {}),
          disabled: false,
          disableTouchEvent: false,
          customStyles: {
            container: {
              backgroundColor: "#F5EBD2",
              borderWidth: 1,
              borderColor: "#A8863A",
              borderRadius: 20,
            },
            text: { color: "#8A6D2F", fontWeight: "600" },
          },
        };
      }
    }
    if (checkInDate) {
      const key = formatDate(checkInDate);
      if (key) {
        marked[key] = {
          ...(marked[key] || {}),
          disabled: false,
          disableTouchEvent: false,
          customStyles: {
            container: {
              backgroundColor: "#DDEFE7",
              borderWidth: 1,
              borderColor: "#1A4A35",
              borderRadius: 20,
            },
            text: { color: "#1A4A35", fontWeight: "600" },
          },
        };
      }
    }
    return marked;
  }, [bookedMarkedDates, checkInDate, checkOutDate]);

  // =======================================================
  // CREATE SELECTED ROOM
  // =======================================================

  const createSelectedRoom = (
    selectedRoom: Room,
    selectedBookingType: BookingType,
    selectedCheckIn: Date,
    selectedCheckOut: Date | null,
    selectedExpectedCheckInTime: string = "2:00 PM",
    selectedExpectedCheckOutTime: string = "11:00 AM",
  ): SelectedBookingRoom => {
    const roomBasePrice = Number(selectedRoom.room_type?.base_price || 0);
    const roomShortPrice = Number(
      selectedRoom.room_type?.short_stay_price || 0,
    );
    const roomNights =
      selectedBookingType === "overnight"
        ? calculateNights(selectedCheckIn, selectedCheckOut)
        : 1;
    const roomSubtotal =
      selectedBookingType === "overnight"
        ? roomNights * roomBasePrice
        : roomShortPrice;

    return {
      id: Number(selectedRoom.id),
      room_type_id: selectedRoom.room_type_id ?? selectedRoom.room_type?.id,
      room_number: String(selectedRoom.room_number),
      room_type_name: selectedRoom.room_type?.type_name || "Standard",
      base_price: roomBasePrice,
      short_stay_price: roomShortPrice,
      stay_type: selectedBookingType,
      check_in_date: formatDate(selectedCheckIn),
      check_out_date: formatDate(
        selectedBookingType === "short" ? selectedCheckIn : selectedCheckOut,
      ),
      expected_check_in_time: selectedExpectedCheckInTime,
      expected_check_out_time: selectedExpectedCheckOutTime,
      nights: roomNights,
      subtotal: Number(roomSubtotal),
    };
  };

  // =======================================================
  // FETCH ALL ROOMS FOR ROOM SELECTION
  // =======================================================

  const fetchAvailableRooms = async () => {
    try {
      setLoadingRooms(true);
      const response = await api.get("/rooms");
      const payload = response.data;
      let rooms: Room[] = [];

      if (Array.isArray(payload?.data?.data)) rooms = payload.data.data;
      else if (Array.isArray(payload?.data)) rooms = payload.data;
      else if (Array.isArray(payload?.rooms)) rooms = payload.rooms;
      else if (Array.isArray(payload)) rooms = payload;

      setAvailableRooms(rooms);
    } catch (error: any) {
      console.log("Failed to load rooms:", error?.response?.data || error);
      setAvailableRooms([]);
      Alert.alert("Error", "Failed to load rooms.");
    } finally {
      setLoadingRooms(false);
    }
  };

  // =======================================================
  // AUTO-PICK AVAILABLE DATES (MANUAL ACTION)
  // =======================================================

  const handleAutoPickAvailableDates = () => {
    if (loadingBookedDates) return;

    if (suggestedDates.length === 0) {
      Alert.alert(
        "No Available Dates",
        "There are no available dates for this room in the next year.",
      );
      return;
    }

    const currentIndex = suggestedDates.findIndex(
      (s) =>
        checkInDate &&
        dateToNumber(s.checkIn) === dateToNumber(checkInDate),
    );

    const nextIndex =
      currentIndex === -1 || currentIndex === suggestedDates.length - 1
        ? 0
        : currentIndex + 1;

    const chosen = suggestedDates[nextIndex];

    setCheckInDate(chosen.checkIn);

    if (bookingType === "overnight") {
      setCheckOutDate(chosen.checkOut);
    } else {
      setCheckOutDate(null);
    }
  };

  // =======================================================
  // OPEN ADD ROOM MODAL
  // =======================================================

  const handleAddAnotherRoom = async () => {
    if (!checkInDate) {
      Alert.alert("Date Required", "Please select a check-in date first.");
      return;
    }

    if (bookingType === "overnight" && !checkOutDate) {
      Alert.alert("Date Required", "Please select a check-out date first.");
      return;
    }

    if (
      bookingType === "overnight" &&
      checkOutDate &&
      checkOutDate <= checkInDate
    ) {
      Alert.alert("Invalid Dates", "Check-out must be after check-in.");
      return;
    }

    if (
      bookingType === "overnight" &&
      hasDateRangeConflict(checkInDate, checkOutDate!)
    ) {
      Alert.alert(
        "Room Unavailable",
        `Room ${parsedRoom.room_number} is already booked for the selected dates.`,
      );
      await fetchBookedDates();
      return;
    }

    if (bookingType === "short" && isDateBooked(checkInDate)) {
      Alert.alert(
        "Room Unavailable",
        `Room ${parsedRoom.room_number} is already booked on this date.`,
      );
      await fetchBookedDates();
      return;
    }

    setSelectedRooms((previous) => {
      const alreadyExists = previous.some((item) => item.id === parsedRoom.id);
      if (alreadyExists) return previous;

      const currentRoom = createSelectedRoom(
        parsedRoom,
        bookingType,
        checkInDate,
        checkOutDate,
        bookingType === "short" ? expectedCheckInTime : "2:00 PM",
        bookingType === "short" ? expectedCheckOutTime : "11:00 AM",
      );
      return [...previous, currentRoom];
    });

    await fetchAvailableRooms();
    setDraftRoom(null);
    setEditingRoomId(null);
    setShowAddRoomModal(true);
  };

  // =======================================================
  // OPEN ROOM CONFIGURATION
  // =======================================================

  const openRoomConfiguration = async (
    roomToConfigure: Room,
    keepEditingRoom = false,
  ) => {
    try {
      setAddingRoom(true);

      if (!keepEditingRoom) setEditingRoomId(null);

      setDraftRoom(roomToConfigure);
      setDraftBookingType("overnight");
      setDraftExpectedCheckInTime("2:00 PM");
      setDraftExpectedCheckOutTime("11:00 AM");
      setDraftLoadingDates(true);

      const response = await api.get(
        `/rooms/${roomToConfigure.id}/booked-dates`,
      );
      const data = response.data?.data ?? response.data ?? [];
      const ranges: BookingRange[] = Array.isArray(data) ? data : [];

      setDraftBookedRanges(ranges);

      const automaticDates = findAutomaticDates(ranges);
      setDraftCheckInDate(automaticDates.checkIn);
      setDraftCheckOutDate(automaticDates.checkOut);
    } catch (error) {
      console.log("Failed to load room dates:", error);
      setDraftBookedRanges([]);
      setDraftCheckInDate(getToday());
      setDraftCheckOutDate(getTomorrow());
    } finally {
      setDraftLoadingDates(false);
      setAddingRoom(false);
    }
  };

  // =======================================================
  // OPEN SELECTED ROOM FOR EDITING
  // =======================================================

  const openSelectedRoomForEdit = async (selectedRoom: SelectedBookingRoom) => {
    try {
      setAddingRoom(true);
      setEditingRoomId(selectedRoom.id);

      setSelectedRooms((previous) => {
        const exists = previous.some((item) => item.id === selectedRoom.id);
        if (exists) return previous;
        return [...previous, selectedRoom];
      });

      const roomToEdit: Room = {
        id: selectedRoom.id,
        room_number: selectedRoom.room_number,
        status: "available",
        room_type: {
          type_name: selectedRoom.room_type_name,
          base_price: selectedRoom.base_price,
          short_stay_price: selectedRoom.short_stay_price,
        },
      };

      setDraftRoom(roomToEdit);
      setDraftBookingType(selectedRoom.stay_type);

      if (selectedRoom.stay_type === "short") {
        const checkInTime = selectedRoom.expected_check_in_time || "2:00 PM";
        setDraftExpectedCheckInTime(checkInTime);
        setDraftExpectedCheckOutTime(
          selectedRoom.expected_check_out_time ||
            addHoursToTime(checkInTime, 4),
        );
      } else {
        setDraftExpectedCheckInTime("2:00 PM");
        setDraftExpectedCheckOutTime("11:00 AM");
      }

      setDraftCheckInDate(
        selectedRoom.check_in_date
          ? parseDate(selectedRoom.check_in_date)
          : getToday(),
      );
      setDraftCheckOutDate(
        selectedRoom.stay_type === "overnight" && selectedRoom.check_out_date
          ? parseDate(selectedRoom.check_out_date)
          : null,
      );

      await fetchAvailableRooms();
      setDraftLoadingDates(true);

      const response = await api.get(`/rooms/${selectedRoom.id}/booked-dates`);
      const data = response.data?.data ?? response.data ?? [];
      let ranges: BookingRange[] = Array.isArray(data) ? data : [];

      if (selectedRoom.check_in_date) {
        ranges = ranges.filter(
          (range) =>
            !(
              range.check_in_date === selectedRoom.check_in_date &&
              range.check_out_date === selectedRoom.check_out_date
            ),
        );
      }

      setDraftBookedRanges(ranges);
      setShowAddRoomModal(true);
    } catch (error: any) {
      console.log(
        "Failed to load room for editing:",
        error?.response?.data || error,
      );
      setDraftBookedRanges([]);
      try {
        await fetchAvailableRooms();
      } catch {}
      setShowAddRoomModal(true);
    } finally {
      setDraftLoadingDates(false);
      setAddingRoom(false);
    }
  };

  // =======================================================
  // DRAFT ROOM DATE AVAILABILITY
  // =======================================================

  const isDraftDateBooked = (date: Date) => {
    const target = dateToNumber(date);
    return draftBookedRanges.some((range) => {
      const start = dateToNumber(parseDate(range.check_in_date));
      const end = dateToNumber(parseDate(range.check_out_date));
      return target >= start && target < end;
    });
  };

  const hasDraftDateRangeConflict = (startDate: Date, endDate: Date) => {
    const selectedStart = dateToNumber(startDate);
    const selectedEnd = dateToNumber(endDate);
    return draftBookedRanges.some((range) => {
      const bookedStart = dateToNumber(parseDate(range.check_in_date));
      const bookedEnd = dateToNumber(parseDate(range.check_out_date));
      return selectedStart < bookedEnd && selectedEnd > bookedStart;
    });
  };

  // =======================================================
  // DRAFT CALENDAR MARKINGS
  // =======================================================

  const draftBookedMarkedDates = useMemo(() => {
    const marked: Record<string, any> = {};
    draftBookedRanges.forEach((range) => {
      const start = parseDate(range.check_in_date);
      const end = parseDate(range.check_out_date);
      const current = new Date(start);

      while (current < end) {
        const key = formatDate(current);
        if (key) {
          marked[key] = {
            disabled: true,
            disableTouchEvent: true,
            customStyles: {
              container: {
                backgroundColor: "#FDE2E2",
                borderWidth: 1,
                borderColor: "#B91C1C",
                borderRadius: 20,
              },
              text: { color: "#B91C1C", fontWeight: "600" },
            },
          };
        }
        current.setDate(current.getDate() + 1);
      }
    });
    return marked;
  }, [draftBookedRanges]);

  const draftCheckInMarkedDates = useMemo(() => {
    const marked = { ...draftBookedMarkedDates };
    if (draftCheckInDate) {
      const key = formatDate(draftCheckInDate);
      if (key && !isDraftDateBooked(draftCheckInDate)) {
        marked[key] = {
          ...(marked[key] || {}),
          disabled: false,
          disableTouchEvent: false,
          customStyles: {
            container: {
              backgroundColor: "#DDEFE7",
              borderWidth: 1,
              borderColor: "#1A4A35",
              borderRadius: 20,
            },
            text: { color: "#1A4A35", fontWeight: "600" },
          },
        };
      }
    }
    return marked;
  }, [draftBookedMarkedDates, draftCheckInDate]);

  const draftCheckOutMarkedDates = useMemo(() => {
    const marked = { ...draftBookedMarkedDates };
    if (draftCheckOutDate) {
      const key = formatDate(draftCheckOutDate);
      if (key) {
        marked[key] = {
          ...(marked[key] || {}),
          disabled: false,
          disableTouchEvent: false,
          customStyles: {
            container: {
              backgroundColor: "#F5EBD2",
              borderWidth: 1,
              borderColor: "#A8863A",
              borderRadius: 20,
            },
            text: { color: "#8A6D2F", fontWeight: "600" },
          },
        };
      }
    }
    if (draftCheckInDate) {
      const key = formatDate(draftCheckInDate);
      if (key) {
        marked[key] = {
          ...(marked[key] || {}),
          disabled: false,
          disableTouchEvent: false,
          customStyles: {
            container: {
              backgroundColor: "#DDEFE7",
              borderWidth: 1,
              borderColor: "#1A4A35",
              borderRadius: 20,
            },
            text: { color: "#1A4A35", fontWeight: "600" },
          },
        };
      }
    }
    return marked;
  }, [draftBookedMarkedDates, draftCheckInDate, draftCheckOutDate]);

  // =======================================================
  // DRAFT ROOM CALCULATIONS
  // =======================================================

  const draftNights =
    draftBookingType === "overnight"
      ? calculateNights(draftCheckInDate, draftCheckOutDate)
      : 1;

  const draftBasePrice = Number(draftRoom?.room_type?.base_price || 0);
  const draftShortPrice = Number(draftRoom?.room_type?.short_stay_price || 0);
  const draftSubtotal =
    draftBookingType === "overnight"
      ? draftNights * draftBasePrice
      : draftShortPrice;

  const draftCanAdd =
    draftBookingType === "overnight"
      ? !!draftCheckInDate &&
        !!draftCheckOutDate &&
        draftCheckOutDate > draftCheckInDate &&
        draftNights > 0 &&
        draftBasePrice > 0 &&
        !hasDraftDateRangeConflict(draftCheckInDate!, draftCheckOutDate!)
      : !!draftCheckInDate &&
        draftShortPrice > 0 &&
        !isDraftDateBooked(draftCheckInDate!);

  // =======================================================
  // SELECT ANOTHER ROOM
  // =======================================================

  const selectAnotherRoom = async (roomToAdd: Room) => {
    if (addingRoom) return;

    const alreadySelected = selectedRooms.some(
      (item) => item.id === roomToAdd.id,
    );
    const isCurrentEditingRoom =
      editingRoomId !== null && roomToAdd.id === editingRoomId;

    if (alreadySelected && !isCurrentEditingRoom) {
      Alert.alert(
        "Room Already Added",
        `Room ${roomToAdd.room_number} is already included in this booking.`,
      );
      return;
    }

    const status = String(roomToAdd.status || "").toLowerCase();
    if (status === "maintenance") {
      Alert.alert(
        "Room Unavailable",
        `Room ${roomToAdd.room_number} is currently under maintenance.`,
      );
      return;
    }

    await openRoomConfiguration(roomToAdd, editingRoomId !== null);
  };

  // =======================================================
  // ADD / UPDATE DRAFT ROOM
  // =======================================================

  const addDraftRoom = () => {
    if (!draftRoom) return;

    if (!draftCheckInDate) {
      Alert.alert("Date Required", "Please select a check-in date.");
      return;
    }

    if (draftBookingType === "overnight" && !draftCheckOutDate) {
      Alert.alert("Date Required", "Please select a check-out date.");
      return;
    }

    if (
      draftBookingType === "overnight" &&
      draftCheckOutDate &&
      draftCheckOutDate <= draftCheckInDate
    ) {
      Alert.alert("Invalid Dates", "Check-out must be after check-in.");
      return;
    }

    if (
      draftBookingType === "overnight" &&
      hasDraftDateRangeConflict(draftCheckInDate, draftCheckOutDate!)
    ) {
      Alert.alert(
        "Room Unavailable",
        `Room ${draftRoom.room_number} is already booked for the selected dates.`,
      );
      return;
    }

    if (draftBookingType === "short" && isDraftDateBooked(draftCheckInDate)) {
      Alert.alert(
        "Room Unavailable",
        `Room ${draftRoom.room_number} is already booked on this date.`,
      );
      return;
    }

    if (draftBookingType === "short" && draftShortPrice <= 0) {
      Alert.alert(
        "Pricing Unavailable",
        `Short stay pricing is not available for Room ${draftRoom.room_number}.`,
      );
      return;
    }

    if (
      draftBookingType === "short" &&
      !isValidExpectedCheckInTime(draftExpectedCheckInTime)
    ) {
      Alert.alert(
        "Invalid Check-in Time",
        "Please enter a valid time such as 2:00 PM.",
      );
      return;
    }

    const finalExpectedCheckInTime =
      draftBookingType === "short"
        ? draftExpectedCheckInTime.trim()
        : "2:00 PM";
    const finalExpectedCheckOutTime =
      draftBookingType === "short" ? draftExpectedCheckOutTime : "11:00 AM";

    const updatedRoom = createSelectedRoom(
      draftRoom,
      draftBookingType,
      draftCheckInDate,
      draftCheckOutDate,
      finalExpectedCheckInTime,
      finalExpectedCheckOutTime,
    );

    if (editingRoomId !== null) {
      setBookingType(draftBookingType);
      setCheckInDate(draftCheckInDate);
      setCheckOutDate(
        draftBookingType === "short" ? draftCheckInDate : draftCheckOutDate,
      );

      setSelectedRooms((previous) => {
        const exists = previous.some((item) => item.id === editingRoomId);
        if (!exists) {
          console.log("ROOM TO UPDATE NOT FOUND:", editingRoomId);
          return previous;
        }
        return previous.map((item) =>
          item.id === editingRoomId ? updatedRoom : item,
        );
      });

      setEditingRoomId(null);
      setDraftRoom(null);
      setDraftCheckInDate(null);
      setDraftCheckOutDate(null);
      setDraftBookedRanges([]);
      setShowAddRoomModal(false);
      return;
    }

    setSelectedRooms((previous) => {
      const exists = previous.some((item) => item.id === updatedRoom.id);
      if (exists) {
        return previous.map((item) =>
          item.id === updatedRoom.id ? updatedRoom : item,
        );
      }
      return [...previous, updatedRoom];
    });

    setDraftRoom(null);
    setDraftCheckInDate(null);
    setDraftCheckOutDate(null);
    setDraftBookedRanges([]);
    setEditingRoomId(null);
    setShowAddRoomModal(true);
  };

  // =======================================================
  // REMOVE ROOM
  // =======================================================

  const removeSelectedRoom = (roomId: number) => {
    if (roomId === parsedRoom.id) {
      Alert.alert(
        "First Room",
        "The first selected room cannot be removed from this screen.",
      );
      return;
    }
    setSelectedRooms((previous) =>
      previous.filter((item) => item.id !== roomId),
    );
  };

  // =======================================================
  // COMBINED TOTAL
  // =======================================================

  const multipleBookingTotal = selectedRooms.reduce(
    (sum, item) => sum + Number(item.subtotal || 0),
    0,
  );

  // =======================================================
  // MAIN ROOM VALIDATION
  // =======================================================

  const canBook =
    bookingType === "overnight"
      ? !!checkInDate &&
        !!checkOutDate &&
        checkOutDate > checkInDate &&
        overnightTotal > 0 &&
        !hasDateRangeConflict(checkInDate!, checkOutDate!)
      : !!checkInDate && shortStayPrice > 0 && !isDateBooked(checkInDate!);

  // =======================================================
  // HANDLE BOOKING
  // =======================================================

  const handleBooking = async () => {
    if (loading) return;

    if (!checkInDate) {
      Alert.alert("Date Required", "Please select a check-in date.");
      return;
    }

    if (bookingType === "overnight" && !checkOutDate) {
      Alert.alert(
        "Dates Required",
        "Please select check-in and check-out dates.",
      );
      return;
    }

    if (
      bookingType === "overnight" &&
      checkOutDate &&
      checkOutDate <= checkInDate
    ) {
      Alert.alert("Invalid Dates", "Check-out must be after check-in.");
      return;
    }

    if (
      bookingType === "overnight" &&
      hasDateRangeConflict(checkInDate, checkOutDate!)
    ) {
      Alert.alert(
        "Room Unavailable",
        `Room ${parsedRoom.room_number} is already booked for the selected dates.`,
      );
      await fetchBookedDates();
      return;
    }

    if (bookingType === "short" && isDateBooked(checkInDate)) {
      Alert.alert(
        "Room Unavailable",
        `Room ${parsedRoom.room_number} is already booked on this date.`,
      );
      await fetchBookedDates();
      return;
    }

    if (bookingType === "short" && !shortStayPrice) {
      Alert.alert(
        "Pricing Unavailable",
        "Short stay pricing is not available for this room.",
      );
      return;
    }

    const currentRoom = createSelectedRoom(
      parsedRoom,
      bookingType,
      checkInDate,
      checkOutDate,
      bookingType === "short" ? expectedCheckInTime : "2:00 PM",
      bookingType === "short" ? expectedCheckOutTime : "11:00 AM",
    );

    const finalRooms = selectedRooms.length > 0 ? selectedRooms : [currentRoom];

    if (finalRooms.length === 0) {
      Alert.alert("Room Required", "Please select at least one room.");
      return;
    }

    setLoading(true);
    try {
      router.push({
        pathname: "/bookings/payment",
        params: {
          multiple: "true",
          rooms: JSON.stringify(finalRooms),
        },
      });
    } catch (error) {
      console.log("Booking navigation error:", error);
    } finally {
      setLoading(false);
    }
  };

  // =======================================================
  // CHANGE MAIN BOOKING TYPE
  // =======================================================

  const changeBookingType = (type: BookingType) => {
    setBookingType(type);

    const preservedCheckIn = checkInDate ?? getToday();

    if (type === "overnight") {
      if (suggestedDates.length > 0) {
        const first = suggestedDates[0];
        const isCheckInValid = !isDateBooked(preservedCheckIn);

        if (isCheckInValid) {
          setCheckInDate(preservedCheckIn);
          const nextDay = new Date(preservedCheckIn);
          nextDay.setDate(nextDay.getDate() + 1);
          setCheckOutDate(nextDay);
        } else {
          setCheckInDate(first.checkIn);
          setCheckOutDate(first.checkOut);
        }
      } else {
        setCheckInDate(preservedCheckIn);
        setCheckOutDate(getTomorrow());
      }

      setExpectedCheckInTime("2:00 PM");
      setExpectedCheckOutTime("11:00 AM");
    } else {
      if (isDateBooked(preservedCheckIn)) {
        const automatic = findAutomaticDates(bookedRanges);
        setCheckInDate(automatic.checkIn);
      } else {
        setCheckInDate(preservedCheckIn);
      }
      setCheckOutDate(null);
      const defaultCheckIn = "2:00 PM";
      setExpectedCheckInTime(defaultCheckIn);
      setExpectedCheckOutTime(addHoursToTime(defaultCheckIn, 4));
    }
  };

  // =======================================================
  // CHANGE DRAFT BOOKING TYPE
  // =======================================================

  const changeDraftBookingType = (type: BookingType) => {
    setDraftBookingType(type);

    if (type === "overnight") {
      setDraftExpectedCheckInTime("2:00 PM");
      setDraftExpectedCheckOutTime("11:00 AM");

      if (!draftCheckInDate) {
        const automatic = findAutomaticDates(draftBookedRanges);
        setDraftCheckInDate(automatic.checkIn);
        setDraftCheckOutDate(automatic.checkOut);
      } else if (!draftCheckOutDate || draftCheckOutDate <= draftCheckInDate) {
        const next = new Date(draftCheckInDate);
        next.setDate(next.getDate() + 1);
        setDraftCheckOutDate(next);
      }
    } else {
      setDraftCheckOutDate(null);
      const defaultCheckIn = "2:00 PM";
      setDraftExpectedCheckInTime(defaultCheckIn);
      setDraftExpectedCheckOutTime(addHoursToTime(defaultCheckIn, 4));
    }
  };

  // =======================================================
  // MAIN CHECK-IN
  // =======================================================

  const handleCheckInSelect = (dateString: string) => {
    const selected = parseDate(dateString);
    if (isDateBooked(selected)) {
      Alert.alert(
        "Date Unavailable",
        "This date is already booked for this room.",
      );
      return;
    }

    setCheckInDate(selected);
    if (checkOutDate && checkOutDate <= selected) setCheckOutDate(null);
    setShowCheckIn(false);
  };

  // =======================================================
  // MAIN CHECK-OUT
  // =======================================================

  const handleCheckOutSelect = (dateString: string) => {
    const selected = parseDate(dateString);
    if (!checkInDate) return;

    if (selected <= checkInDate) {
      Alert.alert("Invalid Check-out", "Check-out must be after check-in.");
      return;
    }

    if (hasDateRangeConflict(checkInDate, selected)) {
      Alert.alert(
        "Date Unavailable",
        "Your selected stay overlaps another booking for this room.",
      );
      return;
    }

    setCheckOutDate(selected);
    setShowCheckOut(false);
  };

  // =======================================================
  // DRAFT CHECK-IN
  // =======================================================

  const handleDraftCheckInSelect = (dateString: string) => {
    const selected = parseDate(dateString);
    if (isDraftDateBooked(selected)) {
      Alert.alert(
        "Date Unavailable",
        `Room ${draftRoom?.room_number || ""} is already booked on this date.`,
      );
      return;
    }

    setDraftCheckInDate(selected);
    if (draftCheckOutDate && draftCheckOutDate <= selected)
      setDraftCheckOutDate(null);
    setShowDraftCheckIn(false);
  };

  // =======================================================
  // DRAFT CHECK-OUT
  // =======================================================

  const handleDraftCheckOutSelect = (dateString: string) => {
    const selected = parseDate(dateString);
    if (!draftCheckInDate) return;

    if (selected <= draftCheckInDate) {
      Alert.alert("Invalid Check-out", "Check-out must be after check-in.");
      return;
    }

    if (hasDraftDateRangeConflict(draftCheckInDate, selected)) {
      Alert.alert(
        "Date Unavailable",
        `The selected dates are already booked for Room ${draftRoom?.room_number || ""}.`,
      );
      return;
    }

    setDraftCheckOutDate(selected);
    setShowDraftCheckOut(false);
  };

  // =======================================================
  // ROOMS FOR SELECTION
  // =======================================================

  const roomsForSelection = availableRooms.filter((item) => {
    const status = String(item.status || "").toLowerCase();
    const alreadySelected = selectedRooms.some(
      (selected) => selected.id === item.id,
    );

    if (status === "maintenance") return false;
    if (editingRoomId !== null && item.id === editingRoomId) return false;
    if (alreadySelected) return false;

    return true;
  });

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <View className="flex-1 bg-[#faf8f3]">
      <StatusBar style="light" translucent />

      {/* HEADER */}

      <LinearGradient
        colors={["#0d2e1f", "#1a4a35"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 28,
          paddingHorizontal: horizontalPadding,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            position: "absolute",
            width: 240,
            height: 240,
            top: -60,
            right: -60,
            borderRadius: 120,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.05)",
          }}
        />

        <View
          style={{
            position: "absolute",
            width: 140,
            height: 140,
            top: -10,
            right: -10,
            borderRadius: 70,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.05)",
          }}
        />

        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.8}
          className="w-10 h-10 rounded-full bg-white/10 border border-white/10 justify-center items-center mb-6"
        >
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>

        <Text className="text-[#c9a96e] text-[10px] tracking-[4px] uppercase mb-1">
          {selectedRooms.length > 1
            ? "MULTIPLE ROOMS"
            : parsedRoom.room_type?.type_name}
        </Text>

        <Text
          className="text-white mb-1"
          style={{
            fontFamily: "Georgia",
            fontSize: titleFontSize,
            lineHeight: titleFontSize * 1.15,
            flexShrink: 1,
          }}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {selectedRooms.length > 1
            ? "Reserve your stay"
            : `Room ${parsedRoom.room_number}`}
        </Text>

        <Text
          className="text-white/40 text-sm"
          style={{
            fontFamily: "Georgia",
            fontStyle: "italic",
            flexShrink: 1,
          }}
          numberOfLines={2}
        >
          {selectedRooms.length > 1
            ? "Add rooms one by one with their own stay type"
            : `${formatPrice(basePrice)} per night`}
        </Text>
      </LinearGradient>

      {/* MAIN CONTENT */}

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 180 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#1a4a35"
            colors={["#1a4a35"]}
          />
        }
      >
        <View style={{ paddingHorizontal: horizontalPadding, paddingTop: 12 }}>
          {/* BOOKING TYPE */}

          <Text className="text-[#1a4a35]/40 text-[10px] tracking-[3px] uppercase mb-3">
            Stay Type
          </Text>

          <View className="flex-row gap-3 mb-6">
            <TouchableOpacity
              onPress={() => changeBookingType("overnight")}
              className={`flex-1 py-3 rounded-xl ${
                bookingType === "overnight" ? "bg-[#1a4a35]" : "bg-gray-200"
              }`}
            >
              <Text
                className={`text-center ${
                  bookingType === "overnight" ? "text-white" : "text-black"
                }`}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                Overnight
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => changeBookingType("short")}
              className={`flex-1 py-3 rounded-xl ${
                bookingType === "short" ? "bg-[#1a4a35]" : "bg-gray-200"
              }`}
            >
              <Text
                className={`text-center ${
                  bookingType === "short" ? "text-white" : "text-black"
                }`}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                Short Stay
              </Text>
            </TouchableOpacity>
          </View>

          {/* MAIN ROOM DATES */}

          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-[#1a4a35]/40 text-[10px] tracking-[3px] uppercase">
              {bookingType === "short" ? "Stay Date" : "Stay Dates"}
            </Text>

            {/* ✅ AUTO PICK ACTION — HIDDEN FOR SHORT STAY */}
            {bookingType !== "short" && suggestedDates.length > 0 && (
              <TouchableOpacity
                onPress={handleAutoPickAvailableDates}
                activeOpacity={0.85}
                className="flex-row items-center bg-[#e9efeb] px-3 py-1.5 rounded-full border border-[#1a4a35]/10"
              >
                <Text className="text-[#1a4a35] text-[10px] font-semibold ml-1 tracking-wide">
                  Auto Pick Available
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ✅ AUTO PICKED INDICATOR — HIDDEN FOR SHORT STAY */}

          {bookingType !== "short" &&
            suggestedDates.length > 0 &&
            checkInDate &&
            dateToNumber(suggestedDates[0].checkIn) ===
              dateToNumber(checkInDate) && (
              <View className="mb-3 flex-row items-center bg-[#e9efeb]/70 border border-[#1a4a35]/10 rounded-xl px-3 py-2">
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color="#1a4a35"
                />
                <Text className="text-[#1a4a35]/70 text-[11px] ml-2 flex-1">
                  Auto-picked the next available dates for this room.
                </Text>
              </View>
            )}

          {/* ✅ AVAILABLE + BLOCKED SECTION — HIDDEN FOR SHORT STAY */}

          {bookingType !== "short" &&
            (suggestedDates.length > 1 || bookedRanges.length > 0) && (
              <View className="mb-5">
                {/* AVAILABLE RANGES */}

                {suggestedDates.length > 1 && (
                  <>
                    <Text className="text-[#1a4a35]/40 text-[10px] tracking-[2px] uppercase mb-2">
                      Other Available Ranges
                    </Text>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingRight: 10, gap: 10 }}
                      style={{ marginBottom: 16 }}
                    >
                      {suggestedDates.map((range, index) => {
                        const isActive =
                          checkInDate &&
                          dateToNumber(range.checkIn) ===
                            dateToNumber(checkInDate);

                        return (
                          <TouchableOpacity
                            key={`${range.checkIn.toISOString()}-${index}`}
                            onPress={() => {
                              setCheckInDate(range.checkIn);
                              if (bookingType === "overnight") {
                                setCheckOutDate(range.checkOut);
                              } else {
                                setCheckOutDate(null);
                              }
                            }}
                            activeOpacity={0.85}
                            style={{
                              width: 160,
                              height: 92,
                              borderWidth: 1.5,
                              borderColor: isActive
                                ? "#1a4a35"
                                : "rgba(26,74,53,0.15)",
                              backgroundColor: isActive
                                ? "#e9efeb"
                                : "#ffffff",
                            }}
                            className="rounded-[20px] px-3 py-3 justify-between"
                          >
                            <View className="flex-row items-center justify-between">
                              <Text
                                className="text-[9px] uppercase tracking-widest"
                                style={{
                                  color: isActive
                                    ? "#1a4a35cc"
                                    : "#1a4a35aa",
                                }}
                              >
                                Available
                              </Text>

                              <View
                                className="px-2 py-1 rounded-full"
                                style={{
                                  backgroundColor: isActive
                                    ? "#1a4a35"
                                    : "#e9efeb",
                                }}
                              >
                                <Text
                                  className="text-[8px] font-semibold"
                                  style={{
                                    color: isActive
                                      ? "#c9a96e"
                                      : "#1a4a35",
                                  }}
                                >
                                  {range.nights}{" "}
                                  {range.nights === 1 ? "NIGHT" : "NIGHTS"}
                                </Text>
                              </View>
                            </View>

                            <View>
                              <Text
                                className="text-[9px] uppercase tracking-widest mb-0.5"
                                style={{
                                  color: isActive
                                    ? "#1a4a35cc"
                                    : "#1a4a35aa",
                                }}
                              >
                                Dates
                              </Text>

                              <Text
                                className="text-[#1a4a35] text-xs font-semibold"
                                style={{ fontFamily: "Georgia" }}
                                numberOfLines={1}
                              >
                                {range.checkIn.toLocaleDateString("en-PH", {
                                  month: "short",
                                  day: "numeric",
                                })}
                                {" → "}
                                {range.checkOut.toLocaleDateString("en-PH", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </>
                )}

                {/* BLOCKED DATES */}

                {bookedRanges.length > 0 && (
                  <>
                    <Text className="text-[#1a4a35]/40 text-[10px] tracking-[2px] uppercase mb-2">
                      Blocked Dates
                    </Text>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingRight: 10, gap: 10 }}
                    >
                      {bookedRanges.map((range, index) => {
                        const startDate = parseDate(range.check_in_date);
                        const endDate = parseDate(range.check_out_date);

                        return (
                          <View
                            key={`${range.check_in_date}-${range.check_out_date}-${index}`}
                            style={{ width: 160, height: 92 }}
                            className="rounded-[20px] px-3 py-3 bg-white border border-red-200 justify-between"
                          >
                            <View className="flex-row items-center justify-between">
                              <Text className="text-[#1a4a35]/40 text-[9px] uppercase tracking-widest">
                                Not Available
                              </Text>

                              <View className="px-2 py-1 rounded-full bg-[#fbe9e7]">
                                <Text className="text-[8px] font-semibold text-[#dc2626]">
                                  BLOCKED
                                </Text>
                              </View>
                            </View>

                            <View>
                              <Text className="text-[#1a4a35]/40 text-[9px] uppercase tracking-widest mb-0.5">
                                Dates
                              </Text>

                              <Text
                                className="text-[#1a4a35] text-xs font-semibold"
                                style={{ fontFamily: "Georgia" }}
                                numberOfLines={1}
                              >
                                {formatShortDate(startDate)}
                                {" → "}
                                {formatShortDate(endDate)}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </>
                )}
              </View>
            )}

          <View className="gap-4 mb-8">
            {/* CHECK-IN */}

            <TouchableOpacity
              onPress={() => setShowCheckIn(true)}
              activeOpacity={0.85}
              className="bg-white rounded-2xl border border-[#1a4a35]/08 overflow-hidden"
            >
              <View className="px-5 py-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3 flex-1">
                    <View className="w-9 h-9 rounded-full bg-[#1a4a35]/06 justify-center items-center">
                      <Ionicons
                        name={
                          bookingType === "short"
                            ? "calendar-outline"
                            : "enter-outline"
                        }
                        size={16}
                        color="#1a4a35"
                      />
                    </View>

                    <View className="flex-1">
                      <Text className="text-[#1a4a35]/40 text-[10px] tracking-widest uppercase mb-0.5">
                        {bookingType === "short" ? "Date" : "Check-in"}
                      </Text>

                      {checkInDate ? (
                        <Text
                          className="text-[#1a4a35] text-base"
                          style={{ fontFamily: "Georgia" }}
                        >
                          {formatDisplayDate(checkInDate)}
                        </Text>
                      ) : (
                        <Text className="text-[#1a4a35]/30 text-sm">
                          Select date
                        </Text>
                      )}
                    </View>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color="#1a4a35"
                    style={{ opacity: 0.3 }}
                  />
                </View>
              </View>

              {checkInDate && (
                <>
                  <View className="h-0.5 bg-[#1a4a35]/05 mx-5" />
                  <View className="px-5 py-2">
                    <Text className="text-[#c9a96e] text-xs tracking-wide">
                      {formatDate(checkInDate)}
                    </Text>
                  </View>
                </>
              )}
            </TouchableOpacity>

            {/* CHECK-OUT */}

            {bookingType === "overnight" && (
              <>
                <View className="items-center">
                  <View className="w-px h-4 bg-[#1a4a35]/10" />
                  <View className="w-6 h-6 rounded-full bg-[#1a4a35]/06 border border-[#1a4a35]/10 justify-center items-center">
                    <Ionicons name="arrow-down" size={12} color="#1a4a35" />
                  </View>
                  <View className="w-px h-4 bg-[#1a4a35]/10" />
                </View>

                <TouchableOpacity
                  onPress={() => {
                    if (!checkInDate) {
                      Alert.alert(
                        "Check-in Required",
                        "Please select your check-in date first.",
                      );
                      return;
                    }
                    setShowCheckOut(true);
                  }}
                  activeOpacity={0.85}
                  className="bg-white rounded-2xl border border-[#1a4a35]/08 overflow-hidden"
                >
                  <View className="px-5 py-4">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-3 flex-1">
                        <View className="w-9 h-9 rounded-full bg-[#1a4a35]/06 justify-center items-center">
                          <Ionicons
                            name="exit-outline"
                            size={16}
                            color="#1a4a35"
                          />
                        </View>

                        <View className="flex-1">
                          <Text className="text-[#1a4a35]/40 text-[10px] tracking-widest uppercase mb-0.5">
                            Check-out
                          </Text>

                          {checkOutDate ? (
                            <Text
                              className="text-[#1a4a35] text-base"
                              style={{ fontFamily: "Georgia" }}
                            >
                              {formatDisplayDate(checkOutDate)}
                            </Text>
                          ) : (
                            <Text className="text-[#1a4a35]/30 text-sm">
                              Select date
                            </Text>
                          )}
                        </View>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color="#1a4a35"
                        style={{ opacity: 0.3 }}
                      />
                    </View>
                  </View>

                  {checkOutDate && (
                    <>
                      <View className="h-0.5 bg-[#1a4a35]/05 mx-5" />
                      <View className="px-5 py-2">
                        <Text className="text-[#c9a96e] text-xs tracking-wide">
                          {formatDate(checkOutDate)}
                        </Text>
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            {bookingType === "short" && shortStayPrice > 0 && (
              <Text className="text-xs text-[#1a4a35]/50 -mt-1 px-1">
                Short stay rate: {formatPrice(shortStayPrice)} for the selected
                date
              </Text>
            )}
          </View>

          {/* SELECTED ROOMS */}

          <View className="mb-6">
            <View className="flex-row items-center mb-4">
              <View className="w-1 h-8 rounded-full bg-[#c9a96e] mr-3" />

              <View className="flex-1">
                <Text className="text-[#1a4a35] text-base font-semibold">
                  Selected Rooms ({selectedRooms.length || 1})
                </Text>

                <Text className="text-[#1a4a35]/40 text-xs">
                  Each room can have different dates
                </Text>
              </View>
            </View>

            {(selectedRooms.length > 0
              ? selectedRooms
              : [
                  {
                    id: parsedRoom.id,
                    room_number: parsedRoom.room_number,
                    room_type_name:
                      parsedRoom.room_type?.type_name || "Standard",
                    base_price: basePrice,
                    short_stay_price: shortStayPrice,
                    stay_type: bookingType,
                    check_in_date: formatDate(checkInDate),
                    check_out_date: formatDate(
                      bookingType === "short" ? checkInDate : checkOutDate,
                    ),
                    nights: bookingType === "overnight" ? nights : 1,
                    subtotal: total,
                  } as SelectedBookingRoom,
                ]
            ).map((item, index) => (
              <View
                key={`${item.id}-${index}`}
                className="bg-white rounded-2xl border border-[#1a4a35]/10 p-5 mb-4"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View className="w-12 h-12 rounded-full bg-[#e9efeb] justify-center items-center mr-4">
                      <Ionicons name="bed-outline" size={25} color="#1a4a35" />
                    </View>

                    <View className="flex-1">
                      <Text
                        className="text-[#1a4a35] text-lg"
                        style={{ fontFamily: "Georgia" }}
                      >
                        Room {item.room_number}
                      </Text>

                      <Text className="text-[#1a4a35]/40 text-xs">
                        {item.room_type_name}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => openSelectedRoomForEdit(item)}
                    activeOpacity={0.8}
                    className="w-9 h-9 rounded-full bg-[#1a4a35]/06 justify-center items-center mr-1"
                  >
                    <Ionicons name="create-outline" size={19} color="#1a4a35" />
                  </TouchableOpacity>

                  {item.id !== parsedRoom.id && (
                    <TouchableOpacity
                      onPress={() => removeSelectedRoom(item.id)}
                      className="w-9 h-9 justify-center items-center"
                    >
                      <Ionicons
                        name="trash-outline"
                        size={21}
                        color="#dc4c4c"
                      />
                    </TouchableOpacity>
                  )}
                </View>

                <View className="h-px bg-[#1a4a35]/10 my-4" />

                <View className="flex-row justify-between items-center mb-3">
                  <Text
                    className="text-[#1a4a35]/50 text-xs"
                    style={{ flexShrink: 0 }}
                  >
                    Stay Type
                  </Text>

                  <View
                    className="bg-[#e3effb] px-3 py-1.5 rounded-full"
                    style={{ flexShrink: 1, marginLeft: 12 }}
                  >
                    <Text
                      className="text-[#3971b9] text-xs font-semibold text-right"
                      style={{ flexWrap: "wrap" }}
                    >
                      {item.stay_type === "overnight"
                        ? `Overnight (${item.nights} ${
                            item.nights === 1 ? "night" : "nights"
                          })`
                        : "Short Stay"}
                    </Text>
                  </View>
                </View>

                <View className="flex-row justify-between items-start mb-3">
                  <Text
                    className="text-[#1a4a35]/50 text-xs"
                    style={{ flexShrink: 0, marginTop: 2 }}
                  >
                    Dates
                  </Text>

                  <Text
                    className="text-[#1a4a35] text-xs font-semibold text-right"
                    style={{ flex: 1, marginLeft: 12 }}
                  >
                    {item.check_in_date
                      ? `${formatDisplayDate(
                          parseDate(item.check_in_date),
                        )?.replace(/^.*?, /, "")}`
                      : "-"}
                    {" → "}
                    {item.check_out_date
                      ? `${formatDisplayDate(
                          parseDate(item.check_out_date),
                        )?.replace(/^.*?, /, "")}`
                      : "-"}
                  </Text>
                </View>

                <View className="flex-row justify-between items-start mb-3">
                  <Text
                    className="text-[#1a4a35]/50 text-xs"
                    style={{ flexShrink: 0, marginTop: 2 }}
                  >
                    Expected Time
                  </Text>

                  <View
                    className="items-end"
                    style={{ flex: 1, marginLeft: 12 }}
                  >
                    <Text className="text-[#1a4a35] text-xs font-semibold text-right">
                      {item.expected_check_in_time || expectedCheckInTime}
                      {" → "}
                      {item.expected_check_out_time || expectedCheckOutTime}
                    </Text>

                    <Text className="text-[#1a4a35]/35 text-[9px] mt-0.5 text-right">
                      Check-in → Check-out
                    </Text>
                  </View>
                </View>

                <View className="flex-row justify-between items-center mb-3">
                  <Text
                    className="text-[#1a4a35]/50 text-xs"
                    style={{ flexShrink: 0 }}
                  >
                    Rate
                  </Text>

                  <Text
                    className="text-[#1a4a35] text-xs font-semibold text-right"
                    style={{ flex: 1, marginLeft: 12 }}
                  >
                    {formatPrice(
                      item.stay_type === "overnight"
                        ? item.base_price
                        : item.short_stay_price,
                    )}
                    {item.stay_type === "overnight" && "/night"}
                  </Text>
                </View>

                <View className="h-px bg-[#1a4a35]/10 mb-3" />

                <View className="flex-row justify-between items-center">
                  <Text
                    className="text-[#1a4a35] text-base"
                    style={{ fontFamily: "Georgia" }}
                  >
                    Subtotal
                  </Text>

                  <Text
                    className="text-[#c9a96e] text-lg"
                    style={{ fontFamily: "Georgia" }}
                  >
                    {formatPrice(Number(item.subtotal))}
                  </Text>
                </View>
              </View>
            ))}

            <TouchableOpacity
              onPress={handleAddAnotherRoom}
              activeOpacity={0.85}
              className="bg-[#1a4a35] rounded-2xl py-4 flex-row justify-center items-center"
            >
              <Ionicons name="add-circle-outline" size={21} color="#c9a96e" />
              <Text className="text-white text-sm font-semibold ml-2">
                Add Another Room
              </Text>
            </TouchableOpacity>
          </View>

          {/* BOOKING SUMMARY */}

          <View className="bg-white rounded-2xl border border-[#1a4a35]/10 p-5">
            <Text className="text-[#1a4a35]/60 text-[11px] tracking-[2px] uppercase mb-5">
              Booking Summary
            </Text>

            <View className="flex-row justify-between items-center mb-3">
              <Text
                className="text-[#1a4a35]/50 text-sm"
                style={{ flexShrink: 0 }}
              >
                Total Rooms
              </Text>

              <Text
                className="text-[#1a4a35] text-sm font-semibold text-right"
                style={{ flex: 1, marginLeft: 12 }}
              >
                {selectedRooms.length || 1}{" "}
                {selectedRooms.length === 1 ? "room" : "rooms"}
              </Text>
            </View>

            <View className="flex-row justify-between items-center mb-3">
              <Text
                className="text-[#1a4a35]/50 text-sm"
                style={{ flexShrink: 0 }}
              >
                Short Stay
              </Text>

              <Text
                className="text-[#1a4a35] text-sm font-semibold text-right"
                style={{ flex: 1, marginLeft: 12 }}
              >
                {
                  (selectedRooms.length
                    ? selectedRooms
                    : [{ stay_type: bookingType }]
                  ).filter((item) => item.stay_type === "short").length
                }{" "}
                {(selectedRooms.length
                  ? selectedRooms
                  : [{ stay_type: bookingType }]
                ).filter((item) => item.stay_type === "short").length === 1
                  ? "room"
                  : "rooms"}
              </Text>
            </View>

            <View className="flex-row justify-between items-center mb-3">
              <Text
                className="text-[#1a4a35]/50 text-sm"
                style={{ flexShrink: 0 }}
              >
                Overnight
              </Text>

              <Text
                className="text-[#1a4a35] text-sm font-semibold text-right"
                style={{ flex: 1, marginLeft: 12 }}
              >
                {
                  (selectedRooms.length
                    ? selectedRooms
                    : [{ stay_type: bookingType }]
                  ).filter((item) => item.stay_type === "overnight").length
                }{" "}
                {(selectedRooms.length
                  ? selectedRooms
                  : [{ stay_type: bookingType }]
                ).filter((item) => item.stay_type === "overnight").length === 1
                  ? "room"
                  : "rooms"}
              </Text>
            </View>

            {(() => {
              const rooms = selectedRooms.length
                ? selectedRooms
                : [{ stay_type: bookingType, nights }];

              const overnightRooms = rooms.filter(
                (item) => item.stay_type === "overnight",
              );

              const totalOvernightNights = overnightRooms.reduce(
                (sum, item) => sum + Number(item.nights || 0),
                0,
              );

              if (totalOvernightNights <= 0) return null;

              return (
                <View className="flex-row justify-between items-center mb-5">
                  <Text
                    className="text-[#1a4a35]/50 text-sm"
                    style={{ flexShrink: 0 }}
                  >
                    Overnight Stay
                  </Text>

                  <Text
                    className="text-[#1a4a35] text-sm font-semibold text-right"
                    style={{ flex: 1, marginLeft: 12 }}
                  >
                    {totalOvernightNights}{" "}
                    {totalOvernightNights === 1 ? "night" : "nights"}
                  </Text>
                </View>
              );
            })()}

            <View className="h-px bg-[#1a4a35]/10 mb-4" />

            <View className="flex-row justify-between items-center">
              <Text
                className="text-[#1a4a35] text-lg"
                style={{ fontFamily: "Georgia" }}
              >
                Total
              </Text>

              <Text
                className="text-[#c9a96e] text-2xl"
                style={{ fontFamily: "Georgia" }}
              >
                {formatPrice(
                  selectedRooms.length > 0 ? multipleBookingTotal : total,
                )}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* BOTTOM CONFIRM BUTTON */}

      <View
        className="absolute bottom-0 left-0 right-0 bg-[#faf8f3] border-t border-[#1a4a35]/08"
        style={{
          paddingBottom: insets.bottom + 16,
          paddingTop: 16,
          paddingHorizontal: horizontalPadding,
        }}
      >
        {canBook && (
          <View className="flex-row justify-between items-center mb-3">
            <Text
              className="text-[#1a4a35]/40 text-xs tracking-widest uppercase"
              style={{ flexShrink: 1 }}
              numberOfLines={2}
            >
              {selectedRooms.length > 1
                ? `${selectedRooms.length} Rooms Total`
                : "Total"}
            </Text>

            <Text
              className="text-[#1a4a35] text-xl"
              style={{ fontFamily: "Georgia" }}
            >
              {formatPrice(
                selectedRooms.length > 0 ? multipleBookingTotal : total,
              )}
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleBooking}
          disabled={loading || !canBook}
          activeOpacity={0.85}
          className="rounded-2xl overflow-hidden"
        >
          <LinearGradient
            colors={
              loading
                ? ["#9ca3af", "#6b7280"]
                : !canBook
                  ? ["#d1d5db", "#9ca3af"]
                  : ["#1a4a35", "#0d2e1f"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="flex-row items-center justify-center py-4 gap-2"
          >
            {loading ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#fff" />
                <Text className="text-white text-sm tracking-widest uppercase">
                  Processing...
                </Text>
              </View>
            ) : (
              <>
                <Text
                  className="text-white text-sm tracking-widest uppercase"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {canBook
                    ? "Confirm Booking"
                    : bookingType === "short" && !shortStayPrice
                      ? "Pricing Unavailable"
                      : "Select Dates First"}
                </Text>

                {canBook && (
                  <Ionicons name="checkmark" size={16} color="#c9a96e" />
                )}
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* MAIN CHECK-IN CALENDAR */}

      <Modal
        visible={showCheckIn}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCheckIn(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View
            className="bg-[#faf8f3] rounded-t-[30px] overflow-hidden"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <View className="px-6 pt-5 pb-3 flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-[#1a4a35]/40 text-[10px] tracking-[3px] uppercase">
                  Room {parsedRoom.room_number}
                </Text>

                <Text
                  className="text-[#1a4a35] text-2xl mt-1"
                  style={{ fontFamily: "Georgia" }}
                >
                  {bookingType === "short" ? "Stay Date" : "Check-in Date"}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setShowCheckIn(false)}
                className="w-10 h-10 rounded-full bg-[#1a4a35]/06 justify-center items-center"
              >
                <Ionicons name="close" size={20} color="#1a4a35" />
              </TouchableOpacity>
            </View>

            {loadingBookedDates && (
              <View className="flex-row items-center justify-center py-2">
                <ActivityIndicator size="small" color="#1a4a35" />
                <Text className="text-[#1a4a35]/40 text-xs ml-2">
                  Checking room availability...
                </Text>
              </View>
            )}

            <Calendar
              markingType="custom"
              minDate={formatDate(new Date())}
              markedDates={checkInMarkedDates}
              onDayPress={(day) => handleCheckInSelect(day.dateString)}
              theme={{
                backgroundColor: "#faf8f3",
                calendarBackground: "#faf8f3",
                textSectionTitleColor: "#1a4a35",
                selectedDayBackgroundColor: "#1a4a35",
                selectedDayTextColor: "#ffffff",
                todayTextColor: "#c9a96e",
                dayTextColor: "#1a4a35",
                textDisabledColor: "#c4c4c4",
                monthTextColor: "#1a4a35",
                arrowColor: "#1a4a35",
                textDayFontFamily: "System",
                textMonthFontFamily: "Georgia",
                textDayHeaderFontFamily: "System",
              }}
            />

            <View className="px-6 pt-2">
              <View className="flex-row items-center justify-center gap-3 mb-4 flex-wrap">
                <View className="flex-row items-center">
                  <View
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: "#dc2626" }}
                  />
                  <Text className="text-[#1a4a35]/60 text-xs">
                    Already booked
                  </Text>
                </View>

                <View className="flex-row items-center">
                  <View
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: "#1a4a35" }}
                  />
                  <Text className="text-[#1a4a35]/60 text-xs">Check-in</Text>
                </View>

                <View className="flex-row items-center">
                  <View
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: "#c9a96e" }}
                  />
                  <Text className="text-[#1a4a35]/60 text-xs">Check-out</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setShowCheckIn(false)}
                className="bg-[#1a4a35] rounded-2xl py-4 items-center"
              >
                <Text className="text-white text-sm tracking-widest uppercase">
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MAIN CHECK-OUT CALENDAR */}

      <Modal
        visible={showCheckOut}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCheckOut(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View
            className="bg-[#faf8f3] rounded-t-[30px] overflow-hidden"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <View className="px-6 pt-5 pb-3 flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-[#1a4a35]/40 text-[10px] tracking-[3px] uppercase">
                  Room {parsedRoom.room_number}
                </Text>

                <Text
                  className="text-[#1a4a35] text-2xl mt-1"
                  style={{ fontFamily: "Georgia" }}
                >
                  Check-out Date
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setShowCheckOut(false)}
                className="w-10 h-10 rounded-full bg-[#1a4a35]/06 justify-center items-center"
              >
                <Ionicons name="close" size={20} color="#1a4a35" />
              </TouchableOpacity>
            </View>

            {loadingBookedDates && (
              <View className="flex-row items-center justify-center py-2">
                <ActivityIndicator size="small" color="#1a4a35" />
                <Text className="text-[#1a4a35]/40 text-xs ml-2">
                  Checking room availability...
                </Text>
              </View>
            )}

            <Calendar
              markingType="custom"
              minDate={formatDate(checkInDate || new Date())}
              markedDates={checkOutMarkedDates}
              onDayPress={(day) => handleCheckOutSelect(day.dateString)}
              theme={{
                backgroundColor: "#faf8f3",
                calendarBackground: "#faf8f3",
                textSectionTitleColor: "#1a4a35",
                selectedDayBackgroundColor: "#1a4a35",
                selectedDayTextColor: "#ffffff",
                todayTextColor: "#c9a96e",
                dayTextColor: "#1a4a35",
                textDisabledColor: "#c4c4c4",
                monthTextColor: "#1a4a35",
                arrowColor: "#1a4a35",
                textDayFontFamily: "System",
                textMonthFontFamily: "Georgia",
                textDayHeaderFontFamily: "System",
              }}
            />

            <View className="px-6 pt-2">
              <View className="flex-row items-center justify-center gap-3 mb-4 flex-wrap">
                <View className="flex-row items-center">
                  <View
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: "#B91C1C" }}
                  />
                  <Text className="text-[#1a4a35]/60 text-xs">
                    Already booked
                  </Text>
                </View>

                <View className="flex-row items-center">
                  <View
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: "#1A4A35" }}
                  />
                  <Text className="text-[#1a4a35]/60 text-xs">Check-in</Text>
                </View>

                <View className="flex-row items-center">
                  <View
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: "#A8863A" }}
                  />
                  <Text className="text-[#1a4a35]/60 text-xs">Check-out</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setShowCheckOut(false)}
                className="bg-[#1a4a35] rounded-2xl py-4 items-center"
              >
                <Text className="text-white text-sm tracking-widest uppercase">
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ADD / EDIT ROOM MODAL */}

      <Modal
        visible={showAddRoomModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowAddRoomModal(false);
          setDraftRoom(null);
          setEditingRoomId(null);
        }}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View
            className="bg-[#faf8f3] rounded-t-[30px] overflow-hidden"
            style={{
              paddingBottom: insets.bottom + 20,
              maxHeight: "90%",
            }}
          >
            <View className="px-6 pt-5 pb-4 flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-[#1a4a35]/40 text-[10px] tracking-[3px] uppercase">
                  {editingRoomId !== null ? "Edit Room" : "Multiple Rooms"}
                </Text>

                <Text
                  className="text-[#1a4a35] text-2xl mt-1"
                  style={{ fontFamily: "Georgia" }}
                >
                  {draftRoom
                    ? editingRoomId !== null
                      ? "Edit Room"
                      : "Configure Room"
                    : "Add Room"}
                </Text>

                <Text className="text-[#1a4a35]/40 text-xs mt-1">
                  {draftRoom
                    ? editingRoomId !== null
                      ? `Edit Room ${draftRoom.room_number}'s stay details.`
                      : `Select ${draftRoom.room_number}'s own stay dates.`
                    : "Select another room for this booking."}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setShowAddRoomModal(false);
                  setDraftRoom(null);
                  setEditingRoomId(null);
                }}
                className="w-10 h-10 rounded-full bg-[#1a4a35]/06 justify-center items-center"
              >
                <Ionicons name="close" size={20} color="#1a4a35" />
              </TouchableOpacity>
            </View>

            {editingRoomId !== null && (
              <TouchableOpacity
                onPress={() => {
                  setDraftRoom(null);
                  setDraftCheckInDate(null);
                  setDraftCheckOutDate(null);
                  setDraftBookedRanges([]);
                }}
                activeOpacity={0.85}
                className="bg-[#e9efeb] rounded-2xl px-4 py-3 mb-5 mx-6 flex-row items-center"
              >
                <Ionicons
                  name="swap-horizontal-outline"
                  size={20}
                  color="#1a4a35"
                />

                <View className="flex-1 ml-3">
                  <Text className="text-[#1a4a35] text-sm font-semibold">
                    Change Room
                  </Text>

                  <Text className="text-[#1a4a35]/40 text-xs mt-0.5">
                    Select a different room for this booking
                  </Text>
                </View>

                <Ionicons name="chevron-down" size={17} color="#1a4a35" />
              </TouchableOpacity>
            )}

            {!draftRoom ? (
              <>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingHorizontal: 24,
                    paddingBottom: 20,
                  }}
                >
                  {loadingRooms ? (
                    <View className="py-12 items-center">
                      <ActivityIndicator size="large" color="#1a4a35" />
                      <Text className="text-[#1a4a35]/40 text-sm mt-3">
                        Loading rooms...
                      </Text>
                    </View>
                  ) : roomsForSelection.length === 0 ? (
                    <View className="py-12 items-center">
                      <Ionicons
                        name="bed-outline"
                        size={36}
                        color="#1a4a35"
                        style={{ opacity: 0.3 }}
                      />

                      <Text className="text-[#1a4a35]/40 text-sm mt-3 text-center">
                        No other rooms are available to add.
                      </Text>
                    </View>
                  ) : (
                    roomsForSelection.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => selectAnotherRoom(item)}
                        disabled={addingRoom}
                        activeOpacity={0.85}
                        className="bg-white rounded-2xl border border-[#1a4a35]/08 p-4 mb-3"
                      >
                        <View className="flex-row items-center">
                          <View className="w-12 h-12 rounded-xl bg-[#1a4a35]/06 justify-center items-center">
                            <Ionicons
                              name="bed-outline"
                              size={22}
                              color="#1a4a35"
                            />
                          </View>

                          <View className="flex-1 ml-4">
                            <Text
                              className="text-[#1a4a35] text-lg"
                              style={{ fontFamily: "Georgia" }}
                            >
                              Room {item.room_number}
                            </Text>

                            <Text className="text-[#1a4a35]/40 text-xs mt-1">
                              {item.room_type?.type_name || "Standard"}
                            </Text>

                            <Text className="text-[#c9a96e] text-xs mt-1">
                              {formatPrice(
                                Number(item.room_type?.base_price || 0),
                              )}
                              {" / night"}
                            </Text>
                          </View>

                          {addingRoom ? (
                            <ActivityIndicator size="small" color="#1a4a35" />
                          ) : (
                            <Ionicons
                              name="chevron-forward-circle-outline"
                              size={26}
                              color="#1a4a35"
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>

                <View className="px-6 pt-2">
                  <TouchableOpacity
                    onPress={() => setShowAddRoomModal(false)}
                    className="bg-[#1a4a35] rounded-2xl py-4 items-center"
                  >
                    <Text className="text-white text-sm tracking-widest uppercase">
                      Done
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingHorizontal: 24,
                    paddingBottom: 20,
                  }}
                >
                  <View className="bg-white rounded-2xl border border-[#1a4a35]/08 p-4 mb-5">
                    <View className="flex-row items-center">
                      <View className="w-12 h-12 rounded-xl bg-[#1a4a35]/06 justify-center items-center">
                        <Ionicons
                          name="bed-outline"
                          size={24}
                          color="#1a4a35"
                        />
                      </View>

                      <View className="flex-1 ml-4">
                        <Text
                          className="text-[#1a4a35] text-lg"
                          style={{ fontFamily: "Georgia" }}
                        >
                          Room {draftRoom.room_number}
                        </Text>

                        <Text className="text-[#1a4a35]/40 text-xs">
                          {draftRoom.room_type?.type_name || "Standard"}
                        </Text>
                      </View>

                      <View className="items-end">
                        <Text className="text-[#c9a96e] font-semibold">
                          {formatPrice(
                            draftBookingType === "short"
                              ? draftShortPrice
                              : draftBasePrice,
                          )}
                        </Text>

                        {draftBookingType === "overnight" && (
                          <Text className="text-[#1a4a35]/40 text-[10px]">
                            /night
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>

                  <Text className="text-[#1a4a35]/40 text-[10px] tracking-[3px] uppercase mb-3">
                    Stay Type
                  </Text>
                  <View className="flex-row gap-3 mb-6">
                    <TouchableOpacity
                      onPress={() => changeDraftBookingType("overnight")}
                      className={`flex-1 py-3 rounded-xl ${
                        draftBookingType === "overnight"
                          ? "bg-[#1a4a35]"
                          : "bg-gray-200"
                      }`}
                    >
                      <Text
                        className={`text-center ${
                          draftBookingType === "overnight"
                            ? "text-white"
                            : "text-black"
                        }`}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        Overnight
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => changeDraftBookingType("short")}
                      className={`flex-1 py-3 rounded-xl ${
                        draftBookingType === "short"
                          ? "bg-[#1a4a35]"
                          : "bg-gray-200"
                      }`}
                    >
                      <Text
                        className={`text-center ${
                          draftBookingType === "short"
                            ? "text-white"
                            : "text-black"
                        }`}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        Short Stay
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text className="text-[#1a4a35]/40 text-[10px] tracking-[3px] uppercase mb-3">
                    {draftBookingType === "short"
                      ? "Stay Date"
                      : "Check-in Date"}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowDraftCheckIn(true)}
                    activeOpacity={0.85}
                    className="bg-white rounded-2xl border border-[#1a4a35]/08 overflow-hidden mb-4"
                  >
                    <View className="px-5 py-4">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-3 flex-1">
                          <View className="w-9 h-9 rounded-full bg-[#1a4a35]/06 justify-center items-center">
                            <Ionicons
                              name="calendar-outline"
                              size={17}
                              color="#1a4a35"
                            />
                          </View>

                          <View className="flex-1">
                            <Text className="text-[#1a4a35]/40 text-[10px] tracking-widest uppercase">
                              {draftBookingType === "short"
                                ? "Date"
                                : "Check-in"}
                            </Text>

                            {draftCheckInDate ? (
                              <Text
                                className="text-[#1a4a35] text-base mt-1"
                                style={{ fontFamily: "Georgia" }}
                              >
                                {formatDisplayDate(draftCheckInDate)}
                              </Text>
                            ) : (
                              <Text className="text-[#1a4a35]/30 text-sm mt-1">
                                Select date
                              </Text>
                            )}
                          </View>
                        </View>

                        <Ionicons
                          name="calendar-outline"
                          size={20}
                          color="#c9a96e"
                        />
                      </View>
                    </View>

                    {draftCheckInDate && (
                      <>
                        <View className="h-px bg-[#1a4a35]/06 mx-5" />
                        <View className="px-5 py-2">
                          <Text className="text-[#c9a96e] text-xs">
                            {formatDate(draftCheckInDate)}
                          </Text>
                        </View>
                      </>
                    )}
                  </TouchableOpacity>

                  {draftBookingType === "short" && (
                    <View className="mb-5">
                      <View className="flex-row items-center mb-3">
                        <View className="w-1 h-7 rounded-full bg-[#c9a96e] mr-3" />

                        <View className="flex-1">
                          <Text
                            className="text-[#1a4a35] text-base font-semibold"
                            style={{ fontFamily: "Georgia" }}
                          >
                            Expected Stay Time
                          </Text>

                          <Text className="text-[#1a4a35]/40 text-xs mt-1">
                            Short stay is automatically set to 4 hours.
                          </Text>
                        </View>

                        <View className="flex-row items-center bg-[#e9efeb] px-3 py-2 rounded-full">
                          <Ionicons
                            name="time-outline"
                            size={13}
                            color="#1a4a35"
                          />
                          <Text className="text-[#1a4a35] text-[10px] font-semibold ml-1">
                            4 HOURS
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row gap-3">
                        <View className="flex-1">
                          <Text className="text-[#1a4a35]/40 text-[10px] tracking-[2px] uppercase mb-2">
                            Expected Check-in
                          </Text>

                          <TouchableOpacity
                            onPress={openDraftTimePicker}
                            activeOpacity={0.85}
                            className="bg-white rounded-2xl border border-[#1a4a35]/10"
                          >
                            <View className="px-3 py-4 flex-row items-center">
                              <View className="w-8 h-8 rounded-full bg-[#e9efeb] justify-center items-center mr-2">
                                <Ionicons
                                  name="time-outline"
                                  size={15}
                                  color="#1a4a35"
                                />
                              </View>

                              <View className="flex-1">
                                <Text
                                  className="text-[#1a4a35] text-sm"
                                  style={{ fontFamily: "Georgia" }}
                                >
                                  {draftExpectedCheckInTime}
                                </Text>
                              </View>

                              <Ionicons
                                name="chevron-down"
                                size={16}
                                color="#1a4a35"
                              />
                            </View>
                          </TouchableOpacity>
                        </View>

                        <View className="flex-1">
                          <Text className="text-[#1a4a35]/40 text-[10px] tracking-[2px] uppercase mb-2">
                            Expected Check-out
                          </Text>

                          <View className="bg-[#e9efeb] rounded-2xl border border-[#1a4a35]/10">
                            <View className="px-3 py-4 flex-row items-center">
                              <View className="w-8 h-8 rounded-full bg-[#1a4a35]/10 justify-center items-center mr-2">
                                <Ionicons
                                  name="lock-closed-outline"
                                  size={13}
                                  color="#1a4a35"
                                />
                              </View>

                              <View className="flex-1">
                                <Text
                                  className="text-[#1a4a35] text-sm"
                                  style={{ fontFamily: "Georgia" }}
                                >
                                  {draftExpectedCheckOutTime}
                                </Text>

                                <Text className="text-[#1a4a35]/40 text-[8px] mt-1">
                                  Automatic +4 hours
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  )}

                  {draftBookingType === "overnight" && (
                    <>
                      <Text className="text-[#1a4a35]/40 text-[10px] tracking-[3px] uppercase mb-3">
                        Check-out Date
                      </Text>

                      <TouchableOpacity
                        onPress={() => {
                          if (!draftCheckInDate) {
                            Alert.alert(
                              "Check-in Required",
                              "Please select the check-in date first.",
                            );
                            return;
                          }
                          setShowDraftCheckOut(true);
                        }}
                        activeOpacity={0.85}
                        className="bg-white rounded-2xl border border-[#1a4a35]/08 overflow-hidden mb-5"
                      >
                        <View className="px-5 py-4">
                          <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center gap-3 flex-1">
                              <View className="w-9 h-9 rounded-full bg-[#1a4a35]/06 justify-center items-center">
                                <Ionicons
                                  name="calendar-outline"
                                  size={17}
                                  color="#1a4a35"
                                />
                              </View>

                              <View className="flex-1">
                                <Text className="text-[#1a4a35]/40 text-[10px] tracking-widest uppercase">
                                  Check-out
                                </Text>

                                {draftCheckOutDate ? (
                                  <Text
                                    className="text-[#1a4a35] text-base mt-1"
                                    style={{ fontFamily: "Georgia" }}
                                  >
                                    {formatDisplayDate(draftCheckOutDate)}
                                  </Text>
                                ) : (
                                  <Text className="text-[#1a4a35]/30 text-sm mt-1">
                                    Select date
                                  </Text>
                                )}
                              </View>
                            </View>

                            <Ionicons
                              name="calendar-outline"
                              size={20}
                              color="#c9a96e"
                            />
                          </View>
                        </View>

                        {draftCheckOutDate && (
                          <>
                            <View className="h-px bg-[#1a4a35]/06 mx-5" />
                            <View className="px-5 py-2">
                              <Text className="text-[#c9a96e] text-xs">
                                {formatDate(draftCheckOutDate)}
                              </Text>
                            </View>
                          </>
                        )}
                      </TouchableOpacity>
                    </>
                  )}

                  <View className="bg-white rounded-2xl border border-[#1a4a35]/08 p-5 mt-5 mb-5">
                    <Text className="text-[#1a4a35]/40 text-[10px] tracking-[3px] uppercase mb-4">
                      Room Summary
                    </Text>

                    <View className="flex-row justify-between items-center mb-3">
                      <Text
                        className="text-[#1a4a35]/50 text-sm"
                        style={{ flexShrink: 0 }}
                      >
                        Stay Type
                      </Text>

                      <Text
                        className="text-[#1a4a35] text-sm font-semibold text-right"
                        style={{ flex: 1, marginLeft: 12 }}
                      >
                        {draftBookingType === "overnight"
                          ? "Overnight"
                          : "Short Stay"}
                      </Text>
                    </View>

                    {draftBookingType === "overnight" && (
                      <View className="flex-row justify-between items-center mb-3">
                        <Text
                          className="text-[#1a4a35]/50 text-sm"
                          style={{ flexShrink: 0 }}
                        >
                          Nights
                        </Text>

                        <Text
                          className="text-[#1a4a35] text-sm font-semibold text-right"
                          style={{ flex: 1, marginLeft: 12 }}
                        >
                          {draftNights}
                        </Text>
                      </View>
                    )}

                    <View className="flex-row justify-between items-center">
                      <Text
                        className="text-[#1a4a35] text-base"
                        style={{ fontFamily: "Georgia", flexShrink: 0 }}
                      >
                        Subtotal
                      </Text>

                      <Text
                        className="text-[#c9a96e] text-xl text-right"
                        style={{
                          fontFamily: "Georgia",
                          flex: 1,
                          marginLeft: 12,
                        }}
                      >
                        {formatPrice(draftSubtotal)}
                      </Text>
                    </View>
                  </View>
                </ScrollView>

                <View className="px-6 pt-2">
                  <TouchableOpacity
                    onPress={addDraftRoom}
                    disabled={!draftCanAdd || draftLoadingDates}
                    className={`rounded-2xl py-4 items-center ${
                      draftCanAdd && !draftLoadingDates
                        ? "bg-[#1a4a35]"
                        : "bg-[#9fb0a7]"
                    }`}
                  >
                    {draftLoadingDates ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="text-white text-sm tracking-widest uppercase">
                        {editingRoomId !== null ? "Update Room" : "Add Room"}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setDraftRoom(null);
                      setDraftCheckInDate(null);
                      setDraftCheckOutDate(null);
                      setDraftBookedRanges([]);
                      setEditingRoomId(null);
                    }}
                    className="py-3 items-center"
                  >
                    <Text className="text-[#1a4a35]/50 text-xs">
                      ← Choose another room
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* SHORT STAY TIME PICKER */}

      <Modal
        visible={showDraftTimePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDraftTimePicker(false)}
      >
        <View className="flex-1 bg-black/30 justify-center items-center px-6">
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setShowDraftTimePicker(false)}
            className="absolute inset-0"
          />

          <View
            className="bg-white rounded-3xl w-full max-w-[330px] overflow-hidden"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.2,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <View className="px-5 pt-5 pb-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text
                    className="text-[#1a4a35] text-lg"
                    style={{ fontFamily: "Georgia" }}
                  >
                    Expected Check-in
                  </Text>

                  <Text className="text-[#1a4a35]/40 text-xs mt-1">
                    Select your expected check-in time
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setShowDraftTimePicker(false)}
                  className="w-9 h-9 rounded-full bg-[#e9efeb] justify-center items-center"
                >
                  <Ionicons name="close" size={18} color="#1a4a35" />
                </TouchableOpacity>
              </View>
            </View>

            <View className="mx-5 mt-2 rounded-2xl bg-[#f4f6f4] border border-[#1a4a35]/10">
              <View className="flex-row items-center justify-center py-4">
                <View className="items-center w-20">
                  <TouchableOpacity
                    onPress={() => changeDraftPickerHour("up")}
                    className="w-12 h-10 justify-center items-center"
                  >
                    <Ionicons name="chevron-up" size={26} color="#1a4a35" />
                  </TouchableOpacity>

                  <Text
                    className="text-[#1a4a35] text-4xl"
                    style={{ fontFamily: "Georgia" }}
                  >
                    {draftPickerHour}
                  </Text>

                  <TouchableOpacity
                    onPress={() => changeDraftPickerHour("down")}
                    className="w-12 h-10 justify-center items-center"
                  >
                    <Ionicons name="chevron-down" size={26} color="#1a4a35" />
                  </TouchableOpacity>
                </View>

                <Text
                  className="text-[#1a4a35] text-4xl mx-1"
                  style={{ fontFamily: "Georgia" }}
                >
                  :
                </Text>

                <View className="items-center w-20">
                  <TouchableOpacity
                    onPress={() => changeDraftPickerMinute("up")}
                    className="w-12 h-10 justify-center items-center"
                  >
                    <Ionicons name="chevron-up" size={26} color="#1a4a35" />
                  </TouchableOpacity>

                  <Text
                    className="text-[#1a4a35] text-4xl"
                    style={{ fontFamily: "Georgia" }}
                  >
                    {draftPickerMinute}
                  </Text>

                  <TouchableOpacity
                    onPress={() => changeDraftPickerMinute("down")}
                    className="w-12 h-10 justify-center items-center"
                  >
                    <Ionicons name="chevron-down" size={26} color="#1a4a35" />
                  </TouchableOpacity>
                </View>
              </View>

              <View className="flex-row mx-4 mb-4 border border-[#1a4a35]/20 rounded-xl overflow-hidden">
                <TouchableOpacity
                  onPress={() => toggleDraftPickerPeriod("AM")}
                  className={`flex-1 py-2.5 ${
                    draftPickerPeriod === "AM" ? "bg-[#1a4a35]" : "bg-white"
                  }`}
                >
                  <Text
                    className={`text-center font-semibold ${
                      draftPickerPeriod === "AM"
                        ? "text-white"
                        : "text-[#1a4a35]"
                    }`}
                  >
                    AM
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => toggleDraftPickerPeriod("PM")}
                  className={`flex-1 py-2.5 border-l border-[#1a4a35]/20 ${
                    draftPickerPeriod === "PM" ? "bg-[#1a4a35]" : "bg-white"
                  }`}
                >
                  <Text
                    className={`text-center font-semibold ${
                      draftPickerPeriod === "PM"
                        ? "text-white"
                        : "text-[#1a4a35]"
                    }`}
                  >
                    PM
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="px-5 pt-4">
              <View className="flex-row items-center justify-between bg-[#e9efeb] rounded-xl px-4 py-3">
                <View className="flex-1">
                  <Text className="text-[#1a4a35]/40 text-[9px] tracking-widest uppercase">
                    Expected Check-out
                  </Text>

                  <Text
                    className="text-[#1a4a35] text-base mt-1"
                    style={{ fontFamily: "Georgia" }}
                  >
                    {addHoursToTime(
                      `${draftPickerHour}:${draftPickerMinute} ${draftPickerPeriod}`,
                      4,
                    )}
                  </Text>
                </View>

                <Ionicons
                  name="arrow-forward-outline"
                  size={18}
                  color="#c9a96e"
                />
              </View>
            </View>

            <View className="px-5 pt-4 pb-5">
              <TouchableOpacity
                onPress={applyDraftTimePicker}
                activeOpacity={0.85}
                className="bg-[#1a4a35] rounded-2xl py-4"
              >
                <Text className="text-white text-center font-semibold">
                  Apply Time
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DRAFT CHECK-IN CALENDAR */}

      <Modal
        visible={showDraftCheckIn}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDraftCheckIn(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View
            className="bg-[#faf8f3] rounded-t-[30px] overflow-hidden"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <View className="px-6 pt-5 pb-3 flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-[#1a4a35]/40 text-[10px] tracking-[3px] uppercase">
                  Room {draftRoom?.room_number}
                </Text>

                <Text
                  className="text-[#1a4a35] text-2xl mt-1"
                  style={{ fontFamily: "Georgia" }}
                >
                  {draftBookingType === "short" ? "Stay Date" : "Check-in Date"}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setShowDraftCheckIn(false)}
                className="w-10 h-10 rounded-full bg-[#1a4a35]/06 justify-center items-center"
              >
                <Ionicons name="close" size={20} color="#1a4a35" />
              </TouchableOpacity>
            </View>

            {draftLoadingDates ? (
              <View className="py-12 items-center">
                <ActivityIndicator size="large" color="#1a4a35" />
                <Text className="text-[#1a4a35]/40 text-sm mt-3">
                  Checking room availability...
                </Text>
              </View>
            ) : (
              <Calendar
                markingType="custom"
                minDate={formatDate(new Date())}
                markedDates={draftCheckInMarkedDates}
                onDayPress={(day) => handleDraftCheckInSelect(day.dateString)}
                theme={{
                  backgroundColor: "#faf8f3",
                  calendarBackground: "#faf8f3",
                  textSectionTitleColor: "#1a4a35",
                  selectedDayBackgroundColor: "#1a4a35",
                  selectedDayTextColor: "#ffffff",
                  todayTextColor: "#c9a96e",
                  dayTextColor: "#1a4a35",
                  textDisabledColor: "#c4c4c4",
                  monthTextColor: "#1a4a35",
                  arrowColor: "#1a4a35",
                  textDayFontFamily: "System",
                  textMonthFontFamily: "Georgia",
                  textDayHeaderFontFamily: "System",
                }}
              />
            )}

            <View className="px-6 pt-2">
              <View className="flex-row items-center justify-center gap-3 mb-4 flex-wrap">
                <View className="flex-row items-center">
                  <View
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: "#B91C1C" }}
                  />
                  <Text className="text-[#1a4a35]/60 text-xs">
                    Already booked
                  </Text>
                </View>

                <View className="flex-row items-center">
                  <View
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: "#1A4A35" }}
                  />
                  <Text className="text-[#1a4a35]/60 text-xs">Check-in</Text>
                </View>

                <View className="flex-row items-center">
                  <View
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: "#A8863A" }}
                  />
                  <Text className="text-[#1a4a35]/60 text-xs">Check-out</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setShowDraftCheckIn(false)}
                className="bg-[#1a4a35] rounded-2xl py-4 items-center"
              >
                <Text className="text-white text-sm tracking-widest uppercase">
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DRAFT CHECK-OUT CALENDAR */}

      <Modal
        visible={showDraftCheckOut}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDraftCheckOut(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View
            className="bg-[#faf8f3] rounded-t-[30px] overflow-hidden"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <View className="px-6 pt-5 pb-3 flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-[#1a4a35]/40 text-[10px] tracking-[3px] uppercase">
                  Room {draftRoom?.room_number}
                </Text>

                <Text
                  className="text-[#1a4a35] text-2xl mt-1"
                  style={{ fontFamily: "Georgia" }}
                >
                  Check-out Date
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setShowDraftCheckOut(false)}
                className="w-10 h-10 rounded-full bg-[#1a4a35]/06 justify-center items-center"
              >
                <Ionicons name="close" size={20} color="#1a4a35" />
              </TouchableOpacity>
            </View>

            {draftLoadingDates ? (
              <View className="py-12 items-center">
                <ActivityIndicator size="large" color="#1a4a35" />
                <Text className="text-[#1a4a35]/40 text-sm mt-3">
                  Checking room availability...
                </Text>
              </View>
            ) : (
              <Calendar
                markingType="custom"
                minDate={
                  draftCheckInDate
                    ? formatDate(
                        new Date(
                          draftCheckInDate.getTime() + 24 * 60 * 60 * 1000,
                        ),
                      )
                    : formatDate(new Date())
                }
                markedDates={draftCheckOutMarkedDates}
                onDayPress={(day) => handleDraftCheckOutSelect(day.dateString)}
                theme={{
                  backgroundColor: "#faf8f3",
                  calendarBackground: "#faf8f3",
                  textSectionTitleColor: "#1a4a35",
                  selectedDayBackgroundColor: "#c9a96e",
                  selectedDayTextColor: "#ffffff",
                  todayTextColor: "#c9a96e",
                  dayTextColor: "#1a4a35",
                  textDisabledColor: "#c4c4c4",
                  monthTextColor: "#1a4a35",
                  arrowColor: "#1a4a35",
                  textDayFontFamily: "System",
                  textMonthFontFamily: "Georgia",
                  textDayHeaderFontFamily: "System",
                }}
              />
            )}

            <View className="px-6 pt-2">
              <View className="flex-row items-center justify-center gap-3 mb-4 flex-wrap">
                <View className="flex-row items-center">
                  <View
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: "#B91C1C" }}
                  />
                  <Text className="text-[#1a4a35]/60 text-xs">
                    Already booked
                  </Text>
                </View>

                <View className="flex-row items-center">
                  <View
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: "#1A4A35" }}
                  />
                  <Text className="text-[#1a4a35]/60 text-xs">Check-in</Text>
                </View>

                <View className="flex-row items-center">
                  <View
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: "#A8863A" }}
                  />
                  <Text className="text-[#1a4a35]/60 text-xs">Check-out</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setShowDraftCheckOut(false)}
                className="bg-[#1a4a35] rounded-2xl py-4 items-center"
              >
                <Text className="text-white text-sm tracking-widest uppercase">
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}