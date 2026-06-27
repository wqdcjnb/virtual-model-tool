import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@cloudbase/node-sdk'],
  allowedDevOrigins: ['*.dev.coze.site'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
