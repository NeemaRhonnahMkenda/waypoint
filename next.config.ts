import type { NextConfig } from "next";

/**
 * Waypoint is served under /waypoint so the portfolio can mount it at
 * https://<portfolio>.vercel.app/waypoint (see the portfolio README).
 * Set WAYPOINT_BASE_PATH="" to run it at the domain root instead.
 */
const basePath = process.env.WAYPOINT_BASE_PATH ?? "/waypoint";

const nextConfig: NextConfig = {
  basePath: basePath || undefined,
  env: {
    // Standalone: Next's basePath already prefixes <Link>/router paths, so the route prefix is empty.
    // (The portfolio sets these differently when it embeds Waypoint; see README.)
    NEXT_PUBLIC_WAYPOINT_BASE: basePath,
    NEXT_PUBLIC_WAYPOINT_ROUTE_PREFIX: "",
  },
  async redirects() {
    // Visiting the bare domain opens the app instead of a 404.
    return basePath ? [{ source: "/", destination: basePath, basePath: false, permanent: false }] : [];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      // Cross-site requests get only the origin, never the path, so share ids (/t/<id>)
      // don't leak to booking sites. OpenStreetMap's tile servers require a Referer
      // and return 403 when it's missing, so "no-referrer" would break the map.
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    return [
      { source: "/:path*", headers: security },
      // Shared trips and the API must never be indexed by search engines.
      { source: "/t/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      {
        source: "/api/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
