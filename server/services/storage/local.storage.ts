import { StorageService, UploadOptions, UploadResult } from './storage.interface';
import * as fs from 'fs/promises';
import * as path from 'path';

export class LocalStorageProvider implements StorageService {
  private baseDir: string;

  constructor(baseDir: string = './uploads') {
    this.baseDir = path.resolve(process.cwd(), baseDir);
  }

  private async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  async uploadFile(fileBuffer: Buffer | Uint8Array, options: UploadOptions): Promise<UploadResult> {
    const folder = options.folder || 'documents';
    const targetFolder = path.join(this.baseDir, folder);
    await this.ensureDir(targetFolder);

    const safeFilename = `${Date.now()}-${options.filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(targetFolder, safeFilename);
    const fileKey = `${folder}/${safeFilename}`;

    await fs.writeFile(filePath, fileBuffer);

    return {
      fileUrl: `/uploads/${fileKey}`,
      fileKey,
      fileSizeBytes: fileBuffer.byteLength,
    };
  }

  async getDownloadUrl(fileKey: string): Promise<string> {
    return `/uploads/${fileKey}`;
  }

  async deleteFile(fileKey: string): Promise<boolean> {
    try {
      const filePath = path.join(this.baseDir, fileKey);
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
