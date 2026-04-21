"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md text-center">
        <div className="mb-4 text-6xl">⚠</div>
        <h1 className="mb-2 text-2xl font-bold">Something went wrong</h1>
        <p className="mb-6 text-sm text-gray-500">
          {error.message || "An unexpected error occurred"}
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-vault-600 px-4 py-2 text-sm font-medium text-white hover:bg-vault-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
