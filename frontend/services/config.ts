export const WS_CONFIG = {
  host: "10.210.240.76",
  port: 8080,
  appKey: "app-key",
};

export const getWsUrl = () =>
  `ws://${WS_CONFIG.host}:${WS_CONFIG.port}/app/${WS_CONFIG.appKey}`;