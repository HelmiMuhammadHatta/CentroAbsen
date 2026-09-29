import { prisma } from '../utils/prisma';
import * as argon2 from 'argon2';

export class EmployeeService {
  static async checkCircularReference(userId: string, proposedManagerId: string): Promise<boolean> {
    let currentManagerId: string | null = proposedManagerId;
    const visited = new Set<string>();

    while (currentManagerId) {
      if (currentManagerId === userId) {
        return true; // Circular!
      }
      if (visited.has(currentManagerId)) {
        return true; // Infinite loop detected in DB
      }
      visited.add(currentManagerId);

      const manager: { manager_id: string | null } | null = await prisma.user.findUnique({
        where: { id: currentManagerId },
        select: { manager_id: true }
      });

      currentManagerId = manager?.manager_id || null;
    }

    return false;
  }

  static async createEmployee(data: any) {
    if (data.manager_id) {
       // Just to be safe, no self manager
       if (data.id === data.manager_id) throw new Error('Cannot be own manager');
    }
    const password_hash = await argon2.hash(data.password || 'password123');
    
    return prisma.user.create({
      data: {
        nik: data.nik,
        full_name: data.full_name,
        email: data.email,
        password_hash,
        manager_id: data.manager_id || null,
        department_id: data.department_id || null,
        primary_work_location_id: data.primary_work_location_id || null,
        work_arrangement: data.work_arrangement || 'Office',
        roles: data.role_ids ? {
          create: data.role_ids.map((id: string) => ({ role_id: id }))
        } : undefined
      }
    });
  }

  static async updateEmployee(id: string, data: any) {
    if (data.manager_id) {
      const isCircular = await this.checkCircularReference(id, data.manager_id);
      if (isCircular) {
        throw new Error('Validasi Gagal: Circular reference terdeteksi pada hierarki manajer');
      }
    }

    let password_hash = undefined;
    if (data.password) {
       password_hash = await argon2.hash(data.password);
    }

    return prisma.user.update({
      where: { id },
      data: {
        nik: data.nik,
        full_name: data.full_name,
        email: data.email,
        password_hash,
        manager_id: data.manager_id,
        department_id: data.department_id,
        primary_work_location_id: data.primary_work_location_id,
        work_arrangement: data.work_arrangement,
        // Role updates requires deletion and recreation in a real app, 
        // simplified here to basic update if provided
      }
    });
  }

  static async getEmployee(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        department: true,
        primary_work_location: true,
        manager: true,
        roles: { include: { role: true } },
        employee_documents: true
      }
    });
  }

  static async listEmployees() {
    return prisma.user.findMany({
      include: {
        department: true,
        roles: { include: { role: true } }
      }
    });
  }

  static async importCsv(csvContent: string) {
    const lines = csvContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) throw new Error('File CSV kosong atau tidak memiliki baris data');

    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const nikIdx = header.indexOf('nik');
    const nameIdx = header.indexOf('full_name') !== -1 ? header.indexOf('full_name') : header.indexOf('nama');
    const emailIdx = header.indexOf('email');

    if (nikIdx === -1 || nameIdx === -1 || emailIdx === -1) {
      throw new Error('Header CSV wajib mengandung kolom nik, full_name/nama, dan email');
    }

    const successList = [];
    const failedList = [];
    const defaultPasswordHash = await argon2.hash('password123');

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      const nik = cols[nikIdx];
      const full_name = cols[nameIdx];
      const email = cols[emailIdx];

      if (!nik || !full_name || !email) {
        failedList.push({ line: i + 1, data: lines[i], reason: 'Kolom NIK, nama, atau email kosong' });
        continue;
      }

      try {
        const existing = await prisma.user.findFirst({
          where: { OR: [{ nik }, { email }] }
        });
        if (existing) {
          failedList.push({ line: i + 1, data: lines[i], reason: 'NIK atau Email sudah digunakan' });
          continue;
        }

        const newUser = await prisma.user.create({
          data: {
            nik,
            full_name,
            email,
            password_hash: defaultPasswordHash,
            must_change_password: true,
            work_arrangement: 'Office'
          }
        });

        successList.push(newUser);
      } catch (e: any) {
        failedList.push({ line: i + 1, data: lines[i], reason: e.message });
      }
    }

    return {
      total: lines.length - 1,
      successCount: successList.length,
      failedCount: failedList.length,
      successList,
      failedList
    };
  }
}
