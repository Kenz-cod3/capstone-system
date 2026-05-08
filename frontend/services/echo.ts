import "react-native-url-polyfill/auto";

import Echo from "laravel-echo";
import Pusher from "pusher-js/react-native";

(global as any).Pusher = Pusher;

// IMPORTANT: wrap in function (prevents crash on import)
export const createEcho = () => {
  return new Echo({
    broadcaster: "reverb",
    key: "app-key",
    wsHost: "192.168.254.188",
    wsPort: 8080,
    forceTLS: false,
    enabledTransports: ["ws"],
  });
};