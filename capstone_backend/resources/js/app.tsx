import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "./layouts/AdminLayout";

// ADMIN
import Dashboard from "./pages/admin/main/Dashboard";
import Bookings from "./pages/admin/management/Bookings";
import WalkIn from "./pages/admin/operations/WalkIn";
import Rooms from "./pages/admin/management/Rooms";
import Guests from "./pages/admin/management/Guests";
import Reports from "./pages/admin/analytics/Reports";
import AdminMenu from "./pages/admin/restaurant/Menu";
import AdminOrders from "./pages/admin/restaurant/OrdersReport";
import ChatPage from "./pages/admin/messages/[userId]";

// STAFF
import StaffLayout from "./layouts/StaffLayout";
import RestaurantDashboard from "./pages/staff/RestaurantDashboard";
import Orders from "./pages/staff/Orders";
import Menu from "./pages/staff/Menu";
import Product from "./pages/staff/Product";

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
                    <Route path="/admin/menu" element={<AdminMenu />} />
                    <Route path="/admin/orders" element={<AdminOrders />} />
                    <Route path="/messages/:userId" element={<ChatPage />} />

                    {/* DEFAULT */}
                    <Route path="*" element={<Navigate to="/dashboard" />} />
                </Route>
            )}

            {/* 🍽️ STAFF ROUTES */}
            {user?.role === "staff" && (
                <Route element={<StaffLayout />}>

                    <Route path="/restaurant" element={<RestaurantDashboard />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/menu" element={<Menu />} />
                    <Route path="/product" element={<Product />} />

                    {/* DEFAULT */}
                    <Route path="*" element={<Navigate to="/restaurant" />} />

                </Route>
            )}
        </Routes>
    );
}