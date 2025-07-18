import prisma from './primsa';
import { ROLES, PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from './rbac';

export async function seedRBAC() {
  console.log('🌱 Seeding RBAC system...');

  try {
    // Create permissions
    console.log('Creating permissions...');
    const permissionPromises = Object.values(PERMISSIONS).map(permission =>
      prisma.permission.upsert({
        where: { permission },
        update: {},
        create: { permission },
      })
    );

    await Promise.all(permissionPromises);
    console.log('✅ Permissions created successfully');

    // Create roles
    console.log('Creating roles...');
    const rolePromises = Object.entries(ROLES).map(([key, roleName]) =>
      prisma.role.upsert({
        where: { name: roleName },
        update: {},
        create: {
          name: roleName,
          description: `Default ${key.toLowerCase().replace('_', ' ')} role`,
        },
      })
    );

    const createdRoles = await Promise.all(rolePromises);
    console.log('✅ Roles created successfully');

    // Assign permissions to roles
    console.log('Assigning permissions to roles...');
    for (const [roleKey, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      const role = createdRoles.find(r => r.name === ROLES[roleKey as keyof typeof ROLES]);
      
      if (!role) {
        console.warn(`⚠️ Role ${roleKey} not found, skipping permission assignment`);
        continue;
      }

      // Get permission records
      const permissionRecords = await prisma.permission.findMany({
        where: { permission: { in: permissions } },
      });

      // Create role-permission relationships
      const rolePermissionPromises = permissionRecords.map(permission =>
        prisma.rolePermission.upsert({
          where: {
            role_id_permission_id: {
              role_id: role.id,
              permission_id: permission.id,
            },
          },
          update: {},
          create: {
            role_id: role.id,
            permission_id: permission.id,
          },
        })
      );

      await Promise.all(rolePermissionPromises);
      console.log(`✅ Permissions assigned to role: ${roleKey}`);
    }

    console.log('🎉 RBAC seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding RBAC:', error);
    throw error;
  }
}

export async function assignDefaultRoleToUser(userId: string, roleName: keyof typeof ROLES = 'USER') {
  try {
    const role = await prisma.role.findUnique({
      where: { name: ROLES[roleName] },
    });

    if (!role) {
      throw new Error(`Role ${roleName} not found`);
    }

    await prisma.siteUser.update({
      where: { id: userId },
      data: { role_id: role.id },
    });

    console.log(`✅ Assigned role ${roleName} to user ${userId}`);
  } catch (error) {
    console.error('❌ Error assigning role to user:', error);
    throw error;
  }
}

export async function createCustomRole(
  name: string,
  description: string,
  permissions: string[]
) {
  try {
    // Create the role
    const role = await prisma.role.create({
      data: {
        name,
        description,
      },
    });

    // Get permission records
    const permissionRecords = await prisma.permission.findMany({
      where: { permission: { in: permissions } },
    });

    // Create role-permission relationships
    const rolePermissionPromises = permissionRecords.map(permission =>
      prisma.rolePermission.create({
        data: {
          role_id: role.id,
          permission_id: permission.id,
        },
      })
    );

    await Promise.all(rolePermissionPromises);

    console.log(`✅ Custom role "${name}" created with ${permissions.length} permissions`);
    return role;
  } catch (error) {
    console.error('❌ Error creating custom role:', error);
    throw error;
  }
}

export async function updateRolePermissions(
  roleId: number,
  permissions: string[]
) {
  try {
    // Remove existing permissions
    await prisma.rolePermission.deleteMany({
      where: { role_id: roleId },
    });

    // Get permission records
    const permissionRecords = await prisma.permission.findMany({
      where: { permission: { in: permissions } },
    });

    // Create new role-permission relationships
    const rolePermissionPromises = permissionRecords.map(permission =>
      prisma.rolePermission.create({
        data: {
          role_id: roleId,
          permission_id: permission.id,
        },
      })
    );

    await Promise.all(rolePermissionPromises);

    console.log(`✅ Updated permissions for role ID ${roleId}`);
  } catch (error) {
    console.error('❌ Error updating role permissions:', error);
    throw error;
  }
}

export async function getRolePermissions(roleId: number) {
  try {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        rolepermissions: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!role) {
      throw new Error(`Role with ID ${roleId} not found`);
    }

    return role.rolepermissions.map(rp => rp.permissions.permission);
  } catch (error) {
    console.error('❌ Error getting role permissions:', error);
    throw error;
  }
}

export async function getAllRoles() {
  try {
    const roles = await prisma.role.findMany({
      include: {
        rolepermissions: {
          include: {
            permissions: true,
          },
        },
        _count: {
          select: {
            siteusers: true,
          },
        },
      },
    });

    return roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.rolepermissions.map(rp => rp.permissions.permission),
      userCount: role._count.siteusers,
    }));
  } catch (error) {
    console.error('❌ Error getting all roles:', error);
    throw error;
  }
}

export async function getAllPermissions() {
  try {
    const permissions = await prisma.permission.findMany({
      include: {
        _count: {
          select: {
            rolepermissions: true,
          },
        },
      },
    });

    return permissions.map(permission => ({
      id: permission.id,
      permission: permission.permission,
      roleCount: permission._count.rolepermissions,
    }));
  } catch (error) {
    console.error('❌ Error getting all permissions:', error);
    throw error;
  }
}