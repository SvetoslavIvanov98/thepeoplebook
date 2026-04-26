const { PrismaClient } = require('@prisma/client');

const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = global;

let prisma;

if (!globalForPrisma.prisma) {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  globalForPrisma.pool = pool;
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
} else {
  prisma = globalForPrisma.prisma;
}

prisma.pool = globalForPrisma.pool;
module.exports = prisma;
