import { useLocalSearchParams, useRouter } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

export default function PanoramaViewer() {
  const { panorama, room } = useLocalSearchParams();
  const router = useRouter();
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parsedRoom = room ? JSON.parse(room as string) : null;

  useEffect(() => {
    // ✅ kung walang panorama URL — not available agad
    if (!panorama) return;

    const fetchImage = async () => {
      try {
        const response = await fetch(panorama as string);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setBase64Image(reader.result as string);
        };
        reader.readAsDataURL(blob);
      } catch (e: any) {
        setError(e.message);
      }
    };

    fetchImage();
  }, [panorama]);

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pannellum/build/pannellum.css" />
    <script src="https://cdn.jsdelivr.net/npm/pannellum/build/pannellum.js"></script>
    <style>
      html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; background: black; }
      #viewer { width: 100%; height: 100%; }
      .pnlm-ui .pnlm-about-msg,
      .pnlm-ui .pnlm-load-button { display: none !important; }
    </style>
  </head>
  <body>
    <div id="viewer"></div>
    <script>
      pannellum.viewer('viewer', {
        type: 'equirectangular',
        panorama: '${base64Image}',
        autoLoad: true,
        showZoomCtrl: false,
        showFullscreenCtrl: false,
        compass: false,
        devicePixelRatio: ${typeof window !== "undefined" ? window.devicePixelRatio || 2 : 2}
      });
    </script>
  </body>
  </html>
  `;

  // ✅ Not Available State — walang panorama URL
  const NotAvailable = () => (
    <View className="flex-1 justify-center items-center bg-[#0a0a0a] gap-4 px-8">
      <View className="w-24 h-24 rounded-full border border-[#c9a96e]/20 bg-[#c9a96e]/5 justify-center items-center mb-2">
        <Ionicons name="image-outline" size={40} color="#c9a96e" />
      </View>
      <Text
        className="text-white text-xl tracking-widest text-center"
        style={{ fontFamily: "Georgia" }}
      >
        Not Available
      </Text>
      <Text className="text-white/40 text-sm text-center leading-6 tracking-wide">
        No 360° panorama view is available for this room yet.
      </Text>
      <TouchableOpacity
        onPress={() => router.back()}
        activeOpacity={0.8}
        className="mt-4 px-8 py-3 rounded-full border border-white/20 bg-white/5"
      >
        <Text className="text-white text-sm tracking-widest uppercase">
          Go Back
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View className="flex-1 bg-[#0a0a0a]">
      <StatusBar hidden />

      {/* ✅ Not Available — walang panorama */}
      {!panorama ? (
        <NotAvailable />

      ) : error ? (
        /* Error State */
        <View className="flex-1 justify-center items-center bg-[#0a0a0a] gap-3">
          <Ionicons name="alert-circle-outline" size={40} color="#ff6b6b" />
          <Text className="text-white text-lg font-semibold tracking-wide">
            Failed to Load
          </Text>
          <Text className="text-white/40 text-sm text-center px-8">
            {error}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-3 px-7 py-2.5 rounded-full border border-white/25"
          >
            <Text className="text-white text-sm tracking-wide">Go Back</Text>
          </TouchableOpacity>
        </View>

      ) : !base64Image ? (
        /* Loading State */
        <View className="flex-1 justify-center items-center bg-[#0a0a0a] gap-3">
          <View className="w-[72px] h-[72px] rounded-full border border-[#c9a96e]/30 justify-center items-center mb-2">
            <ActivityIndicator size="large" color="#c9a96e" />
          </View>
          <Text className="text-white text-lg font-semibold tracking-widest">
            Preparing View
          </Text>
          <Text className="text-white/40 text-sm tracking-wide">
            Loading panorama...
          </Text>
        </View>

      ) : (
        /* WebView */
        <WebView
          originWhitelist={["*"]}
          source={{ html }}
          className="flex-1 bg-black"
          startInLoadingState
          renderLoading={() => (
            <View className="flex-1 justify-center items-center bg-[#0a0a0a]">
              <ActivityIndicator size="large" color="#c9a96e" />
            </View>
          )}
        />
      )}

      {/* Top Gradient Overlay */}
      {panorama && (
        <LinearGradient
          colors={["rgba(0,0,0,0.75)", "transparent"]}
          className="absolute top-0 left-0 right-0 h-32"
          pointerEvents="none"
        />
      )}

      {/* Bottom Gradient Overlay */}
      {panorama && (
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.5)"]}
          className="absolute bottom-0 left-0 right-0 h-24"
          pointerEvents="none"
        />
      )}

      {/* Back Button — laging visible */}
      <TouchableOpacity
        onPress={() => router.back()}
        activeOpacity={0.8}
        className="absolute top-[52px] left-5 rounded-full overflow-hidden border border-white/15"
      >
        <BlurView
          intensity={60}
          tint="dark"
          className="w-11 h-11 justify-center items-center"
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </BlurView>
      </TouchableOpacity>

      {/* Room Info Badge */}
      {parsedRoom && panorama && (
        <BlurView
          intensity={60}
          tint="dark"
          className="absolute top-[52px] right-5 rounded-[14px] overflow-hidden border border-white/[0.12]"
        >
          <View className="flex-row items-center gap-2.5 px-3.5 py-2.5">
            <View className="w-1.5 h-1.5 rounded-full bg-[#c9a96e]" />
            <View>
              <Text className="text-white/55 text-[11px] tracking-widest uppercase">
                {parsedRoom.room_type?.type_name}
              </Text>
              <Text className="text-white text-sm font-bold tracking-wide">
                Room {parsedRoom.room_number}
              </Text>
            </View>
          </View>
        </BlurView>
      )}

      {/* 360 Badge */}
      {base64Image && (
        <View className="absolute bottom-8 self-center left-1/2 -translate-x-6 px-3.5 py-1 rounded-full border border-[#c9a96e]/50 bg-[#c9a96e]/10">
          <Text className="text-[#c9a96e] text-xs font-bold tracking-[2px]">
            360°
          </Text>
        </View>
      )}
    </View>
  );
}