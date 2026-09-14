export interface UploadOptions {
  filename: string;
  contentType: string;
  folder?: string;
  isPublic?: boolean;
}

export interface UploadResult {
  fileUrl: string;
  fileKey: string;
  fileSizeBytes: number;
}

export interface StorageService {
  uploadFile(fileBuffer: Buffer | Uint8Array, options: UploadOptions): Promise<UploadResult>;
  getDownloadUrl(fileKey: string, expiresInSeconds?: number): Promise<string>;
  deleteFile(fileKey: string): Promise<boolean>;
}
