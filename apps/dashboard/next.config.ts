import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Export each route as folder/index.html so hard reloads resolve on
  // static hosts (Vercel) instead of returning 404.
  trailingSlash: true,
  // Dev-only: lets phones on the local network open the dev server.
  // Wildcarded so DHCP address changes do not break it.
  allowedDevOrigins: ["192.168.1.*", "192.168.0.*"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
