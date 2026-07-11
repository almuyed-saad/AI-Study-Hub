import fs from "fs";
import path from "path";

export interface StorageResult {
  storedName: string;
  storagePath: string;
  storageProvider: string;
}

export interface StorageProvider {
  uploadFile(file: { originalname: string; buffer: Buffer }, userId: string): Promise<StorageResult>;
  deleteFile(storagePath: string): Promise<void>;
}

export class LocalStorageProvider implements StorageProvider {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(this.uploadDir)) {
      try {
        fs.mkdirSync(this.uploadDir, { recursive: true });
        console.log(`[Storage] Uploads directory created at: ${this.uploadDir}`);
      } catch (err) {
        console.error("[Storage] Failed to create uploads directory:", err);
      }
    }
  }

  async uploadFile(file: { originalname: string; buffer: Buffer }, userId: string): Promise<StorageResult> {
    const extension = path.extname(file.originalname).toLowerCase();
    const timestamp = Date.now();
    const randomHex = Math.random().toString(16).substring(2, 8);
    // Sanitize base name to prevent path traversal and keep alphanumeric chars
    const baseName = path.basename(file.originalname, extension);
    const sanitizedBase = baseName
      .replace(/[^a-zA-Z0-9]/g, "_")
      .substring(0, 100);
    
    const storedName = `${userId}_${timestamp}_${randomHex}_${sanitizedBase}${extension}`;
    const fullPath = path.join(this.uploadDir, storedName);

    // Save to disk
    await fs.promises.writeFile(fullPath, file.buffer);

    return {
      storedName,
      storagePath: storedName, // relative path used as the storage key
      storageProvider: "local",
    };
  }

  async deleteFile(storagePath: string): Promise<void> {
    const fullPath = path.join(this.uploadDir, storagePath);
    try {
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
        console.log(`[Storage] Deleted file from local storage: ${storagePath}`);
      }
    } catch (err) {
      console.error(`[Storage] Failed to delete local file ${storagePath}:`, err);
    }
  }
}

// Export the active storage provider. This allows us to hot-swap to Google Cloud Storage or AWS S3 later easily.
export const activeStorageProvider: StorageProvider = new LocalStorageProvider();
