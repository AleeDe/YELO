import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.yelo.monitor",
  appName: "YELO",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
};

export default config;
