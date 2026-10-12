/**
 * `cn` — concatenate class names with tailwind-aware conflict resolution.
 *
 * shadcn/ui components depend on this helper; every component file in
 * `packages/ui/src/components/*` (added in E11) imports it from here.
 *
 *   cn('px-4', condition && 'bg-primary', 'px-6') // → 'bg-primary px-6'
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
