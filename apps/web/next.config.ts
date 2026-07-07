import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      // Disable persistent file cache in dev mode.
      // The file cache writes to .next/cache/webpack/ and gets stale
      // when pages are added/removed, causing ENOENT errors on Windows.
      // Without it, compilations are slightly slower but never stale.
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
