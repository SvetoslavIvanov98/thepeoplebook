const { S3Client } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: process.env.LINODE_S3_REGION || 'us-east-1',
  endpoint: process.env.LINODE_S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.LINODE_S3_ACCESS_KEY,
    secretAccessKey: process.env.LINODE_S3_SECRET_KEY,
  },
  forcePathStyle: false,
});

module.exports = s3;
