import Echo from "laravel-echo";
import Pusher from "pusher-js";

declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: any;
    }
}

window.Pusher = Pusher;

// TOKEN
const token = localStorage.getItem("token");

const API_BASE = import.meta.env.VITE_API_URL as string;

const echo = new Echo({
    broadcaster: "pusher",

    key: import.meta.env.VITE_PUSHER_APP_KEY,
    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,

    forceTLS: true,

    authEndpoint: `${API_BASE}/broadcasting/auth`,

    auth: {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
        },
    },
});

// MAKE GLOBAL
window.Echo = echo;

console.log("✅ ECHO INITIALIZED");

export default echo;