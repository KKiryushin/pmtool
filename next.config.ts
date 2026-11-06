import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // This app is entirely session/DB-backed (auth, assessments, admin data),
  // so almost every route is dynamic. Cache Components (PPR-style explicit
  // caching) is built for mostly-static apps and would require wrapping
  // nearly every page in Suspense for no real benefit here.

  // Accessed from a phone over home WiFi (LAN IP, DHCP-assigned, varies)
  // and over Tailscale (100.64.0.0/10 CGNAT range + MagicDNS .local name),
  // never just localhost. Without this, Next.js's own request-URL/Origin
  // handling falls back to a wrong, fixed "self" host (seen as literally
  // "0.0.0.0" or "localhost" in `req.nextUrl.origin`) for any request
  // whose Host header isn't localhost or the dev server's own bind host,
  // which breaks NextAuth's callback/redirect URLs for LAN/Tailscale
  // clients. See node_modules/next/dist/docs/.../allowedDevOrigins.md.
  allowedDevOrigins: [
    "192.168.*.*",
    "100.*.*.*",
    "*.local",
    "localhost",
  ],
  experimental: {
    serverActions: {
      allowedOrigins: ["192.168.*.*", "100.*.*.*", "*.local", "localhost:4317"],
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
