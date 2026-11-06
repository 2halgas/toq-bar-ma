"use client"; // Error boundaries must be Client Components

import { ErrorMessage } from "@/components/errors/error-message";

/**
 * Last line of defence for the page body: the header, disclaimer and footer
 * (in the layout) stay, and the schedule link still works.
 */
export default function Error({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <ErrorMessage scope="page" error={error} retry={retry} />
    </div>
  );
}
