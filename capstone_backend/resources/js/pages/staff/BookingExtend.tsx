import React, { useEffect, useState } from "react";
import { Input, Card, Button, Typography, message, Spin } from "antd";
import api from "@/services/api";

const { Title, Text } = Typography;
const { Search } = Input;

interface Booking {
  id: number;
  booking_reference: string;
  total_price: number;
  booking_status: string;
  stay_type: string;
  user?: {
    first_name?: string;
    last_name?: string;
  };
}

export default function BookingExtend() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filtered, setFiltered] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");

  // 🔥 Fetch ACTIVE bookings only
  const fetchBookings = async () => {
    try {
      setLoading(true);

      const res = await api.get("/bookings/active");

      const data = res.data?.data ?? res.data ?? [];

      setBookings(data);
      setFiltered(data);
    } catch (error) {
      console.log(error);
      message.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // 🔍 SEARCH FUNCTION
  const handleSearch = (value: string) => {
    setSearchText(value);

    const filteredData = bookings.filter((b) => {
      const name = `${b.user?.first_name ?? ""} ${b.user?.last_name ?? ""}`;

      return (
        name.toLowerCase().includes(value.toLowerCase()) ||
        b.booking_reference.toLowerCase().includes(value.toLowerCase()) ||
        String(b.id).includes(value)
      );
    });

    setFiltered(filteredData);
  };

  // ➕ EXTEND FUNCTION
  const handleExtend = async (id: number) => {
    try {
      await api.post(`/bookings/${id}/extend`);

      message.success("Extended +1 hour");

      // refresh data
      fetchBookings();
    } catch (error: any) {
      console.log(error?.response?.data || error);
      message.error("Failed to extend");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <Title level={4}>Extend Booking</Title>

      {/* 🔍 SEARCH BAR */}
      <Search
        placeholder="Search by name, reference, or ID"
        allowClear
        onChange={(e) => handleSearch(e.target.value)}
        style={{ marginBottom: 20, maxWidth: 400 }}
      />

      {/* 🔄 LOADING */}
      {loading ? (
        <Spin />
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {filtered.map((b) => (
            <Card key={b.id} style={{ borderRadius: 12 }}>
              <Text strong>
                {b.user?.first_name} {b.user?.last_name}
              </Text>
              <br />

              <Text>Ref: {b.booking_reference}</Text>
              <br />

              <Text>Status: {b.booking_status}</Text>
              <br />

              <Text strong>
                ₱{b.total_price.toLocaleString()}
              </Text>

              <div style={{ marginTop: 12 }}>
                <Button
                  type="primary"
                  onClick={() => handleExtend(b.id)}
                  disabled={b.booking_status !== "checked_in"}
                >
                  + Extend
                </Button>
              </div>
            </Card>
          ))}

          {/* ❌ EMPTY STATE */}
          {filtered.length === 0 && (
            <Text type="secondary">No active bookings found</Text>
          )}
        </div>
      )}
    </div>
  );
}