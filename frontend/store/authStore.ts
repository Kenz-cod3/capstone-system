import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setToken, clearToken } from "../services/api";

type AuthState = {
  user: any;
  token: string | null;
  isLoaded: boolean;

  setAuth: (user: any, token: string) => Promise<void>;
  loadAuth: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoaded: false,

  // ✅ SAVE LOGIN
  setAuth: async (user, token) => {
    try {
      await AsyncStorage.setItem(
        "auth",
        JSON.stringify({ user, token })
      );

      await setToken(token); // ✅ make sure awaited

      set({ user, token });
    } catch (e) {
      console.log("SET AUTH ERROR:", e);
    }
  },

  // ✅ LOAD ON APP START
  loadAuth: async () => {
    try {
      const stored = await AsyncStorage.getItem("auth");

      if (stored) {
        const { user, token } = JSON.parse(stored);

        if (token) {
          await setToken(token); // ✅ ensure axios is ready
        }

        set({ user, token, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch (e) {
      console.log("LOAD AUTH ERROR:", e);
      set({ isLoaded: true });
    }
  },

  // ✅ LOGOUT (FULL CLEAN)
  logout: async () => {
    try {
      await AsyncStorage.removeItem("auth");

      await clearToken(); // ✅ remove axios header

      set({ user: null, token: null });
    } catch (e) {
      console.log("LOGOUT ERROR:", e);
    }
  },
}));