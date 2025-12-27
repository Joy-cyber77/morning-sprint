import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Prevent Next from inferring an incorrect workspace root (e.g., due to another lockfile outside the repo).
  // This also makes `.env*` resolution deterministic for this project.
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig
