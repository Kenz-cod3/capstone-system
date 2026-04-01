import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function PanoramaViewer() {
    const navigate = useNavigate();
    const location = useLocation();
    const viewerRef = useRef<HTMLDivElement>(null);

    const { panoramaSrc, room } = location.state || {};

    useEffect(() => {
        const pannellum = (window as any).pannellum;

        if (!pannellum) {
            console.error("Pannellum not loaded");
            return;
        }

        if (viewerRef.current && panoramaSrc) {
            pannellum.viewer(viewerRef.current, {
                type: "equirectangular",
                panorama: panoramaSrc,
                autoLoad: true,
                showZoomCtrl: true,
            });
        }
    }, [panoramaSrc]);

    if (!panoramaSrc) {
        return (
            <div className="h-screen flex items-center justify-center">
                <p>No panorama data found</p>
            </div>
        );
    }

    return (
        <div className="w-full h-screen bg-black relative">

            <button
                onClick={() => navigate(-1)}
                className="absolute top-5 left-5 z-10 bg-white px-4 py-2 rounded-lg shadow"
            >
                ← Back
            </button>

            <div className="absolute top-5 right-5 text-white z-10">
                <h2 className="text-lg font-bold">
                    {room?.room_type?.type_name} - Room {room?.room_number}
                </h2>
            </div>

            <div ref={viewerRef} className="w-full h-full" />
        </div>
    );
}