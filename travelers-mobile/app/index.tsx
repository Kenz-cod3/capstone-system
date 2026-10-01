import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ImageBackground,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
  TextInput,
  useWindowDimensions,
  Platform,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { getPublicRooms } from "@/services/roomService";
import { useAuthStore } from "@/store/authStore";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const AMENITIES = [
  { icon: "cafe-outline", title: "Free Kapihan", subtitle: "Enjoy complimentary coffee and a relaxing break." },
  { icon: "car-outline", title: "Free Parking", subtitle: "Safe and convenient parking for our guests." },
  { icon: "wifi-outline", title: "WiFi Vendo Access", subtitle: "Stay connected whenever you need it." },
  { icon: "basketball-outline", title: "Basketball Court", subtitle: "Enjoy an active game during your stay." },
  { icon: "bed-outline", title: "Comfortable Accommodation", subtitle: "Relax in a welcoming and comfortable space." },
  { icon: "sparkles-outline", title: "Essential Amenities", subtitle: "Everything you need for a convenient stay." },
];

const NAV_LINKS = [
  { label: "Home", icon: "home-outline", id: "home" },
  { label: "Rooms", icon: "bed-outline", id: "rooms" },
  { label: "Amenities", icon: "sparkles-outline", id: "amenities" },
  { label: "About", icon: "information-circle-outline", id: "about" },
  { label: "Contact", icon: "call-outline", id: "contact" },
];

const SOCIALS = [
  { icon: "logo-facebook", label: "Facebook" },
  { icon: "logo-instagram", label: "Instagram" },
  { icon: "logo-twitter", label: "Twitter" },
];

const CREAM = "#F7F4EF";
const INK = "#1B2B27";
const GOLD = "#C89B5A";

export default function Welcome() {
  const router = useRouter();
  const { user, isLoaded } = useAuthStore();
  const { height, width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [demoText, setDemoText] = useState("");

  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<string, number>>({});

  // ===== ANIMATIONS =====
  const heroFade = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(24)).current;
  const heroImgFade = useRef(new Animated.Value(0)).current;
  const heroImgScale = useRef(new Animated.Value(1.06)).current;
  const searchFade = useRef(new Animated.Value(0)).current;
  const searchLift = useRef(new Animated.Value(20)).current;
  const headerShadow = useRef(new Animated.Value(0)).current;
  const headerBorder = useRef(new Animated.Value(0)).current; // 0 = hidden, 1 = visible
  const drawerSlide = useRef(new Animated.Value(0)).current;
  const backdropFade = useRef(new Animated.Value(0)).current;
  const cursorBlink = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroFade, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(heroSlide, { toValue: 0, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    Animated.parallel([
      Animated.timing(heroImgFade, { toValue: 1, duration: 900, delay: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(heroImgScale, { toValue: 1, duration: 1200, delay: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    Animated.parallel([
      Animated.timing(searchFade, { toValue: 1, duration: 700, delay: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(searchLift, { toValue: 0, duration: 700, delay: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorBlink, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(cursorBlink, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    if (menuOpen) {
      Animated.parallel([
        Animated.timing(drawerSlide, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(backdropFade, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(drawerSlide, { toValue: 0, duration: 240, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(backdropFade, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [menuOpen]);

  useEffect(() => {
    if (!isLoaded) return;
    if (user) {
      if (user.role === "guest") router.replace("/(guest)/(tabs)/home");
      else if (user.role === "housekeeper") router.replace("/(housekeeper)/(tabs)/dashboard");
    }
  }, [user, isLoaded]);

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    const phrases = ["Room 204", "Deluxe room", "Family suite", "Standard"];
    let i = 0;
    let charIndex = 0;
    let erasing = false;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const current = phrases[i % phrases.length];
      if (!erasing) {
        charIndex++;
        setDemoText(current.slice(0, charIndex));
        if (charIndex >= current.length) {
          erasing = true;
          setTimeout(tick, 1100);
          return;
        }
      } else {
        charIndex--;
        setDemoText(current.slice(0, charIndex));
        if (charIndex <= 0) {
          erasing = false;
          i++;
        }
      }
      setTimeout(tick, erasing ? 40 : 80);
    };
    const t = setTimeout(tick, 600);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  // ===== FETCH PUBLIC ROOMS =====
  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await getPublicRooms();

      // /rooms/available returns { data: [...], current_page, last_page, ... }
      // Defensive: handle both paginated object and flat array.
      const list = Array.isArray(res) ? res : res?.data ?? [];

      console.log("PUBLIC ROOMS:", list.length, list[0]); // temp debug
      setRooms(list);
    } catch (e) {
      console.log("fetchRooms error:", e);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNavPress = (id: string) => {
    setMenuOpen(false);
    setTimeout(() => {
      if (id === "home") {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        return;
      }
      const y = sectionOffsets.current[id];
      if (typeof y === "number" && y >= 0) {
        scrollRef.current?.scrollTo({ y: Math.max(y - 12, 0), animated: true });
      }
    }, 280);
  };

  const registerSection = (id: string) => (e: any) => {
    const y = e?.nativeEvent?.layout?.y;
    if (typeof y === "number") {
      sectionOffsets.current[id] = y;
    }
  };

  const openMenu = () => setMenuOpen(true);
  const closeMenu = () => setMenuOpen(false);

  return (
    <View style={{ flex: 1, backgroundColor: CREAM }}>
      <StatusBar style="dark" />

      {/* ===================== NAVBAR ===================== */}
      <SafeAreaView edges={["top"]} style={{ backgroundColor: CREAM }}>
        <Animated.View
          style={[
            styles.navBar,
            {
              borderBottomWidth: headerBorder.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              }),
              borderBottomColor: "rgba(27,43,39,0.08)",
              shadowColor: INK,
              shadowOpacity: headerShadow as any,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 },
              elevation: 0,
            },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Image source={require("../assets/logo.jpg")} style={styles.logoImg} resizeMode="cover" />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.brandName}>Travelers Inn</Text>
              <Text style={styles.brandSub}>COMFORT · STAY · ENJOY</Text>
            </View>
          </View>

          <TouchableOpacity onPress={openMenu} activeOpacity={0.7} style={styles.burgerBtn}>
            <Ionicons name="menu-outline" size={26} color={INK} />
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>

      {/* ===================== DRAWER ===================== */}
      <Modal visible={menuOpen} transparent animationType="none" onRequestClose={closeMenu}>
        <View style={{ flex: 1 }}>
          <Animated.View
            style={{
              position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              opacity: backdropFade,
            }}
          >
            <Pressable style={{ flex: 1 }} onPress={closeMenu} />
          </Animated.View>

          <Animated.View
            style={{
              position: "absolute", top: 0, right: 0, height: "100%",
              width: Math.min(width * 0.82, 340),
              backgroundColor: CREAM,
              transform: [
                {
                  translateX: drawerSlide.interpolate({
                    inputRange: [0, 1],
                    outputRange: [Math.min(width * 0.82, 340), 0],
                  }),
                },
              ],
            }}
          >
            <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1 }}>
              <View style={styles.drawerHeader}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Image source={require("../assets/logo.jpg")} style={styles.drawerLogoImg} resizeMode="cover" />
                  <Text style={[styles.brandName, { marginLeft: 10 }]}>Travelers Inn</Text>
                </View>
                <TouchableOpacity onPress={closeMenu} activeOpacity={0.7} style={styles.drawerClose}>
                  <Ionicons name="close-outline" size={20} color={INK} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {NAV_LINKS.map((link, index) => (
                  <DrawerLink
                    key={link.label}
                    link={link}
                    index={index}
                    visible={menuOpen}
                    onPress={() => handleNavPress(link.id)}
                  />
                ))}
              </ScrollView>

              <View style={styles.drawerFooter}>
                <TouchableOpacity
                  onPress={() => {
                    closeMenu();
                    setTimeout(() => router.push("/auth/login"), 200);
                  }}
                  activeOpacity={0.85}
                  style={styles.drawerSignInBtn}
                >
                  <Text style={styles.drawerSignInText}>SIGN IN</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    closeMenu();
                    setTimeout(() => router.push("/auth/register"), 200);
                  }}
                  activeOpacity={0.9}
                  style={{ borderRadius: 999, overflow: "hidden" }}
                >
                  <LinearGradient
                    colors={[INK, INK]}
                    style={{
                      paddingVertical: 14,
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                      borderRadius: 999,
                    }}
                  >
                    <Text style={styles.drawerBookText}>BOOK NOW</Text>
                    <Ionicons name="arrow-up" size={12} color={CREAM} style={{ marginLeft: 6 }} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>

      {/* ===================== SCROLL CONTENT ===================== */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, backgroundColor: CREAM }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          const past = y > 10;

          Animated.timing(headerShadow, {
            toValue: past ? 0.08 : 0,
            duration: 200,
            useNativeDriver: false,
          }).start();

          Animated.timing(headerBorder, {
            toValue: past ? 1 : 0,
            duration: 200,
            useNativeDriver: false,
          }).start();
        }}
      >
        {/* ============ HERO ============ */}
        <View
          onLayout={registerSection("home")}
          style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 90 }}
        >
          <Animated.View
            style={{
              marginBottom: 32,
              opacity: heroFade,
              transform: [{ translateY: heroSlide }],
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
              <View style={{ width: 40, height: 1, backgroundColor: GOLD, marginRight: 12 }} />
              <Text style={styles.eyebrow}>EST. 2019 · ALUBIJID</Text>
            </View>

            <Text style={styles.heroTitle}>
              A quiet place{"\n"}
              to <Text style={{ color: GOLD, fontStyle: "italic" }}>rest</Text>,{"\n"}
              a warm place{"\n"}
              to <Text style={{ color: GOLD, fontStyle: "italic" }}>return</Text>.
            </Text>

            <Text style={styles.heroBody}>
              Discover your perfect room and book a stay that feels like home —
              wherever your journey takes you.
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginTop: 26 }}>
              <TouchableOpacity
                onPress={() => router.push("/auth/register")}
                activeOpacity={0.9}
                style={{ borderRadius: 999, overflow: "hidden" }}
              >
                <LinearGradient
                  colors={[INK, INK]}
                  style={{ paddingHorizontal: 22, height: 48, flexDirection: "row", alignItems: "center", borderRadius: 999 }}
                >
                  <Text style={styles.primaryBtnText}>Reserve your stay</Text>
                  <Ionicons name="arrow-forward" size={15} color={CREAM} style={{ marginLeft: 8 }} />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleNavPress("rooms")}
                activeOpacity={0.7}
                style={{ height: 48, flexDirection: "row", alignItems: "center", marginLeft: 14 }}
              >
                <View style={{ width: 32, height: 1, backgroundColor: INK + "4D", marginRight: 10 }} />
                <Text style={styles.secondaryBtnText}>View rooms</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 42 }}>
              <View>
                <Text style={styles.statNum}>24</Text>
                <Text style={styles.statLabel}>Rooms</Text>
              </View>
              <View style={styles.statDivider} />
              <View>
                <Text style={styles.statNum}>4.9</Text>
                <Text style={styles.statLabel}>Guest rating</Text>
              </View>
              <View style={styles.statDivider} />
              <View>
                <Text style={styles.statNum}>5AM–11PM</Text>
                <Text style={styles.statLabel}>Front desk</Text>
              </View>
            </View>
          </Animated.View>

          <View style={{ position: "relative" }}>
            <View style={styles.heroFrame} />
            <Animated.View
              style={[
                styles.heroImageWrap,
                { opacity: heroImgFade, transform: [{ scale: heroImgScale }] },
              ]}
            >
              <ImageBackground
                source={require("../assets/bg1.jpg")}
                style={{ width: "100%", height: Math.min(height * 0.55, 480) }}
                resizeMode="cover"
                imageStyle={{ borderRadius: 20 }}
              >
                <LinearGradient
                  colors={["transparent", "rgba(27,43,39,0.05)", "rgba(27,43,39,0.5)"]}
                  style={{ flex: 1, justifyContent: "flex-end" }}
                >
                  <View style={styles.quoteCard}>
                    <Text style={styles.quoteText}>
                      "More than just a place to stay — it's a home for every traveler."
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
                      <View style={{ width: 24, height: 1, backgroundColor: GOLD, marginRight: 8 }} />
                      <Text style={styles.quoteLabel}>TRAVELERS INN</Text>
                    </View>
                  </View>
                </LinearGradient>
              </ImageBackground>
            </Animated.View>
          </View>
        </View>

        {/* ============ SEARCH BAR ============ */}
        <Animated.View
          style={{
            marginTop: -60,
            marginBottom: 24,
            paddingHorizontal: 16,
            zIndex: 5,
            opacity: searchFade,
            transform: [{ translateY: searchLift }],
          }}
        >
          <View style={styles.searchCard}>
            <SearchRow icon="location-outline" label="Destination">
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TextInput
                  value={demoText}
                  editable={false}
                  placeholder="Where are you going?"
                  placeholderTextColor="rgba(27,43,39,0.4)"
                  style={[styles.searchInput, { flexShrink: 1 }]}
                />
                {demoText.length > 0 && (
                  <Animated.View
                    style={{
                      width: 1.5,
                      height: 14,
                      backgroundColor: INK,
                      marginLeft: 1,
                      opacity: cursorBlink,
                    }}
                  />
                )}
              </View>
            </SearchRow>
            <View style={styles.searchDivider} />
            <SearchRow icon="calendar-outline" label="Check in">
              <Text style={styles.searchValue}>Add date</Text>
            </SearchRow>
            <View style={styles.searchDivider} />
            <SearchRow icon="calendar-outline" label="Check out">
              <Text style={styles.searchValue}>Add date</Text>
            </SearchRow>
            <View style={styles.searchDivider} />
            <SearchRow icon="people-outline" label="Guests">
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={[styles.searchValue, { color: INK }]}>2 Guests</Text>
                <Ionicons name="chevron-down" size={12} color="rgba(27,43,39,0.4)" style={{ marginLeft: 4 }} />
              </View>
            </SearchRow>

            <TouchableOpacity onPress={() => handleNavPress("rooms")} activeOpacity={0.9} style={styles.searchBtn}>
              <Ionicons name="search-outline" size={16} color={INK} />
              <Text style={styles.searchBtnText}>Search</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ============ AMENITIES ============ */}
        <FadeInSection onLayout={registerSection("amenities")}>
          <View style={{ backgroundColor: CREAM, paddingHorizontal: 16, paddingBottom: 56, paddingTop: 8 }}>
            <SectionEyebrow label="What we offer" />
            <Text style={styles.sectionTitle}>Everything you need,{"\n"}for a comfortable stay.</Text>
            <Text style={styles.sectionBody}>
              Thoughtful amenities and convenient facilities designed to make your stay
              relaxing, enjoyable, and hassle-free.
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 4 }}>
              {AMENITIES.map((item, index) => (
                <View
                  key={item.title}
                  style={{
                    width: "50%",
                    paddingRight: index % 2 === 0 ? 6 : 0,
                    paddingLeft: index % 2 === 0 ? 0 : 6,
                    marginBottom: 12,
                  }}
                >
                  <View style={styles.amenityCard}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                      <View style={styles.amenityIconWrap}>
                        <Ionicons name={item.icon as any} size={18} color={INK} />
                      </View>
                      <Text style={styles.amenityNum}>0{index + 1}</Text>
                    </View>
                    <Text style={styles.amenityTitle}>{item.title}</Text>
                    <Text style={styles.amenitySub}>{item.subtitle}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </FadeInSection>

        {/* ============ ROOMS ============ */}
        <FadeInSection onLayout={registerSection("rooms")}>
          <View style={{ backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingVertical: 40 }}>
            <SectionEyebrow label="Our rooms" />
            <Text style={styles.sectionTitle}>Rooms & suites</Text>
            <Text style={styles.sectionBody}>
              Explore our comfortable and affordable rooms. Sign in or create an account to book your stay.
            </Text>

            {loading ? (
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <ActivityIndicator size="small" color={INK} />
                <Text style={styles.mutedText}>Loading rooms...</Text>
              </View>
            ) : rooms.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <Ionicons name="bed-outline" size={35} color={INK} />
                <Text style={styles.mutedText}>No rooms available right now.</Text>
              </View>
            ) : (
              <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
                {rooms.slice(0, 6).map((room, index) => (
                  <RoomCard
                    key={room.id ?? index}
                    room={room}
                    index={index}
                    isTablet={isTablet}
                    onBook={() => router.push("/auth/register")}
                  />
                ))}
              </View>
            )}
          </View>
        </FadeInSection>

        {/* ============ ABOUT ============ */}
        <FadeInSection onLayout={registerSection("about")}>
          <View style={{ backgroundColor: CREAM, paddingHorizontal: 16, paddingVertical: 48 }}>
            <SectionEyebrow label="About us" />
            <Text style={styles.sectionTitle}>A better place to{"\n"}create memories.</Text>
            <Text style={styles.sectionBody}>
              Whether you're here for business, leisure, or a quick getaway, Travelers Inn offers a
              comfortable and relaxing stay with modern amenities and warm hospitality.
            </Text>
            <Text style={[styles.sectionBody, { marginTop: 16 }]}>
              Every detail — from the linens to the lighting — is chosen with one goal: to make you feel
              at home, far from home.
            </Text>

            <View style={{ flexDirection: "row", marginTop: 32, height: 280 }}>
              {/* Left Column - Relax. Unwind. Belong. */}
              <View style={{ flex: 1, borderRadius: 24, overflow: "hidden", marginRight: 12 }}>
                <ImageBackground
                  source={require("../assets/bg8.jpg")}
                  style={{ flex: 1, justifyContent: "flex-end", padding: 20 }}
                  imageStyle={{ borderRadius: 24 }}
                  resizeMode="cover"
                >
                  <LinearGradient
                    colors={["transparent", "rgba(27,43,39,0.8)"]}
                    style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: 0 }}
                  />
                  <Text style={styles.mosaicBig}>
                    Relax.{"\n"}Unwind.{"\n"}
                    <Text style={{ color: GOLD, fontStyle: "italic" }}>Belong.</Text>
                  </Text>
                </ImageBackground>
              </View>

              {/* Right Column */}
              <View style={{ flex: 1, gap: 12 }}>
                {/* Top Right - Good food Good mood */}
                <View style={{ flex: 1, borderRadius: 24, overflow: "hidden" }}>
                  <ImageBackground
                    source={require("../assets/bg2.jpg")}
                    style={{ flex: 1, justifyContent: "flex-end", padding: 16 }}
                    imageStyle={{ borderRadius: 24 }}
                    resizeMode="cover"
                  >
                    <LinearGradient
                      colors={["transparent", "rgba(27,43,39,0.7)"]}
                      style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: 0 }}
                    />
                    <Text style={styles.mosaicScript}>Good food{"\n"}Good mood</Text>
                  </ImageBackground>
                </View>

                {/* Bottom Right Row */}
                <View style={{ flex: 1, flexDirection: "row", gap: 12 }}>
                  {/* Bottom Left - Image */}
                  <View style={{ flex: 1, borderRadius: 24, overflow: "hidden" }}>
                    <ImageBackground
                      source={require("../assets/bg3.jpg")}
                      style={{ flex: 1 }}
                      imageStyle={{ borderRadius: 24 }}
                      resizeMode="cover"
                    />
                  </View>
                  
                  {/* Bottom Right - Same comfort New adventures */}
                  <View style={[styles.mosaicDark, { flex: 1, borderRadius: 24, overflow: "hidden" }]}>
                    <ImageBackground
                      source={require("../assets/bg4.jpg")}
                      style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 12 }}
                      imageStyle={{ borderRadius: 24 }}
                      resizeMode="cover"
                    >
                      <LinearGradient
                        colors={["rgba(27,43,39,0.6)", "rgba(27,43,39,0.8)"]}
                        style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: 0 }}
                      />
                      <Text style={styles.mosaicDarkText}>Same comfort.{"\n"}New adventures.</Text>
                    </ImageBackground>
                  </View>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => router.push("/auth/register")}
              activeOpacity={0.85}
              style={styles.learnMoreBtn}
            >
              <Text style={styles.learnMoreText}>Learn more</Text>
              <Ionicons name="arrow-up" size={14} color={INK} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        </FadeInSection>

        {/* ============ FOOTER ============ */}
        <FadeInSection onLayout={registerSection("contact")}>
          <View style={{ backgroundColor: INK, paddingHorizontal: 16, paddingTop: 56, paddingBottom: 40 }}>
            <Text style={styles.footerTitle}>
              Ready to{"\n"}
              <Text style={{ color: GOLD, fontStyle: "italic" }}>check in?</Text>
            </Text>

            <Text style={styles.footerBody}>
              Book your stay at Travelers Inn and experience comfort that feels like home.
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 28 }}>
              <TouchableOpacity
                onPress={() => router.push("/auth/register")}
                activeOpacity={0.9}
                style={styles.footerPrimaryBtn}
              >
                <Text style={styles.footerPrimaryText}>Book now</Text>
                <Ionicons name="arrow-forward" size={14} color={INK} style={{ marginLeft: 8 }} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/auth/login")}
                activeOpacity={0.85}
                style={[styles.footerSecondaryBtn, { marginLeft: 12 }]}
              >
                <Text style={styles.footerSecondaryText}>Sign in</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footerBlock}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <Image source={require("../assets/logo.jpg")} style={styles.footerLogoImg} resizeMode="cover" />
                <Text style={styles.footerBrand}>Travelers Inn</Text>
              </View>
              <Text style={styles.footerMuted}>A quiet place to rest,{"\n"}a warm place to return.</Text>
            </View>

            <FooterColumn title="Explore">
              {NAV_LINKS.map((link) => (
                <TouchableOpacity
                  key={link.label}
                  onPress={() => handleNavPress(link.id)}
                  activeOpacity={0.7}
                  style={{ paddingVertical: 5 }}
                >
                  <Text style={styles.footerLink}>{link.label}</Text>
                </TouchableOpacity>
              ))}
            </FooterColumn>

            <FooterColumn title="Contact">
              <FooterRow icon="call-outline" text="09177045341" />
              <FooterRow icon="mail-outline" text="lyeniatravellersinn@gmail.com" />
              <FooterRow icon="location-outline" text="Zone 3 Lanao, Alubijid, Mis. Or." />
            </FooterColumn>

            <FooterColumn title="Follow">
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                {SOCIALS.map((s, i) => (
                  <TouchableOpacity
                    key={s.label}
                    activeOpacity={0.7}
                    style={[styles.socialBtn, i > 0 ? { marginLeft: 12 } : null]}
                  >
                    <Ionicons name={s.icon as any} size={15} color={CREAM} />
                  </TouchableOpacity>
                ))}
              </View>
            </FooterColumn>

            <View style={{ borderTopWidth: 1, borderTopColor: "rgba(247,244,239,0.1)", marginTop: 32, paddingTop: 24 }}>
              <Text style={styles.copyright}>
                © {new Date().getFullYear()} Travelers Inn. All rights reserved.
              </Text>
            </View>
          </View>
        </FadeInSection>
      </ScrollView>
    </View>
  );
}

/* ============ Fade-in wrapper ============ */
function FadeInSection({
  onLayout,
  children,
  delay = 0,
}: {
  onLayout?: (e: any) => void;
  children: React.ReactNode;
  delay?: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 700, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 700, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View onLayout={onLayout} style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

/* ============ Animated room card ============ */
function RoomCard({
  room,
  index,
  isTablet,
  onBook,
}: {
  room: any;
  index: number;
  isTablet: boolean;
  onBook: () => void;
}) {
  const fade = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(24)).current;

  // Defensive fallbacks — works with BOTH /rooms/available (camelCase)
  // and the protected /rooms resource (snake_case).
  const imageUrl    = room.imageUrl ?? room.image_url ?? room.images?.[0]?.url ?? null;
  const displayType = room.type ?? room.room_type?.type_name ?? "Room";
  const displayName = room.name ?? room.room_number ?? "Room";
  const capacity    = room.capacity ?? room.room_type?.max_occupancy ?? 0;
  const price       = room.pricePerNight ?? room.room_type?.base_price ?? 0;

  useEffect(() => {
    const delay = (index % 3) * 90;
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 600, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(lift, { toValue: 0, duration: 600, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        width: isTablet ? "50%" : "100%",
        paddingRight: isTablet && index % 2 === 0 ? 8 : 0,
        paddingLeft: isTablet && index % 2 === 1 ? 8 : 0,
        marginBottom: 16,
        opacity: fade,
        transform: [{ translateY: lift }],
      }}
    >
      <View style={styles.roomCard}>
        <View style={{ position: "relative" }}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: "100%", height: 190 }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: "100%",
                height: 190,
                backgroundColor: "rgba(27,43,39,0.05)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="image-outline" size={35} color={INK} />
            </View>
          )}
          <View style={styles.availableBadge}>
            <Text style={styles.availableText}>AVAILABLE</Text>
          </View>
        </View>

        <View style={{ padding: 16 }}>
          <Text style={styles.roomType}>{displayType}</Text>
          <Text style={styles.roomName}>{displayName}</Text>
          {room.description && (
            <Text numberOfLines={2} style={styles.roomDesc}>{room.description}</Text>
          )}

          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 14 }}>
            <Ionicons name="people-outline" size={14} color={GOLD} />
            <Text style={styles.roomMeta}>{capacity} Guests</Text>
            {!!room.beds && (
              <>
                <Ionicons name="bed-outline" size={14} color={GOLD} style={{ marginLeft: 18 }} />
                <Text style={styles.roomMeta}>
                  {room.beds} {room.beds > 1 ? "Beds" : "Bed"}
                </Text>
              </>
            )}
          </View>

          <View style={styles.roomDivider} />

          <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
            <View>
              <Text style={styles.fromLabel}>FROM</Text>
              <Text style={styles.priceText}>
                ₱{Number(price || 0).toLocaleString()}
                <Text style={styles.perNight}> / night</Text>
              </Text>
            </View>

            <TouchableOpacity onPress={onBook} activeOpacity={0.85} style={styles.bookBtn}>
              <Text style={styles.bookBtnText}>Book</Text>
              <Ionicons name="arrow-forward" size={12} color={CREAM} style={{ marginLeft: 5 }} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

/* ============ Animated drawer link ============ */
function DrawerLink({
  link,
  index,
  visible,
  onPress,
}: {
  link: any;
  index: number;
  visible: boolean;
  onPress: () => void;
}) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (visible) {
      fade.setValue(0);
      slide.setValue(12);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 320, delay: 120 + index * 50, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(slide, { toValue: 0, duration: 320, delay: 120 + index * 50, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    } else {
      fade.setValue(0);
      slide.setValue(12);
    }
  }, [visible]);

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateX: slide }] }}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.drawerLink}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name={link.icon as any} size={18} color={GOLD} />
          <Text style={styles.drawerLinkText}>{link.label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={INK} style={{ opacity: 0.3 }} />
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ============ small helper components ============ */

function SectionEyebrow({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
      <View style={{ width: 32, height: 1, backgroundColor: GOLD, marginRight: 12 }} />
      <Text style={styles.eyebrow}>{label.toUpperCase()}</Text>
    </View>
  );
}

function SearchRow({ icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 }}>
      <Ionicons name={icon} size={16} color={GOLD} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.searchLabel}>{label.toUpperCase()}</Text>
        {children}
      </View>
    </View>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: "rgba(247,244,239,0.1)", marginTop: 32, paddingTop: 24 }}>
      <Text style={styles.footerColumnTitle}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function FooterRow({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 12 }}>
      <Ionicons name={icon} size={14} color={GOLD} />
      <Text style={[styles.footerLink, { marginLeft: 10, flex: 1 }]}>{text}</Text>
    </View>
  );
}

/* ============ styles ============ */

const styles = StyleSheet.create({
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 68,
    backgroundColor: CREAM,
  },
  logoImg: { width: 44, height: 44, borderRadius: 999 },
  brandName: {
    color: INK,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
  },
  brandSub: { color: "rgba(27,43,39,0.5)", fontSize: 8, letterSpacing: 1.5, marginTop: 2 },
  burgerBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 999 },

  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(27,43,39,0.08)",
  },
  drawerLogoImg: { width: 36, height: 36, borderRadius: 999 },
  drawerClose: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: "rgba(27,43,39,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(27,43,39,0.06)",
  },
  drawerLinkText: {
    color: INK,
    fontSize: 15,
    fontWeight: "500",
    marginLeft: 14,
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
  },
  drawerFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(27,43,39,0.08)",
  },
  drawerSignInBtn: {
    borderWidth: 1,
    borderColor: "rgba(27,43,39,0.2)",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  drawerSignInText: { color: INK, fontSize: 12, fontWeight: "600", letterSpacing: 2 },
  drawerBookText: { color: CREAM, fontSize: 12, fontWeight: "600", letterSpacing: 2 },

  eyebrow: { color: GOLD, fontSize: 10, letterSpacing: 2.5, fontWeight: "600" },
  heroTitle: {
    color: INK,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.5,
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
  },
  heroBody: { color: "rgba(27,43,39,0.6)", fontSize: 14, lineHeight: 24, marginTop: 22, maxWidth: 340 },
  primaryBtnText: { color: CREAM, fontSize: 14, fontWeight: "600" },
  secondaryBtnText: { color: "rgba(27,43,39,0.75)", fontSize: 14, fontWeight: "600" },
  statNum: { color: INK, fontSize: 22, fontFamily: Platform.select({ ios: "Georgia", android: "serif" }) },
  statLabel: { color: "rgba(27,43,39,0.5)", fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: "rgba(27,43,39,0.1)", marginHorizontal: 22 },

  heroFrame: {
    position: "absolute",
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderWidth: 1,
    borderColor: "rgba(200,155,90,0.3)",
    borderRadius: 24,
  },
  heroImageWrap: { borderRadius: 20, overflow: "hidden", backgroundColor: "rgba(27,43,39,0.05)" },
  quoteCard: { margin: 12, backgroundColor: "rgba(247,244,239,0.95)", borderRadius: 16, padding: 16 },
  quoteText: {
    color: INK,
    fontSize: 15,
    lineHeight: 22,
    fontStyle: "italic",
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
  },
  quoteLabel: { fontSize: 10, letterSpacing: 2, color: "rgba(27,43,39,0.5)", fontWeight: "600" },

  searchCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: "rgba(27,43,39,0.06)",
    ...Platform.select({
      ios: {
        shadowColor: "#1B2B27",
        shadowOpacity: 0.12,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 8 },
    }),
  },
  searchDivider: { height: 1, backgroundColor: "rgba(27,43,39,0.08)", marginHorizontal: 16 },
  searchLabel: { fontSize: 10, letterSpacing: 1.5, color: "rgba(27,43,39,0.4)", fontWeight: "600" },
  searchInput: { fontSize: 13, color: INK, marginTop: 2, padding: 0 },
  searchValue: { fontSize: 13, color: "rgba(27,43,39,0.5)", marginTop: 2 },
  searchBtn: {
    marginTop: 8,
    height: 56,
    borderRadius: 14,
    backgroundColor: GOLD,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnText: { color: INK, fontSize: 14, fontWeight: "600", marginLeft: 8 },

  sectionTitle: {
    color: INK,
    fontSize: 30,
    lineHeight: 34,
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
  },
  sectionBody: { color: "rgba(27,43,39,0.6)", fontSize: 14, lineHeight: 24, marginTop: 16, marginBottom: 26 },
  mutedText: { color: "rgba(27,43,39,0.5)", fontSize: 13, marginTop: 12 },

  amenityCard: {
    backgroundColor: CREAM,
    borderWidth: 1,
    borderColor: "rgba(27,43,39,0.08)",
    borderRadius: 18,
    padding: 16,
  },
  amenityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "rgba(27,43,39,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  amenityNum: {
    color: "rgba(27,43,39,0.3)",
    fontSize: 12,
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
  },
  amenityTitle: {
    color: INK,
    fontSize: 15,
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
  },
  amenitySub: { color: "rgba(27,43,39,0.5)", fontSize: 11, lineHeight: 16, marginTop: 6 },

  roomCard: { backgroundColor: CREAM, borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", overflow: "hidden" },
  availableBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(247,244,239,0.95)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  availableText: { color: INK, fontSize: 10, letterSpacing: 1.5, fontWeight: "600" },
  roomType: { color: GOLD, fontSize: 10, letterSpacing: 2, fontWeight: "600" },
  roomName: {
    color: INK,
    fontSize: 18,
    marginTop: 4,
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
  },
  roomDesc: { color: "rgba(27,43,39,0.55)", fontSize: 12, lineHeight: 20, marginTop: 8 },
  roomMeta: { color: "rgba(27,43,39,0.6)", fontSize: 12, marginLeft: 6 },
  roomDivider: { height: 1, backgroundColor: "rgba(27,43,39,0.08)", marginVertical: 16 },
  fromLabel: { color: "rgba(27,43,39,0.4)", fontSize: 10, letterSpacing: 2, fontWeight: "600" },
  priceText: {
    color: INK,
    fontSize: 16,
    marginTop: 2,
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
  },
  perNight: { color: "rgba(27,43,39,0.4)", fontSize: 11 },
  bookBtn: {
    backgroundColor: INK,
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
  },
  bookBtnText: { color: CREAM, fontSize: 12, fontWeight: "600" },

  mosaicBig: {
    color: CREAM,
    fontSize: 22,
    lineHeight: 28,
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
  },
  mosaicScript: {
    color: CREAM,
    fontSize: 15,
    lineHeight: 20,
    textAlign: "right",
    fontStyle: "italic",
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
  },
  mosaicDark: { flex: 1, borderRadius: 24, backgroundColor: INK, alignItems: "center", justifyContent: "center", padding: 12 },
  mosaicDarkText: { color: CREAM, fontSize: 11, fontWeight: "600", lineHeight: 16, textAlign: "center" },
  learnMoreBtn: {
    borderWidth: 1,
    borderColor: "rgba(27,43,39,0.2)",
    borderRadius: 999,
    paddingHorizontal: 20,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 32,
  },
  learnMoreText: { color: INK, fontSize: 13, fontWeight: "600" },

  footerTitle: {
    color: CREAM,
    fontSize: 34,
    lineHeight: 40,
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
  },
  footerBody: { color: "rgba(247,244,239,0.5)", fontSize: 14, lineHeight: 24, marginTop: 20, maxWidth: 340 },
  footerPrimaryBtn: {
    backgroundColor: GOLD,
    borderRadius: 999,
    paddingHorizontal: 22,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
  },
  footerPrimaryText: { color: INK, fontSize: 13, fontWeight: "600" },
  footerSecondaryBtn: {
    borderWidth: 1,
    borderColor: "rgba(247,244,239,0.2)",
    borderRadius: 999,
    paddingHorizontal: 22,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  footerSecondaryText: { color: CREAM, fontSize: 13, fontWeight: "600" },
  footerBlock: {
    borderTopWidth: 1,
    borderTopColor: "rgba(247,244,239,0.1)",
    marginTop: 48,
    paddingTop: 32,
  },
  footerLogoImg: { width: 40, height: 40, borderRadius: 999 },
  footerBrand: {
    color: CREAM,
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 10,
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
  },
  footerMuted: { color: "rgba(247,244,239,0.4)", fontSize: 12, lineHeight: 20 },
  footerColumnTitle: {
    color: "rgba(247,244,239,0.4)",
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 16,
    fontWeight: "600",
  },
  footerLink: { color: "rgba(247,244,239,0.7)", fontSize: 13 },
  socialBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(247,244,239,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  copyright: { color: "rgba(247,244,239,0.35)", fontSize: 11 },
});