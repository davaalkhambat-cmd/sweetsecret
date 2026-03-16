/**
 * Role-Based Access Control (RBAC) Configuration
 * Sweet Secret — Дотоод ажилтны эрхийн тохиргоо
 */

// ─── Permissions ────────────────────────────────────────────────
export const PERMISSIONS = {
    // Dashboard
    VIEW_DASHBOARD: 'view_dashboard',
    VIEW_FULL_ANALYTICS: 'view_full_analytics',

    // Products
    VIEW_PRODUCTS: 'view_products',
    EDIT_PRODUCTS: 'edit_products',
    DELETE_PRODUCTS: 'delete_products',

    // Orders
    VIEW_ORDERS: 'view_orders',
    EDIT_ORDERS: 'edit_orders',

    // Users
    VIEW_USERS: 'view_users',
    EDIT_USER_ROLES: 'edit_user_roles',

    // Promotions
    VIEW_PROMOTIONS: 'view_promotions',
    EDIT_PROMOTIONS: 'edit_promotions',

    // Staff / Settings
    MANAGE_STAFF_ROLES: 'manage_staff_roles',
    VIEW_SETTINGS: 'view_settings',
};

// ─── Role Definitions ───────────────────────────────────────────
export const DEFAULT_ROLES = {
    admin: {
        key: 'admin',
        label: 'Админ',
        labelEn: 'Admin',
        description: 'Бүх эрхтэй, системийн удирдлага',
        color: '#8B0000',
        icon: '🛡️',
        permissions: Object.values(PERMISSIONS), // бүх эрх
    },
    marketing_manager: {
        key: 'marketing_manager',
        label: 'Маркетингийн менежер',
        labelEn: 'Marketing Manager',
        description: 'Урамшуулал, хэрэглэгчийн мэдээлэл удирдах',
        color: '#7C3AED',
        icon: '📢',
        permissions: [
            PERMISSIONS.VIEW_DASHBOARD,
            PERMISSIONS.VIEW_FULL_ANALYTICS,
            PERMISSIONS.VIEW_USERS,
            PERMISSIONS.VIEW_PROMOTIONS,
            PERMISSIONS.EDIT_PROMOTIONS,
            PERMISSIONS.VIEW_PRODUCTS,
        ],
    },
    sales: {
        key: 'sales',
        label: 'Борлуулалтын ажилтан',
        labelEn: 'Sales',
        description: 'Захиалга, барааны мэдээлэл харах, захиалга засах',
        color: '#2563EB',
        icon: '💼',
        permissions: [
            PERMISSIONS.VIEW_DASHBOARD,
            PERMISSIONS.VIEW_PRODUCTS,
            PERMISSIONS.EDIT_PRODUCTS,
            PERMISSIONS.VIEW_ORDERS,
            PERMISSIONS.EDIT_ORDERS,
        ],
    },
    cashier: {
        key: 'cashier',
        label: 'Дэлгүүрийн худалдагч',
        labelEn: 'Cashier',
        description: 'Захиалга харах, хязгаарлагдмал dashboard',
        color: '#059669',
        icon: '🛒',
        permissions: [
            PERMISSIONS.VIEW_DASHBOARD,
            PERMISSIONS.VIEW_ORDERS,
        ],
    },
    manager: {
        key: 'manager',
        label: 'Менежер',
        labelEn: 'Manager',
        description: 'Админтай адил бүх эрхтэй',
        color: '#B45309',
        icon: '👔',
        permissions: Object.values(PERMISSIONS),
    },
    customer: {
        key: 'customer',
        label: 'Хэрэглэгч',
        labelEn: 'Customer',
        description: 'Энгийн хэрэглэгч — админ хэсэгт нэвтрэх боломжгүй',
        color: '#6B7280',
        icon: '👤',
        permissions: [],
    },
};

export const ROLES = DEFAULT_ROLES;

// Staff-д хамрагдах role-үүд — эдгээр нь admin хэсэгт нэвтрэх боломжтой
export const STAFF_ROLES = ['admin', 'manager', 'marketing_manager', 'sales', 'cashier'];

// ─── Sidebar Menu Items mapped to Permissions ───────────────────
export const ADMIN_MENU = [
    {
        key: 'dashboard',
        title: 'Хянах самбар',
        path: '/admin',
        requiredPermission: PERMISSIONS.VIEW_DASHBOARD,
        iconName: 'LayoutDashboard',
    },
    {
        key: 'delivery-dashboard',
        title: 'Хүргэлтийн хянах самбар',
        path: '/admin/delivery-dashboard',
        requiredPermission: PERMISSIONS.VIEW_DASHBOARD,
        iconName: 'Truck',
    },
    {
        key: 'products',
        title: 'Бараа бүтээгдэхүүн',
        path: '/admin/products',
        requiredPermission: PERMISSIONS.VIEW_PRODUCTS,
        iconName: 'Package',
    },
    {
        key: 'inventory',
        title: 'Үлдэгдэл',
        path: '/admin/inventory',
        requiredPermission: PERMISSIONS.VIEW_PRODUCTS,
        iconName: 'Boxes',
    },
    {
        key: 'sales-revenue',
        title: 'Борлуулалтын орлого',
        path: '/admin/sales-revenue',
        requiredPermission: PERMISSIONS.VIEW_DASHBOARD,
        iconName: 'BarChart3',
    },
    {
        key: 'orders',
        title: 'Захиалгууд',
        path: '/admin/orders',
        requiredPermission: PERMISSIONS.VIEW_ORDERS,
        iconName: 'ShoppingBag',
    },
    {
        key: 'users',
        title: 'Хэрэглэгчид',
        path: '/admin/users',
        requiredPermission: PERMISSIONS.VIEW_USERS,
        iconName: 'Users',
    },
    {
        key: 'promotions',
        title: 'Урамшуулал',
        path: '/admin/promotions',
        requiredPermission: PERMISSIONS.VIEW_PROMOTIONS,
        iconName: 'BadgePercent',
    },
    {
        key: 'staff-roles',
        title: 'Ажилтны эрх',
        path: '/admin/staff-roles',
        requiredPermission: PERMISSIONS.MANAGE_STAFF_ROLES,
        iconName: 'ShieldCheck',
    },
    {
        key: 'settings',
        title: 'Тохиргоо',
        path: '/admin/settings',
        requiredPermission: PERMISSIONS.VIEW_SETTINGS,
        iconName: 'Settings',
    },
];

// ─── Helper Functions ───────────────────────────────────────────

/**
 * Тухайн role тодорхой permission-тэй эсэхийг шалгана
 */
export const roleHasPermission = (roleKey, permission) => {
    const role = ROLES[roleKey];
    if (!role) return false;
    return role.permissions.includes(permission);
};

/**
 * Тухайн role-д зөвшөөрөгдсөн sidebar menu item-уудыг буцаана
 */
export const getMenuForRole = (roleKey, rolesSource = ROLES) => {
    const role = rolesSource[roleKey];
    if (!role) return [];
    return ADMIN_MENU.filter((item) => role.permissions.includes(item.requiredPermission));
};

/**
 * Тухайн role staff-д хамрагдаж, админ хэсэгт нэвтрэх боломжтой эсэх
 */
export const isStaffRole = (roleKey) => {
    return STAFF_ROLES.includes(roleKey);
};

/**
 * Role-ийн дэлгэрэнгүй мэдээллийг авна
 */
export const getRoleInfo = (roleKey, rolesSource = ROLES) => {
    return rolesSource[roleKey] || rolesSource.customer;
};

/**
 * Assignable role-ууд (тухайн хэрэглэгчид өгч болох role-ууд)
 * Admin зөвхөн бусад role оноож болно
 */
export const getAssignableRoles = () => {
    return Object.values(ROLES).filter((role) => role.key !== 'customer');
};
