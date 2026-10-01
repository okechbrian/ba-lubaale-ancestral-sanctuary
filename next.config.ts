import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Next 16 requires the allowed quality values to be declared before a
    // per-image `quality` prop is accepted. 75 stays the default everywhere;
    // hero images opt up to 85.
    qualities: [75, 85],
    // Film shelf thumbnails. The player itself only loads on click.
    remotePatterns: [{ protocol: "https", hostname: "i.ytimg.com" }],
  },
};

export default nextConfig;