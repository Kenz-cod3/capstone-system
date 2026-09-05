import logo from "../../images/logo.png";

export default function PageLoader() {
    return (
        <div className="flex items-center justify-center min-h-[70vh] w-full">
            <img
                src={logo}
                alt="Logo"
                className="mt-14 w-[600px] h-[600px] object-contain"
                style={{ animation: "scalePulse 1.4s ease-in-out infinite" }}
            />

            <style>
                {`
                    @keyframes scalePulse {
                        0%, 100% { transform: scale(1); opacity: 0.75; }
                        50% { transform: scale(1.15); opacity: 1; }
                    }
                `}
            </style>
        </div>
    );
}