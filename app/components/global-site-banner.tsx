export function GlobalSiteBanner({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="border-b border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-800"
    >
      {message}
    </div>
  );
}
