import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Every protected upload route passes through proxy.ts. Next defaults its
    // cloned request body to 10 MB, which silently truncated normal phone
    // videos before the Server Action could validate them. Keep both limits
    // above the app's 100 MB file limit to leave room for multipart metadata.
    proxyClientMaxBodySize: "105mb",
    serverActions: {
      bodySizeLimit: "105mb",
    },
  },
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
