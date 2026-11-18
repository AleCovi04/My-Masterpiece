import type { CapacitorConfig } from '@capacitor/cli'

// App Android (Capacitor): i file dell'app sono dentro l'APK (`dist/`), così funziona sempre offline.
const config: CapacitorConfig = {
  appId: 'app.mymasterpiece.android',
  appName: 'My Masterpiece',
  webDir: 'dist',
  android: {
    // niente contenuti http in chiaro
    allowMixedContent: false,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_rest',
      iconColor: '#ED4336',
    },
  },
}

export default config
