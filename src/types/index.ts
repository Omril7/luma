// Frontend-only TypeScript types — component props, store shapes, etc.
// These are safe to import in client components but are not shared with the API.
// For types shared between UI and API, see src/shared/types.ts

export interface PageProps {
  params: Promise<{ lang: string }>
  searchParams?: Promise<Record<string, string | string[]>>
}
