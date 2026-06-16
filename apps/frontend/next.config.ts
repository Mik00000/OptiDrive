import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["192.168.61.102"],

  // Дозволяємо Next.js транспілювати TypeScript-пакети з монорепозиторію
  transpilePackages: ["@optidrive/shared"],

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
};

export default nextConfig;
