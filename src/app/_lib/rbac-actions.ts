'use server';

import { requirePermission, requireAnyPermission, requireRole, requireAuth } from './rbac';
import { PERMISSIONS, ROLES } from './rbac';
import type { PermissionString } from './rbac';

/**
 * Wrapper for server actions that require a specific permission
 */
export function withPermission<T extends any[], R>(
  permission: PermissionString,
  action: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    await requirePermission(permission);
    return action(...args);
  };
}

/**
 * Wrapper for server actions that require any of the specified permissions
 */
export function withAnyPermission<T extends any[], R>(
  permissions: PermissionString[],
  action: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    await requireAnyPermission(permissions);
    return action(...args);
  };
}

/**
 * Wrapper for server actions that require a specific role
 */
export function withRole<T extends any[], R>(
  role: string,
  action: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    await requireRole(role);
    return action(...args);
  };
}

/**
 * Wrapper for server actions that require authentication only
 */
export function withAuth<T extends any[], R>(
  action: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    await requireAuth();
    return action(...args);
  };
}

// Pre-built wrappers for common actions
export const withUserCreate = <T extends any[], R>(action: (...args: T) => Promise<R>) =>
  withPermission(PERMISSIONS.USER_CREATE, action);

export const withUserRead = <T extends any[], R>(action: (...args: T) => Promise<R>) =>
  withPermission(PERMISSIONS.USER_READ, action);

export const withUserUpdate = <T extends any[], R>(action: (...args: T) => Promise<R>) =>
  withPermission(PERMISSIONS.USER_UPDATE, action);

export const withUserDelete = <T extends any[], R>(action: (...args: T) => Promise<R>) =>
  withPermission(PERMISSIONS.USER_DELETE, action);

export const withBookingCreate = <T extends any[], R>(action: (...args: T) => Promise<R>) =>
  withPermission(PERMISSIONS.BOOKING_CREATE, action);

export const withBookingRead = <T extends any[], R>(action: (...args: T) => Promise<R>) =>
  withPermission(PERMISSIONS.BOOKING_READ, action);

export const withBookingUpdate = <T extends any[], R>(action: (...args: T) => Promise<R>) =>
  withPermission(PERMISSIONS.BOOKING_UPDATE, action);

export const withBookingDelete = <T extends any[], R>(action: (...args: T) => Promise<R>) =>
  withPermission(PERMISSIONS.BOOKING_DELETE, action);

export const withPaymentCreate = <T extends any[], R>(action: (...args: T) => Promise<R>) =>
  withPermission(PERMISSIONS.PAYMENT_CREATE, action);

export const withPaymentRead = <T extends any[], R>(action: (...args: T) => Promise<R>) =>
  withPermission(PERMISSIONS.PAYMENT_READ, action);

export const withPaymentUpdate = <T extends any[], R>(action: (...args: T) => Promise<R>) =>
  withPermission(PERMISSIONS.PAYMENT_UPDATE, action);

export const withPaymentDelete = <T extends any[], R>(action: (...args: T) => Promise<R>) =>
  withPermission(PERMISSIONS.PAYMENT_DELETE, action);

export const withRoomCreate = <T extends any[], R>(action: (...args: T) => Promise<R>) =>
  withPermission(PERMISSIONS.ROOM_CREATE, action);

export const withRoomRead = <T extends any[], R>(action: (...args: T) => Promise<R>) =>
  withPermission(PERMISSIONS.ROOM_READ, action);

export const withRoomUpdate = <T extends any[], R>(action: (...args: T) => Promise<R>) =>
  withPermission(PERMISSIONS.ROOM_UPDATE, action);

export const withRoomDelete = <T extends any[], R>(action: (...args: T) => Promise<R>) =>
  withPermission(PERMISSIONS.ROOM_DELETE, action);

export const withReportCreate = <T extends any[], R>(action: (...args: T) => Promise<R>) =>
  withPermission(PERMISSIONS.REPORT_CREATE, action);

export const withReportRead = <T extends any[], R>(action: (...args: T) => Promise<R>) =>
  withPermission(PERMISSIONS.REPORT_READ, action);

export const withReportUpdate = <T extends any[], R>(action: (...args: T) => Promise<R>) =>
  withPermission(PERMISSIONS.REPORT_UPDATE, action);

export const withReportDelete = <T extends any[], R>(action: (...args: T) => Promise<R>) =>
  withPermission(PERMISSIONS.REPORT_DELETE, action);

export const withSettingsRead = <T extends any[], R>(action: (...args: T) => Promise<R>) =>
  withPermission(PERMISSIONS.SETTINGS_READ, action);

export const withSettingsUpdate = <T extends any[], R>(action: (...args: T) => Promise<R>) =>
  withPermission(PERMISSIONS.SETTINGS_UPDATE, action);

export const withAdminRole = <T extends any[], R>(action: (...args: T) => Promise<R>) =>
  withRole(ROLES.ADMIN, action);

export const withSuperAdminRole = <T extends any[], R>(action: (...args: T) => Promise<R>) =>
  withRole(ROLES.SUPER_ADMIN, action);

// Wrapper for actions that require any booking permission
export const withAnyBookingPermission = <T extends any[], R>(action: (...args: T) => Promise<R>) =>
  withAnyPermission([
    PERMISSIONS.BOOKING_CREATE,
    PERMISSIONS.BOOKING_READ,
    PERMISSIONS.BOOKING_UPDATE,
    PERMISSIONS.BOOKING_DELETE,
  ], action);

// Wrapper for actions that require any payment permission
export const withAnyPaymentPermission = <T extends any[], R>(action: (...args: T) => Promise<R>) =>
  withAnyPermission([
    PERMISSIONS.PAYMENT_CREATE,
    PERMISSIONS.PAYMENT_READ,
    PERMISSIONS.PAYMENT_UPDATE,
    PERMISSIONS.PAYMENT_DELETE,
  ], action);

// Wrapper for actions that require any user management permission
export const withAnyUserPermission = <T extends any[], R>(action: (...args: T) => Promise<R>) =>
  withAnyPermission([
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_DELETE,
  ], action);