import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Lowercases and dashes a string for use in storage paths (e.g. font slugs).
// Only meaningful for Latin input — font family names are always Latin in
// this project, so non-Latin input producing a short/empty slug is fine.
export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
