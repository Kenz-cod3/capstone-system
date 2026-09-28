import { useEffect, useRef, useState } from "react";

export default function PanoramaModal({ data, onClose }: any) {
    const viewerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const pannellum = (window as any).pannellum;

        if (!pannellum || !data?.panoramaSrc) return;

        pannellum.viewer(viewerRef.current, {
            type: "equirectangular",
            panorama: data.panoramaSrc,
            autoLoad: true,
            autoRotate: 2,
            showZoomCtrl: true,
            showFullscreenCtrl: true,
            compass: true,

            onLoad: () => setLoading(false),
        });

        setTimeout(() => setLoading(false), 4000);
    }, [data]);

    if (!data) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            {/* FLOATING MODAL CONTAINER */}
            <div className="relative w-full max-w-6xl h-[90vh] bg-black rounded-2xl shadow-2xl overflow-hidden">

                {/* CLOSE BUTTON */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 bg-white/90 hover:bg-white text-gray-800 px-4 py-2 rounded-full shadow-lg transition-all duration-200 flex items-center gap-2 backdrop-blur-sm"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Close
                </button>

                {/* BOTTOM INFO BAR */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 
    bg-black/50 backdrop-blur-md text-white 
    px-6 py-3 rounded-xl border border-white/10 shadow-lg max-w-md w-auto">

                    <h2 className="text-base font-semibold leading-tight">
                        {data.room?.room_type?.type_name} - Room {data.room?.room_number}
                    </h2>
                </div>

                {/* VIEWER */}
                <div ref={viewerRef} className="w-full h-full" />

                {/* LOADING OVERLAY */}
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-40 backdrop-blur-sm">
                        <div className="relative">
                            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                        </div>
                        <p className="text-white mt-4 font-medium">Loading 360° view...</p>
                    </div>
                )}

                {/* DECORATIVE CORNER ELEMENTS (optional) */}
                <div className="absolute bottom-4 left-4 z-50 text-white/50 text-xs">
                    Drag to explore • Auto-rotate enabled
                </div>
            </div>
        </div>
    );
}