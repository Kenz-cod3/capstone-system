// app/inactive.tsx
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  StyleSheet,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/authStore";
import { clearToken } from "@/services/api";

const CREAM = "#F7F4EF";
const INK = "#1B2B27";
const GOLD = "#C89B5A";
const RED = "#C60505";

// ====== Travelers Inn support contact ======
const SUPPORT_EMAIL = "lyeniatravellersinn@gmail.com";
const SUPPORT_PHONE = "09177045341";

export default function InactiveScreen() {
  const { logout } = useAuthStore();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params?.email;

  const handleContactSupport = () => {
    const subject = "Account Access Question";
    const body = email
      ? `Account email: ${encodeURIComponent(email)}`
      : "";
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      subject
    )}${body ? `&body=${body}` : ""}`;

    Linking.openURL(url).catch((err) =>
      console.log("Failed to open mail app:", err)
    );
  };

  const handleCallSupport = () => {
    const url = `tel:${SUPPORT_PHONE.replace(/\s+/g, "")}`;
    Linking.openURL(url).catch((err) =>
      console.log("Failed to open dialer:", err)
    );
  };

  const handleBackToLogin = async () => {
    try {
      // Clear the auth store (user + token in memory)
      await logout();
    } catch (e) {
      console.log("Logout error:", e);
    }

    try {
      // Also clear any persisted token in storage
      await clearToken();
    } catch (e) {
      console.log("clearToken error:", e);
    }

    router.replace("/auth/login");
  };

  return (
    <View style={{ flex: 1, backgroundColor: CREAM }}>
      <StatusBar style="dark" />

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Card */}
          <View style={styles.card}>
            <View style={{ padding: 28 }}>
              {/* Title */}
              <Text style={styles.title}>Your account is on hold</Text>

              <Text style={styles.subtitle}>
                Sign-in and bookings are paused for now. This is usually set
                by our team — send us a message and we'll take a look and get
                back to you.
              </Text>

              {/* Email chip */}
              {!!email && (
                <Text style={styles.emailChip}>
                  Account:{" "}
                  <Text style={styles.emailChipValue}>{email}</Text>
                </Text>
              )}

              {/* ============ CONTACT OPTIONS ============ */}
              <View style={{ gap: 10, marginBottom: 28 }}>
                {/* Email row — tap to open mail app */}
                <TouchableOpacity
                  onPress={handleContactSupport}
                  activeOpacity={0.8}
                  style={styles.contactRow}
                >
                  <View style={styles.contactIconWrap}>
                    <Ionicons
                      name="mail-outline"
                      size={16}
                      color="rgba(27,43,39,0.55)"
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.contactLabel}>Email</Text>
                    <Text
                      style={styles.contactValue}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {SUPPORT_EMAIL}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color="rgba(27,43,39,0.3)"
                  />
                </TouchableOpacity>

                {/* Phone row — tap to open dialer */}
                <TouchableOpacity
                  onPress={handleCallSupport}
                  activeOpacity={0.8}
                  style={styles.contactRow}
                >
                  <View style={styles.contactIconWrap}>
                    <Ionicons
                      name="call-outline"
                      size={16}
                      color="rgba(27,43,39,0.55)"
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.contactLabel}>Phone</Text>
                    <Text
                      style={styles.contactValue}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {SUPPORT_PHONE}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color="rgba(27,43,39,0.3)"
                  />
                </TouchableOpacity>
              </View>

              {/* ============ ACTIONS ============ */}
              <View style={{ gap: 10 }}>
                {/* Message Support — dark pill */}
                <TouchableOpacity
                  onPress={handleContactSupport}
                  activeOpacity={0.85}
                  style={styles.primaryBtn}
                >
                  <Text style={styles.primaryBtnText}>Message Support</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={CREAM}
                    style={{ marginLeft: 8 }}
                  />
                </TouchableOpacity>

                {/* Back to Sign In — outline pill */}
                <TouchableOpacity
                  onPress={handleBackToLogin}
                  activeOpacity={0.85}
                  style={styles.secondaryBtn}
                >
                  <Ionicons
                    name="log-out-outline"
                    size={16}
                    color="rgba(27,43,39,0.7)"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.secondaryBtnText}>Back to Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(27,43,39,0.06)",
    ...Platform.select({
      ios: {
        shadowColor: INK,
        shadowOpacity: 0.08,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 6 },
    }),
  },

  title: {
    color: RED,
    fontSize: 22,
    lineHeight: 28,
    textAlign: "center",
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
    marginBottom: 12,
  },
  subtitle: {
    color: "rgba(27,43,39,0.6)",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 20,
  },

  emailChip: {
    color: "rgba(198,5,5,0.5)",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 22,
  },
  emailChipValue: {
    color: "rgba(198,5,5,0.85)",
    fontWeight: "600",
  },

  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: "rgba(27,43,39,0.08)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  contactIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(27,43,39,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  contactLabel: {
    color: "rgba(27,43,39,0.4)",
    fontSize: 11,
    lineHeight: 14,
    marginBottom: 2,
  },
  contactValue: {
    color: "rgba(27,43,39,0.85)",
    fontSize: 14,
    fontWeight: "500",
  },

  primaryBtn: {
    height: 50,
    borderRadius: 999,
    backgroundColor: INK,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: CREAM,
    fontSize: 14,
    fontWeight: "600",
  },

  secondaryBtn: {
    height: 50,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(27,43,39,0.12)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  secondaryBtnText: {
    color: "rgba(27,43,39,0.7)",
    fontSize: 14,
    fontWeight: "600",
  },
});