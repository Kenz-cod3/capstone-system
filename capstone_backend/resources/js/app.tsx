import { configureEcho } from '@laravel/echo-react';

configureEcho({
    broadcaster: 'reverb',
});
import { useLoadingStore } from "@/stores/useLoadingStore";
import LoadingScreen from "@/components/LoadingScreen";
import { useEffect } from "react";
import "pannellum/build/pannellum.css";

import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import AdminLayout from "./layouts/AdminLayout";

// ADMIN
import Dashboard from "./pages/admin/main/Dashboard";
import Bookings from "./pages/admin/management/BookingManagement";
import BookingManagement  from "./pages/admin/management/BookingManagement";
import BookingTransaction  from "./pages/admin/management/BookingTransaction";
import IncidentsRooms from "./pages/admin/management/incidents";

import GuestDetails from "./components/AdminComponents/users/[id]";

import Rooms from "./pages/admin/management/Rooms";
import Expenses from "./pages/admin/management/Expenses";
import CashManagement from "./pages/admin/management/CashManagement";
import AddOnsPage from "./pages/admin/management/AddOnsPage";
import PanoramaViewer from "./components/AdminComponents/PanoramaViewer";
import Guests from "./pages/admin/management/Guests";
import WalkInGuest from "./pages/admin/management/WalkInGuests";
import Staff from "./pages/admin/management/Staff";
import HouseKeeper from "./pages/admin/management/HouseKeeper";
import Reports from "./pages/admin/analytics/Reports";
import AdminMenu from "./pages/admin/restaurant/Menu";
import AdminOrders from "./pages/admin/restaurant/OrdersReport";
import ChatPage from "./pages/admin/messages/[userId]";


// STAFF
import StaffLayout from "./layouts/StaffLayout";
import BookingStaff  from "./pages/admin/management/BookingManagement";
import WalkIn from "./pages/admin/operations/WalkIn";
import Transaction  from "./pages/staff/Transaction";
import BookingExtend from "./pages/staff/BookingExtend";
import StaffDashboard from "./pages/staff/StaffDashboard";
import Cash from "./pages/staff/Cash";

// CASHIER
import CashierLayout from "./layouts/CashierLayout";
import RestaurantDashboard from "./pages/cashier/RestaurantDashboard";
import Orders from "./pages/cashier/Orders";
import Menu from "./pages/cashier/Menu";
import Product from "./pages/cashier/Product";

// AUTH
import Login from "./pages/auth/Login";



export default function App() {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const { loading, setLoading } = useLoadingStore();
    const location = useLocation(); // ✅ current route

    // ❗ check if login page
    const isLoginPage = location.pathname === "/login";

    useEffect(() => {
        // simulate loading
        setTimeout(() => {
            setLoading(false);
        }, 1200);
    }, []);

    return (
        <>
            {/* ✅ hide loading on login */}
            {loading && !isLoginPage && <LoadingScreen />}

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
                        <Route path="/booking-management" element={<BookingManagement />} />
                        <Route path="/booking-transaction" element={<BookingTransaction />} />
                        <Route path="/incidents" element={<IncidentsRooms />} />
                        <Route path="/add-ons" element={<AddOnsPage />} />
                        {/* <Route path="/walk-in-guests" element={<WalkIn />} /> */}

                        <Route path="/guests/:id" element={<GuestDetails />} />

                        
                        <Route path="/rooms" element={<Rooms />} />
                        <Route path="/expenses" element={<Expenses />} />
                        <Route path="/cash-management" element={<CashManagement />} />
                        <Route path="/guests" element={<Guests />} />
                        <Route path="/walkin-guest" element={<WalkInGuest />} />
                        <Route path="/staff" element={<Staff />} />
                        <Route path="/housekeepers" element={<HouseKeeper />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/panorama" element={<PanoramaViewer />} />
                        <Route path="/admin/menu" element={<AdminMenu />} />
                        <Route path="/admin/orders" element={<AdminOrders />} />
                        <Route path="/messages/:userId" element={<ChatPage />} />

                        {/* DEFAULT */}
                        <Route path="*" element={<Navigate to="/dashboard" />} />
                    </Route>
                )}

                {/* STAFF ROUTES */}
                {user?.role === "staff" && (
                    <Route element={<StaffLayout />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/bookings" element={<BookingStaff />} />
                        <Route path="/transactions" element={<Transaction />} />
                        <Route path="/incidents" element={<IncidentsRooms />} />
                        <Route path="/walk-in-guests" element={<WalkIn />} />
                        <Route path="/extend-stay" element={<BookingExtend />} />
                        <Route path="/cash" element={<Cash />} />

                        <Route path="*" element={<Navigate to="/dashboard" />} />
                    </Route>
                )}

                {/* CASHIER ROUTES */}
                {user?.role === "cashier" && (
                    <Route element={<CashierLayout />}>
                        <Route path="/restaurant" element={<RestaurantDashboard />} />
                        <Route path="/orders" element={<Orders />} />
                        <Route path="/menu" element={<Menu />} />
                        <Route path="/product" element={<Product />} />

                        {/* DEFAULT */}
                        <Route path="*" element={<Navigate to="/restaurant" />} />
                    </Route>
                )}

            </Routes>
        </>
    );
}