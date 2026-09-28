import { useEffect, useState } from "react";
import {
    X,
    Settings,
    RotateCcw,
    RectangleVertical,
    RectangleHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
    DEFAULT_SETTINGS,
    type ReportSettings,
    type ReportEnding,
} from "../Reports";

interface SettingsDrawerProps {
    open: boolean;
    settings: ReportSettings;
    onClose: () => void;
    onApply: (s: ReportSettings) => void;
    onReset: () => void;
}

export default function ReportSettingsDrawer({
    open,
    settings,
    onClose,
    onApply,
    onReset,
}: SettingsDrawerProps) {
    const [draft, setDraft] = useState<ReportSettings>(settings);

    // Sync draft with incoming settings when drawer opens
    useEffect(() => {
        if (open) setDraft(settings);
    }, [open, settings]);

    // AUTO-APPLY: whenever draft changes (and drawer is open), push to parent
    useEffect(() => {
        if (!open) return;
        onApply(draft);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draft]);

    const updateHeader = <K extends keyof ReportSettings["header"]>(
        key: K,
        value: boolean,
    ) => setDraft((d) => ({ ...d, header: { ...d.header, [key]: value } }));

    const updateFooter = <K extends keyof ReportSettings["footer"]>(
        key: K,
        value: boolean,
    ) => setDraft((d) => ({ ...d, footer: { ...d.footer, [key]: value } }));

    if (!open) return null;

    return (
        <>
            <div
                className="fixed inset-0 bg-black/40 z-[100] no-print"
                onClick={onClose}
            />
            <div className="fixed top-0 right-0 h-full w-[360px] max-w-[92vw] bg-white border-l border-gray-200 shadow-2xl z-[101] flex flex-col no-print">
                <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-emerald-500" />
                        <h2 className="text-[14px] font-semibold text-gray-800">
                            Report Settings
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                        aria-label="Close settings"
                    >
                        <X className="h-4 w-4 text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 scrollbar-mint">
                    <section>
                        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                            Page Orientation
                        </h3>
                        <div className="inline-flex w-full rounded-md border border-gray-200 overflow-hidden">
                            <button
                                type="button"
                                onClick={() =>
                                    setDraft((d) => ({
                                        ...d,
                                        orientation: "portrait",
                                    }))
                                }
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-1.5 h-9 text-[12px] transition-colors",
                                    draft.orientation === "portrait"
                                        ? "bg-emerald-500 text-white"
                                        : "bg-white text-gray-600 hover:bg-gray-50",
                                )}
                            >
                                <RectangleVertical className="h-3.5 w-3.5" />
                                Portrait
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setDraft((d) => ({
                                        ...d,
                                        orientation: "landscape",
                                    }))
                                }
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-1.5 h-9 text-[12px] border-l border-gray-200 transition-colors",
                                    draft.orientation === "landscape"
                                        ? "bg-emerald-500 text-white"
                                        : "bg-white text-gray-600 hover:bg-gray-50",
                                )}
                            >
                                <RectangleHorizontal className="h-3.5 w-3.5" />
                                Landscape
                            </button>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                            Header
                        </h3>
                        <div className="space-y-2">
                            <SettingsCheckbox
                                label="Hotel Logo"
                                checked={draft.header.showLogo}
                                onChange={(v) => updateHeader("showLogo", v)}
                            />
                            <SettingsCheckbox
                                label="Hotel Name"
                                checked={draft.header.showHotelName}
                                onChange={(v) =>
                                    updateHeader("showHotelName", v)
                                }
                            />
                            <SettingsCheckbox
                                label="Report Title"
                                checked={draft.header.showReportTitle}
                                onChange={(v) =>
                                    updateHeader("showReportTitle", v)
                                }
                            />
                            <SettingsCheckbox
                                label="Report Date / Period"
                                checked={draft.header.showPeriod}
                                onChange={(v) => updateHeader("showPeriod", v)}
                            />
                        </div>
                    </section>

                    <section>
                        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                            Footer
                        </h3>
                        <div className="space-y-2">
                            <SettingsCheckbox
                                label="Hotel Name"
                                checked={draft.footer.showHotelName}
                                onChange={(v) =>
                                    updateFooter("showHotelName", v)
                                }
                            />
                            <SettingsCheckbox
                                label="Page Number"
                                checked={draft.footer.showPageNumber}
                                onChange={(v) =>
                                    updateFooter("showPageNumber", v)
                                }
                            />
                        </div>
                    </section>

                    <section>
                        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                            Report Ending
                        </h3>
                        <div className="space-y-2">
                            <SettingsRadio
                                label="None"
                                name="ending"
                                value="none"
                                checked={draft.ending === "none"}
                                onChange={(v) =>
                                    setDraft((d) => ({
                                        ...d,
                                        ending: v as ReportEnding,
                                    }))
                                }
                            />
                            <SettingsRadio
                                label="Signatures"
                                name="ending"
                                value="signatures"
                                checked={draft.ending === "signatures"}
                                onChange={(v) =>
                                    setDraft((d) => ({
                                        ...d,
                                        ending: v as ReportEnding,
                                    }))
                                }
                            />
                            <SettingsRadio
                                label="Summary + Signatures"
                                name="ending"
                                value="summary_signatures"
                                checked={draft.ending === "summary_signatures"}
                                onChange={(v) =>
                                    setDraft((d) => ({
                                        ...d,
                                        ending: v as ReportEnding,
                                    }))
                                }
                            />
                        </div>
                    </section>

                    {(draft.ending === "signatures" ||
                        draft.ending === "summary_signatures") && (
                        <section>
                            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                                Signature Labels
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <Label
                                        htmlFor="prepared_by"
                                        className="text-[11px] text-gray-500 font-medium"
                                    >
                                        Prepared by
                                    </Label>
                                    <Input
                                        id="prepared_by"
                                        value={draft.preparedBy}
                                        onChange={(e) =>
                                            setDraft((d) => ({
                                                ...d,
                                                preparedBy: e.target.value,
                                            }))
                                        }
                                        placeholder="e.g. John Doe"
                                        className="h-9 mt-1 border-gray-200 focus:border-emerald-400 focus:ring-0 focus:outline-none text-[12px]"
                                    />
                                </div>
                                <div>
                                    <Label
                                        htmlFor="noted_by"
                                        className="text-[11px] text-gray-500 font-medium"
                                    >
                                        Noted by
                                    </Label>
                                    <Input
                                        id="noted_by"
                                        value={draft.notedBy}
                                        onChange={(e) =>
                                            setDraft((d) => ({
                                                ...d,
                                                notedBy: e.target.value,
                                            }))
                                        }
                                        placeholder="e.g. Jane Doe"
                                        className="h-9 mt-1 border-gray-200 focus:border-emerald-400 focus:ring-0 focus:outline-none text-[12px]"
                                    />
                                </div>
                            </div>
                        </section>
                    )}
                </div>

                <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onReset}
                        className="gap-1.5 h-9 text-[12px] border-gray-200 hover:bg-gray-50"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reset
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onClose}
                        className="h-9 text-[12px] border-gray-200 hover:bg-gray-50"
                    >
                        Close
                    </Button>
                </div>
            </div>
        </>
    );
}

function SettingsCheckbox({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <label className="flex items-center gap-2 text-[12.5px] text-gray-700 cursor-pointer select-none">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
            />
            {label}
        </label>
    );
}

function SettingsRadio({
    label,
    name,
    value,
    checked,
    onChange,
}: {
    label: string;
    name: string;
    value: string;
    checked: boolean;
    onChange: (v: string) => void;
}) {
    return (
        <label className="flex items-center gap-2 text-[12.5px] text-gray-700 cursor-pointer select-none">
            <input
                type="radio"
                name={name}
                value={value}
                checked={checked}
                onChange={(e) => onChange(e.target.value)}
                className="h-4 w-4 border-gray-300 text-emerald-500 focus:ring-emerald-500"
            />
            {label}
        </label>
    );
}