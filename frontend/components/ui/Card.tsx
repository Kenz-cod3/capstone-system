import { View } from "react-native";

export default function Card({ children }: any) {
    return (
        <View className="bg-white p-4 rounded-xl shadow mb-3">
            {children}
        </View>
    );
}