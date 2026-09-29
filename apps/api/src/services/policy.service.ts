import { prisma } from '../utils/prisma';

export type Action = 'read' | 'create' | 'update' | 'delete' | 'approve' | 'pay';
export type Resource = 'employee' | 'attendance' | 'leave' | 'finance' | 'master_data';

export class PolicyService {
  /**
   * Determine if user A can view/edit user B's data based on hierarchy.
   * HR can see all. Manager can see subordinates. Employee can see self.
   */
  static async canAccessUserData(
    actorId: string, 
    actorRoles: string[], 
    targetUserId: string
  ): Promise<boolean> {
    if (actorRoles.includes('HrAdmin') || actorRoles.includes('Super Admin')) {
      return true;
    }
    if (actorId === targetUserId) {
      return true;
    }

    if (actorRoles.includes('Manager')) {
      const targetUser = await prisma.user.findUnique({ where: { id: targetUserId }});
      if (targetUser?.manager_id === actorId) {
        return true;
      }
    }

    return false;
  }
}
