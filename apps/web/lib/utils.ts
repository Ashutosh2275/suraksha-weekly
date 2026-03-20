import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names using clsx and tailwind-merge.
 * Resolves Tailwind CSS class conflicts intelligently.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format a number as Indian currency string: ₹1,23,456 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format a date string to "Mon DD MMM YYYY" */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Returns days remaining until a date (0 if past) */
export function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/** Maps a city name to its service zones */
export const CITY_ZONES: Record<string, string[]> = {
  Mumbai: ['South Mumbai', 'Bandra', 'Andheri', 'Borivali', 'Thane', 'Navi Mumbai'],
  Delhi: ['Central Delhi', 'South Delhi', 'Dwarka', 'Noida', 'Gurugram', 'Rohini'],
  Bengaluru: ['Koramangala', 'Whitefield', 'Indiranagar', 'HSR Layout', 'Electronic City', 'Hebbal'],
  Hyderabad: ['Banjara Hills', 'Hitech City', 'Secunderabad', 'Kukatpally', 'Madhapur', 'Gachibowli'],
  Chennai: ['T Nagar', 'Anna Nagar', 'Velachery', 'OMR', 'Adyar', 'Tambaram'],
  Pune: ['Shivajinagar', 'Koregaon Park', 'Wakad', 'Hinjewadi', 'Baner', 'Kothrud'],
};

export const CITIES = Object.keys(CITY_ZONES);

export const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    weeklyPremium: 249,
    coverageCap: 5000,
    triggers: ['Heavy Rain', 'Extreme Heat', 'Platform Outage'],
    badge: '',
    highlight: false,
    description: 'Essential coverage for everyday disruptions',
  },
  {
    id: 'standard',
    name: 'Standard',
    weeklyPremium: 399,
    coverageCap: 8000,
    triggers: ['Heavy Rain', 'Extreme Heat', 'Severe Pollution', 'Platform Outage', 'Local Restriction'],
    badge: 'Most Popular',
    highlight: true,
    description: 'Full protection for serious disruptions',
  },
  {
    id: 'pro',
    name: 'Pro',
    weeklyPremium: 599,
    coverageCap: 12000,
    triggers: ['Heavy Rain', 'Extreme Heat', 'Severe Pollution', 'Platform Outage', 'Local Restriction'],
    badge: 'Best Value',
    highlight: false,
    description: 'Maximum coverage with priority support',
  },
] as const;

export type PlanId = (typeof PLANS)[number]['id'];
