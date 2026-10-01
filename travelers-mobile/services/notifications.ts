// services/notifications.ts

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";

// ✅ Show notification as banner while app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device.");
    return null;
  }

  // Android notification channels
  if (Platform.OS === "android") {
    // ✅ Housekeeper channel
    await Notifications.setNotificationChannelAsync("housekeeping", {
      name: "Housekeeping",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#14966E",
    });

    // ✅ Guest channel — para sa booking updates
    await Notifications.setNotificationChannelAsync("bookings", {
      name: "Bookings",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#c9a96e",
    });
  }

  // Check existing permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  // Ask permission if not granted
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Notification permission was not granted.");
    return null;
  }

  // Get Expo project ID
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.log("Expo project ID not found.");
    return null;
  }

  // Get Expo Push Token
  const token = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  console.log("================================");
  console.log("EXPO PUSH TOKEN:");
  console.log(token.data);
  console.log("================================");

  return token.data;
}