import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Stock photography for the MVP. Swap for your own CDN (Cloudinary, S3, Uploadthing) in Phase 2.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/photo-**" },
      { protocol: "https", hostname: "cdn.21st.dev", pathname: "/assets/**" },
    ],
    qualities: [75, 85],
  },
  // better-sqlite3 is a native module; keep it out of the server bundle.
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
};

export default nextConfig;
