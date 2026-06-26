export const WS_CONFIG = {
  host: "10.99.189.76",
  port: 8080,
  appKey: "app-key",
};

export const getWsUrl = () =>
  `ws://${WS_CONFIG.host}:${WS_CONFIG.port}/app/${WS_CONFIG.appKey}`;