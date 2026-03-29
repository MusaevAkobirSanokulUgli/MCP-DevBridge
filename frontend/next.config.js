/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(process.env.DOCKER_BUILD === 'true' ? { output: 'standalone' } : {}),
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    // Only proxy when API URL is explicitly set (Docker/local dev)
    // On Vercel, skip rewrites to avoid DNS_HOSTNAME_RESOLVED_PRIVATE errors
    if (!apiUrl) return [];

    return [
      { source: '/api/:path*', destination: `${apiUrl}/api/:path*` },
    ];
  },
};

module.exports = nextConfig;
