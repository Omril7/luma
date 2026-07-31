// Route-level Suspense fallback — shown instantly while the server fetches products, instead
// of a blank screen. Purely visual (no i18n needed for gray placeholder shapes).
export default function ShopLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12" aria-hidden="true">
      {/* Title */}
      <div className="mb-6 h-8 w-40 animate-pulse rounded-lg bg-secondary md:mb-8" />

      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
        {/* Category filter rail */}
        <div className="flex gap-2 overflow-hidden md:w-48 md:shrink-0 md:flex-col">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-9 shrink-0 animate-pulse rounded-full bg-secondary md:w-full md:rounded-lg"
              style={{ width: i === 0 ? '4rem' : '5.5rem' }}
            />
          ))}
        </div>

        {/* Product grid */}
        <div className="grid flex-1 grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-lg border border-border">
              <div className="aspect-[4/3] animate-pulse bg-secondary" />
              <div className="space-y-2 p-3">
                <div className="h-4 w-3/4 animate-pulse rounded bg-secondary" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-secondary" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
