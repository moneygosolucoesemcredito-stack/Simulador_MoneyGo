import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pasta de build separável por marca (NEXT_DIST_DIR) para rodar MoneyGo e
  // Capita Max em paralelo sem um sobrescrever o cache do outro. Default: .next
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
