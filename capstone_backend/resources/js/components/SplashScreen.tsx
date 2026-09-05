import logo from "../../images/logo.png";

export default function SplashScreen() {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white">
            <img
                src={logo}
                alt="Logo"
                className="w-48 h-48 object-contain animate-bounce"
            />

            <div className="absolute bottom-10 flex flex-col items-center">
                <p className="text-sm font-medium text-gray-500">
                    From
                </p>
                <p
                    className="text-xl tracking-wide text-emerald-400"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                >
                    Lyn Enia Travelers Inn
                </p>
            </div>
        </div>
    );
}