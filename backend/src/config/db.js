const prisma = require('./prisma');

module.exports = {
  query: async (text, params) => {
    // Temporary wrapper to keep legacy pg code working during migration
    // Convert $1, $2 to prisma parameters...
    // Actually, prisma.$queryRawUnsafe takes the string and the params directly!
    // But pg uses 1-indexed $1, $2, whereas prisma expects Prisma.sql or just passing them.
    // Let's just pass it through to $queryRawUnsafe

    try {
      const result = await prisma.$queryRawUnsafe(text, ...(params || []));
      return { rows: Array.isArray(result) ? result : [result] };
    } catch (e) {
      console.error('Legacy db.query error:', e);
      throw e;
    }
  },
};
