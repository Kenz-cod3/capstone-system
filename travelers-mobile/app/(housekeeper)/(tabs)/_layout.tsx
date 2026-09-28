import { Tabs } from "expo-router";
import {
  AntDesign,
  Ionicons,
  MaterialCommunityIcons,
  Octicons,
} from "@expo/vector-icons";
import { Text } from "react-native";

const EMERALD = "#14966E";
const GOLD = "#C9A227";
const GRAY = "#9CA3AF";

export default function Layout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        /*
         * Icon colors
         */
        tabBarActiveTintColor: EMERALD,
        tabBarInactiveTintColor: GRAY,

        tabBarStyle: {
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,

          backgroundColor: "#FFFFFF",

          borderTopWidth: 1,
          borderTopColor: "#E5E7EB",
        },

        /*
         * We use custom labels below,
         * so this only controls the default font.
         */
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      {/* =====================================================
          DASHBOARD
      ===================================================== */}

      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",

          tabBarIcon: ({ size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "view-dashboard" : "view-dashboard-outline"}
              size={focused ? size + 1 : size}
              color={focused ? GOLD : GRAY}
            />
          ),

          tabBarLabel: ({ focused }) => (
            <Text
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: focused ? GOLD : GRAY,
              }}
            >
              Dashboard
            </Text>
          ),
        }}
      />

      {/* =====================================================
          TASKS
      ===================================================== */}

      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",

          tabBarIcon: ({ size, focused }) => (
            <Octicons
              name="tasklist"
              size={focused ? size + 2 : size}
              color={focused ? GOLD : GRAY}
            />
          ),

          tabBarLabel: ({ focused }) => (
            <Text
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: focused ? GOLD : GRAY,
              }}
            >
              Tasks
            </Text>
          ),
        }}
      />

      {/* =====================================================
          HISTORY
      ===================================================== */}

      <Tabs.Screen
        name="history"
        options={{
          title: "History",

          tabBarIcon: ({ size, focused }) => (
            <AntDesign
              name="history"
              size={focused ? size + 2 : size}
              color={focused ? GOLD : GRAY}
            />
          ),

          tabBarLabel: ({ focused }) => (
            <Text
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: focused ? GOLD : GRAY,
              }}
            >
              History
            </Text>
          ),
        }}
      />

      {/* =====================================================
          PROFILE
      ===================================================== */}

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",

          tabBarIcon: ({ size, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={focused ? size + 1 : size}
              color={focused ? GOLD : GRAY}
            />
          ),

          tabBarLabel: ({ focused }) => (
            <Text
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: focused ? GOLD : GRAY,
              }}
            >
              Profile
            </Text>
          ),
        }}
      />
    </Tabs>
  );
}
