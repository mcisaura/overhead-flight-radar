export default function FlightPathIcon({ className = "" }: { className?: string }) {
  return <svg className={className} width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M3 16c-1.5-4 5-2 5-5 0-2-4-1.5-3-4" stroke="currentColor" strokeWidth="1.4" strokeDasharray="1.5 2.5" strokeLinecap="round" />
    <path d="m9 5 8-3-3 8-1.4-3.6L9 5Z" fill="currentColor" />
  </svg>;
}
