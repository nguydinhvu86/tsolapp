import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tsolapp.app',
  appName: 'tsolapp',
  webDir: 'public',
  server: {
    url: 'http://10.0.2.2:6688', // Use 10.0.2.2 for Android emulator -> localhost:6688. Change to Production URL for release.
    cleartext: true
  }
};

export default config;
