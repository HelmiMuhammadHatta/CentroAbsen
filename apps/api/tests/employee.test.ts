import { EmployeeService } from '../src/services/employee.service';
import { prisma } from '../src/utils/prisma';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('EmployeeService', () => {
  let u1: any, u2: any, u3: any;

  beforeAll(async () => {
    // Clean up
    await prisma.user.deleteMany({ where: { email: { contains: 'testcirc' } } });
    
    u1 = await prisma.user.create({
      data: { nik: 'T1', full_name: 'U1', email: 'testcirc1@test.com', password_hash: 'xx', work_arrangement: 'Office' }
    });
    u2 = await prisma.user.create({
      data: { nik: 'T2', full_name: 'U2', email: 'testcirc2@test.com', password_hash: 'xx', manager_id: u1.id, work_arrangement: 'Office' }
    });
    u3 = await prisma.user.create({
      data: { nik: 'T3', full_name: 'U3', email: 'testcirc3@test.com', password_hash: 'xx', manager_id: u2.id, work_arrangement: 'Office' }
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'testcirc' } } });
  });

  it('should detect circular reference when u1 manager becomes u3', async () => {
    // Hierarchy: u1 -> u2 -> u3. If u1's manager is set to u3, it becomes u3 -> u2 -> u1 -> u3 (circular)
    const isCircular = await EmployeeService.checkCircularReference(u1.id, u3.id);
    expect(isCircular).toBe(true);
  });

  it('should reject circular reference during update', async () => {
    await expect(EmployeeService.updateEmployee(u1.id, { manager_id: u3.id }))
      .rejects.toThrow('Validasi Gagal: Circular reference terdeteksi pada hierarki manajer');
  });

  it('should allow valid manager update', async () => {
    // If u3 manager becomes u1, it's u1 -> u3, u1 -> u2, which is valid.
    const isCircular = await EmployeeService.checkCircularReference(u3.id, u1.id);
    expect(isCircular).toBe(false);

    const res = await EmployeeService.updateEmployee(u3.id, { manager_id: u1.id });
    expect(res.manager_id).toBe(u1.id);
  });
});
