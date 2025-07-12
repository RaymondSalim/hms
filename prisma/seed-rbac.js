const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding RBAC data...');

  // Create permissions
  const permissions = [
    // User management
    { permission: 'user:create' },
    { permission: 'user:read' },
    { permission: 'user:update' },
    { permission: 'user:delete' },
    
    // Role management
    { permission: 'role:create' },
    { permission: 'role:read' },
    { permission: 'role:update' },
    { permission: 'role:delete' },
    
    // Booking management
    { permission: 'booking:create' },
    { permission: 'booking:read' },
    { permission: 'booking:update' },
    { permission: 'booking:delete' },
    
    // Room management
    { permission: 'room:create' },
    { permission: 'room:read' },
    { permission: 'room:update' },
    { permission: 'room:delete' },
    
    // Payment management
    { permission: 'payment:create' },
    { permission: 'payment:read' },
    { permission: 'payment:update' },
    { permission: 'payment:delete' },
    
    // Report management
    { permission: 'report:create' },
    { permission: 'report:read' },
    { permission: 'report:update' },
    { permission: 'report:delete' },
    
    // Settings management
    { permission: 'settings:read' },
    { permission: 'settings:update' },
  ];

  console.log('Creating permissions...');
  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { permission: perm.permission },
      update: {},
      create: perm,
    });
  }

  // Create roles
  const roles = [
    {
      name: 'Super Admin',
      description: 'Full system access with all permissions',
    },
    {
      name: 'Admin',
      description: 'Administrative access with most permissions',
    },
    {
      name: 'Manager',
      description: 'Management access with booking and payment permissions',
    },
    {
      name: 'Staff',
      description: 'Staff access with limited permissions',
    },
    {
      name: 'Viewer',
      description: 'Read-only access to view data',
    },
  ];

  console.log('Creating roles...');
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }

  // Get all permissions and roles for assignment
  const allPermissions = await prisma.permission.findMany();
  const allRoles = await prisma.role.findMany();

  // Assign permissions to roles
  console.log('Assigning permissions to roles...');

  // Super Admin - all permissions
  const superAdmin = allRoles.find(r => r.name === 'Super Admin');
  if (superAdmin) {
    await prisma.rolePermission.deleteMany({
      where: { role_id: superAdmin.id },
    });
    
    for (const permission of allPermissions) {
      await prisma.rolePermission.create({
        data: {
          role_id: superAdmin.id,
          permission_id: permission.id,
        },
      });
    }
  }

  // Admin - all permissions except role management
  const admin = allRoles.find(r => r.name === 'Admin');
  if (admin) {
    await prisma.rolePermission.deleteMany({
      where: { role_id: admin.id },
    });
    
    const adminPermissions = allPermissions.filter(p => 
      !p.permission.startsWith('role:')
    );
    
    for (const permission of adminPermissions) {
      await prisma.rolePermission.create({
        data: {
          role_id: admin.id,
          permission_id: permission.id,
        },
      });
    }
  }

  // Manager - booking, payment, room, and report permissions
  const manager = allRoles.find(r => r.name === 'Manager');
  if (manager) {
    await prisma.rolePermission.deleteMany({
      where: { role_id: manager.id },
    });
    
    const managerPermissions = allPermissions.filter(p => 
      p.permission.startsWith('booking:') ||
      p.permission.startsWith('payment:') ||
      p.permission.startsWith('room:') ||
      p.permission.startsWith('report:read')
    );
    
    for (const permission of managerPermissions) {
      await prisma.rolePermission.create({
        data: {
          role_id: manager.id,
          permission_id: permission.id,
        },
      });
    }
  }

  // Staff - limited permissions
  const staff = allRoles.find(r => r.name === 'Staff');
  if (staff) {
    await prisma.rolePermission.deleteMany({
      where: { role_id: staff.id },
    });
    
    const staffPermissions = allPermissions.filter(p => 
      p.permission === 'booking:read' ||
      p.permission === 'booking:update' ||
      p.permission === 'payment:read' ||
      p.permission === 'payment:create' ||
      p.permission === 'room:read' ||
      p.permission === 'report:read'
    );
    
    for (const permission of staffPermissions) {
      await prisma.rolePermission.create({
        data: {
          role_id: staff.id,
          permission_id: permission.id,
        },
      });
    }
  }

  // Viewer - read-only permissions
  const viewer = allRoles.find(r => r.name === 'Viewer');
  if (viewer) {
    await prisma.rolePermission.deleteMany({
      where: { role_id: viewer.id },
    });
    
    const viewerPermissions = allPermissions.filter(p => 
      p.permission.endsWith(':read')
    );
    
    for (const permission of viewerPermissions) {
      await prisma.rolePermission.create({
        data: {
          role_id: viewer.id,
          permission_id: permission.id,
        },
      });
    }
  }

  console.log('✅ RBAC seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding RBAC data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });