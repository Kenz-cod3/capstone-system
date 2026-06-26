import api from "./api";

export const getRooms = async () => {
    const res = await api.get("/rooms");
    return res.data;
};