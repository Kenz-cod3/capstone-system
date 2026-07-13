import logo from "../../images/logo.png";
import { useEffect, useState } from "react";

interface LoadingScreenProps {
    progress: number;
}

export default function LoadingScreen({
    progress,
}: LoadingScreenProps) {
    const [dots, setDots] = useState("");

    useEffect(() => {
        const interval = setInterval(() => {
            setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
        }, 500);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity duration-500">
            <div className="flex flex-col items-center gap-4">

                {/* Animated Logo */}
                <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-emerald-400 opacity-20 animate-ping"></div>

                    <img
                        src={logo}
                        alt="Logo"
                        className="relative w-28 h-28 object-contain animate-pulse"
                    />
                </div>

                {/* Loading Text */}
                <p className="text-sm font-medium text-gray-600">
                    Loading{dots}
                </p>

                {/* Progress Bar */}
                <div className="w-56">
                    <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                        <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-300 ease-out"
                            style={{
                                width: `${progress}%`,
                            }}
                        />
                    </div>

                    {/* Percentage */}
                    <p className="mt-2 text-center text-xs font-medium text-gray-500">
                        {Math.round(progress)}%
                    </p>
                </div>

            </div>
        </div>
    );
}