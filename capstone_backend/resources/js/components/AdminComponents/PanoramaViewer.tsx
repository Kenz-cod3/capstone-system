import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface RoomType {
    type_name: string;
}

interface Room {
    room_type: RoomType;
    room_number: string | number;
}

interface PanoramaState {
    panoramaSrc: string;
    room: Room;
}

export default function PanoramaViewer() {
    const navigate = useNavigate();
    const location = useLocation();
    const viewerRef = useRef<HTMLDivElement>(null);
    const viewerInstanceRef = useRef<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const { panoramaSrc, room } = (location.state as PanoramaState) || {};

    useEffect(() => {
        const pannellum = (window as any).pannellum;

        if (!pannellum) {
            console.error("Pannellum not loaded");
            return;
        }

        if (!viewerRef.current || !panoramaSrc) return;

        const timeout = setTimeout(() => {
            viewerInstanceRef.current = pannellum.viewer(viewerRef.current, {
                type: "equirectangular",
                panorama: panoramaSrc,
                autoLoad: true,
                showZoomCtrl: true,
                devicePixelRatio: window.devicePixelRatio || 2,
            });

            viewerInstanceRef.current.on("load", () => {
                setIsLoading(false);
            });
        }, 100);

        return () => {
            clearTimeout(timeout);
            if (viewerInstanceRef.current) {
                viewerInstanceRef.current.destroy();
                viewerInstanceRef.current = null;
            }
        };
    }, [panoramaSrc]);

    if (!panoramaSrc) {
        return (
            <div className="h-screen flex items-center justify-center bg-black">
                <p className="text-white">No panorama data found</p>
            </div>
        );
    }

    return (
        <div className="w-full h-screen bg-black relative">

            {/* Back Button */}
            <button
                onClick={() => navigate(-1)}
                className="absolute top-5 left-5 z-10 bg-white px-4 py-2 rounded-lg shadow hover:bg-gray-100 transition"
            >
                ← Back
            </button>

            {/* Room Info */}
            <div className="absolute top-5 right-5 text-white z-10">
                <h2 className="text-lg font-bold">
                    {room?.room_type?.type_name} - Room {room?.room_number}
                </h2>
            </div>

            {/* Loading Spinner */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-20 bg-black">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
                        <p className="text-white text-sm">Loading panorama...</p>
                    </div>
                </div>
            )}

            {/* Pannellum Viewer */}
            <div ref={viewerRef} className="w-full h-full" />
        </div>
    );
}