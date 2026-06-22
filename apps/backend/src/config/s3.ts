import { S3Client } from '@aws-sdk/client-s3';

export const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.RE_ACCESS_KEY_ID || '', // Keeping typo from .env just in case
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'optidrive';
