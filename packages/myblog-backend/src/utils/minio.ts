import * as Minio from 'minio';
import { AppLogger } from '../common/utils/app-logger/app-logger';

const logger = new AppLogger('MinIO');

declare global {
  var minioClient: Minio.Client | undefined;
}

const minioClient =
  globalThis.minioClient ||
  new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.minioClient = minioClient;
}

// Bucket name for profile pictures
export const PROFILE_PICTURES_BUCKET = 'profile-pictures';

export async function ensureBucketExists(bucketName: string): Promise<void> {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, 'us-east-1');
      logger.info(`Created MinIO bucket: ${bucketName}`);
    }
  } catch (error) {
    logger.error(
      { message: 'Error ensuring bucket exists', error },
      { bucketName }
    );
    throw error;
  }
}

export { minioClient };
