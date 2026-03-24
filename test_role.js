import { isStaffRole, STAFF_ROLES, resolveRoleKey } from './src/config/roles.js';
console.log('isStaffRole:', isStaffRole('super_admin'));
console.log('STAFF_ROLES:', STAFF_ROLES);
console.log('resolveRoleKey:', resolveRoleKey('super_admin'));
