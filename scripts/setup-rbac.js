#!/usr/bin/env node

/**
 * RBAC System Setup Script
 * 
 * This script helps you set up the Role-Based Access Control system
 * by seeding the database with default roles and permissions.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Import the RBAC seeder
const { seedRBAC, assignDefaultRoleToUser } = require('../src/app/_lib/seed-rbac');

async function setupRBAC() {
  console.log('🚀 Setting up RBAC System...\n');

  try {
    // Step 1: Seed the database with roles and permissions
    console.log('📦 Step 1: Seeding roles and permissions...');
    await seedRBAC();
    console.log('✅ Roles and permissions seeded successfully!\n');

    // Step 2: Create a super admin user (optional)
    console.log('👤 Step 2: Creating super admin user...');
    
    const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'admin123';
    const adminName = process.env.SUPER_ADMIN_NAME || 'Super Admin';

    // Check if super admin already exists
    const existingAdmin = await prisma.siteUser.findUnique({
      where: { email: adminEmail },
      include: { roles: true }
    });

    if (existingAdmin) {
      console.log(`⚠️  Super admin user already exists: ${adminEmail}`);
      
      // Check if they have the super admin role
      if (existingAdmin.roles?.name === 'super_admin') {
        console.log('✅ Super admin user already has correct role');
      } else {
        console.log('🔄 Assigning super admin role to existing user...');
        await assignDefaultRoleToUser(existingAdmin.id, 'SUPER_ADMIN');
        console.log('✅ Super admin role assigned successfully!');
      }
    } else {
      // Create new super admin user
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      const superAdminUser = await prisma.siteUser.create({
        data: {
          name: adminName,
          email: adminEmail,
          password: hashedPassword,
        }
      });

      // Assign super admin role
      await assignDefaultRoleToUser(superAdminUser.id, 'SUPER_ADMIN');
      
      console.log(`✅ Super admin user created successfully!`);
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
      console.log(`   Name: ${adminName}`);
    }

    // Step 3: Display system information
    console.log('\n📊 Step 3: System Information...');
    
    const roles = await prisma.role.findMany({
      include: {
        rolepermissions: {
          include: {
            permissions: true
          }
        },
        _count: {
          select: {
            siteusers: true
          }
        }
      }
    });

    console.log('\n📋 Available Roles:');
    roles.forEach(role => {
      console.log(`   • ${role.name} (${role.description})`);
      console.log(`     Permissions: ${role.rolepermissions.length}`);
      console.log(`     Users: ${role._count.siteusers}`);
    });

    const permissions = await prisma.permission.findMany({
      include: {
        _count: {
          select: {
            rolepermissions: true
          }
        }
      }
    });

    console.log('\n🔐 Available Permissions:');
    const permissionGroups = {};
    permissions.forEach(permission => {
      const [resource] = permission.permission.split(':');
      if (!permissionGroups[resource]) {
        permissionGroups[resource] = [];
      }
      permissionGroups[resource].push(permission.permission);
    });

    Object.entries(permissionGroups).forEach(([resource, perms]) => {
      console.log(`   • ${resource}: ${perms.length} permissions`);
    });

    // Step 4: Verify setup
    console.log('\n🔍 Step 4: Verifying setup...');
    
    const superAdminRole = await prisma.role.findUnique({
      where: { name: 'super_admin' },
      include: {
        rolepermissions: {
          include: {
            permissions: true
          }
        }
      }
    });

    if (superAdminRole && superAdminRole.rolepermissions.length > 0) {
      console.log('✅ Super admin role has permissions assigned');
    } else {
      console.log('❌ Super admin role missing permissions');
    }

    console.log('\n🎉 RBAC System setup completed successfully!');
    console.log('\n📚 Next steps:');
    console.log('   1. Review the RBAC_README.md file for usage instructions');
    console.log('   2. Test the system with different user roles');
    console.log('   3. Customize permissions and roles as needed');
    console.log('   4. Implement protected components in your application');

  } catch (error) {
    console.error('❌ Error setting up RBAC system:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupRBAC();
}

module.exports = { setupRBAC };