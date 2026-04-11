const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: process.env.LINODE_S3_REGION || 'us-east-1',
  endpoint: process.env.LINODE_S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.LINODE_S3_ACCESS_KEY,
    secretAccessKey: process.env.LINODE_S3_SECRET_KEY,
  },
  forcePathStyle: false,
});

/**
 * Delete a file from S3 by its full URL.
 * The key is the last path segment of the URL.
 * No-ops gracefully when S3 is not configured or the URL is falsy.
 */
const deleteS3Object = async (url) => {
  if (!url || !process.env.LINODE_S3_BUCKET) return;
  try {
    const key = url.split('/').pop().split('?')[0];
    if (!key) return;
    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.LINODE_S3_BUCKET,
      Key: key,
    }));
  } catch (err) {
    console.error('S3 delete error for', url, err.message);
  }
};

module.exports = { s3, deleteS3Object };
