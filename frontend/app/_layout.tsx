import "@/global.css";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useAuthStore } from "@/store/authStore";
import InactiveScreen from "@/app/inactive";

export default function Layout() {
  const loadAuth = useAuthStore((s) => s.loadAuth);
  const isLoaded = useAuthStore((s) => s.isLoaded);
  const inactive = useAuthStore((s) => s.inactive);

  useEffect(() => {
    loadAuth();
  }, []);

  if (!isLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {inactive ? (
        <InactiveScreen />
      ) : (
        <Stack screenOptions={{ headerShown: false }} />
      )}
    </GestureHandlerRootView>
  );
}

// import "@/global.css";
// import { Stack } from "expo-router";
// import { useEffect } from "react";
// import { GestureHandlerRootView } from "react-native-gesture-handler";
// import { useAuthStore } from "@/store/authStore";
// import InactiveScreen from "@/app/inactive";

// export default function Layout() {
//   const loadAuth = useAuthStore((s) => s.loadAuth);
//   const isLoaded = useAuthStore((s) => s.isLoaded);
//   const inactive = useAuthStore((s) => s.inactive);

//   useEffect(() => {
//     loadAuth();
//   }, []);

//   if (!isLoaded) return null;

//   return (
//     <GestureHandlerRootView style={{ flex: 1 }}>

//       {inactive ? (
//         <InactiveScreen />
//       ) : (
//         <Stack screenOptions={{ headerShown: false }}>
//           <Stack.Screen name="index" />
//           <Stack.Screen name="(guest)" />
//           <Stack.Screen name="(housekeeper)/(tabs)" />
//         </Stack>
//       )}

//     </GestureHandlerRootView>
//   );
// }