import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Renamed screens (2026-11-17): Shop → Nursery, Statistics → Journal.
  // Permanent (308), so old bookmarks and links keep working; the query
  // string (e.g. ?tab=) is passed on.
  async redirects() {
    return [
      { source: "/shop", destination: "/nursery", permanent: true },
      { source: "/shop/:path*", destination: "/nursery/:path*", permanent: true },
      { source: "/statistics", destination: "/journal", permanent: true },
    ];
  },
};

export default nextConfig;
