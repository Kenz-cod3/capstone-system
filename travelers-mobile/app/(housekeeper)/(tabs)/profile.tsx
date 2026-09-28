import { useState } from "react";

import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  RefreshControl,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";

import { useAuthStore } from "@/store/authStore";
import { useRouter } from "expo-router";
import api from "@/services/api";

import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";

import EditProfileModal from "../../profile/edit";

/* =========================================================
   CHANGE PASSWORD MODAL (inline, same file)
========================================================= */

function ChangePasswordModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    if (!currentPassword) {
      Alert.alert("Error", "Please enter your current password");
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert("Error", "New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setSaving(true);

    try {
      // Adjust the path/method to match your actual route in routes/api.php
      await api.post("/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });

      Alert.alert("Success", "Password updated successfully!");
      handleClose();
    } catch (error: any) {
      console.log("CHANGE PASSWORD ERROR:", error?.response?.data || error);

      Alert.alert(
        "Error",
        error?.response?.data?.message || "Something went wrong",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        <View
          style={{
            backgroundColor: "#FFFDF7",
            borderRadius: 22,
            padding: 22,
          }}
        >
          {/* HEADER */}

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 18,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: "#EAF8F2",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Ionicons name="lock-closed-outline" size={20} color="#14966E" />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: "800",
                    color: "#0F172A",
                  }}
                >
                  Change Password
                </Text>
                <Text style={{ fontSize: 10, color: "#7B8794", marginTop: 2 }}>
                  Update your account password
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleClose}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: "#EEEAE0",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 18, color: "#59655F" }}>×</Text>
            </TouchableOpacity>
          </View>

          {/* CURRENT PASSWORD */}

          <View style={{ marginBottom: 14 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: "#26352F",
                marginBottom: 6,
              }}
            >
              Current Password
            </Text>
            <TextInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              placeholder="Enter current password"
              placeholderTextColor="#A0A7A2"
              style={{
                backgroundColor: "#F5F1E6",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#E8E4D8",
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 13,
                color: "#17251F",
              }}
            />
          </View>

          {/* NEW PASSWORD */}

          <View style={{ marginBottom: 14 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: "#26352F",
                marginBottom: 6,
              }}
            >
              New Password
            </Text>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="At least 8 characters"
              placeholderTextColor="#A0A7A2"
              style={{
                backgroundColor: "#F5F1E6",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#E8E4D8",
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 13,
                color: "#17251F",
              }}
            />
          </View>

          {/* CONFIRM PASSWORD */}

          <View style={{ marginBottom: 22 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: "#26352F",
                marginBottom: 6,
              }}
            >
              Confirm New Password
            </Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Re-enter new password"
              placeholderTextColor="#A0A7A2"
              style={{
                backgroundColor: "#F5F1E6",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#E8E4D8",
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 13,
                color: "#17251F",
              }}
            />
          </View>

          {/* BUTTONS */}

          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              onPress={handleClose}
              disabled={saving}
              style={{
                flex: 1,
                backgroundColor: "#EEEAE0",
                paddingVertical: 13,
                borderRadius: 12,
                alignItems: "center",
              }}
            >
              <Text
                style={{ color: "#59655F", fontSize: 12, fontWeight: "700" }}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={{
                flex: 1,
                backgroundColor: "#0B3D2E",
                paddingVertical: 13,
                borderRadius: 12,
                alignItems: "center",
              }}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text
                  style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "800" }}
                >
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* =========================================================
   PROFILE
========================================================= */

export default function Profile() {
  const { user, logout, updateUser } = useAuthStore();
  const router = useRouter();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  /* =======================================================
     PROFILE UPDATE
  ======================================================= */

  const handleProfileUpdate = async (updatedUser?: any) => {
    try {
      if (updatedUser) {
        await updateUser(updatedUser);
      } else {
        const res = await api.get("/user");
        await updateUser(res.data);
      }

      setShowEditModal(false);
    } catch (error: any) {
      console.log(
        "PROFILE UPDATE REFRESH ERROR:",
        error?.response?.data || error?.message,
      );

      setShowEditModal(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);

    try {
      const res = await api.get("/user");
      await updateUser(res.data);
    } catch (error: any) {
      console.log(
        "PROFILE REFRESH ERROR:",
        error?.response?.data || error?.message,
      );
    } finally {
      setRefreshing(false);
    }
  };

  /* =======================================================
     USER DATA
  ======================================================= */

  const displayName =
    user?.name ||
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    "User";

  const userEmail = user?.email || "No Email";
  const userRole = user?.role || "N/A";

  const userPhone = user?.contact_number || "No Phone Number";
  const userAddress = user?.address || "No Address";

  /*
   * Backend uses profile_image.
   * Supports both a full URL and Laravel storage path.
   */
  const userAvatar = user?.profile_image
    ? user.profile_image.startsWith("http")
      ? user.profile_image
      : `${api.defaults.baseURL?.replace("/api", "")}/storage/${user.profile_image}`
    : user?.avatar || null;

  /* =======================================================
     ROLE INFO
  ======================================================= */

  const getRoleInfo = (role: string) => {
    switch (role.toLowerCase()) {
      case "guest":
        return {
          color: "#14966E",
          bgColor: "#EAF8F2",
          icon: "person-outline",
        };

      case "housekeeper":
        return {
          color: "#14966E",
          bgColor: "#EAF8F2",
          icon: "briefcase-outline",
        };

      default:
        return {
          color: "#6B756F",
          bgColor: "#F0EEE7",
          icon: "person-outline",
        };
    }
  };

  const roleInfo = getRoleInfo(userRole);

  /* =======================================================
     DATE
  ======================================================= */

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";

  /* =======================================================
     MENU ITEM
  ======================================================= */

  const MenuItem = ({
    icon,
    title,
    subtitle,
    last = false,
    iconColor = "#53615B",
    iconBg = "#F1F3EF",
    onPress,
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    last?: boolean;
    iconColor?: string;
    iconBg?: string;
    onPress?: () => void;
  }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onPress}
        style={{
          flexDirection: "row",
          alignItems: "center",
          minHeight: subtitle ? 58 : 52,
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: "#ECE9E0",
        }}
      >
        {/* ICON */}

        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: iconBg,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          {icon}
        </View>

        {/* TEXT */}

        <View
          style={{
            flex: 1,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: "#17251F",
            }}
          >
            {title}
          </Text>

          {subtitle && (
            <Text
              style={{
                fontSize: 9,
                color: "#89928D",
                marginTop: 3,
              }}
            >
              {subtitle}
            </Text>
          )}
        </View>

        {/* ARROW */}

        <Feather name="chevron-right" size={17} color="#89928D" />
      </TouchableOpacity>
    );
  };

  /* =======================================================
     RETURN
  ======================================================= */

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#F5F1E6",
      }}
    >
      {/* ===================================================
          STATUS BAR
      =================================================== */}

      <StatusBar
        barStyle="light-content"
        backgroundColor="#0B3D2E"
        translucent={false}
      />

      {/* ===================================================
          SCROLL CONTENT
      =================================================== */}

      <ScrollView
        style={{
          flex: 1,
          backgroundColor: "#F5F1E6",
        }}
        contentContainerStyle={{
          paddingBottom: 30,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#14966E"
            colors={["#14966E"]}
          />
        }
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <View
          style={{
            backgroundColor: "#0B3D2E",
            paddingTop: 55,
            paddingHorizontal: 20,
            paddingBottom: 60,
            borderBottomLeftRadius: 25,
            borderBottomRightRadius: 25,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* PROFILE */}

          <View
            style={{
              alignItems: "center",
              marginTop: 7,
            }}
          >
            {/* =================================================
                AVATAR + EDIT BUTTON
            ================================================= */}

            <View
              style={{
                position: "relative",
              }}
            >
              {/* AVATAR */}

              <View
                style={{
                  width: 92,
                  height: 92,
                  borderRadius: 46,
                  borderWidth: 3,
                  borderColor: "#F8F5EA",
                  backgroundColor: "rgba(255,255,255,0.10)",
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#000",
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  shadowOffset: {
                    width: 0,
                    height: 4,
                  },
                  elevation: 4,
                }}
              >
                {userAvatar ? (
                  <Image
                    source={{
                      uri: userAvatar,
                    }}
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: 46,
                    }}
                  />
                ) : (
                  <Text
                    style={{
                      fontSize: 32,
                      fontWeight: "800",
                      color: "#FFFFFF",
                    }}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>

              {/* =================================================
                  EDIT BUTTON
              ================================================= */}

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowEditModal(true)}
                style={{
                  position: "absolute",
                  right: -1,
                  bottom: -1,
                  width: 30,
                  height: 30,
                  borderRadius: 20,
                  backgroundColor: "#FFFDF7",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: "#0B3D2E",
                  elevation: 4,
                  shadowColor: "#000",
                  shadowOpacity: 0.18,
                  shadowRadius: 4,
                  shadowOffset: {
                    width: 0,
                    height: 2,
                  },
                }}
              >
                <Feather
                  name="edit-2"
                  size={13}
                  color="#0B6B4F"
                  strokeWidth={2.5}
                />
              </TouchableOpacity>
            </View>

            {/* =================================================
                NAME
            ================================================= */}

            <Text
              style={{
                marginTop: 12,
                color: "#FFFFFF",
                fontSize: 20,
                fontWeight: "800",
                letterSpacing: -0.4,
              }}
            >
              {displayName}
            </Text>

            {/* =================================================
                ROLE
            ================================================= */}

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#FFFDF7",
                paddingHorizontal: 13,
                paddingVertical: 6,
                borderRadius: 18,
                marginTop: 7,
              }}
            >
              <Ionicons name={roleInfo.icon as any} size={14} color="#0B6B4F" />

              <Text
                style={{
                  marginLeft: 5,
                  fontSize: 9,
                  fontWeight: "800",
                  color: "#0B6B4F",
                  letterSpacing: 0.4,
                }}
              >
                {userRole.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* =================================================
            CONTENT
        ================================================= */}

        <View
          style={{
            paddingHorizontal: 16,
            marginTop: -42,
          }}
        >
          {/* =================================================
              CONTACT INFORMATION
          ================================================= */}

          <View
            style={{
              backgroundColor: "#FFFDF7",
              borderRadius: 18,
              paddingHorizontal: 15,
              paddingTop: 13,
              paddingBottom: 8,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: "#E8E4D8",
              shadowColor: "#0B3D2E",
              shadowOpacity: 0.07,
              shadowRadius: 8,
              shadowOffset: {
                width: 0,
                height: 3,
              },
              elevation: 2,
            }}
          >
            {/* TITLE */}

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#EAF8F2",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                <Ionicons name="person-outline" size={17} color="#14966E" />
              </View>

              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "800",
                  color: "#17251F",
                }}
              >
                Contact Information
              </Text>
            </View>

            {/* EMAIL */}

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                minHeight: 55,
                borderBottomWidth: 1,
                borderBottomColor: "#ECE9E0",
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#F1F3EF",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                <MaterialIcons name="email" size={16} color="#53615B" />
              </View>

              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 9,
                    color: "#89928D",
                  }}
                >
                  Email Address
                </Text>

                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 11,
                    color: "#26352F",
                    fontWeight: "600",
                    marginTop: 3,
                  }}
                >
                  {userEmail}
                </Text>
              </View>
            </View>

            {/* PHONE NUMBER */}

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                minHeight: 55,
                borderBottomWidth: 1,
                borderBottomColor: "#ECE9E0",
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#F1F3EF",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                <Ionicons name="call-outline" size={16} color="#53615B" />
              </View>

              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 9,
                    color: "#89928D",
                  }}
                >
                  Phone Number
                </Text>

                <Text
                  style={{
                    fontSize: 11,
                    color: "#26352F",
                    fontWeight: "600",
                    marginTop: 3,
                  }}
                >
                  {userPhone}
                </Text>
              </View>
            </View>

            {/* ADDRESS */}

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                minHeight: 55,
                borderBottomWidth: 1,
                borderBottomColor: "#ECE9E0",
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#F1F3EF",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                <Ionicons name="location-outline" size={16} color="#53615B" />
              </View>

              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 9,
                    color: "#89928D",
                  }}
                >
                  Address
                </Text>

                <Text
                  numberOfLines={2}
                  style={{
                    fontSize: 11,
                    color: "#26352F",
                    fontWeight: "600",
                    marginTop: 3,
                  }}
                >
                  {userAddress}
                </Text>
              </View>
            </View>

            {/* MEMBER SINCE */}

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                minHeight: 55,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#F1F3EF",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                <Ionicons name="calendar-outline" size={16} color="#53615B" />
              </View>

              <View>
                <Text
                  style={{
                    fontSize: 9,
                    color: "#89928D",
                  }}
                >
                  Member Since
                </Text>

                <Text
                  style={{
                    fontSize: 11,
                    color: "#26352F",
                    fontWeight: "600",
                    marginTop: 3,
                  }}
                >
                  {memberSince}
                </Text>
              </View>
            </View>
          </View>

          {/* =================================================
              ACCOUNT SETTINGS
          ================================================= */}

          <View
            style={{
              backgroundColor: "#FFFDF7",
              borderRadius: 18,
              paddingHorizontal: 15,
              paddingTop: 13,
              paddingBottom: 5,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: "#E8E4D8",
              shadowColor: "#0B3D2E",
              shadowOpacity: 0.06,
              shadowRadius: 8,
              shadowOffset: {
                width: 0,
                height: 3,
              },
              elevation: 2,
            }}
          >
            {/* TITLE */}

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 2,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#EAF8F2",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                <Ionicons name="settings-outline" size={17} color="#14966E" />
              </View>

              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "800",
                  color: "#17251F",
                }}
              >
                Account Settings
              </Text>
            </View>

            <MenuItem
              title="Change Password"
              subtitle="Update your password"
              onPress={() => setShowChangePasswordModal(true)}
              icon={
                <Ionicons
                  name="lock-closed-outline"
                  size={16}
                  color="#53615B"
                />
              }
            />

            <MenuItem
              title="Notifications"
              subtitle="Manage your alerts"
              icon={
                <Ionicons
                  name="notifications-outline"
                  size={16}
                  color="#53615B"
                />
              }
            />

            <MenuItem
              title="Privacy & Security"
              subtitle="Control your data"
              last
              icon={
                <Ionicons
                  name="shield-checkmark-outline"
                  size={16}
                  color="#53615B"
                />
              }
            />
          </View>

          {/* =================================================
              SUPPORT & HELP
          ================================================= */}

          <View
            style={{
              backgroundColor: "#FFFDF7",
              borderRadius: 18,
              paddingHorizontal: 15,
              paddingTop: 13,
              paddingBottom: 5,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: "#E8E4D8",
              shadowColor: "#0B3D2E",
              shadowOpacity: 0.06,
              shadowRadius: 8,
              shadowOffset: {
                width: 0,
                height: 3,
              },
              elevation: 2,
            }}
          >
            {/* TITLE */}

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 2,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#EAF8F2",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                <Ionicons name="help-outline" size={18} color="#14966E" />
              </View>

              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "800",
                  color: "#17251F",
                }}
              >
                Support & Help
              </Text>
            </View>

            <MenuItem
              title="Contact Support"
              subtitle="Get help from our team"
              icon={
                <Ionicons
                  name="chatbubbles-outline"
                  size={16}
                  color="#53615B"
                />
              }
            />

            <MenuItem
              title="Terms & Conditions"
              subtitle="Read our policies"
              last
              icon={
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color="#53615B"
                />
              }
            />
          </View>

          {/* =================================================
              LOGOUT
          ================================================= */}

          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.85}
            style={{
              height: 46,
              borderRadius: 14,
              backgroundColor: "#FFF0EE",
              borderWidth: 1,
              borderColor: "#E89B91",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 1,
              marginBottom: 8,
            }}
          >
            <MaterialIcons name="logout" size={18} color="#DC2626" />

            <Text
              style={{
                color: "#DC2626",
                fontSize: 12,
                fontWeight: "800",
                marginLeft: 7,
              }}
            >
              Logout
            </Text>
          </TouchableOpacity>

          {/* VERSION */}

          <Text
            style={{
              textAlign: "center",
              color: "#A0A7A2",
              fontSize: 9,
              marginTop: 2,
            }}
          >
            Version 1.0.0
          </Text>
        </View>
      </ScrollView>

      {/* =================================================
          EDIT PROFILE MODAL
      ================================================= */}

      <EditProfileModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        onUpdate={handleProfileUpdate}
        user={user}
      />

      {/* =================================================
          CHANGE PASSWORD MODAL
      ================================================= */}

      <ChangePasswordModal
        visible={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />
    </View>
  );
}