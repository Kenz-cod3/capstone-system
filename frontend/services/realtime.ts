// services/realtime.ts
import "react-native-url-polyfill/auto";
import { getWsUrl } from "@/services/config";

type Status = "connected" | "disconnected" | "reconnecting";

export const connectRealtime = (
  userId: number,
  onInactive: () => void,
  onActive: () => void, // bagong callback
  onStatusChange?: (status: Status) => void
) => {
  let ws: WebSocket;
  let shouldReconnect = true;
  let retryDelay = 3000;
  let inactiveCalled = false;

  const connect = () => {
    if (ws) {
      ws.onclose = null;
      ws.close();
    }

    ws = new WebSocket(getWsUrl());

    ws.onopen = () => {
      console.log("✅ WebSocket connected");
      retryDelay = 3000;
      onStatusChange?.("connected");

      ws.send(JSON.stringify({
        event: "pusher:subscribe",
        data: { channel: "users" },
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.event === "pusher:ping") {
          ws.send(JSON.stringify({ event: "pusher:pong" }));
          return;
        }

        if (data.event === "UserStatusChanged") {
          const payload =
            typeof data.data === "string"
              ? JSON.parse(data.data)
              : data.data;

          if (payload.userId === userId) {
            if (!payload.isActive && !inactiveCalled) {
              // 🔴 naging inactive
              inactiveCalled = true;
              shouldReconnect = false;
              console.log("🔴 User is inactive");
              onInactive();
            } else if (payload.isActive) {
              // 🟢 naging active ulit
              inactiveCalled = false;
              shouldReconnect = true;
              console.log("🟢 User is active");
              onActive(); // ✅
            }
          }
        }
      } catch (e) {
        console.log("Parse error:", e);
      }
    };

    ws.onerror = (e) => console.log("⚠️ WS error:", e);

    ws.onclose = () => {
      console.log("🔌 WS disconnected");
      if (shouldReconnect && !inactiveCalled) {
        onStatusChange?.("reconnecting");
        console.log(`🔁 Reconnecting in ${retryDelay / 1000}s...`);
        setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30000);
      } else {
        onStatusChange?.("disconnected");
      }
    };
  };

  connect();

  return () => {
    shouldReconnect = false;
    ws?.close();
  };
};