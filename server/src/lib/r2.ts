import { S3Client } from '@aws-sdk/client-s3';

const required = (key: string): string => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
};

// Only initialize if R2 is configured — allows server to start without R2 in dev
const isConfigured =
  !!process.env.R2_ACCOUNT_ID &&
  !!process.env.R2_ACCESS_KEY_ID &&
  !!process.env.R2_SECRET_ACCESS_KEY;

export const r2 = isConfigured
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${required('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: required('R2_ACCESS_KEY_ID'),
        secretAccessKey: required('R2_SECRET_ACCESS_KEY'),
      },
    })
  : null;

export const R2_BUCKET = process.env.R2_BUCKET_NAME ?? 'muster-media';
export const R2_PUBLIC_URL =
  process.env.R2_PUBLIC_URL ?? 'https://media.muster.app';
export const R2_CONFIGURED = isConfigured;
