'use client';

import React, { useState } from 'react';
import { 
  useRBAC, 
  usePermission, 
  useAnyPermission, 
  useRole,
  RequirePermission,
  RequireAnyPermission,
  RequireRole,
  RequireAdmin,
  PERMISSIONS,
  ROLES
} from '@/app/_components/RBAC';

export function RBACExample() {
  const { 
    userPermissions, 
    isLoading, 
    error,
    hasPermission,
    hasAnyPermission,
    hasRole,
    isAdmin,
    isManager,
    isStaff,
    refreshPermissions 
  } = useRBAC();

  const [activeTab, setActiveTab] = useState('overview');

  // Example permission checks using hooks
  const canCreateUsers = usePermission(PERMISSIONS.USER_CREATE);
  const canManageBookings = useAnyPermission([
    PERMISSIONS.BOOKING_CREATE,
    PERMISSIONS.BOOKING_UPDATE,
    PERMISSIONS.BOOKING_DELETE
  ]);
  const isUserRole = useRole(ROLES.USER);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-red-800 font-medium">Error Loading Permissions</h3>
          <p className="text-red-600 mt-1">{error}</p>
          <button
            onClick={refreshPermissions}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">RBAC System Demo</h1>
        <p className="text-gray-600">
          This component demonstrates the Role-Based Access Control system in action.
        </p>
      </div>

      {/* User Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">User Information</h2>
        {userPermissions ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><strong>User ID:</strong> {userPermissions.userId}</p>
              <p><strong>Role:</strong> {userPermissions.roleName}</p>
              <p><strong>Role ID:</strong> {userPermissions.roleId}</p>
            </div>
            <div>
              <p><strong>Permissions:</strong> {userPermissions.permissions.length}</p>
              <p><strong>Role Hierarchy:</strong></p>
              <ul className="text-sm text-gray-600 ml-4">
                <li>Super Admin: {isAdmin() ? '✅' : '❌'}</li>
                <li>Admin: {isAdmin() ? '✅' : '❌'}</li>
                <li>Manager: {isManager() ? '✅' : '❌'}</li>
                <li>Staff: {isStaff() ? '✅' : '❌'}</li>
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No user permissions found</p>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {['overview', 'permissions', 'components', 'api'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Permission Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900">User Management</h4>
                <ul className="text-sm text-blue-700 mt-2 space-y-1">
                  <li>Create Users: {hasPermission(PERMISSIONS.USER_CREATE) ? '✅' : '❌'}</li>
                  <li>Read Users: {hasPermission(PERMISSIONS.USER_READ) ? '✅' : '❌'}</li>
                  <li>Update Users: {hasPermission(PERMISSIONS.USER_UPDATE) ? '✅' : '❌'}</li>
                  <li>Delete Users: {hasPermission(PERMISSIONS.USER_DELETE) ? '✅' : '❌'}</li>
                </ul>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900">Booking Management</h4>
                <ul className="text-sm text-green-700 mt-2 space-y-1">
                  <li>Create Bookings: {hasPermission(PERMISSIONS.BOOKING_CREATE) ? '✅' : '❌'}</li>
                  <li>Read Bookings: {hasPermission(PERMISSIONS.BOOKING_READ) ? '✅' : '❌'}</li>
                  <li>Update Bookings: {hasPermission(PERMISSIONS.BOOKING_UPDATE) ? '✅' : '❌'}</li>
                  <li>Delete Bookings: {hasPermission(PERMISSIONS.BOOKING_DELETE) ? '✅' : '❌'}</li>
                </ul>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-medium text-purple-900">Payment Management</h4>
                <ul className="text-sm text-purple-700 mt-2 space-y-1">
                  <li>Create Payments: {hasPermission(PERMISSIONS.PAYMENT_CREATE) ? '✅' : '❌'}</li>
                  <li>Read Payments: {hasPermission(PERMISSIONS.PAYMENT_READ) ? '✅' : '❌'}</li>
                  <li>Update Payments: {hasPermission(PERMISSIONS.PAYMENT_UPDATE) ? '✅' : '❌'}</li>
                  <li>Approve Payments: {hasPermission(PERMISSIONS.PAYMENT_APPROVE) ? '✅' : '❌'}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'permissions' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">All User Permissions</h3>
            {userPermissions ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {userPermissions.permissions.map((permission) => (
                  <div
                    key={permission}
                    className="bg-gray-100 px-3 py-2 rounded text-sm font-mono"
                  >
                    {permission}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No permissions found</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'components' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Protected Components Demo</h3>
            
            <div className="space-y-4">
              {/* Single Permission Protection */}
              <RequirePermission permission={PERMISSIONS.USER_CREATE}>
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <h4 className="text-green-800 font-medium">✅ User Creation Panel</h4>
                  <p className="text-green-600 text-sm mt-1">
                    This component is only visible to users with USER_CREATE permission.
                  </p>
                  <button className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                    Create User
                  </button>
                </div>
              </RequirePermission>

              {/* Multiple Permissions Protection */}
              <RequireAnyPermission permissions={[
                PERMISSIONS.BOOKING_CREATE,
                PERMISSIONS.BOOKING_UPDATE,
                PERMISSIONS.BOOKING_DELETE
              ]}>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="text-blue-800 font-medium">✅ Booking Management Panel</h4>
                  <p className="text-blue-600 text-sm mt-1">
                    This component is visible to users with any booking management permission.
                  </p>
                  <div className="mt-2 space-x-2">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                      Create Booking
                    </button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                      Edit Booking
                    </button>
                  </div>
                </div>
              </RequireAnyPermission>

              {/* Role-based Protection */}
              <RequireRole role={ROLES.ADMIN}>
                <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                  <h4 className="text-purple-800 font-medium">✅ Admin Panel</h4>
                  <p className="text-purple-600 text-sm mt-1">
                    This component is only visible to users with ADMIN role.
                  </p>
                  <button className="mt-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
                    Admin Settings
                  </button>
                </div>
              </RequireRole>

              {/* Role Hierarchy Protection */}
              <RequireAdmin>
                <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
                  <h4 className="text-orange-800 font-medium">✅ Admin+ Panel</h4>
                  <p className="text-orange-600 text-sm mt-1">
                    This component is visible to users with ADMIN or SUPER_ADMIN role.
                  </p>
                  <button className="mt-2 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">
                    System Settings
                  </button>
                </div>
              </RequireAdmin>

              {/* Hidden Component (Inverted Logic) */}
              <RequirePermission permission={PERMISSIONS.SYSTEM_ADMIN} invert>
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                  <h4 className="text-gray-800 font-medium">ℹ️ Limited Access Notice</h4>
                  <p className="text-gray-600 text-sm mt-1">
                    This notice is only visible to users who do NOT have SYSTEM_ADMIN permission.
                  </p>
                </div>
              </RequirePermission>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'api' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">API Endpoints Demo</h3>
            <p className="text-gray-600 mb-4">
              These buttons demonstrate API calls to protected endpoints.
            </p>
            
            <div className="space-y-4">
              <RequirePermission permission={PERMISSIONS.ROLE_READ}>
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/rbac/roles');
                      const data = await response.json();
                      alert(`Roles: ${JSON.stringify(data, null, 2)}`);
                    } catch (error) {
                      alert('Error fetching roles');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Fetch Roles (requires ROLE_READ)
                </button>
              </RequirePermission>

              <RequirePermission permission={PERMISSIONS.ROLE_CREATE}>
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/rbac/roles', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          name: 'test_role',
                          description: 'Test role created via API',
                          permissions: [PERMISSIONS.USER_READ, PERMISSIONS.BOOKING_READ]
                        })
                      });
                      const data = await response.json();
                      alert(`Role created: ${JSON.stringify(data, null, 2)}`);
                    } catch (error) {
                      alert('Error creating role');
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Create Test Role (requires ROLE_CREATE)
                </button>
              </RequirePermission>

              <RequirePermission permission={PERMISSIONS.ROLE_READ}>
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/rbac/permissions');
                      const data = await response.json();
                      alert(`Permissions: ${JSON.stringify(data, null, 2)}`);
                    } catch (error) {
                      alert('Error fetching permissions');
                    }
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  Fetch Permissions (requires ROLE_READ)
                </button>
              </RequirePermission>
            </div>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="mt-6">
        <button
          onClick={refreshPermissions}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Refresh Permissions
        </button>
      </div>
    </div>
  );
}