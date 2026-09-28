import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Dimensions,
    ImageBackground,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { useState, useRef, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import api, { setToken } from "../../services/api";
import { useAuthStore } from "../../store/authStore";

const { width } = Dimensions.get("window");

export default function OTP() {
    const { setAuth } = useAuthStore();
    const router = useRouter();
    const { email, from, expires_at } = useLocalSearchParams();


    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [expiresAt, setExpiresAt] = useState(
        expires_at ? new Date(expires_at as string).getTime() : 0
    );

    const [countdown, setCountdown] = useState(0);
    const [canResend, setCanResend] = useState(false);
    const isProcessing = useRef(false);

    useEffect(() => {
        if (!expiresAt) return;

        const interval = setInterval(() => {
            const remaining = Math.max(
                0,
                Math.floor((expiresAt - Date.now()) / 1000)
            );

            setCountdown(remaining);

            if (remaining <= 0) {
                setCanResend(true);
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [expiresAt]);

    const handleVerify = async () => {
        // Prevent double click
        if (loading || isProcessing.current) return;

        if (!otp || otp.length !== 6) {
            Alert.alert("Validation Error", "Please enter a valid 6-digit OTP");
            return;
        }

        isProcessing.current = true;
        setLoading(true);

        try {
            const res = await api.post("/auth/verify-otp", {
                email,
                otp,
            });

            console.log("OTP VERIFIED:", res.data);

            // CHECK WHERE USER CAME FROM
            if (from === "login") {
                // AUTO LOGIN
                await setAuth(res.data.user, res.data.token);
                await setToken(res.data.token);

                // REDIRECT TO HOME
                if (res.data.user.role === "guest") {
                    router.replace("/(guest)/(tabs)/home");
                } else if (res.data.user.role === "housekeeper") {
                    router.replace("/(housekeeper)/(tabs)/dashboard");
                }

            } else {
                // FROM REGISTER → BACK TO LOGIN
                Alert.alert("Success", "Account verified! Please login.", [
                    {
                        text: "OK",
                        onPress: () => router.replace("/auth/login"),
                    },
                ]);
            }

        } catch (e: any) {
            console.log("OTP Verification Error:", e.response?.data);

            const errorMessage =
                e.response?.data?.message || "Invalid OTP. Please try again.";

            Alert.alert("Verification Failed", errorMessage);

            isProcessing.current = false;
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        if (!canResend || loading) return;

        setLoading(true);
        try {
            const res = await api.post("/auth/resend-otp", {
                email,
            });

            Alert.alert("Success", "OTP has been resent to your email.");

            setExpiresAt(new Date(res.data.expires_at).getTime());
            setCanResend(false);
        } catch (e: any) {
            const status = e.response?.status;

            if (status === 429) {
                const expiresAt = new Date(
                    e.response.data.expires_at
                ).getTime();

                setExpiresAt(expiresAt);
                setCanResend(false);

                Alert.alert(
                    "OTP Active",
                    e.response.data.message
                );
            } else {
                Alert.alert(
                    "Error",
                    e.response?.data?.message || "Failed to resend OTP"
                );
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <ImageBackground
            source={require("../../assets/bg.jpg")}
            style={{ flex: 1 }}
        >
            <View className="flex-1 justify-center items-center px-6 bg-black/60">
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    className="w-full items-center"
                >
                    <View
                        style={{ width: width * 0.9 }}
                        className="bg-white p-6 rounded-2xl"
                    >
                        <Text className="text-2xl font-bold text-center mb-2">
                            Verify Your Email
                        </Text>

                        <Text className="text-center text-gray-500 mb-4">
                            Enter the 6-digit code sent to
                        </Text>

                        <Text className="text-center text-green-600 font-semibold mb-6">
                            {email}
                        </Text>

                        <TextInput
                            value={otp}
                            onChangeText={setOtp}
                            placeholder="Enter OTP"
                            keyboardType="numeric"
                            className="border border-gray-300 p-4 rounded-xl text-center text-lg mb-4"
                            maxLength={6}
                            editable={!loading}
                            autoFocus={true}
                        />

                        <TouchableOpacity
                            onPress={handleVerify}
                            disabled={loading || !otp}
                            activeOpacity={0.7}
                            className={`p-3 rounded-xl mb-3 ${loading || !otp ? "bg-gray-400" : "bg-green-500"}`}
                        >
                            <Text className="text-white text-center font-bold text-lg">
                                {loading ? "Verifying..." : "Verify OTP"}
                            </Text>
                        </TouchableOpacity>

                        <View className="flex-row justify-center items-center mt-4">
                            <Text className="text-gray-500">
                                {canResend ? "Didn't receive the code? " : `OTP expires in ${countdown}s `}
                            </Text>
                            {canResend && (
                                <TouchableOpacity onPress={handleResendOTP} disabled={loading}>
                                    <Text className="text-green-600 font-semibold">
                                        Resend
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <TouchableOpacity
                            onPress={() => router.back()}
                            className="mt-4"
                        >
                            <Text className="text-center text-gray-500">
                                ← Back to Registration
                            </Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </ImageBackground>
    );
}