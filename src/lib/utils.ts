import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getImagePath(path: string): string {
  const basePath = process.env.NODE_ENV === "production" ? "/GOTS.github.io" : ""
  return `${basePath}${path}`
}

export function getPagePath(path: string): string {
  const basePath = process.env.NODE_ENV === "production" ? "/GOTS.github.io" : ""
  return `${basePath}${path}`
}
