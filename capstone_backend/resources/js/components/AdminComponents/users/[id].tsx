import { useEffect, useState } from "react";
import {
    useNavigate,
    useParams,
    useLocation,
} from "react-router-dom";

import api from "@/services/api";

import GuestDetailModal, {
    type GuestDetailsResponse,
} from "./Guestdetailmodal";

export default function GuestDetailsPage() {

    const { id } = useParams();

    const navigate = useNavigate();

    const location = useLocation();

    const passedUser = location.state?.user;

    const [guestDetails, setGuestDetails] =
        useState<GuestDetailsResponse | null>(null);

    const [loadingDetails, setLoadingDetails] =
        useState(false);

    const BASE_URL =
        api.defaults.baseURL?.replace("/api", "") || "";

    const fetchGuestDetails = async () => {

        if (!id) return;

        setLoadingDetails(true);

        try {

            // FETCH BOOKINGS ONLY
            const bookingsResponse =
                await api.get("/bookings");

            const guest = passedUser;

            const allBookings = bookingsResponse.data;

            const userBookings = allBookings.filter(
                (b: any) => b.user_id === Number(id)
            );

            const totalBookings = userBookings.length;

            const totalSpent = userBookings.reduce(
                (s: number, b: any) =>
                    s + Number(b.total_price || 0),
                0
            );

            setGuestDetails({
                guest,

                bookings: userBookings,

                summary: {
                    total_bookings: totalBookings,

                    total_spent: totalSpent,

                    first_visit:
                        userBookings[userBookings.length - 1]
                            ?.check_in_date || null,

                    last_visit:
                        userBookings[0]?.check_in_date || null,

                    average_spent:
                        totalBookings > 0
                            ? totalSpent / totalBookings
                            : 0,
                },
            });

        } catch (error) {

            console.error(
                "Failed to fetch guest details:",
                error
            );

        } finally {

            setLoadingDetails(false);

        }
    };

    useEffect(() => {
        fetchGuestDetails();
    }, [id]);

    return (
        <GuestDetailModal
            open={true}
            onClose={() => navigate("/guests")}
            selectedUser={guestDetails?.guest || null}
            guestDetails={guestDetails}
            loadingDetails={loadingDetails}
            baseUrl={BASE_URL}
        />
    );
}