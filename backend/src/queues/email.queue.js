const { Queue, Worker } = require('bullmq');

// connection config mapped to match standard ioredis connection
const connection = process.env.REDIS_URL
  ? { url: process.env.REDIS_URL }
  : {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
    };

// Create a new queue
const emailQueue = new Queue('email', { connection });

// Define a worker to process jobs in this queue
const emailWorker = new Worker(
  'email',
  async (job) => {
    const logger = require('../utils/logger');
    logger.info(`[Job ${job.id}] Processing email job`);
    logger.info(`[Job ${job.id}] Sending email to: ${job.data.to}`);

    // Simulate heavy processing / email sending delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    logger.info(`[Job ${job.id}] Email job completed successfully`);
  },
  { connection }
);

emailWorker.on('completed', (job) => {
  const logger = require('../utils/logger');
  logger.info(`Job ${job.id} completed!`);
});

emailWorker.on('failed', (job, err) => {
  const logger = require('../utils/logger');
  logger.error(`Job ${job.id} failed with error: ${err.message}`);
});

module.exports = { emailQueue, emailWorker };
