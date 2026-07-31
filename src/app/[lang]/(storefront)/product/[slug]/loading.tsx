// Route-level Suspense fallback — mirrors ProductDetail's gallery + buy-box layout so there's
// no layout shift once real content arrives.
export default function ProductLoading() {
  return (
    <div className="min-h-screen py-8 md:py-12" aria-hidden="true">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
          {/* Gallery */}
          <div className="aspect-[4/3] animate-pulse rounded-xl bg-secondary" />

          {/* Buy box */}
          <div className="flex flex-col gap-6">
            <div className="space-y-3">
              <div className="h-5 w-24 animate-pulse rounded-full bg-secondary" />
              <div className="h-8 w-2/3 animate-pulse rounded-lg bg-secondary" />
            </div>
            <div className="h-[72px] animate-pulse rounded-xl bg-secondary" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-11 w-24 animate-pulse rounded-full bg-secondary" />
              ))}
            </div>
            <div className="h-[52px] animate-pulse rounded-full bg-secondary" />
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-secondary" />
              <div className="h-4 w-full animate-pulse rounded bg-secondary" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-secondary" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
