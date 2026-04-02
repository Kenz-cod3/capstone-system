import api from "./api";

export const getRooms = async () => {
    const res = await api.get("/rooms"); // make sure this route exists
    return res.data;
};