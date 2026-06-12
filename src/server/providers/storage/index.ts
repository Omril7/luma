import 'server-only'

export interface UploadFile {
  buffer: Buffer
  mimetype: string
  originalName: string
}

export interface UploadResult {
  url: string
  key: string
}

export interface StorageProvider {
  save(file: UploadFile): Promise<UploadResult>
  delete(key: string): Promise<void>
}

// Selected by STORAGE_DRIVER env — implementations in ./cloudinary.ts and ./local.ts
export async function getStorageProvider(): Promise<StorageProvider> {
  const driver = process.env.STORAGE_DRIVER ?? 'local'
  if (driver === 'cloudinary') {
    const { CloudinaryStorageProvider } = await import('./cloudinary')
    return new CloudinaryStorageProvider()
  }
  const { LocalStorageProvider } = await import('./local')
  return new LocalStorageProvider()
}
