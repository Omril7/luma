import 'server-only'

export interface UploadTicket {
  provider: string
  endpoint: string
  fields: Record<string, string>
}

export interface StorageProvider {
  createUploadTicket(): Promise<UploadTicket> | UploadTicket
  deleteAsset(key: string): Promise<void>
  keyFromUrl(url: string): string | null
}

// Selected by STORAGE_PROVIDER env — implementation in ./cloudinary.ts
export async function getStorageProvider(): Promise<StorageProvider> {
  switch (process.env.STORAGE_PROVIDER ?? 'cloudinary') {
    case 'cloudinary':
    default: {
      const { cloudinaryProvider } = await import('./cloudinary')
      return cloudinaryProvider
    }
  }
}
