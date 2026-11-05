/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone output for Docker environments, omit on Vercel to use native serverless tracing
  output: process.env.VERCEL
    ? undefined
    : (process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined),
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['@electric-sql/pglite'],
};

export default nextConfig;
