export const WS_CONFIG = {
  cluster: "ap1",
  appKey: "61f7bf38a6e202280a45",
};

export const getWsUrl = () =>
  `wss://ws-${WS_CONFIG.cluster}.pusher.com/app/${WS_CONFIG.appKey}?protocol=7&client=js&version=8.4.0`;