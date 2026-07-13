import api from "./api";

let cache: any[] = [];

export const getRoomTypesCached = async () => {
    if (cache.length) return cache;

    const res = await api.get("/room-types");

    cache = Array.isArray(res.data)
        ? res.data
        : res.data.data ?? [];

    return cache;
};

export const clearRoomTypeCache = () => {
    cache = [];
};