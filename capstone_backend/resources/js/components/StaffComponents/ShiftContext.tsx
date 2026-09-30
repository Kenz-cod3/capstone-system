import { createContext, useContext } from "react";

export interface ShiftState {
    hasShift: boolean | null; // null = still checking
    viewOnly: boolean;
    shiftNumber: string | null;
    refreshShift: () => Promise<boolean | undefined>;
    openShiftModal: () => void;
}

const ShiftContext = createContext<ShiftState>({
    hasShift: true,
    viewOnly: false,
    shiftNumber: null,
    refreshShift: async () => true,
    openShiftModal: () => {},
});

export const useShift = () => useContext(ShiftContext);
export default ShiftContext;