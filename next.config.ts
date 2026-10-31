import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Crucial for Electron so it can load HTML/JS files directly via file://

  images: {
    unoptimized: true,
  },

  // Whitelist your local network IP for development
  allowedDevOrigins: ['192.168.0.25'],

  experimental: {
    optimizePackageImports: ['@mantine/core', '@mantine/hooks'],
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