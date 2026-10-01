import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  useWindowDimensions,
  StyleSheet,
  Alert,
  findNodeHandle,
  UIManager,
} from "react-native";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { register } from "../../services/authServices";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

const CREAM = "#F7F4EF";
const INK = "#1B2B27";
const GOLD = "#C89B5A";

type FieldKey =
  | "firstName"
  | "lastName"
  | "middleName"
  | "contact"
  | "address"
  | "email"
  | "password"
  | "confirm"
  | null;

export default function Register() {
  const router = useRouter();
  const { height } = useWindowDimensions();

  const [isNavigating, setIsNavigating] = useState(false);

  const [first_name, setFirstName] = useState("");
  const [middle_name, setMiddleName] = useState("");
  const [last_name, setLastName] = useState("");
  const [contact_number, setContactNumber] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [focusedField, setFocusedField] = useState<FieldKey>(null);

  const isProcessing = useRef(false);

  // All input refs
  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const middleNameRef = useRef<TextInput>(null);
  const contactRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const scrollRef = useRef<ScrollView>(null);

  // Track keyboard height
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Auto-scroll when focused field changes OR keyboard opens
  useEffect(() => {
    if (!focusedField) return;
    const t = setTimeout(() => scrollToFocused(focusedField), 250);
    return () => clearTimeout(t);
  }, [focusedField, keyboardHeight]);

  // Scroll to the focused input so it stays above the keyboard
  const scrollToFocused = (field: FieldKey) => {
    if (!field || !scrollRef.current) return;

    const map: Record<string, React.RefObject<TextInput | null>> = {
      firstName: firstNameRef,
      lastName: lastNameRef,
      middleName: middleNameRef,
      contact: contactRef,
      address: addressRef,
      email: emailRef,
      password: passwordRef,
      confirm: confirmRef,
    };

    const target = map[field]?.current;
    if (!target) return;

    const handle = findNodeHandle(target);
    if (!handle) return;

    // @ts-ignore — getInnerViewNode exists at runtime
    const scrollNode = scrollRef.current.getInnerViewNode
      ? scrollRef.current.getInnerViewNode()
      : findNodeHandle(scrollRef.current);

    UIManager.measureLayout(
      handle,
      scrollNode,
      () => {},
      (_x: number, y: number) => {
        // Leave ~140px of space above the input so it clears the keyboard
        scrollRef.current?.scrollTo({
          y: Math.max(y - 140, 0),
          animated: true,
        });
      },
    );
  };

  const handleRegister = async () => {
    if (loading || isProcessing.current || isNavigating) {
      console.log("Prevented double click");
      return;
    }

    setError("");

    if (!first_name || !last_name || !email || !password) {
      setError("Please fill all required fields.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    isProcessing.current = true;
    setLoading(true);
    Keyboard.dismiss();

    try {
      const res = await register({
        first_name,
        middle_name: middle_name || null,
        last_name,
        contact_number: contact_number || null,
        address: address || null,
        email,
        password,
        password_confirmation: confirmPassword,
      });

      console.log("REGISTER RESPONSE:", res);

      // NOT VERIFIED CASE
      if (res?.message?.includes("not verified")) {
        Alert.alert(
          "Account Not Verified",
          "This email is already registered but not verified.\n\nDo you want to continue verification?",
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => {
                isProcessing.current = false;
                setLoading(false);
              },
            },
            {
              text: "Continue",
              onPress: () => {
                setIsNavigating(true);
                router.replace({
                  pathname: "/auth/otp",
                  params: { email, from: "register" },
                });
              },
            },
          ],
        );
        return;
      }

      setIsNavigating(true);
      router.replace({
        pathname: "/auth/otp",
        params: { email },
      });
    } catch (e: any) {
      console.log("ERROR DATA:", e.response?.data);

      if (
        e.response?.status === 400 &&
        e.response?.data?.message === "Email already registered"
      ) {
        Alert.alert(
          "Registration Failed",
          "This email is already registered and verified. Please login instead.",
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => {
                isProcessing.current = false;
                setLoading(false);
              },
            },
            {
              text: "Go to Login",
              onPress: () => {
                isProcessing.current = false;
                setLoading(false);
                router.push("/auth/login");
              },
            },
          ],
        );
      } else {
        const errorMessage =
          e.response?.data?.message || "Registration failed. Please try again.";
        setError(errorMessage);
        isProcessing.current = false;
        setLoading(false);
      }
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: CREAM }}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={{ flexGrow: 1 }}
          >
            {/* ===================== HERO PANEL ===================== */}
            <View
              style={{
                height: Math.max(height * 0.38, 280),
                overflow: "hidden",
              }}
            >
              <ImageBackground
                source={require("../../assets/bg.jpg")}
                style={{ flex: 1 }}
                resizeMode="cover"
              >
                <LinearGradient
                  colors={[
                    "rgba(27,43,39,0.35)",
                    "rgba(27,43,39,0.65)",
                    "rgba(27,43,39,0.95)",
                  ]}
                  style={{
                    flex: 1,
                    justifyContent: "space-between",
                    paddingHorizontal: 24,
                    paddingTop: 60,
                    paddingBottom: 60,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        width: 32,
                        height: 1,
                        backgroundColor: GOLD,
                        marginRight: 10,
                      }}
                    />
                    <Text style={styles.eyebrowWhite}>
                      EST. 2019 · ALUBIJID
                    </Text>
                  </View>

                  <View>
                    <Text style={styles.heroTitle}>
                      Join the{"\n"}
                      <Text style={{ color: GOLD, fontStyle: "italic" }}>
                        family
                      </Text>
                      .
                    </Text>

                    <Text style={styles.heroScript}>
                      "A quiet place to rest,{"\n"}
                      a warm place to return."
                    </Text>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 24,
                          height: 1,
                          backgroundColor: GOLD,
                          marginRight: 8,
                        }}
                      />
                      <Text style={styles.heroLabel}>TRAVELERS INN</Text>
                    </View>
                  </View>
                </LinearGradient>
              </ImageBackground>
            </View>

            {/* ===================== FORM PANEL ===================== */}
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                marginTop: -28,
                paddingHorizontal: 24,
                paddingTop: 32,
                paddingBottom: 40,
                ...Platform.select({
                  ios: {
                    shadowColor: INK,
                    shadowOpacity: 0.08,
                    shadowRadius: 20,
                    shadowOffset: { width: 0, height: -8 },
                  },
                  android: { elevation: 6 },
                }),
              }}
            >
              {/* Title */}
              <View style={{ marginBottom: 22 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <View
                    style={{
                      width: 28,
                      height: 1,
                      backgroundColor: GOLD,
                      marginRight: 10,
                    }}
                  />
                  <Text style={styles.eyebrow}>CREATE ACCOUNT</Text>
                </View>

                <Text style={styles.formTitle}>
                  Register your{"\n"}guest account.
                </Text>

                <Text style={styles.formSubtitle}>
                  Fill in your details below to get started.
                </Text>
              </View>

              {/* Error banner */}
              {!!error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* ============ NAME ROW ============ */}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>FIRST NAME *</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons
                      name="person-outline"
                      size={15}
                      color="rgba(27,43,39,0.4)"
                      style={{ marginRight: 8 }}
                    />
                    <TextInput
                      ref={firstNameRef}
                      value={first_name}
                      onChangeText={setFirstName}
                      onFocus={() => setFocusedField("firstName")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Juan"
                      placeholderTextColor="rgba(27,43,39,0.35)"
                      autoCapitalize="words"
                      returnKeyType="next"
                      onSubmitEditing={() => lastNameRef.current?.focus()}
                      editable={!loading}
                      style={styles.input}
                    />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>LAST NAME *</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons
                      name="person-outline"
                      size={15}
                      color="rgba(27,43,39,0.4)"
                      style={{ marginRight: 8 }}
                    />
                    <TextInput
                      ref={lastNameRef}
                      value={last_name}
                      onChangeText={setLastName}
                      onFocus={() => setFocusedField("lastName")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Dela Cruz"
                      placeholderTextColor="rgba(27,43,39,0.35)"
                      autoCapitalize="words"
                      returnKeyType="next"
                      onSubmitEditing={() => contactRef.current?.focus()}
                      editable={!loading}
                      style={styles.input}
                    />
                  </View>
                </View>
              </View>

              {/* Middle name */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
                MIDDLE NAME
              </Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="person-outline"
                  size={15}
                  color="rgba(27,43,39,0.4)"
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  ref={middleNameRef}
                  value={middle_name}
                  onChangeText={setMiddleName}
                  onFocus={() => setFocusedField("middleName")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Optional"
                  placeholderTextColor="rgba(27,43,39,0.35)"
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => contactRef.current?.focus()}
                  editable={!loading}
                  style={styles.input}
                />
              </View>

              {/* Contact */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
                CONTACT NUMBER
              </Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="call-outline"
                  size={15}
                  color="rgba(27,43,39,0.4)"
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  ref={contactRef}
                  value={contact_number}
                  onChangeText={setContactNumber}
                  onFocus={() => setFocusedField("contact")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="09XX XXX XXXX"
                  placeholderTextColor="rgba(27,43,39,0.35)"
                  keyboardType="phone-pad"
                  returnKeyType="next"
                  onSubmitEditing={() => addressRef.current?.focus()}
                  editable={!loading}
                  style={styles.input}
                />
              </View>

              {/* Address */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
                ADDRESS
              </Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="location-outline"
                  size={15}
                  color="rgba(27,43,39,0.4)"
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  ref={addressRef}
                  value={address}
                  onChangeText={setAddress}
                  onFocus={() => setFocusedField("address")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Optional"
                  placeholderTextColor="rgba(27,43,39,0.35)"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  editable={!loading}
                  style={styles.input}
                />
              </View>

              {/* Email */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
                EMAIL ADDRESS *
              </Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="mail-outline"
                  size={15}
                  color="rgba(27,43,39,0.4)"
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  ref={emailRef}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="you@example.com"
                  placeholderTextColor="rgba(27,43,39,0.35)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  editable={!loading}
                  style={styles.input}
                />
              </View>

              {/* Password */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
                PASSWORD *
              </Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="lock-closed-outline"
                  size={15}
                  color="rgba(27,43,39,0.4)"
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="At least 8 characters"
                  placeholderTextColor="rgba(27,43,39,0.35)"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  editable={!loading}
                  style={styles.input}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((s) => !s)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={17}
                    color="rgba(27,43,39,0.4)"
                  />
                </TouchableOpacity>
              </View>

              {/* Confirm Password */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
                CONFIRM PASSWORD *
              </Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="lock-closed-outline"
                  size={15}
                  color="rgba(27,43,39,0.4)"
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  ref={confirmRef}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setFocusedField("confirm")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Re-enter password"
                  placeholderTextColor="rgba(27,43,39,0.35)"
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="go"
                  onSubmitEditing={handleRegister}
                  editable={!loading}
                  style={styles.input}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword((s) => !s)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={
                      showConfirmPassword ? "eye-off-outline" : "eye-outline"
                    }
                    size={17}
                    color="rgba(27,43,39,0.4)"
                  />
                </TouchableOpacity>
              </View>

              {/* Register button */}
              <TouchableOpacity
                onPress={handleRegister}
                disabled={loading || isNavigating}
                activeOpacity={0.9}
                style={{ borderRadius: 999, overflow: "hidden", marginTop: 26 }}
              >
                <LinearGradient
                  colors={[INK, INK]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    height: 52,
                    borderRadius: 999,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: loading || isNavigating ? 0.7 : 1,
                  }}
                >
                  {loading ? (
                    <>
                      <ActivityIndicator size="small" color={CREAM} />
                      <Text style={[styles.registerText, { marginLeft: 10 }]}>
                        Creating account...
                      </Text>
                    </>
                  ) : isNavigating ? (
                    <Text style={styles.registerText}>Redirecting...</Text>
                  ) : (
                    <>
                      <Text style={styles.registerText}>Create account</Text>
                      <Ionicons
                        name="arrow-forward"
                        size={16}
                        color={CREAM}
                        style={{ marginLeft: 8 }}
                      />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Login link */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  marginTop: 22,
                }}
              >
                <Text style={styles.loginText}>
                  Already have an account?{" "}
                </Text>
                <TouchableOpacity
                  onPress={() => !loading && router.push("/auth/login")}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.loginLink}>Sign in</Text>
                </TouchableOpacity>
              </View>

              {/* Security badge */}
              <View style={styles.securityBadge}>
                <View style={styles.securityIconWrap}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={18}
                    color={GOLD}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.securityTitle}>Your data is safe</Text>
                  <Text style={styles.securityBody}>
                    We protect your details with enterprise-grade security.
                  </Text>
                </View>
              </View>
            </View>

            {/* ============ DYNAMIC KEYBOARD SPACER ============ */}
            {keyboardHeight > 0 && (
              <View style={{ height: keyboardHeight }} />
            )}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: GOLD,
    fontSize: 10,
    letterSpacing: 2.5,
    fontWeight: "600",
  },
  eyebrowWhite: {
    color: GOLD,
    fontSize: 10,
    letterSpacing: 2.5,
    fontWeight: "600",
  },

  heroTitle: {
    color: "#FFFFFF",
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.3,
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
  },
  heroScript: {
    color: "rgba(247,244,239,0.85)",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
    fontStyle: "italic",
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
  },
  heroLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "600",
  },

  formTitle: {
    color: INK,
    fontSize: 26,
    lineHeight: 30,
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
  },
  formSubtitle: {
    color: "rgba(27,43,39,0.55)",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },

  errorBox: {
    backgroundColor: "#FEF2F2",
    borderLeftWidth: 2,
    borderLeftColor: "#F87171",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    lineHeight: 18,
  },

  fieldLabel: {
    color: "rgba(27,43,39,0.55)",
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(27,43,39,0.12)",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: INK,
    paddingVertical: 0,
  },

  registerText: {
    color: CREAM,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  loginText: {
    color: "rgba(27,43,39,0.6)",
    fontSize: 13,
  },
  loginLink: {
    color: INK,
    fontSize: 13,
    fontWeight: "700",
    textDecorationLine: "underline",
    textDecorationColor: GOLD,
  },

  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(27,43,39,0.04)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(27,43,39,0.06)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 24,
  },
  securityIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(200,155,90,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  securityTitle: {
    color: INK,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },
  securityBody: {
    color: "rgba(27,43,39,0.55)",
    fontSize: 11,
    lineHeight: 15,
  },
});