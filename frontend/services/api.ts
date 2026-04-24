import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// ✅ SET TOKEN AFTER LOGIN
export const setToken = async (token: string) => {
  await AsyncStorage.setItem("token", token);
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
};

// ✅ LOAD TOKEN ON APP START
export const loadToken = async () => {
  const token = await AsyncStorage.getItem("token");

  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }

  return token;
};

// ✅ CLEAR TOKEN (LOGOUT)
export const clearToken = async () => {
  delete api.defaults.headers.common["Authorization"];
  await AsyncStorage.removeItem("token");
};

// 🔥 REQUEST INTERCEPTOR
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// 🔥 RESPONSE INTERCEPTOR (FIXED + BULLETPROOF)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message;

    const token = await AsyncStorage.getItem("token");

    console.log("🔥 API ERROR:", status, message); // DEBUG

    try {
      const { useAuthStore } = require("../store/authStore");

      // ✅ 401 → TOKEN INVALID → FORCE LOGOUT
      if (status === 401 && token) {
        console.log("🚪 401 → Auto logout");

        await useAuthStore.getState().logout();
      }

      // ✅ 403 → ACCOUNT INACTIVE (FIXED CONDITION)
      if (status === 403 && message?.toLowerCase().includes("inactive")) {
        console.log("⛔ Account inactive detected");

        // 🔥 OPTION A: FORCE LOGOUT (RECOMMENDED)
        await useAuthStore.getState().logout();

        // 🔥 OPTION B (if you want screen instead)
        // useAuthStore.getState().setInactive(true);
      }

    } catch (e) {
      console.log("Interceptor error:", e);
    }

    return Promise.reject(error);
  }
);

export default api;