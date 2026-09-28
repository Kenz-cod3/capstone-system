import { useEffect, useState } from "react";
import { message } from "antd";
import { Button } from "@/components/ui/button";

import {
    testPrinter,
    searchPrinter,
    refreshPrinter,
    isSerialSupported,
    isPrinterConnected,
} from "./thermalPrinter";

interface PrinterTestModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type PrinterStatus =
    | "checking"
    | "connected"
    | "disconnected"
    | "unsupported";

export default function PrinterTestModal({
    isOpen,
    onClose,
}: PrinterTestModalProps) {
    const [printerStatus, setPrinterStatus] =
        useState<PrinterStatus>("checking");

    const [loading, setLoading] = useState(false);

    // =========================
    // CHECK PRINTER
    // =========================
    const checkPrinter = async () => {
        if (!isSerialSupported()) {
            setPrinterStatus("unsupported");
            return;
        }

        setPrinterStatus("checking");

        try {
            const connected =
                isPrinterConnected() || (await refreshPrinter());

            setPrinterStatus(
                connected ? "connected" : "disconnected"
            );
        } catch (error) {
            console.error("Printer check error:", error);
            setPrinterStatus("disconnected");
        }
    };

    // Check automatically when modal opens
    useEffect(() => {
        if (isOpen) {
            checkPrinter();
        }
    }, [isOpen]);

    // =========================
    // SEARCH PRINTER
    // =========================
    const handleSearchPrinter = async () => {
        try {
            setLoading(true);
            setPrinterStatus("checking");

            await searchPrinter();

            setPrinterStatus("connected");

            message.success("Printer connected successfully.");
        } catch (error: any) {
            console.error("Search printer error:", error);

            setPrinterStatus("disconnected");

            // User closed the browser printer picker
            if (error?.name === "NotFoundError") {
                return;
            }

            message.error(
                error?.message || "Could not connect to printer."
            );
        } finally {
            setLoading(false);
        }
    };

    // =========================
    // REFRESH PRINTER
    // =========================
    const handleRefresh = async () => {
        try {
            setLoading(true);

            await checkPrinter();

            message.info("Printer status refreshed.");
        } catch (error) {
            console.error("Refresh printer error:", error);

            message.error("Failed to refresh printer status.");
        } finally {
            setLoading(false);
        }
    };

    // =========================
    // TEST PRINT
    // =========================
    const handleTestPrint = async () => {
        try {
            setLoading(true);

            // Make sure printer is still connected
            const connected =
                isPrinterConnected() || (await refreshPrinter());

            if (!connected) {
                setPrinterStatus("disconnected");

                message.warning(
                    "Please search and connect the printer first."
                );

                return;
            }

            await testPrinter();

            setPrinterStatus("connected");

            message.success("Test print sent.");
        } catch (error: any) {
            console.error("Test print error:", error);

            setPrinterStatus("disconnected");

            message.error(
                error?.message ||
                    "Could not print test page."
            );
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) {
        return null;
    }

    const statusText =
        printerStatus === "checking"
            ? "Checking printer..."
            : printerStatus === "connected"
              ? "Printer connected"
              : printerStatus === "unsupported"
                ? "Web Serial is not supported"
                : "Printer not connected";

    const statusColor =
        printerStatus === "connected"
            ? "#16a34a"
            : printerStatus === "checking"
              ? "#f59e0b"
              : "#dc2626";

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15, 23, 42, 0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
                padding: 20,
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: 430,
                    background: "#fff",
                    borderRadius: 14,
                    boxShadow:
                        "0 20px 50px rgba(15, 23, 42, 0.18)",
                    overflow: "hidden",
                }}
            >
                {/* HEADER */}
                <div
                    style={{
                        padding: "18px 20px",
                        borderBottom: "1px solid #e2e8f0",
                    }}
                >
                    <div
                        style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: "#0f172a",
                        }}
                    >
                        Thermal Printer Test
                    </div>

                    <div
                        style={{
                            marginTop: 4,
                            fontSize: 12,
                            color: "#64748b",
                        }}
                    >
                        Test the PT-210 without creating a
                        checkout.
                    </div>
                </div>

                {/* BODY */}
                <div style={{ padding: 20 }}>

                    {/* STATUS */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "12px 14px",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: 10,
                        }}
                    >
                        <span
                            style={{
                                width: 9,
                                height: 9,
                                borderRadius: "50%",
                                background: statusColor,
                            }}
                        />

                        <span
                            style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "#334155",
                            }}
                        >
                            {statusText}
                        </span>
                    </div>

                    {/* PRINTER INFO */}
                    <div
                        style={{
                            marginTop: 16,
                            padding: 14,
                            background: "#f0fdfa",
                            border: "1px solid #99f6e4",
                            borderRadius: 10,
                        }}
                    >
                        <div
                            style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#0f766e",
                                textTransform: "uppercase",
                            }}
                        >
                            Printer
                        </div>

                        <div
                            style={{
                                marginTop: 6,
                                fontSize: 14,
                                fontWeight: 600,
                                color: "#0f172a",
                            }}
                        >
                            PT-210
                        </div>

                        <div
                            style={{
                                marginTop: 3,
                                fontSize: 11,
                                color: "#64748b",
                            }}
                        >
                            58mm Bluetooth Thermal Printer
                        </div>

                        <div
                            style={{
                                marginTop: 3,
                                fontSize: 11,
                                color: "#64748b",
                            }}
                        >
                            Baud Rate: 9600
                        </div>
                    </div>

                    {/* TEST OUTPUT */}
                    <div
                        style={{
                            marginTop: 16,
                            padding: 14,
                            border: "1px dashed #cbd5e1",
                            borderRadius: 10,
                        }}
                    >
                        <div
                            style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#64748b",
                                marginBottom: 8,
                            }}
                        >
                            TEST OUTPUT
                        </div>

                        <pre
                            style={{
                                margin: 0,
                                fontFamily: "monospace",
                                fontSize: 11,
                                lineHeight: 1.7,
                                color: "#334155",
                                whiteSpace: "pre-wrap",
                            }}
                        >
{`LYNN ENNIA TRAVELERS INN
PRINTER TEST
------------------------------
HELLO FROM TRAVELERS INN`}
                        </pre>
                    </div>

                    {/* SEARCH + REFRESH */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "1fr 1fr",
                            gap: 8,
                            marginTop: 18,
                        }}
                    >
                        <Button
                            variant="outline"
                            onClick={handleSearchPrinter}
                            disabled={loading}
                            style={{
                                height: 40,
                                borderRadius: 8,
                            }}
                        >
                            Search Printer
                        </Button>

                        <Button
                            variant="outline"
                            onClick={handleRefresh}
                            disabled={loading}
                            style={{
                                height: 40,
                                borderRadius: 8,
                            }}
                        >
                            Refresh
                        </Button>
                    </div>

                    {/* TEST PRINT */}
                    <Button
                        onClick={handleTestPrint}
                        disabled={
                            loading ||
                            printerStatus !== "connected"
                        }
                        style={{
                            width: "100%",
                            height: 42,
                            marginTop: 8,
                            borderRadius: 8,
                            background: "#0f766e",
                            borderColor: "#0f766e",
                            color: "#fff",
                            fontWeight: 600,
                        }}
                    >
                        {loading
                            ? "Please wait..."
                            : "Print Test"}
                    </Button>

                    {/* CLOSE */}
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={loading}
                        style={{
                            width: "100%",
                            marginTop: 6,
                            color: "#64748b",
                        }}
                    >
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
}