import api from "./api";

let cache: any[] = [];

export const getRoomTypesCached = async () => {
    if (cache.length) return cache;

    const res = await api.get("/room-types");
    cache = res.data;

    return cache;
};