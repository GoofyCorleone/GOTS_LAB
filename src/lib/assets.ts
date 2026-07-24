/**
 * Prefix a file in /public with the deployment basePath.
 *
 * On GitHub Pages the app is served from /GOTS_LAB, but Next.js only rewrites
 * next/link, next/image and /_next automatically — a raw <video src="/videos/x">
 * would resolve against the domain root and 404. Always wrap public assets used
 * in plain <img>/<video>/<source> tags with this.
 */
export function asset(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
