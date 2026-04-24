import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
    Form,
    Input,
    Button,
    Card,
    Select,
    DatePicker,
    Space,
    Typography,
    Alert,
    Badge,
    Row,
    Col,
    Divider,
    Tag,
    message,
    Statistic,
    Modal,
    Empty,
    Spin,
    ConfigProvider,
    Tooltip
} from "antd";
import {
    UserOutlined,
    PhoneOutlined,
    EnvironmentOutlined,
    CalendarOutlined,
    TeamOutlined,
    PlusOutlined,
    DeleteOutlined,
    ApartmentOutlined,
    CreditCardOutlined,
    DollarOutlined,
    InfoCircleOutlined,
    BuildOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import api from "@/services/api";
import { motion, AnimatePresence } from "framer-motion";

const { Title, Text } = Typography;

interface Room {
    id: number;
    room_number: string;
    status: string;
    room_type?: {
        base_price: number;
        short_stay_price?: number;
        type_name?: string;
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
}

export default function WalkIn() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [form] = Form.useForm();

    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedRoomsDetails, setSelectedRoomsDetails] = useState<SelectedRoom[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchingRooms, setFetchingRooms] = useState(false);
    const [guestName, setGuestName] = useState("");
    const [contactNumber, setContactNumber] = useState("");
    const [address, setAddress] = useState("");
    const [selectedRoomValue, setSelectedRoomValue] = useState<number | null>(null);

    // State for new room form
    const [newRoomStayType, setNewRoomStayType] = useState<"short_stay" | "overnight">("overnight");
    const [newRoomCheckIn, setNewRoomCheckIn] = useState<string>(dayjs().format('YYYY-MM-DD'));
    const [newRoomCheckOut, setNewRoomCheckOut] = useState<string>(dayjs().add(1, 'day').format('YYYY-MM-DD'));
    const [previewAmount, setPreviewAmount] = useState<number>(0);

    // Load rooms
    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        try {
            setFetchingRooms(true);
            const res = await api.get("/rooms");

            let available = res.data.filter(
                (room: Room) => room.status === "available"
            );

            // Filter out already selected rooms
            available = available.filter(
                (room: Room) => !selectedRoomsDetails.some(r => r.id === room.id)
            );

            setRooms(available);
        } catch (err) {
            console.error("Failed to fetch rooms", err);
            message.error("Failed to load available rooms. Please refresh the page.");
        } finally {
            setFetchingRooms(false);
        }
    };

    useEffect(() => {
        fetchRooms();
    }, [selectedRoomsDetails]);

    // Calculate preview amount when selections change
    useEffect(() => {
        if (selectedRoomValue) {
            const room = rooms.find(r => r.id === selectedRoomValue);
            if (room) {
                let amount = 0;
                if (newRoomStayType === "short_stay") {
                    amount = room.room_type?.short_stay_price || room.room_type?.base_price || 0;
                } else {
                    const nights = Math.max(1, dayjs(newRoomCheckOut).diff(dayjs(newRoomCheckIn), 'day'));
                    amount = (room.room_type?.base_price || 0) * nights;
                }
                setPreviewAmount(amount);
            }
        } else {
            setPreviewAmount(0);
        }
    }, [selectedRoomValue, newRoomStayType, newRoomCheckIn, newRoomCheckOut, rooms]);

    const getNightsCount = (checkIn: string, checkOut: string) => {
        if (checkIn && checkOut) {
            return Math.max(1, dayjs(checkOut).diff(dayjs(checkIn), 'day'));
        }
        return 1;
    };

    const calculateRoomSubtotal = (room: Room, stayType: "short_stay" | "overnight", checkIn: string, checkOut: string) => {
        const pricePerUnit = stayType === "short_stay"
            ? (room.room_type?.short_stay_price || room.room_type?.base_price || 0)
            : (room.room_type?.base_price || 0);

        if (stayType === "short_stay") {
            return pricePerUnit;
        } else {
            const nights = getNightsCount(checkIn, checkOut);
            return pricePerUnit * nights;
        }
    };

    const addRoom = (roomId: number, stayType: "short_stay" | "overnight", checkIn: string, checkOut: string) => {
        const roomToAdd = rooms.find(r => r.id === roomId);
        if (!roomToAdd) return;

        if (selectedRoomsDetails.some(r => r.id === roomToAdd.id)) {
            message.warning("Room already selected");
            return;
        }

        const pricePerUnit = stayType === "short_stay"
            ? (roomToAdd.room_type?.short_stay_price || roomToAdd.room_type?.base_price || 0)
            : (roomToAdd.room_type?.base_price || 0);

        const nights = stayType === "short_stay" ? 1 : getNightsCount(checkIn, checkOut);
        const subtotal = calculateRoomSubtotal(roomToAdd, stayType, checkIn, checkOut);

        setSelectedRoomsDetails(prev => [...prev, {
            id: roomToAdd.id,
            room_number: roomToAdd.room_number,
            room_type_name: roomToAdd.room_type?.type_name || "Standard",
            price_per_unit: pricePerUnit,
            stay_type: stayType,
            check_in_date: checkIn,
            check_out_date: checkOut,
            nights: nights,
            subtotal: subtotal
        }]);

        // Reset the select dropdown
        setSelectedRoomValue(null);
        setPreviewAmount(0);

        message.success(`Room ${roomToAdd.room_number} added successfully`);
    };

    const removeRoom = (roomId: number) => {
        const room = selectedRoomsDetails.find(r => r.id === roomId);

        setSelectedRoomsDetails(prev => prev.filter(r => r.id !== roomId));

        setSelectedRoomValue(null);
        setPreviewAmount(0);

        if (room) {
            message.info(`Room ${room.room_number} removed`);
        }
    };

    const calculateTotal = () => {
        return selectedRoomsDetails.reduce(
            (sum, room) => sum + Number(room.subtotal),
            0
        );
    };

    const total = Number(calculateTotal());

    const handleSubmit = async () => {
        if (!guestName.trim()) {
            message.warning("Please enter guest name");
            return;
        }

        if (selectedRoomsDetails.length === 0) {
            message.warning("Please select at least one room");
            return;
        }

        setLoading(true);

        try {
            const payload = {
                guest_name: guestName,
                contact_number: contactNumber,
                address: address,
                room_ids: selectedRoomsDetails.map(room => room.id),
                stay_types: selectedRoomsDetails.map(room => room.stay_type),
                subtotals: selectedRoomsDetails.map(room => room.subtotal),
                check_in_date: selectedRoomsDetails[0]?.check_in_date,
                check_out_date: selectedRoomsDetails[0]?.check_out_date
            };

            await api.post("/walk-in-guests", payload);

            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
            queryClient.invalidateQueries({ queryKey: ["rooms"] });
            queryClient.invalidateQueries({ queryKey: ["bookings"] });
            queryClient.invalidateQueries({ queryKey: ["walk-in-guests"] });

            const roomDetails = selectedRoomsDetails.map(r => r.room_number).join(", ");

            message.success({
                content: `Walk-in successful! Guest checked into: ${roomDetails}`,
                duration: 3,
                icon: <CheckCircleOutlined />
            });

            // Reset form
            setGuestName("");
            setContactNumber("");
            setAddress("");
            setSelectedRoomsDetails([]);
            setSelectedRoomValue(null);
            setPreviewAmount(0);

            form.setFieldsValue({
                guest_name: "",
                contact_number: "",
                address: ""
            });

            await fetchRooms();

        } catch (err: any) {
            console.error("Walk-in error:", err);

            if (err.response?.status === 409) {
                message.error("Some rooms are no longer available. Please refresh and try again.");
                await fetchRooms();
                setSelectedRoomsDetails([]);
                setSelectedRoomValue(null);
                setPreviewAmount(0);
            } else if (err.response?.status === 400) {
                message.error(err.response?.data?.message || "Invalid data. Please check your inputs.");
            } else {
                message.error(err.response?.data?.message || "Failed to check in guest. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2
        }).format(amount);
    };

    const formatDate = (date: string) => {
        return dayjs(date).format('MMM DD');
    };

    const roomsByType = rooms.reduce((acc, room) => {
        const typeName = room.room_type?.type_name || "Standard";
        if (!acc[typeName]) acc[typeName] = [];
        acc[typeName].push(room);
        return acc;
    }, {} as Record<string, Room[]>);

    // Mint green color scheme
    const mintGreen = '#10b981';
    const mintGreenDark = '#059669';
    const mintGreenBg = '#ecfdf5';
    const neutralText = '#1e293b';
    const neutralTextLight = '#64748b';
    const neutralBorder = '#e2e8f0';

    // Handle check-in date change
    const handleCheckInChange = (date: Dayjs | null) => {
        if (!date) {
            // Don't allow clearing - keep current date
            return;
        }
        
        const newDate = date.format('YYYY-MM-DD');
        setNewRoomCheckIn(newDate);
        
        if (newRoomStayType === "overnight") {
            // For overnight, set check-out to next day
            setNewRoomCheckOut(dayjs(newDate).add(1, 'day').format('YYYY-MM-DD'));
        } else {
            // For short stay, check-out is same day
            setNewRoomCheckOut(newDate);
        }
    };

    // Handle check-out date change
    const handleCheckOutChange = (date: Dayjs | null) => {
        if (!date) {
            // Don't allow clearing - set to default based on stay type
            if (newRoomStayType === "overnight") {
                setNewRoomCheckOut(dayjs(newRoomCheckIn).add(1, 'day').format('YYYY-MM-DD'));
            } else {
                setNewRoomCheckOut(newRoomCheckIn);
            }
            return;
        }
        
        const newDate = date.format('YYYY-MM-DD');
        setNewRoomCheckOut(newDate);
    };

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: mintGreen,
                    borderRadius: 8,
                    colorBgContainer: '#ffffff',
                    colorLink: mintGreen,
                },
            }}
        >
            <div style={{
                minHeight: '100vh',
                padding: '24px'
            }}>
                <div style={{ maxWidth: 1400, margin: '0 auto' }}>
                    {/* Header Section with Animation */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Card
                            style={{
                                marginBottom: 24,
                                borderRadius: 16,
                                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
                                border: `1px solid ${neutralBorder}`
                            }}
                            bodyStyle={{ padding: '20px 24px' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                                <Space size="large">
                                    <div style={{
                                        background: `linear-gradient(135deg, ${mintGreen} 0%, ${mintGreenDark} 100%)`,
                                        padding: 12,
                                        borderRadius: 12,
                                        display: 'inline-flex'
                                    }}>
                                        <TeamOutlined style={{ fontSize: 28, color: 'white' }} />
                                    </div>
                                    <div>
                                        <Title level={3} style={{ margin: 0, color: neutralText }}>Walk-In Guest Registration</Title>
                                        <Text style={{ color: neutralTextLight }}>
                                            Register and assign rooms for walk-in guests
                                        </Text>
                                    </div>
                                </Space>
                            </div>
                        </Card>
                    </motion.div>

                    <Row gutter={[24, 24]}>
                        {/* Main Form Section */}
                        <Col xs={24} lg={16}>
                            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                                {/* Unified Card with all sections */}
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.5, delay: 0.1 }}
                                >
                                    <Card
                                        style={{
                                            borderRadius: 16,
                                            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)'
                                        }}
                                    >
                                        {/* Guest Information Section */}
                                        <div>
                                            <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                                <div style={{
                                                    width: 28,
                                                    height: 28,
                                                    background: '#ffffff',
                                                    borderRadius: 8,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                                }}>
                                                    <UserOutlined style={{ color: '#000000', fontSize: 20 }} />
                                                </div>
                                                <span style={{ color: neutralText, fontSize: 20 }}>Guest Information</span>
                                            </h2>
                                            <Row gutter={16}>
                                                <Col xs={24} md={12}>
                                                    <div>
                                                        <div style={{ marginBottom: 8, fontWeight: 500, color: neutralText }}>
                                                            Guest Name <span style={{ color: '#ef4444' }}>*</span>
                                                        </div>
                                                        <Input
                                                            prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
                                                            placeholder="Enter full name"
                                                            value={guestName}
                                                            onChange={(e) => setGuestName(e.target.value)}
                                                            size="large"
                                                            style={{ borderRadius: 10 }}
                                                        />
                                                    </div>
                                                </Col>
                                                <Col xs={24} md={12}>
                                                    <div>
                                                        <div style={{ marginBottom: 8, fontWeight: 500, color: neutralText }}>Contact Number</div>
                                                        <Input
                                                            prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />}
                                                            placeholder="09123456789"
                                                            value={contactNumber}
                                                            onChange={(e) => setContactNumber(e.target.value)}
                                                            size="large"
                                                            style={{ borderRadius: 10 }}
                                                        />
                                                    </div>
                                                </Col>
                                                <Col xs={24}>
                                                    <div>
                                                        <div style={{ marginBottom: 8, fontWeight: 500, color: neutralText }}>Address</div>
                                                        <Input
                                                            prefix={<EnvironmentOutlined style={{ color: '#94a3b8' }} />}
                                                            placeholder="Enter complete address"
                                                            value={address}
                                                            onChange={(e) => setAddress(e.target.value)}
                                                            size="large"
                                                            style={{ borderRadius: 10 }}
                                                        />
                                                    </div>
                                                </Col>
                                            </Row>
                                        </div>

                                        <Divider style={{ margin: '24px 0' }} />

                                        {/* Add New Room Section */}
                                        <div>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: 12
                                                }}
                                            >
                                                <h2
                                                    className="text-base font-semibold text-gray-800 flex items-center gap-2"
                                                    style={{ margin: 0 }}
                                                >
                                                    <span style={{ color: neutralText }}>Select Room</span>
                                                </h2>

                                                <Button
                                                    type="primary"
                                                    icon={<PlusOutlined />}
                                                    onClick={() => {
                                                        if (selectedRoomValue) {
                                                            addRoom(
                                                                selectedRoomValue,
                                                                newRoomStayType,
                                                                newRoomCheckIn,
                                                                newRoomCheckOut
                                                            );
                                                        } else {
                                                            message.warning("Please select a room first");
                                                        }
                                                    }}
                                                    style={{
                                                        borderRadius: 8,
                                                        background: mintGreen,
                                                        borderColor: mintGreen
                                                    }}
                                                >
                                                    Add
                                                </Button>
                                            </div>

                                            <Row gutter={16}>
                                                <Col xs={24} md={8}>
                                                    <div>
                                                        <div style={{ marginBottom: 8, fontWeight: 500, color: neutralText }}>
                                                            Choose Room <span style={{ color: '#ef4444' }}>*</span>
                                                        </div>
                                                        <Select
                                                            value={selectedRoomValue}
                                                            onChange={(value) => {
                                                                setSelectedRoomValue(value);
                                                            }}
                                                            style={{ width: '100%', borderRadius: 10 }}
                                                            size="large"
                                                            placeholder="Choose a room"
                                                            loading={fetchingRooms}
                                                            disabled={fetchingRooms || rooms.length === 0}
                                                            notFoundContent={fetchingRooms ? "Loading rooms..." : "No available rooms"}
                                                            allowClear
                                                        >
                                                            {Object.entries(roomsByType).map(([typeName, typeRooms]) => (
                                                                <Select.OptGroup key={typeName} label={`${typeName} Rooms`}>
                                                                    {typeRooms.map((room) => (
                                                                        <Select.Option key={room.id} value={room.id}>
                                                                            Room {room.room_number} - {formatCurrency(room.room_type?.base_price || 0)}/night
                                                                        </Select.Option>
                                                                    ))}
                                                                </Select.OptGroup>
                                                            ))}
                                                        </Select>
                                                    </div>
                                                </Col>
                                                <Col xs={24} md={5}>
                                                    <div>
                                                        <div style={{ marginBottom: 8, fontWeight: 500, color: neutralText }}>
                                                            Stay Type
                                                        </div>
                                                        <Select
                                                            value={newRoomStayType}
                                                            onChange={(value) => {
                                                                setNewRoomStayType(value);
                                                                if (value === "short_stay") {
                                                                    // For short stay, check-out is same day
                                                                    setNewRoomCheckOut(newRoomCheckIn);
                                                                } else {
                                                                    // For overnight, check-out is next day
                                                                    setNewRoomCheckOut(dayjs(newRoomCheckIn).add(1, 'day').format('YYYY-MM-DD'));
                                                                }
                                                            }}
                                                            size="large"
                                                            style={{ width: '100%', borderRadius: 10 }}
                                                        >
                                                            <Select.Option value="overnight">Overnight</Select.Option>
                                                            <Select.Option value="short_stay">Short Stay (3 hrs)</Select.Option>
                                                        </Select>
                                                    </div>
                                                </Col>
                                                <Col xs={24} md={5}>
                                                    <div>
                                                        <div style={{ marginBottom: 8, fontWeight: 500, color: neutralText }}>
                                                            Check-in Date
                                                        </div>
                                                        <DatePicker
                                                            style={{ 
                                                                width: '100%', 
                                                                borderRadius: 10,
                                                                cursor: 'pointer'
                                                            }}
                                                            size="large"
                                                            value={dayjs(newRoomCheckIn)}
                                                            onChange={handleCheckInChange}
                                                            disabledDate={(current) => current && current < dayjs().startOf('day')}
                                                            inputReadOnly={true}
                                                            popupClassName="datepicker-hand-cursor"
                                                            allowClear={false}
                                                        />
                                                    </div>
                                                </Col>
                                                <Col xs={24} md={6}>
                                                    <div>
                                                        <div style={{ marginBottom: 8, fontWeight: 500, color: neutralText }}>
                                                            Check-out Date
                                                        </div>
                                                        <DatePicker
                                                            style={{ 
                                                                width: '100%', 
                                                                borderRadius: 10,
                                                                cursor: 'pointer'
                                                            }}
                                                            size="large"
                                                            value={dayjs(newRoomCheckOut)}
                                                            onChange={handleCheckOutChange}
                                                            disabledDate={(current) => {
                                                                if (newRoomStayType === "short_stay") {
                                                                    // For short stay, only allow same day
                                                                    return current && current.format('YYYY-MM-DD') !== newRoomCheckIn;
                                                                } else {
                                                                    // For overnight, only allow dates after check-in
                                                                    return current && current <= dayjs(newRoomCheckIn);
                                                                }
                                                            }}
                                                            disabled={newRoomStayType === "short_stay"}
                                                            inputReadOnly={true}
                                                            popupClassName="datepicker-hand-cursor"
                                                            allowClear={false}
                                                        />
                                                    </div>
                                                </Col>
                                            </Row>

                                            {/* Preview Card - Shows calculated amount before adding */}
                                            {selectedRoomValue && previewAmount > 0 && (
                                                <div style={{
                                                    marginTop: 16,
                                                    padding: '12px 16px',
                                                    background: mintGreenBg,
                                                    borderRadius: 10,
                                                    border: `1px solid ${neutralBorder}`
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div>
                                                            <Text strong style={{ color: neutralText }}>
                                                                {newRoomStayType === "short_stay" ? "Short Stay Amount:" : `Total for ${Math.max(1, dayjs(newRoomCheckOut).diff(dayjs(newRoomCheckIn), 'day'))} night(s):`}
                                                            </Text>
                                                            <div style={{ fontSize: '12px', color: neutralTextLight, marginTop: 4 }}>
                                                                {newRoomStayType === "short_stay"
                                                                    ? `Fixed rate for 3 hours`
                                                                    : `₱${(rooms.find(r => r.id === selectedRoomValue)?.room_type?.base_price || 0).toLocaleString()} per night × ${Math.max(1, dayjs(newRoomCheckOut).diff(dayjs(newRoomCheckIn), 'day'))} night(s)`}
                                                            </div>
                                                        </div>
                                                        <span style={{ fontSize: '24px', fontWeight: 'bold', color: mintGreen }}>
                                                            {formatCurrency(previewAmount)}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <Divider style={{ margin: '24px 0' }} />

                                        {/* Room Selection Section - Selected Rooms as ROWS (Grid Layout) */}
                                        <div>
                                            <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                                <ApartmentOutlined style={{ color: mintGreen }} />
                                                <span style={{ color: neutralText }}>Selected Rooms ({selectedRoomsDetails.length})</span>
                                            </h2>

                                            {/* Selected Rooms as ROWS - Grid Layout */}
                                            <AnimatePresence>
                                                {selectedRoomsDetails.length > 0 ? (
                                                    <motion.div
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '12px'
                                                        }}
                                                    >
                                                        {selectedRoomsDetails.map((room, index) => (
                                                            <motion.div
                                                                key={room.id}
                                                                initial={{ opacity: 0, x: -20 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                exit={{ opacity: 0, x: 20 }}
                                                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        background: mintGreenBg,
                                                                        borderRadius: '12px',
                                                                        border: `1px solid ${neutralBorder}`,
                                                                        padding: '12px 16px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'space-between',
                                                                        flexWrap: 'wrap',
                                                                        gap: '12px'
                                                                    }}
                                                                >
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                                                        <span style={{ fontWeight: 600, color: neutralText, fontSize: '14px', minWidth: '70px' }}>
                                                                            Room {room.room_number}
                                                                        </span>

                                                                        <Tag
                                                                            color={room.stay_type === "short_stay" ? "orange" : "blue"}
                                                                            style={{
                                                                                fontSize: '11px',
                                                                                padding: '2px 10px',
                                                                                margin: 0,
                                                                                borderRadius: '12px'
                                                                            }}
                                                                        >
                                                                            {room.stay_type === "short_stay" ? "Short Stay (3 hrs)" : `Overnight (${room.nights} night${room.nights > 1 ? 's' : ''})`}
                                                                        </Tag>

                                                                        <span style={{ fontSize: '11px', color: neutralTextLight }}>
                                                                            📅 {formatDate(room.check_in_date)} → {formatDate(room.check_out_date)}
                                                                        </span>

                                                                        <span style={{ fontSize: '12px', color: neutralTextLight }}>
                                                                            Rate: {formatCurrency(room.price_per_unit)}{room.stay_type === "overnight" && "/night"}
                                                                        </span>
                                                                    </div>

                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                                        <span style={{ fontWeight: 700, color: mintGreen, fontSize: '15px' }}>
                                                                            {formatCurrency(room.subtotal)}
                                                                        </span>

                                                                        <Button
                                                                            type="text"
                                                                            danger
                                                                            size="small"
                                                                            icon={<DeleteOutlined />}
                                                                            onClick={() => removeRoom(room.id)}
                                                                            style={{
                                                                                padding: '4px 8px',
                                                                                height: 'auto'
                                                                            }}
                                                                        >
                                                                            Remove
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        ))}
                                                    </motion.div>
                                                ) : (
                                                    <Empty description="No rooms added yet. Use the form above to add rooms." style={{ marginTop: 16 }} />
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </Card>
                                </motion.div>
                            </Space>
                        </Col>

                        {/* Summary Sidebar with Animation - Combined Container */}
                        <Col xs={24} lg={8}>
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                style={{ position: 'sticky', top: 24 }}
                            >
                                <Card
                                    style={{
                                        borderRadius: 16,
                                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)'
                                    }}
                                    bodyStyle={{ padding: 0 }}
                                >
                                    {/* Payment Summary Section */}
                                    {selectedRoomsDetails.length > 0 && (
                                        <div style={{ padding: '20px' }}>
                                            <div style={{ marginBottom: 16 }}>
                                                <span style={{ color: neutralText, fontWeight: 600, fontSize: 18 }}>Payment Summary</span>
                                            </div>

                                            <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
                                                {selectedRoomsDetails.map((room) => (
                                                    <div key={room.id} style={{ marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${neutralBorder}` }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                            <Text style={{ color: neutralText, fontSize: 13 }}>Room {room.room_number}</Text>
                                                            <Text strong style={{ color: mintGreen, fontSize: 13 }}>{formatCurrency(room.subtotal)}</Text>
                                                        </div>
                                                        <div style={{ fontSize: '10px', color: neutralTextLight }}>
                                                            {room.stay_type === "short_stay" ? (
                                                                <>Short Stay (3 hours) • ₱{room.price_per_unit.toLocaleString()} fixed</>
                                                            ) : (
                                                                <>Overnight • {room.nights} night{room.nights > 1 ? 's' : ''} • ₱{room.price_per_unit.toLocaleString()}/night</>
                                                            )}
                                                        </div>
                                                        <div style={{ fontSize: '10px', color: neutralTextLight }}>
                                                            {formatDate(room.check_in_date)} → {formatDate(room.check_out_date)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <Divider style={{ margin: '12px 0' }} />

                                            <div style={{ textAlign: 'right', marginBottom: 16 }}>
                                                <div style={{ fontSize: '13px', color: neutralTextLight, marginBottom: 4 }}>
                                                    Total Amount ({selectedRoomsDetails.length} Room{selectedRoomsDetails.length > 1 ? 's' : ''})
                                                </div>
                                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: mintGreen }}>
                                                    {formatCurrency(total)}
                                                </div>
                                                <div style={{ fontSize: '11px', color: neutralTextLight, marginTop: 4 }}>
                                                    {selectedRoomsDetails.filter(r => r.stay_type === "short_stay").length} Short Stay • {selectedRoomsDetails.filter(r => r.stay_type === "overnight").length} Overnight
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Submit Button Section */}
                                    <div style={{
                                        padding: selectedRoomsDetails.length > 0 ? '0 20px 20px 20px' : '20px',
                                        borderTop: selectedRoomsDetails.length > 0 ? `1px solid ${neutralBorder}` : 'none'
                                    }}>
                                        <Button
                                            type="primary"
                                            onClick={handleSubmit}
                                            loading={loading}
                                            disabled={
                                                selectedRoomsDetails.length === 0 ||
                                                !guestName.trim() ||
                                                fetchingRooms
                                            }
                                            size="large"
                                            block
                                            icon={<CreditCardOutlined />}
                                            style={{
                                                background: `linear-gradient(135deg, ${mintGreen} 0%, ${mintGreenDark} 100%)`,
                                                borderColor: mintGreen,
                                                height: 44,
                                                fontSize: 15,
                                                borderRadius: 10,
                                                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                            }}
                                        >
                                            {loading ? <Spin /> : "Complete Check-in"}
                                            {selectedRoomsDetails.length > 0 && ` (${selectedRoomsDetails.length} Room${selectedRoomsDetails.length > 1 ? 's' : ''})`}
                                        </Button>

                                        {selectedRoomsDetails.length === 0 && (
                                            <Text style={{ color: neutralTextLight, display: 'block', textAlign: 'center', marginTop: 12, fontSize: 12 }}>
                                                Add at least one room to continue
                                            </Text>
                                        )}
                                    </div>
                                </Card>
                            </motion.div>
                        </Col>
                    </Row>
                </div>
            </div>
        </ConfigProvider>
    );
}