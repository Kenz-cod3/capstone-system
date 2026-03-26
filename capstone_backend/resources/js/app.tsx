import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "./layouts/AdminLayout";

// ADMIN
import Dashboard from "./pages/admin/main/Dashboard";
import Bookings from "./pages/admin/management/Bookings";
import WalkIn from "./pages/admin/operations/WalkIn";
import Rooms from "./pages/admin/management/Rooms";
import Guests from "./pages/admin/management/Guests";
import Reports from "./pages/admin/analytics/Reports";
import ChatPage from "./pages/admin/messages/[userId]";

// STAFF
import RestaurantDashboard from "./pages/staff/RestaurantDashboard";
import Orders from "./pages/staff/Orders";
import Menu from "./pages/staff/Menu";

// AUTH
import Login from "./pages/auth/Login";

export default function App() {
    const user = JSON.parse(localStorage.getItem("user") || "null");

    return (
        <Routes>
            {/* 🔓 PUBLIC ROUTE */}
            <Route path="/login" element={<Login />} />

            {/* 🔐 NOT LOGGED IN */}
            {!user && (
                <Route path="*" element={<Navigate to="/login" />} />
            )}

            {/* 🔐 ADMIN ROUTES */}
            {user?.role === "admin" && (
                <Route element={<AdminLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/bookings" element={<Bookings />} />
                    <Route path="/walk-in-guests" element={<WalkIn />} />
                    <Route path="/rooms" element={<Rooms />} />
                    <Route path="/guests" element={<Guests />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/messages/:userId" element={<ChatPage />} />

                    {/* DEFAULT */}
                    <Route path="*" element={<Navigate to="/dashboard" />} />
                </Route>
            )}

            {/* 🍽️ STAFF ROUTES */}
            {user?.role === "staff" && (
                <>
                    <Route path="/restaurant" element={<RestaurantDashboard />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/menu" element={<Menu />} />

                    {/* DEFAULT */}
                    <Route path="*" element={<Navigate to="/restaurant" />} />
                </>
            )}
        </Routes>
    );
}