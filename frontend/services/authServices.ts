import api from "./api";

export const login = async (data: any) => {
    const res = await api.post("/auth/login", data);
    return res.data;
};

export const register = async (data: any) => {
    const res = await api.post("/auth/register", data);
    return res.data;
};







