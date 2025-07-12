'use client';

import React from 'react';
import ProtectedComponent, { 
  RequirePermission, 
  RequireRole,
  CanManageUsers,
  CanViewUsers,
  CanManageBookings,
  CanViewBookings,
  IsAdmin,
  IsSuperAdmin,
  RequireAnyPermission,
  RequireAllPermissions
} from '@/app/_components/auth/ProtectedComponent';
import { PERMISSIONS, ROLES } from '@/app/_lib/rbac';

export default function RBACExample() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-6">RBAC System Examples</h1>
      
      {/* Basic Permission Check */}
      <section className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">Basic Permission Check</h2>
        <RequirePermission permission={PERMISSIONS.USER_CREATE}>
          <button className="bg-blue-500 text-white px-4 py-2 rounded">
            Create User
          </button>
        </RequirePermission>
      </section>

      {/* Role-based Check */}
      <section className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">Role-based Check</h2>
        <RequireRole role={ROLES.ADMIN}>
          <div className="bg-green-100 p-4 rounded">
            <h3 className="font-semibold">Admin Panel</h3>
            <p>This content is only visible to Admin users.</p>
          </div>
        </RequireRole>
      </section>

      {/* Multiple Permissions (Any) */}
      <section className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">Multiple Permissions (Any)</h2>
        <RequireAnyPermission permissions={[PERMISSIONS.USER_CREATE, PERMISSIONS.USER_UPDATE]}>
          <div className="bg-yellow-100 p-4 rounded">
            <h3 className="font-semibold">User Management</h3>
            <p>This content is visible to users who can create OR update users.</p>
            <div className="space-x-2 mt-2">
              <button className="bg-blue-500 text-white px-3 py-1 rounded text-sm">
                Create User
              </button>
              <button className="bg-green-500 text-white px-3 py-1 rounded text-sm">
                Edit User
              </button>
            </div>
          </div>
        </RequireAnyPermission>
      </section>

      {/* Multiple Permissions (All) */}
      <section className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">Multiple Permissions (All)</h2>
        <RequireAllPermissions permissions={[PERMISSIONS.USER_CREATE, PERMISSIONS.USER_UPDATE, PERMISSIONS.USER_DELETE]}>
          <div className="bg-red-100 p-4 rounded">
            <h3 className="font-semibold">Full User Management</h3>
            <p>This content is only visible to users who can create AND update AND delete users.</p>
            <div className="space-x-2 mt-2">
              <button className="bg-blue-500 text-white px-3 py-1 rounded text-sm">
                Create
              </button>
              <button className="bg-green-500 text-white px-3 py-1 rounded text-sm">
                Edit
              </button>
              <button className="bg-red-500 text-white px-3 py-1 rounded text-sm">
                Delete
              </button>
            </div>
          </div>
        </RequireAllPermissions>
      </section>

      {/* Pre-built Components */}
      <section className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">Pre-built Components</h2>
        
        <div className="space-y-3">
          <CanManageUsers>
            <div className="bg-purple-100 p-3 rounded">
              <h4 className="font-semibold">User Management Panel</h4>
              <p>Visible to users who can create users.</p>
            </div>
          </CanManageUsers>

          <CanViewUsers>
            <div className="bg-blue-100 p-3 rounded">
              <h4 className="font-semibold">User List</h4>
              <p>Visible to users who can read users.</p>
            </div>
          </CanViewUsers>

          <CanManageBookings>
            <div className="bg-green-100 p-3 rounded">
              <h4 className="font-semibold">Booking Management</h4>
              <p>Visible to users who can create bookings.</p>
            </div>
          </CanManageBookings>

          <CanViewBookings>
            <div className="bg-yellow-100 p-3 rounded">
              <h4 className="font-semibold">Booking List</h4>
              <p>Visible to users who can read bookings.</p>
            </div>
          </CanViewBookings>
        </div>
      </section>

      {/* Role-based Components */}
      <section className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">Role-based Components</h2>
        
        <div className="space-y-3">
          <IsAdmin>
            <div className="bg-orange-100 p-3 rounded">
              <h4 className="font-semibold">Admin Dashboard</h4>
              <p>This is the admin dashboard with administrative features.</p>
            </div>
          </IsAdmin>

          <IsSuperAdmin>
            <div className="bg-red-100 p-3 rounded">
              <h4 className="font-semibold">Super Admin Panel</h4>
              <p>This panel is only visible to Super Admins.</p>
              <button className="bg-red-600 text-white px-3 py-1 rounded text-sm mt-2">
                Manage Roles
              </button>
            </div>
          </IsSuperAdmin>
        </div>
      </section>

      {/* Custom Fallbacks */}
      <section className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">Custom Fallbacks</h2>
        
        <RequirePermission 
          permission={PERMISSIONS.USER_DELETE}
          fallback={
            <div className="bg-gray-100 p-3 rounded">
              <p className="text-gray-600">You don't have permission to delete users.</p>
              <p className="text-sm text-gray-500">Contact your administrator for access.</p>
            </div>
          }
        >
          <div className="bg-red-100 p-3 rounded">
            <h4 className="font-semibold">Delete User</h4>
            <p>You have permission to delete users.</p>
            <button className="bg-red-500 text-white px-3 py-1 rounded text-sm mt-2">
              Delete User
            </button>
          </div>
        </RequirePermission>
      </section>

      {/* Complex Permission Logic */}
      <section className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">Complex Permission Logic</h2>
        
        <ProtectedComponent 
          permissions={[PERMISSIONS.BOOKING_READ, PERMISSIONS.PAYMENT_READ]}
          requireAll={true}
          fallback={
            <div className="bg-gray-100 p-3 rounded">
              <p>You need both booking and payment read permissions to view this content.</p>
            </div>
          }
        >
          <div className="bg-indigo-100 p-3 rounded">
            <h4 className="font-semibold">Financial Overview</h4>
            <p>This dashboard shows booking and payment data together.</p>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="bg-white p-2 rounded">
                <h5 className="font-semibold">Bookings</h5>
                <p className="text-sm">Recent bookings data</p>
              </div>
              <div className="bg-white p-2 rounded">
                <h5 className="font-semibold">Payments</h5>
                <p className="text-sm">Recent payments data</p>
              </div>
            </div>
          </div>
        </ProtectedComponent>
      </section>

      {/* Loading State */}
      <section className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">Loading State</h2>
        
        <ProtectedComponent 
          permissions={[PERMISSIONS.SETTINGS_READ]}
          loadingFallback={
            <div className="bg-blue-100 p-3 rounded animate-pulse">
              <div className="h-4 bg-blue-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-blue-200 rounded w-1/2"></div>
            </div>
          }
        >
          <div className="bg-green-100 p-3 rounded">
            <h4 className="font-semibold">Settings Panel</h4>
            <p>This content is loaded after permission verification.</p>
          </div>
        </ProtectedComponent>
      </section>
    </div>
  );
}