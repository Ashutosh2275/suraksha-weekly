import { redirect } from 'next/navigation';

/**
 * Root route — immediately redirects to the main operations dashboard.
 */
export default function Home(): never {
  redirect('/dashboard');
}
