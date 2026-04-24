import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setToken, clearToken } from "../services/api";

type AuthState = {
  user: any;
  token: string | null;
  isLoaded: boolean;

  inactive: boolean; // 🔥 ADD THIS

  setAuth: (user: any, token: string) => Promise<void>;
  loadAuth: () => Promise<void>;
  logout: () => Promise<void>;

  setInactive: (value: boolean) => void; // 🔥 ADD THIS
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoaded: false,
  inactive: false,

  setAuth: async (user, token) => {
    await AsyncStorage.setItem("auth", JSON.stringify({ user, token }));
    await setToken(token);

    set({
      user,
      token,
      inactive: false, // reset on login
    });
  },

  loadAuth: async () => {
    const stored = await AsyncStorage.getItem("auth");

    if (stored) {
      const { user, token } = JSON.parse(stored);

      if (token) await setToken(token);

      set({
        user,
        token,
        isLoaded: true,
        inactive: false,
      });
    } else {
      set({ isLoaded: true });
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem("auth");
    await clearToken();

    set({
      user: null,
      token: null,
      inactive: false,
    });
  },

  setInactive: (value) => set({ inactive: value }),
}));