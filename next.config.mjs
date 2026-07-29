/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Vercelビルド時にESLint警告でデプロイが失敗しないようにする
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
