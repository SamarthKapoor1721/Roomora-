import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // MongoDB's ordinary unique indexes permit only one null/missing value.
  // Manual assignments have no application, so uniqueness applies only to strings.
  await prisma.$runCommandRaw({
    createIndexes: 'RoomAssignment',
    indexes: [{
      key: { applicationId: 1 },
      name: 'RoomAssignment_applicationId_partial_unique',
      unique: true,
      partialFilterExpression: { applicationId: { $type: 'string' } },
    }, {
      key: { roomId: 1, tenantId: 1 },
      name: 'RoomAssignment_active_tenant_partial_unique',
      unique: true,
      partialFilterExpression: { isActive: true },
    }],
  });
  console.log('MongoDB application and active tenancy indexes ready.');
}

main().catch(() => {
  console.error('MongoDB index setup failed. Check connectivity, permissions and duplicate application assignments.');
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
