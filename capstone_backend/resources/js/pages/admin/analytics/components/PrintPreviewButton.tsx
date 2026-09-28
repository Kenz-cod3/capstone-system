import { Eye, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
    onPreview: () => void;
    onPrint: () => void;
}

export function PrintPreviewButton({ onPreview, onPrint }: Props) {
    return (
        <>
            <Button
                onClick={onPreview}
                variant="outline"
                className={cn(
                    "!h-10 !px-4 !gap-2 !rounded-lg !border !border-emerald-200 !bg-white !text-emerald-600",
                    "hover:!bg-emerald-50 hover:!border-emerald-400 hover:!text-emerald-700",
                    "!transition-colors !duration-200",
                    "!shadow-none focus-visible:!ring-0 focus-visible:!outline-none",
                    "no-print text-[12px] font-medium",
                )}
            >
                <Eye className="h-4 w-4 !text-emerald-600" />
                Print Preview
            </Button>
            <Button
                onClick={onPrint}
                className="gap-2 no-print white-badge focus:ring-0 focus:outline-none text-[12px] h-9 shadow-sm"
            >
                <Printer className="h-3.5 w-3.5" />
                Print
            </Button>
        </>
    );
}