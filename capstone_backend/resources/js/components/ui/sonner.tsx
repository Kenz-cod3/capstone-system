import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
    CircleCheckIcon,
    InfoIcon,
    TriangleAlertIcon,
    OctagonXIcon,
    Loader2Icon,
} from "lucide-react";

const Toaster = ({ ...props }: ToasterProps) => {
    return (
        <Sonner
            theme="light"
            className="toaster group"
            icons={{
                success: <CircleCheckIcon className="size-4" />,
                info: <InfoIcon className="size-4" />,
                warning: <TriangleAlertIcon className="size-4" />,
                error: <OctagonXIcon className="size-4" />,
                loading: <Loader2Icon className="size-4 animate-spin" />,
            }}
            style={
                {
                    "--normal-bg": "var(--popover)",
                    "--normal-text": "var(--popover-foreground)",
                    "--normal-border": "var(--border)",
                    "--border-radius": "var(--radius)",
                } as React.CSSProperties
            }
            toastOptions={{
                classNames: {
                    toast: "cn-toast !bg-white !text-gray-800 !border !border-gray-200 !rounded-[6px] !shadow-lg !px-4 !py-3 !text-base",
                    title: "!text-base !font-medium",
                    icon: "!mr-3",
                    closeButton:
                        "!bg-gray-100 !border-none !text-gray-500 hover:!bg-gray-200 !left-auto !right-2 !top-1/2 !-translate-y-1/2 !translate-x-0",
                },
            }}
            {...props}
        />
    );
};

export { Toaster };
