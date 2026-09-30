import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The dev badge sits over the climb's altimeter.
  devIndicators: false,
  // Lets a second dev server run beside the first without sharing (and locking) .next.
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;
