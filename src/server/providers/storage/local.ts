import 'server-only'
import path from 'path'
import fs from 'fs/promises'
import { randomUUID } from 'crypto'
import type { StorageProvider, UploadFile, UploadResult } from './index'

export class LocalStorageProvider implements StorageProvider {
  private uploadDir = process.env.UPLOAD_DIR ?? './uploads'

  async save(file: UploadFile): Promise<UploadResult> {
    await fs.mkdir(this.uploadDir, { recursive: true })
    const ext = file.originalName.split('.').pop() ?? 'bin'
    const key = `${randomUUID()}.${ext}`
    await fs.writeFile(path.join(this.uploadDir, key), file.buffer)
    return { url: `/uploads/${key}`, key }
  }

  async delete(key: string): Promise<void> {
    await fs.unlink(path.join(this.uploadDir, key)).catch(() => {})
  }
}
