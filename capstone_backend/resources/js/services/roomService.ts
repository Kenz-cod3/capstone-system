import api from "./api";

export const getRooms = () => {
    return api.get("/rooms");
};

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