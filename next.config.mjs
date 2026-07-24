/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production"
const repoName = "GOTS_LAB"

const basePath = isProd ? `/${repoName}` : ""

const nextConfig = {
  output: "export",
  basePath,
  assetPrefix: isProd ? `/${repoName}/` : "",
  // Next.js prefixes basePath onto next/link, next/image and /_next assets,
  // but NOT onto raw <img>/<video> src attributes. Exposing it lets those
  // build correct URLs on GitHub Pages, where the site lives under /GOTS_LAB.
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
}

export default nextConfig
