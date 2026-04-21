import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md text-center">
        <div className="mb-4 text-6xl font-bold text-vault-600">404</div>
        <h1 className="mb-2 text-2xl font-bold">Page not found</h1>
        <p className="mb-6 text-sm text-gray-500">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="rounded-lg bg-vault-600 px-4 py-2 text-sm font-medium text-white hover:bg-vault-700"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
