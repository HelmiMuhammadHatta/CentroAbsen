import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting custom database migration...');

  try {
    // 1. Create new tables if not exist (Positions, Roles, Permissions, UserRoles, RolePermissions, EmployeeDocuments)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS positions (
        id CHAR(36) NOT NULL,
        name VARCHAR(191) NOT NULL,
        level INT NOT NULL DEFAULT 1,
        department_id CHAR(36) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS roles (
        id CHAR(36) NOT NULL,
        name VARCHAR(191) NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        UNIQUE INDEX roles_name_key(name)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS permissions (
        id CHAR(36) NOT NULL,
        name VARCHAR(191) NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        UNIQUE INDEX permissions_name_key(name)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id CHAR(36) NOT NULL,
        permission_id CHAR(36) NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (role_id, permission_id)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id CHAR(36) NOT NULL,
        role_id CHAR(36) NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (user_id, role_id)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS employee_documents (
        id CHAR(36) NOT NULL,
        user_id CHAR(36) NOT NULL,
        document_type VARCHAR(191) NOT NULL,
        file_path VARCHAR(191) NOT NULL,
        original_name VARCHAR(191) NOT NULL,
        content_type VARCHAR(191) NOT NULL,
        size_bytes INT NOT NULL,
        uploaded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    // 2. Rename divisions to departments if divisions exists
    try {
      await prisma.$executeRawUnsafe(`RENAME TABLE divisions TO departments;`);
      console.log('Renamed divisions to departments.');
    } catch (e: any) {
      if (e.message.includes("doesn't exist")) {
        console.log('Table divisions does not exist (already renamed or fresh).');
      } else {
        console.log('Warning renaming divisions:', e.message);
      }
    }

    // 3. Rename division_id to department_id in users
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE users CHANGE division_id department_id CHAR(36) NULL;`);
      console.log('Renamed users.division_id to department_id.');
    } catch (e: any) {
      console.log('Warning renaming division_id:', e.message);
    }

    // 4. Add new columns to users and leave_types
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN position_id CHAR(36) NULL;`);
    } catch(e) {}
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN gender ENUM('Male', 'Female') NULL;`);
    } catch(e) {}
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE leave_types ADD COLUMN eligible_gender ENUM('Male', 'Female') NULL;`);
    } catch(e) {}

    // 5. Seed Roles
    const roles = ['Employee', 'Manager', 'Finance', 'HrAdmin', 'Executive'];
    const roleIds: Record<string, string> = {};
    for (const r of roles) {
      const id = crypto.randomUUID();
      try {
        await prisma.$executeRawUnsafe(`INSERT IGNORE INTO roles (id, name) VALUES ('${id}', '${r}')`);
      } catch(e) {}
    }
    
    const dbRoles = await prisma.$queryRawUnsafe<any[]>(`SELECT id, name FROM roles`);
    dbRoles.forEach(r => roleIds[r.name] = r.id);

    // 6. Migrate users.role to user_roles
    try {
      const usersWithRole = await prisma.$queryRawUnsafe<any[]>(`SELECT id, role FROM users WHERE role IS NOT NULL`);
      for (const u of usersWithRole) {
        const roleName = u.role === 'HrAdmin' ? 'HrAdmin' : u.role;
        const roleId = roleIds[roleName];
        if (roleId) {
          await prisma.$executeRawUnsafe(`INSERT IGNORE INTO user_roles (user_id, role_id) VALUES ('${u.id}', '${roleId}')`);
        }
      }
      console.log('Migrated user roles.');
    } catch(e: any) {
      console.log('Error migrating user roles:', e.message);
    }

    // 7. Drop users.role safely
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE users DROP COLUMN role;`);
      console.log('Dropped enum role column from users.');
    } catch(e) {}
    
    console.log('Migration script completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
