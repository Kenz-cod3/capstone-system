import api from "./api";

// Protected — used by admin / housekeeper dashboards
export const getRooms = async () => {
    const res = await api.get("/rooms");
    return res.data;
};

// Public — used by landing page / Welcome screen (no auth required)
export const getPublicRooms = async () => {
    const res = await api.get("/rooms/available");
    return res.data;
};