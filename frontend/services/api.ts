import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const api = axios.create({
  baseURL: "http://192.168.254.188:8000/api",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// ✅ SET TOKEN AFTER LOGIN
export const setToken = async (token: string) => {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  await AsyncStorage.setItem("token", token);
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


// 🔥 GLOBAL 401 HANDLER (VERY IMPORTANT)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.log("❌ 401 Unauthorized - Auto Logout");

      try {
        const { useAuthStore } = require("../store/authStore");

        // clear Zustand + storage
        await useAuthStore.getState().logout();
      } catch (e) {
        console.log("AUTO LOGOUT ERROR:", e);
      }
    }

    return Promise.reject(error);
  }
);

export default api;