export const WS_CONFIG = {
  host: "192.168.254.188",
  port: 8080,
  appKey: "app-key",
};

export const getWsUrl = () =>
  `ws://${WS_CONFIG.host}:${WS_CONFIG.port}/app/${WS_CONFIG.appKey}`;