import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_URL as string;

const api = axios.create({
    baseURL: `${API_BASE}/api`,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers = config.headers || {};
        (config.headers as any).Authorization = `Bearer ${token}`;
        (config.headers as any).Accept = "application/json";
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.log("🚨 Unauthorized → Logging out");
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.replace("/login");
        }
        return Promise.reject(error);
    }
);

export default api;