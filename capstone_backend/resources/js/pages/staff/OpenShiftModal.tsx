import React, { useState } from "react";
import { Modal, Button, InputNumber, message } from "antd";
import api from "@/services/api";

interface Props {
    open: boolean;
    onSuccess: () => void;
}

export default function OpenShiftModal({
    open,
    onSuccess,
}: Props) {
    const [startingCash, setStartingCash] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    const handleOpenShift = async () => {
        if (startingCash === null || startingCash < 0) {
            message.warning("Please enter starting cash");
            return;
        }

        setLoading(true);

        try {
            await api.post("/shift/open", {
                starting_cash: startingCash,
            });

            message.success("Shift opened successfully");

            setStartingCash(null);

            onSuccess();
        } catch (error: any) {
            message.error(
                error.response?.data?.message ||
                "Failed to open shift"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            open={open}
            centered
            closable={false}
            footer={null}
            title="Open Shift"
        >
            <div style={{ marginTop: 20 }}>

                <div
                    style={{
                        fontSize: 12,
                        fontWeight: 600,
                        marginBottom: 8,
                        color: "#8a8878",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                    }}
                >
                    Starting Cash
                </div>

                <InputNumber
                    value={startingCash}
                    onChange={(value) =>
                        setStartingCash(value as number)
                    }
                    placeholder="0.00"
                    prefix="₱"
                    style={{
                        width: "100%",
                        height: 42,
                        borderRadius: 10,
                    }}
                />

                <Button
                    type="primary"
                    block
                    loading={loading}
                    onClick={handleOpenShift}
                    style={{
                        marginTop: 20,
                        height: 44,
                        background: "#3eb489",
                        borderColor: "#3eb489",
                        borderRadius: 10,
                        fontWeight: 600,
                    }}
                >
                    Open Shift
                </Button>
            </div>
        </Modal>
    );
}
