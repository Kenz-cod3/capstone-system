import { create } from "zustand";

type LoadingState = {
    loading: boolean;
    setLoading: (value: boolean) => void;
};

export const useLoadingStore = create<LoadingState>((set) => ({
    loading: true, // 🔥 IMPORTANT (start as true)
    setLoading: (value) => set({ loading: value }),
}));