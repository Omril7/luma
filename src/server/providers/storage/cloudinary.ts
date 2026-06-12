import 'server-only'
import type { StorageProvider, UploadFile, UploadResult } from './index'

export class CloudinaryStorageProvider implements StorageProvider {
  async save(file: UploadFile): Promise<UploadResult> {
    const { v2: cloudinary } = await import('cloudinary')
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'image', folder: 'luma' },
        (err, result) => {
          if (err || !result) return reject(err ?? new Error('Cloudinary upload failed'))
          resolve({ url: result.secure_url, key: result.public_id })
        }
      )
      stream.end(file.buffer)
    })
  }

  async delete(key: string): Promise<void> {
    const { v2: cloudinary } = await import('cloudinary')
    await cloudinary.uploader.destroy(key)
  }
}
