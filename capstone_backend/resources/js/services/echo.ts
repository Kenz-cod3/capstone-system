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

const echo = new Echo({
    broadcaster: "reverb",

    key: "app-key",

    wsHost: "192.168.254.188",
    wsPort: 8080,

    forceTLS: false,

    enabledTransports: ["ws"],

    authEndpoint: "http://192.168.254.188:8000/broadcasting/auth",

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