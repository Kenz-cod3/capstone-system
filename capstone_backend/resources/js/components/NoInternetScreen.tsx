import { useEffect, useState, useCallback } from "react";
import { WifiOff } from "lucide-react";
import logo from "../../images/logo.png";

interface NoInternetScreenProps {
    /** Called when the user taps "Try Again" and the browser reports it's back online. */
    onRetry?: () => void;
}

export default function NoInternetScreen({ onRetry }: NoInternetScreenProps) {
    const [isChecking, setIsChecking] = useState(false);
    const [dots, setDots] = useState("");

    // Animated "..." dots, same feel as LoadingScreen
    useEffect(() => {
        const interval = setInterval(() => {
            setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
        }, 500);

        return () => clearInterval(interval);
    }, []);

    const handleRetry = useCallback(() => {
        setIsChecking(true);

        // Small delay so the button feedback is actually visible
        setTimeout(() => {
            if (navigator.onLine) {
                onRetry ? onRetry() : window.location.reload();
            } else {
                setIsChecking(false);
            }
        }, 800);
    }, [onRetry]);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity duration-500">
            <div className="flex flex-col items-center gap-4 px-6 text-center">
                {/* Animated Logo + Offline Badge */}
                <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-red-400 opacity-20 animate-ping"></div>

                    <img
                        src={logo}
                        alt="Logo"
                        className="relative w-24 h-24 object-contain opacity-60 grayscale"
                    />

                    <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 shadow-md ring-4 ring-white">
                        <WifiOff className="h-4 w-4 text-white" />
                    </div>
                </div>

                {/* Title */}
                <div className="space-y-1">
                    <p className="text-base font-semibold text-gray-800">
                        No Internet Connection
                    </p>
                    <p className="text-sm text-gray-500">
                        Please check your connection and try again.
                    </p>
                </div>

                {/* Checking indicator */}
                {isChecking && (
                    <p className="text-xs font-medium text-gray-400">
                        Checking connection{dots}
                    </p>
                )}

                {/* Retry Button */}
                <button
                    onClick={handleRetry}
                    disabled={isChecking}
                    className="mt-2 rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-emerald-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isChecking ? "Checking..." : "Try Again"}
                </button>
            </div>
        </div>
    );
}