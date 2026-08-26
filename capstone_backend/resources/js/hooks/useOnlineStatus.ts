import { useEffect, useState } from "react";

/**
 * Tracks the browser's online/offline status using the native
 * `navigator.onLine` API plus the `online`/`offline` window events.
 *
 * Usage:
 *   const isOnline = useOnlineStatus();
 *   {!isOnline && <NoInternetScreen />}
 */
export function useOnlineStatus(): boolean {
    const [isOnline, setIsOnline] = useState<boolean>(
        typeof navigator !== "undefined" ? navigator.onLine : true,
    );

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    return isOnline;
}