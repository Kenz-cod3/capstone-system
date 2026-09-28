import { TextInput } from "react-native";

export default function Input(props: any) {
    return (
        <TextInput
            {...props}
            className="border p-3 rounded-xl mb-3"
        />
    );
}