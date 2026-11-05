import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // This app is entirely session/DB-backed (auth, assessments, admin data),
  // so almost every route is dynamic. Cache Components (PPR-style explicit
  // caching) is built for mostly-static apps and would require wrapping
  // nearly every page in Suspense for no real benefit here.
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
