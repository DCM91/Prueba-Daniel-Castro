export const environment = {
  production: true,
  apiBaseUrl: 'https://framematch.vercel.app',
  ws: {
    key: 'framematch-reverb-key',
    host: 'framematch-ws.railway.app',
    port: 443,
    scheme: 'wss' as 'ws' | 'wss',
  },
} as const;
