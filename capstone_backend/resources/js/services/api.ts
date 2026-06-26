import axios from "axios";

const api = axios.create({
    baseURL: "http://10.99.189.76:8000/api",
});

export const API_BASE = "http://10.99.189.76:8000";

// REQUEST INTERCEPTOR (attach token)
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");

    if (token) {
        config.headers = config.headers || {};
        (config.headers as any).Authorization = `Bearer ${token}`;
        (config.headers as any).Accept = "application/json";
    }

    return config;
});

// RESPONSE INTERCEPTOR (auto logout if 401)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.log("🚨 Unauthorized → Logging out");

            localStorage.removeItem("token");
            localStorage.removeItem("user");

            window.location.replace("/");
        }

        return Promise.reject(error);
    }
);

export default api;

