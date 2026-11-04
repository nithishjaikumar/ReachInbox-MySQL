
/** @type {import('next').NextConfig} */

const apiServerUrl =
  process.env.API_SERVER_URL || 'http://localhost:4000';

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiServerUrl}/api/:path*`,
      },
      {
        source: '/admin/:path*',
        destination: `${apiServerUrl}/admin/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
