import { create } from "zustand";

export interface User {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    role: "admin" | "staff" | "cashier";
    profile_image?: string | null;
}

interface AuthStore {
    user: User | null;

    isInitializing: boolean;

    setUser: (user: User | null) => void;

    clearUser: () => void;

    finishInitializing: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
    user: null,

    isInitializing: true,

    setUser: (user) =>
        set({
            user,
        }),

    clearUser: () =>
        set({
            user: null,
        }),

    finishInitializing: () =>
        set({
            isInitializing: false,
        }),
}));
