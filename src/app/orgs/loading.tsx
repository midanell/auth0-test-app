export default function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md animate-pulse">
        <div className="h-7 w-56 bg-gray-200 rounded mx-auto mb-3" />
        <div className="h-3 w-72 bg-gray-100 rounded mx-auto mb-6" />

        <ul className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <li key={i} className="h-12 bg-white rounded-lg border border-gray-200" />
          ))}
        </ul>
      </div>
    </main>
  );
}
