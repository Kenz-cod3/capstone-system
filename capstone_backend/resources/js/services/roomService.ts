import api from "./api";

export const getRooms = (params?: Record<string, any>) =>
    api.get("/rooms", { params });

// ── NEW: full details for the View Info modal ──
export const getRoomDetails = (id: number) =>
    api.get(`/rooms/${id}/details`);

export const createRoom = (data: any) => api.post("/rooms", data);

export const updateRoom = (id: number, data: any) =>
    api.put(`/rooms/${id}`, data);

export const deleteRoom = (id: number) =>
    api.delete(`/rooms/${id}`);

export const uploadRoomImage = (formData: FormData) =>
    api.post("/room-images", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

export const deleteRoomImage = (id: number) =>
    api.delete(`/room-images/${id}`);