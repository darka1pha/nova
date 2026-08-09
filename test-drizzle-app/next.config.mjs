import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
let nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Enabled per Next.js recommendation for Server Actions typed routes.
    typedRoutes: true,
  },
  images: {
    remotePatterns: [],
  },
  };


export default withNextIntl(nextConfig);
