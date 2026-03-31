import logo from "../../images/logo.png";
import { useEffect, useState } from "react";

export default function LoadingScreen() {
    const [dots, setDots] = useState("");
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
        // Animated dots effect
        const dotInterval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? "" : prev + ".");
        }, 500);
        
        return () => clearInterval(dotInterval);
    }, []);

    return (
        <div className={`fixed inset-0 flex items-center justify-center bg-white z-[9999] transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
            <div className="flex flex-col items-center gap-4">
                {/* Animated Logo */}
                <div className="relative">
                    <div className="absolute inset-0 animate-ping bg-emerald-400 rounded-full opacity-20"></div>
                    <img
                        src={logo}
                        alt="Logo"
                        className="w-28 h-28 object-contain relative animate-pulse"
                    />
                </div>

                {/* Loading Text with Dots */}
                <p className="text-gray-600 text-sm font-medium">
                    Loading{dots}
                </p>

                {/* Optional Progress Bar */}
                <div className="w-48 mt-2">
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-emerald-500 rounded-full animate-loading-progress"
                            style={{
                                animation: 'loading-progress 2s ease-in-out infinite'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Add animation keyframes */}
            <style>
                {`
                    @keyframes loading-progress {
                        0% {
                            width: 0%;
                        }
                        50% {
                            width: 70%;
                        }
                        100% {
                            width: 100%;
                        }
                    }
                `}
            </style>
        </div>
    );
}