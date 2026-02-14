import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

const BUCKET = process.env.MINIO_BUCKET || "signalleague";

export const s3 = new S3Client({
  region: "us-east-1",
  endpoint: `http://${process.env.MINIO_ENDPOINT || "localhost"}:${process.env.MINIO_PORT || "9000"}`,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || "signalleague",
    secretAccessKey: process.env.MINIO_SECRET_KEY || "signalleague-secret",
  },
});

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return getPublicUrl(key);
}

export async function deleteFile(key: string) {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}

export function getPublicUrl(key: string) {
  const baseUrl = process.env.NEXT_PUBLIC_MINIO_URL || `http://${process.env.MINIO_ENDPOINT || "localhost"}:${process.env.MINIO_PORT || "9000"}`;
  return `${baseUrl}/${BUCKET}/${key}`;
}

export async function getFile(key: string) {
  const response = await s3.send(
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
  return response;
}
