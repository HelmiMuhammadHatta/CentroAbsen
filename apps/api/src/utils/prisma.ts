import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const basePrisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma;

const AUDITED_MODELS = [
  'User', 'Role', 'Permission', 'Department', 'Position', 
  'WorkLocation', 'LeaveType', 'AppSetting', 'LeaveRequest', 'FinanceRequest'
];

export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async create({ model, args, query }) {
        const result = await query(args);
        
        if (AUDITED_MODELS.includes(model)) {
          try {
            await basePrisma.auditLog.create({
              data: {
                actor_id: (args as any)?.ctx?.userId || 'SYSTEM', // Context injection needed for real actor
                action: 'CREATE',
                entity: model,
                entity_id: String((result as any).id),
                after_json: JSON.stringify(result)
              }
            });
          } catch (e) {
            console.error('AuditLog Error:', e);
          }
        }
        return result;
      },
      async update({ model, args, query }) {
        let beforeState: any = null;
        if (AUDITED_MODELS.includes(model) && (args.where as any).id) {
          try {
             beforeState = await (basePrisma as any)[model.toLowerCase()].findUnique({ where: args.where });
          } catch (e) {}
        }
        
        const result = await query(args);
        
        if (beforeState && result) {
          try {
            await basePrisma.auditLog.create({
              data: {
                actor_id: (args as any)?.ctx?.userId || 'SYSTEM',
                action: 'UPDATE',
                entity: model,
                entity_id: String((result as any).id),
                before_json: JSON.stringify(beforeState),
                after_json: JSON.stringify(result)
              }
            });
          } catch (e) {
            console.error('AuditLog Error:', e);
          }
        }
        return result;
      },
      async delete({ model, args, query }) {
        let beforeState: any = null;
        if (AUDITED_MODELS.includes(model) && (args.where as any).id) {
          try {
             beforeState = await (basePrisma as any)[model.toLowerCase()].findUnique({ where: args.where });
          } catch (e) {}
        }

        const result = await query(args);

        if (beforeState) {
          try {
            await basePrisma.auditLog.create({
              data: {
                actor_id: (args as any)?.ctx?.userId || 'SYSTEM',
                action: 'DELETE',
                entity: model,
                entity_id: String((result as any).id),
                before_json: JSON.stringify(beforeState)
              }
            });
          } catch (e) {
            console.error('AuditLog Error:', e);
          }
        }
        return result;
      }
    }
  }
});
