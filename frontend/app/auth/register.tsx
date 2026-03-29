import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ImageBackground,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import axios from "axios";
import { register } from "../../services/authService"; // make sure this exists

const { width, height } = Dimensions.get("window");

export default function Register() {
  const router = useRouter();

  const [first_name, setFirstName] = useState("");
  const [middle_name, setMiddleName] = useState("");
  const [last_name, setLastName] = useState("");
  const [contact_number, setContactNumber] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async () => {
    if (!first_name || !last_name || !email || !password) {
      alert("Please fill all required fields");
      return;
    }

    try {
      await register({
        first_name,
        middle_name,
        last_name,
        contact_number,
        address,
        email,
        password,
      });

      router.replace("/auth/login");
    } catch (e: any) {
      console.log("ERROR DATA:", e.response?.data);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1"
    >
      {/* BACKGROUND */}
      <ImageBackground
        source={require("../../assets/bg.jpg")}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        {/* OVERLAY */}
        <View className="absolute inset-0 bg-green-900/60" />

        {/* CONTENT */}
        <View className="flex-1 justify-center items-center px-6">

          {/* LOGO */}
          <Image
            source={require("../../assets/logo.jpg")}
            style={{
              width: height * 0.12,
              height: height * 0.12,
            }}
            className="mb-6 rounded-full border-4 border-white"
          />

          {/* FORM CARD */}
          <View
            style={{ width: width * 0.9 }}
            className="bg-white p-6 rounded-2xl shadow-lg"
          >
            <Text className="text-2xl font-bold text-center mb-4">
              Register
            </Text>

            {/* NAME */}
            <TextInput
              placeholder="Fist Name"
              placeholderTextColor="#999"
              className="border border-gray-200 p-3 rounded-xl mb-3"
              onChangeText={setFirstName}
            />

            {/* NAME */}
            <TextInput
              placeholder="Middle Name"
              placeholderTextColor="#999"
              className="border border-gray-200 p-3 rounded-xl mb-3"
              onChangeText={setMiddleName}
            />

            {/* NAME */}
            <TextInput
              placeholder="Last Name"
              placeholderTextColor="#999"
              className="border border-gray-200 p-3 rounded-xl mb-3"
              onChangeText={setLastName}
            />

            {/* Contact */}
            <TextInput
              placeholder="Contact Number"
              placeholderTextColor="#999"
              className="border border-gray-200 p-3 rounded-xl mb-3"
              onChangeText={setContactNumber}
            />

            {/* Address */}
            <TextInput
              placeholder="Address"
              placeholderTextColor="#999"
              className="border border-gray-200 p-3 rounded-xl mb-3"
              onChangeText={setAddress}
            />

            {/* EMAIL */}
            <TextInput
              placeholder="Email"
              placeholderTextColor="#999"
              className="border border-gray-200 p-3 rounded-xl mb-3"
              onChangeText={setEmail}
            />

            {/* PASSWORD */}
            <TextInput
              placeholder="Password"
              placeholderTextColor="#999"
              secureTextEntry
              className="border border-gray-200 p-3 rounded-xl mb-4"
              onChangeText={setPassword}
            />

            {/* REGISTER BUTTON */}
            <TouchableOpacity
              onPress={handleRegister}
              style={{ paddingVertical: height * 0.015 }}
              className="bg-green-500 rounded-xl"
            >
              <Text className="text-white text-center font-bold">
                Register
              </Text>
            </TouchableOpacity>

            {/* LOGIN LINK */}
            <TouchableOpacity
              onPress={() => router.push("/auth/login")}
              className="mt-4"
            >
              <Text className="text-center text-gray-500">
                Already have an account?{" "}
                <Text className="text-green-600 font-semibold">
                  Login
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}