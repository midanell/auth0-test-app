export default function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md animate-pulse">
        <div className="text-center mb-8">
          <div className="h-3 w-24 bg-gray-200 rounded mx-auto mb-3" />
          <div className="h-8 w-48 bg-gray-200 rounded mx-auto mb-6" />
          <div className="h-9 w-24 bg-gray-200 rounded-lg mx-auto" />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="h-3 w-32 bg-gray-200 rounded" />
            <div className="w-6 h-6 bg-gray-200 rounded-full" />
          </div>

          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0"
            >
              <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="h-3 w-28 bg-gray-200 rounded" />
                <div className="h-2.5 w-40 bg-gray-100 rounded" />
              </div>
              <div className="h-6 w-16 bg-gray-200 rounded" />
              <div className="w-6 h-6 bg-gray-200 rounded-full" />
              <div className="w-6 h-6 bg-gray-200 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
