import api from "./api";

export const getBookings = () => api.get("/bookings");

export const createBooking = (data: any) =>
    api.post("/bookings", data);

export const updateBooking = (id: number, data: any) =>
    api.put(`/bookings/${id}`, data);

export const deleteBooking = (id: number) =>
    api.delete(`/bookings/${id}`);