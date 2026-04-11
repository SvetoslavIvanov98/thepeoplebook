/**
 * The People Book wordmark logo.
 * Matches the landing page header style: monospace, brand-coloured "the" + "book",
 * default-text-coloured "people".
 *
 * Props:
 *   size  – Tailwind text-size class, e.g. 'text-lg' (default) | 'text-2xl' | 'text-3xl'
 *   className – additional classes
 */
export default function Logo({ size = 'text-lg', className = '' }) {
  return (
    <span className={`font-mono font-bold tracking-tight text-brand-600 ${size} ${className}`}>
      the<span className="text-gray-900 dark:text-gray-100">people</span>book
    </span>
  );
}
