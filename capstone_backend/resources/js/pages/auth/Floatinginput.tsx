// Save as: resources/js/components/FloatingInput.tsx  (or anywhere you like,
// then fix the import path in ForgotPassword.tsx / ResetPassword.tsx)
//
// This is the same FloatingInput that lives inside Register.tsx, just exported
// so the new pages can reuse it. (Optional: delete the copy in Register.tsx and
// import this one instead.)
import React from "react";

interface FloatingInputProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    icon: React.ReactNode;
    type?: string;
    required?: boolean;
    autoComplete?: string;
    error?: string;
    trailing?: React.ReactNode;
    className?: string;
}

export default function FloatingInput({
    id,
    label,
    value,
    onChange,
    icon,
    type = "text",
    required = false,
    autoComplete,
    error,
    trailing,
    className = "",
}: FloatingInputProps) {
    return (
        <div className={className}>
            <div className="relative">
                {/* input comes first so peer-* classes on siblings work */}
                <input
                    id={id}
                    type={type}
                    placeholder=" "
                    value={value}
                    autoComplete={autoComplete}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        onChange(e.target.value)
                    }
                    className={`peer w-full h-12 pl-9 ${
                        trailing ? "pr-9" : "pr-3"
                    } rounded-lg border bg-white text-gray-900 outline-none transition-colors focus:ring-0 ${
                        error
                            ? "border-red-400 focus:border-red-500"
                            : "border-gray-300 focus:border-teal-400"
                    }`}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 peer-focus:text-teal-500 z-10 pointer-events-none">
                    {icon}
                </span>
                <label
                    htmlFor={id}
                    className="absolute left-9 top-1/2 -translate-y-1/2 bg-white px-1 text-gray-400 text-sm transition-all duration-150 pointer-events-none
                        peer-focus:top-0 peer-focus:left-3 peer-focus:text-xs peer-focus:text-teal-500
                        peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-gray-400"
                >
                    {label}
                    {required && " *"}
                </label>
                {trailing && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                        {trailing}
                    </div>
                )}
            </div>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}