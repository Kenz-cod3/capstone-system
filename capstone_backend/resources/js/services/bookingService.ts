import api from "./api";

export const getBookings = () => api.get("/bookings");

// PAST BOOKINGS — GET /bookings/history (paginated, matches BookingController@history)
export const getBookingHistory = (page: number = 1, perPage: number = 10) =>
    api.get(`/bookings/history?page=${page}&per_page=${perPage}`);

export const createBooking = (data: any) =>
    api.post("/bookings", data);

export const updateBooking = (id: number, data: any) =>
    api.put(`/bookings/${id}`, data);

export const deleteBooking = (id: number) =>
    api.delete(`/bookings/${id}`);