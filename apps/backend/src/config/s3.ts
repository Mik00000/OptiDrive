import { S3Client } from '@aws-sdk/client-s3';
import { prisma } from './prisma';

export const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.RE_ACCESS_KEY_ID || '', // Keeping typo from .env just in case
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'optidrive';

// Cache for dynamic workspace S3 clients to prevent re-instantiating on every request
interface WorkspaceS3Config {
  client: S3Client;
  bucketName: string;
  publicUrl?: string | null;
}

const clientCache = new Map<string, WorkspaceS3Config>();

export const getS3ConfigForWorkspace = async (workspaceId: string): Promise<WorkspaceS3Config> => {
  if (clientCache.has(workspaceId)) {
    return clientCache.get(workspaceId)!;
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      customS3Enabled: true,
      s3AccessKeyId: true,
      s3SecretAccessKey: true,
      s3Endpoint: true,
      s3BucketName: true,
      s3Region: true,
      s3PublicUrl: true,
    }
  });

  if (workspace && workspace.customS3Enabled && workspace.s3AccessKeyId && workspace.s3SecretAccessKey && workspace.s3BucketName) {
    const s3Config: any = {
      region: workspace.s3Region || 'auto',
      credentials: {
        accessKeyId: workspace.s3AccessKeyId,
        secretAccessKey: workspace.s3SecretAccessKey,
      },
    };
    if (workspace.s3Endpoint) {
      s3Config.endpoint = workspace.s3Endpoint;
    }

    const client = new S3Client(s3Config);

    const config = {
      client,
      bucketName: workspace.s3BucketName,
      publicUrl: workspace.s3PublicUrl
    };

    clientCache.set(workspaceId, config);
    return config;
  }

  // Fallback to default system storage
  const config = {
    client: s3Client,
    bucketName: BUCKET_NAME,
    publicUrl: process.env.R2_PUBLIC_URL || null
  };
  
  return config;
};

export const clearWorkspaceS3Cache = (workspaceId: string) => {
  clientCache.delete(workspaceId);
};
