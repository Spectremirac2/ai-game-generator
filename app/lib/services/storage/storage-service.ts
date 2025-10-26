/**
 * Storage Service
 *
 * Handles asset storage, retrieval, and URL generation
 * Currently uses local filesystem, can be extended for cloud storage
 */

import { logger } from "../../logger";
import * as fs from "fs/promises";
import * as path from "path";
import crypto from "crypto";

export interface StoredAsset {
  id: string;
  filename: string;
  path: string;
  url: string;
  size: number;
  mimeType: string;
  createdAt: Date;
}

export class StorageService {
  private storagePath: string;
  private baseUrl: string;

  constructor() {
    this.storagePath = path.join(process.cwd(), "public", "generated");
    this.baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  }

  /**
   * Initialize storage directory
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.storagePath, { recursive: true });
      await fs.mkdir(path.join(this.storagePath, "sprites"), {
        recursive: true,
      });
      await fs.mkdir(path.join(this.storagePath, "packages"), {
        recursive: true,
      });
      logger.info("Storage Service: Initialized", { path: this.storagePath });
    } catch (error) {
      logger.error("Storage Service: Failed to initialize", { error });
      throw error;
    }
  }

  /**
   * Store a sprite image
   */
  async storeSprite(
    buffer: Buffer,
    filename: string,
    userId: string
  ): Promise<StoredAsset> {
    logger.info("Storage Service: Storing sprite", { filename, userId });

    try {
      const id = crypto.randomUUID();
      const ext = path.extname(filename) || ".png";
      const safeFilename = `${id}${ext}`;
      const filePath = path.join(this.storagePath, "sprites", safeFilename);

      await fs.writeFile(filePath, buffer);

      const stats = await fs.stat(filePath);
      const asset: StoredAsset = {
        id,
        filename: safeFilename,
        path: filePath,
        url: `/generated/sprites/${safeFilename}`,
        size: stats.size,
        mimeType: this.getMimeType(ext),
        createdAt: new Date(),
      };

      logger.info("Storage Service: Sprite stored", {
        id: asset.id,
        size: asset.size,
      });

      return asset;
    } catch (error) {
      logger.error("Storage Service: Failed to store sprite", {
        filename,
        error,
      });
      throw new Error(`Failed to store sprite: ${error}`);
    }
  }

  /**
   * Store a game package (ZIP file)
   */
  async storePackage(
    buffer: Buffer,
    gameId: string,
    userId: string
  ): Promise<StoredAsset> {
    logger.info("Storage Service: Storing package", { gameId, userId });

    try {
      const filename = `${gameId}.zip`;
      const filePath = path.join(this.storagePath, "packages", filename);

      await fs.writeFile(filePath, buffer);

      const stats = await fs.stat(filePath);
      const asset: StoredAsset = {
        id: gameId,
        filename,
        path: filePath,
        url: `/generated/packages/${filename}`,
        size: stats.size,
        mimeType: "application/zip",
        createdAt: new Date(),
      };

      logger.info("Storage Service: Package stored", {
        id: asset.id,
        size: asset.size,
      });

      return asset;
    } catch (error) {
      logger.error("Storage Service: Failed to store package", {
        gameId,
        error,
      });
      throw new Error(`Failed to store package: ${error}`);
    }
  }

  /**
   * Get asset by ID
   */
  async getAsset(id: string, type: "sprite" | "package"): Promise<Buffer> {
    logger.info("Storage Service: Retrieving asset", { id, type });

    try {
      const dir = type === "sprite" ? "sprites" : "packages";
      const files = await fs.readdir(path.join(this.storagePath, dir));

      const file = files.find((f) => f.startsWith(id));
      if (!file) {
        throw new Error(`Asset not found: ${id}`);
      }

      const filePath = path.join(this.storagePath, dir, file);
      const buffer = await fs.readFile(filePath);

      logger.info("Storage Service: Asset retrieved", {
        id,
        size: buffer.length,
      });

      return buffer;
    } catch (error) {
      logger.error("Storage Service: Failed to retrieve asset", { id, error });
      throw new Error(`Failed to retrieve asset: ${error}`);
    }
  }

  /**
   * Delete asset by ID
   */
  async deleteAsset(id: string, type: "sprite" | "package"): Promise<void> {
    logger.info("Storage Service: Deleting asset", { id, type });

    try {
      const dir = type === "sprite" ? "sprites" : "packages";
      const files = await fs.readdir(path.join(this.storagePath, dir));

      const file = files.find((f) => f.startsWith(id));
      if (!file) {
        logger.warn("Storage Service: Asset not found for deletion", { id });
        return;
      }

      const filePath = path.join(this.storagePath, dir, file);
      await fs.unlink(filePath);

      logger.info("Storage Service: Asset deleted", { id });
    } catch (error) {
      logger.error("Storage Service: Failed to delete asset", { id, error });
      throw new Error(`Failed to delete asset: ${error}`);
    }
  }

  /**
   * Clean up old assets (older than specified days)
   */
  async cleanup(daysOld: number = 7): Promise<number> {
    logger.info("Storage Service: Starting cleanup", { daysOld });

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      let deletedCount = 0;

      // Clean sprites
      deletedCount += await this.cleanupDirectory(
        path.join(this.storagePath, "sprites"),
        cutoffDate
      );

      // Clean packages
      deletedCount += await this.cleanupDirectory(
        path.join(this.storagePath, "packages"),
        cutoffDate
      );

      logger.info("Storage Service: Cleanup complete", { deletedCount });

      return deletedCount;
    } catch (error) {
      logger.error("Storage Service: Cleanup failed", { error });
      throw error;
    }
  }

  /**
   * Clean up files in a directory older than cutoff date
   */
  private async cleanupDirectory(
    dir: string,
    cutoffDate: Date
  ): Promise<number> {
    let count = 0;

    try {
      const files = await fs.readdir(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          count++;
        }
      }
    } catch (error) {
      logger.error("Storage Service: Directory cleanup failed", { dir, error });
    }

    return count;
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    totalSize: number;
    spriteCount: number;
    packageCount: number;
  }> {
    try {
      const [sprites, packages] = await Promise.all([
        this.getDirectoryStats(path.join(this.storagePath, "sprites")),
        this.getDirectoryStats(path.join(this.storagePath, "packages")),
      ]);

      return {
        totalSize: sprites.size + packages.size,
        spriteCount: sprites.count,
        packageCount: packages.count,
      };
    } catch (error) {
      logger.error("Storage Service: Failed to get stats", { error });
      return { totalSize: 0, spriteCount: 0, packageCount: 0 };
    }
  }

  /**
   * Get statistics for a directory
   */
  private async getDirectoryStats(
    dir: string
  ): Promise<{ size: number; count: number }> {
    try {
      const files = await fs.readdir(dir);
      let totalSize = 0;

      for (const file of files) {
        const stats = await fs.stat(path.join(dir, file));
        totalSize += stats.size;
      }

      return { size: totalSize, count: files.length };
    } catch (error) {
      return { size: 0, count: 0 };
    }
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(ext: string): string {
    const mimeTypes: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".zip": "application/zip",
    };

    return mimeTypes[ext.toLowerCase()] || "application/octet-stream";
  }

  /**
   * Generate a signed URL for secure downloads (future enhancement)
   */
  generateSignedUrl(assetId: string, expiresIn: number = 3600): string {
    // For now, return public URL
    // In production, implement signed URLs with expiration
    return `${this.baseUrl}/api/assets/${assetId}`;
  }
}

// Singleton instance
export const storageService = new StorageService();

// Initialize on module load
storageService.initialize().catch((error) => {
  logger.error("Storage Service: Failed to initialize on module load", {
    error,
  });
});
