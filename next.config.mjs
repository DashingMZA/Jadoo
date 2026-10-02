/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
  // Tauri loads the built frontend as static files (or from the dev server
  // in dev mode). "export" produces a plain static `out/` folder that
  // tauri.conf.json's `frontendDist` points at.
  output: isProd ? "export" : undefined,
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
