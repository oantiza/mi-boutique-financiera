import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Añade esta línea
  serverExternalPackages: ['pdfkit'],
};

export default nextConfig;