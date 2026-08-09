import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Merges Tailwind classes safely, resolving conflicting utility classes.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
