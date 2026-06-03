// app/not-found.tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="mt-2 text-lg">Page not found</p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
