import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["192.168.61.102"],

  // Дозволяємо Next.js транспілювати TypeScript-пакети з монорепозиторію
  transpilePackages: ["@optidrive/shared"],
};

export default nextConfig;
