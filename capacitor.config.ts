import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'plateup-frontend',
  webDir: 'www',
  // The development backend uses HTTP instead of HTTPS.
  server: {
    cleartext: true,
  },
};

export default config;
