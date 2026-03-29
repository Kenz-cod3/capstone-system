import "@/global.css";
import { Stack } from "expo-router";


export default function Layout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="booking" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="notification" />
    </Stack>
  );
}
