/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",  // ← 追加
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.proto-ixd.org",  // ← 変更
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // eslint の ignoreDuringBuilds は残してOK
};

export default nextConfig;
