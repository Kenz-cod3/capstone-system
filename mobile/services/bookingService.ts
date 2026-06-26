import api from "./api";

export const createBooking = async (data: any) => {
    const res = await api.post("/bookings", data);
    return res.data;
};