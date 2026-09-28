import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setToken, clearToken } from "../services/api";
import api from "../services/api";

type AuthState = {
  user: any;
  token: string | null;
  isLoaded: boolean;
  inactive: boolean;

  setAuth: (user: any, token: string) => Promise<void>;
  loadAuth: () => Promise<void>;
  logout: () => Promise<void>;
  setInactive: (value: boolean) => Promise<void>;

  // ✅ NEW
  updateUser: (user: any) => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoaded: false,
  inactive: false,

  setAuth: async (user, token) => {
    await AsyncStorage.setItem("auth", JSON.stringify({ user, token }));

    await AsyncStorage.setItem("inactive", "false");
    await setToken(token);

    set({
      user,
      token,
      inactive: false,
    });
  },

  loadAuth: async () => {
    console.log("🚀 loadAuth START");

    const stored = await AsyncStorage.getItem("auth");
    const inactiveStored = await AsyncStorage.getItem("inactive");

    console.log("📦 stored:", stored);
    console.log("📦 inactiveStored:", inactiveStored);

    if (!stored) {
      console.log("❌ walang stored auth");

      set({
        isLoaded: true,
      });

      return;
    }

    const { user, token } = JSON.parse(stored);

    if (token) {
      await setToken(token);
    }

    try {
      console.log("🌐 mag-fetch ng user status...");

      const res = await api.get("/user/status");

      console.log("🌐 response:", JSON.stringify(res.data));

      console.log("🌐 is_active:", res.data.is_active);

      const isInactive = !res.data.is_active;

      await AsyncStorage.setItem("inactive", String(isInactive));

      set({
        user: {
          ...user,
          is_active: res.data.is_active,
        },
        token,
        isLoaded: true,
        inactive: isInactive,
      });
    } catch (e: any) {
      console.log("❌ fetch error:", e?.response?.status, e?.message);

      // If the token is invalid, clear everything
      if (e?.response?.status === 401) {
        console.log("🔑 Invalid token. Logging out...");

        await AsyncStorage.removeItem("auth");
        await AsyncStorage.removeItem("inactive");
        await clearToken();

        set({
          user: null,
          token: null,
          inactive: false,
          isLoaded: true,
        });

        return;
      }

      // If it's only a network problem,
      // keep the cached login
      set({
        user,
        token,
        inactive: inactiveStored === "true",
        isLoaded: true,
      });
    }
  },

  // =====================================================
  // UPDATE USER
  // =====================================================

  updateUser: async (user) => {
    const stored = await AsyncStorage.getItem("auth");

    if (stored) {
      const { token } = JSON.parse(stored);

      await AsyncStorage.setItem(
        "auth",
        JSON.stringify({
          user,
          token,
        }),
      );

      set({
        user,
        token,
      });
    } else {
      // Fallback in case auth storage is missing
      set({
        user,
      });
    }
  },

  // =====================================================
  // LOGOUT
  // =====================================================

  logout: async () => {
    await AsyncStorage.removeItem("auth");
    await AsyncStorage.removeItem("inactive");
    await clearToken();

    set({
      user: null,
      token: null,
      inactive: false,
    });
  },

  // =====================================================
  // INACTIVE
  // =====================================================

  setInactive: async (value) => {
    await AsyncStorage.setItem("inactive", String(value));

    set((state) => ({
      ...state,
      inactive: value,
    }));
  },
}));
