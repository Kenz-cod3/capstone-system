import { TouchableOpacity, Text } from "react-native";

export default function Button({ title, onPress }: any) {
    return (
        <TouchableOpacity onPress={onPress} className="bg-primary p-3 rounded-xl">
            <Text className="text-white text-center font-bold">{title}</Text>
        </TouchableOpacity>
    );
}