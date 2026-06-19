export const environment = {
  production: false,
  apiBaseUrl: 'http://127.0.0.1:8000',
  ws: {
    key: 'framematch-reverb-key',
    host: '127.0.0.1',
    port: 8080,
    scheme: 'ws' as 'ws' | 'wss',
  },
} as const;
