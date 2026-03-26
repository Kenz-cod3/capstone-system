import React from "react";
import StaffLayout from "@/layouts/StaffLayout";

export default function RestaurantDashboard() {
    return (
        <StaffLayout>
            <h1 className="text-2xl font-bold mb-4">
                🍽️ Restaurant Dashboard
            </h1>

            <div className="bg-white p-4 rounded shadow">
                <p>Welcome staff! Manage orders here.</p>
            </div>
        </StaffLayout>
    );
}