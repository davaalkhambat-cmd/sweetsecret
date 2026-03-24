/**
 * Backoffice RBAC architecture
 * Canonical roles are mapped to module-level permissions.
 * Legacy role keys are resolved so existing users keep access.
 */

export const PERMISSIONS = {
    VIEW_OVERVIEW: 'view_overview',
    VIEW_EXECUTIVE_DASHBOARD: 'view_executive_dashboard',
    VIEW_BRANCH_DASHBOARD: 'view_branch_dashboard',

    VIEW_ORDERS: 'view_orders',
    MANAGE_ORDERS: 'manage_orders',

    VIEW_PRODUCTS: 'view_products',
    MANAGE_PRODUCTS: 'manage_products',

    VIEW_INVENTORY: 'view_inventory',
    MANAGE_INVENTORY: 'manage_inventory',

    VIEW_CUSTOMERS: 'view_customers',
    MANAGE_CUSTOMERS: 'manage_customers',

    VIEW_MARKETING: 'view_marketing',
    MANAGE_MARKETING: 'manage_marketing',

    VIEW_FINANCE: 'view_finance',
    MANAGE_FINANCE: 'manage_finance',

    VIEW_HR: 'view_hr',
    MANAGE_HR: 'manage_hr',

    VIEW_OPERATIONS: 'view_operations',
    MANAGE_OPERATIONS: 'manage_operations',

    VIEW_BRANCHES: 'view_branches',
    MANAGE_BRANCHES: 'manage_branches',

    VIEW_USERS: 'view_users',
    MANAGE_USERS: 'manage_users',

    VIEW_ROLES: 'view_roles',
    MANAGE_ROLES: 'manage_roles',

    VIEW_AUDIT: 'view_audit',

    VIEW_SETTINGS: 'view_settings',
    MANAGE_SETTINGS: 'manage_settings',
};

const ALL_ADMIN_PERMISSIONS = Object.values(PERMISSIONS);

const buildRole = ({
    key,
    label,
    labelEn,
    description,
    color,
    icon,
    permissions,
    landingPage = '/admin',
    level = 100,
    scope = 'global',
    primarySections = [],
}) => ({
    key,
    label,
    labelEn,
    description,
    color,
    icon,
    permissions,
    landingPage,
    level,
    scope,
    primarySections,
});

export const DEFAULT_ROLES = {
    super_admin: buildRole({
        key: 'super_admin',
        label: 'Супер админ',
        labelEn: 'Super Admin',
        description: 'Системийн бүх модуль, эрх, тохиргоо, аудитын бүрэн хяналт.',
        color: '#7F1D1D',
        icon: '🛡️',
        permissions: ALL_ADMIN_PERMISSIONS,
        landingPage: '/admin',
        level: 10,
        primarySections: ['overview', 'operations', 'commerce', 'insights', 'growth', 'people', 'system'],
    }),
    executive_ceo: buildRole({
        key: 'executive_ceo',
        label: 'Гүйцэтгэх удирдлага',
        labelEn: 'Executive / CEO',
        description: 'Стратегийн KPI, санхүү, салбарын нэгтгэсэн үзүүлэлт харна.',
        color: '#1D4ED8',
        icon: '👑',
        permissions: [
            PERMISSIONS.VIEW_OVERVIEW,
            PERMISSIONS.VIEW_EXECUTIVE_DASHBOARD,
            PERMISSIONS.VIEW_FINANCE,
            PERMISSIONS.VIEW_BRANCHES,
            PERMISSIONS.VIEW_OPERATIONS,
            PERMISSIONS.VIEW_CUSTOMERS,
            PERMISSIONS.VIEW_MARKETING,
            PERMISSIONS.VIEW_AUDIT,
        ],
        landingPage: '/admin',
        level: 20,
        primarySections: ['overview', 'insights', 'operations'],
    }),
    system_admin: buildRole({
        key: 'system_admin',
        label: 'Систем админ',
        labelEn: 'System Admin',
        description: 'Хэрэглэгч, роль, системийн тохиргоо, эрхийн удирдлага.',
        color: '#0F766E',
        icon: '⚙️',
        permissions: [
            PERMISSIONS.VIEW_OVERVIEW,
            PERMISSIONS.VIEW_USERS,
            PERMISSIONS.MANAGE_USERS,
            PERMISSIONS.VIEW_ROLES,
            PERMISSIONS.MANAGE_ROLES,
            PERMISSIONS.VIEW_SETTINGS,
            PERMISSIONS.MANAGE_SETTINGS,
            PERMISSIONS.VIEW_AUDIT,
        ],
        landingPage: '/admin/staff-roles',
        level: 30,
        primarySections: ['people', 'system'],
    }),
    operation_admin: buildRole({
        key: 'operation_admin',
        label: 'Үйл ажиллагааны админ',
        labelEn: 'Operation Admin',
        description: 'Захиалга, хүргэлт, урсгал ажиллагаа, гүйцэтгэлийн хяналт.',
        color: '#C2410C',
        icon: '🚚',
        permissions: [
            PERMISSIONS.VIEW_OVERVIEW,
            PERMISSIONS.VIEW_OPERATIONS,
            PERMISSIONS.MANAGE_OPERATIONS,
            PERMISSIONS.VIEW_ORDERS,
            PERMISSIONS.MANAGE_ORDERS,
            PERMISSIONS.VIEW_BRANCHES,
        ],
        landingPage: '/admin/delivery-dashboard',
        level: 40,
        primarySections: ['operations', 'commerce'],
    }),
    branch_manager: buildRole({
        key: 'branch_manager',
        label: 'Салбар / хэлтсийн менежер',
        labelEn: 'Branch / Department Manager',
        description: 'Салбарын борлуулалт, захиалга, нөөц, багийн гүйцэтгэлийг хянадаг.',
        color: '#92400E',
        icon: '🏬',
        permissions: [
            PERMISSIONS.VIEW_OVERVIEW,
            PERMISSIONS.VIEW_BRANCH_DASHBOARD,
            PERMISSIONS.VIEW_ORDERS,
            PERMISSIONS.MANAGE_ORDERS,
            PERMISSIONS.VIEW_PRODUCTS,
            PERMISSIONS.VIEW_INVENTORY,
            PERMISSIONS.MANAGE_INVENTORY,
            PERMISSIONS.VIEW_BRANCHES,
        ],
        landingPage: '/admin/orders',
        level: 50,
        scope: 'branch',
        primarySections: ['commerce', 'operations'],
    }),
    finance: buildRole({
        key: 'finance',
        label: 'Санхүү',
        labelEn: 'Finance',
        description: 'Орлого, зардал, тайлан, төлбөрийн хяналт.',
        color: '#047857',
        icon: '💰',
        permissions: [
            PERMISSIONS.VIEW_OVERVIEW,
            PERMISSIONS.VIEW_FINANCE,
            PERMISSIONS.MANAGE_FINANCE,
            PERMISSIONS.VIEW_ORDERS,
        ],
        landingPage: '/admin/sales-revenue',
        level: 60,
        primarySections: ['insights', 'commerce'],
    }),
    inventory_warehouse: buildRole({
        key: 'inventory_warehouse',
        label: 'Агуулах / нөөц',
        labelEn: 'Inventory / Warehouse',
        description: 'Нөөц, үлдэгдэл, барааны урсгал, SKU-ийн хяналт.',
        color: '#6D28D9',
        icon: '📦',
        permissions: [
            PERMISSIONS.VIEW_PRODUCTS,
            PERMISSIONS.MANAGE_PRODUCTS,
            PERMISSIONS.VIEW_INVENTORY,
            PERMISSIONS.MANAGE_INVENTORY,
        ],
        landingPage: '/admin/inventory',
        level: 70,
        primarySections: ['commerce'],
    }),
    sales_customer_service: buildRole({
        key: 'sales_customer_service',
        label: 'Борлуулалт / харилцагч',
        labelEn: 'Sales / Customer Service',
        description: 'Захиалга, хэрэглэгчийн хүсэлт, борлуулалтын үйлдэл.',
        color: '#2563EB',
        icon: '🤝',
        permissions: [
            PERMISSIONS.VIEW_OVERVIEW,
            PERMISSIONS.VIEW_ORDERS,
            PERMISSIONS.MANAGE_ORDERS,
            PERMISSIONS.VIEW_CUSTOMERS,
            PERMISSIONS.MANAGE_CUSTOMERS,
        ],
        landingPage: '/admin/orders',
        level: 80,
        primarySections: ['commerce', 'people'],
    }),
    marketing_crm: buildRole({
        key: 'marketing_crm',
        label: 'Маркетинг / CRM',
        labelEn: 'Marketing / CRM',
        description: 'Кампанит ажил, сегмент, промо, хэрэглэгчийн холбоо.',
        color: '#BE185D',
        icon: '📣',
        permissions: [
            PERMISSIONS.VIEW_OVERVIEW,
            PERMISSIONS.VIEW_MARKETING,
            PERMISSIONS.MANAGE_MARKETING,
            PERMISSIONS.VIEW_CUSTOMERS,
            PERMISSIONS.VIEW_PRODUCTS,
        ],
        landingPage: '/admin/promotions',
        level: 90,
        primarySections: ['growth', 'people'],
    }),
    hr_people_admin: buildRole({
        key: 'hr_people_admin',
        label: 'HR / People Admin',
        labelEn: 'HR / People Admin',
        description: 'Ажилтан, багийн бүтэц, хүний нөөцийн хяналт.',
        color: '#9333EA',
        icon: '🧑‍💼',
        permissions: [
            PERMISSIONS.VIEW_HR,
            PERMISSIONS.MANAGE_HR,
            PERMISSIONS.VIEW_USERS,
            PERMISSIONS.VIEW_ROLES,
        ],
        landingPage: '/admin/staff-roles',
        level: 100,
        primarySections: ['people'],
    }),
    supervisor_team_lead: buildRole({
        key: 'supervisor_team_lead',
        label: 'Ахлах / багийн удирдагч',
        labelEn: 'Supervisor / Team Lead',
        description: 'Багийн өдөр тутмын ажил, гүйцэтгэл, даалгаврын хяналт.',
        color: '#0EA5E9',
        icon: '🧭',
        permissions: [
            PERMISSIONS.VIEW_OVERVIEW,
            PERMISSIONS.VIEW_ORDERS,
            PERMISSIONS.VIEW_OPERATIONS,
            PERMISSIONS.VIEW_BRANCHES,
        ],
        landingPage: '/admin/delivery-dashboard',
        level: 110,
        scope: 'team',
        primarySections: ['operations', 'commerce'],
    }),
    staff_operator: buildRole({
        key: 'staff_operator',
        label: 'Ажилтан / оператор',
        labelEn: 'Staff / Operator',
        description: 'Өдөр тутмын гүйцэтгэлтэй холбоотой хязгаарлагдмал ажиллах эрх.',
        color: '#059669',
        icon: '🧑‍🔧',
        permissions: [
            PERMISSIONS.VIEW_ORDERS,
            PERMISSIONS.MANAGE_ORDERS,
        ],
        landingPage: '/admin/orders',
        level: 120,
        scope: 'assigned',
        primarySections: ['commerce'],
    }),
    viewer_auditor: buildRole({
        key: 'viewer_auditor',
        label: 'Хянагч / аудит',
        labelEn: 'Viewer / Auditor',
        description: 'Зөвхөн унших эрхтэй, тайлан болон аудитын зориулалттай.',
        color: '#475569',
        icon: '🔍',
        permissions: [
            PERMISSIONS.VIEW_OVERVIEW,
            PERMISSIONS.VIEW_EXECUTIVE_DASHBOARD,
            PERMISSIONS.VIEW_FINANCE,
            PERMISSIONS.VIEW_ORDERS,
            PERMISSIONS.VIEW_PRODUCTS,
            PERMISSIONS.VIEW_INVENTORY,
            PERMISSIONS.VIEW_CUSTOMERS,
            PERMISSIONS.VIEW_MARKETING,
            PERMISSIONS.VIEW_USERS,
            PERMISSIONS.VIEW_ROLES,
            PERMISSIONS.VIEW_AUDIT,
            PERMISSIONS.VIEW_SETTINGS,
        ],
        landingPage: '/admin',
        level: 130,
        primarySections: ['overview', 'insights', 'people'],
    }),
    customer: buildRole({
        key: 'customer',
        label: 'Хэрэглэгч',
        labelEn: 'Customer',
        description: 'Backoffice-д нэвтрэхгүй энгийн хэрэглэгч.',
        color: '#6B7280',
        icon: '👤',
        permissions: [],
        landingPage: '/',
        level: 999,
        scope: 'self',
    }),
};

export const LEGACY_ROLE_ALIASES = {
    admin: 'super_admin',
    manager: 'branch_manager',
    marketing_manager: 'marketing_crm',
    sales: 'sales_customer_service',
    cashier: 'staff_operator',
};

export const resolveRoleKey = (roleKey) => {
    const normalized = String(roleKey || 'customer').trim().toLowerCase();
    if (DEFAULT_ROLES[normalized]) return normalized;
    if (LEGACY_ROLE_ALIASES[normalized]) return LEGACY_ROLE_ALIASES[normalized];
    return 'customer';
};

export const ROLES = DEFAULT_ROLES;

export const STAFF_ROLES = Object.values(DEFAULT_ROLES)
    .filter((role) => role.key !== 'customer')
    .map((role) => role.key);

export const ADMIN_MENU = [
    {
        key: 'overview',
        title: 'Ерөнхий самбар',
        path: '/admin',
        section: 'overview',
        requiredPermission: PERMISSIONS.VIEW_OVERVIEW,
        iconName: 'LayoutDashboard',
    },
    {
        key: 'operations',
        title: 'Үйл ажиллагаа',
        path: '/admin/delivery-dashboard',
        section: 'operations',
        requiredPermission: PERMISSIONS.VIEW_OPERATIONS,
        iconName: 'Truck',
    },
    {
        key: 'orders',
        title: 'Захиалга',
        path: '/admin/orders',
        section: 'commerce',
        requiredPermission: PERMISSIONS.VIEW_ORDERS,
        iconName: 'ShoppingBag',
    },
    {
        key: 'products',
        title: 'Бараа бүтээгдэхүүн',
        path: '/admin/products',
        section: 'commerce',
        requiredPermission: PERMISSIONS.VIEW_PRODUCTS,
        iconName: 'Package',
    },
    {
        key: 'inventory',
        title: 'Нөөц / агуулах',
        path: '/admin/inventory',
        section: 'commerce',
        requiredPermission: PERMISSIONS.VIEW_INVENTORY,
        iconName: 'Boxes',
    },
    {
        key: 'sales-revenue',
        title: 'Санхүү / орлого',
        path: '/admin/sales-revenue',
        section: 'insights',
        requiredPermission: PERMISSIONS.VIEW_FINANCE,
        iconName: 'BarChart3',
    },
    {
        key: 'users',
        title: 'Хэрэглэгч / CRM',
        path: '/admin/users',
        section: 'people',
        requiredPermission: PERMISSIONS.VIEW_CUSTOMERS,
        iconName: 'Users',
    },
    {
        key: 'promotions',
        title: 'Маркетинг',
        path: '/admin/promotions',
        section: 'growth',
        requiredPermission: PERMISSIONS.VIEW_MARKETING,
        iconName: 'BadgePercent',
    },
    {
        key: 'staff-roles',
        title: 'Хүний нөөц / эрх',
        path: '/admin/staff-roles',
        section: 'people',
        requiredPermission: PERMISSIONS.VIEW_ROLES,
        iconName: 'ShieldCheck',
    },
    {
        key: 'settings',
        title: 'Системийн тохиргоо',
        path: '/admin/settings',
        section: 'system',
        requiredPermission: PERMISSIONS.VIEW_SETTINGS,
        iconName: 'Settings',
    },
];

export const ADMIN_MENU_SECTIONS = [
    { key: 'overview', label: 'Удирдлагын төв', description: 'Нийт төлөв ба гол үзүүлэлтүүд' },
    { key: 'operations', label: 'Ажиллагаа', description: 'Өдөр тутмын урсгал ба гүйцэтгэл' },
    { key: 'commerce', label: 'Худалдаа', description: 'Захиалга, бараа, нөөц' },
    { key: 'insights', label: 'Тайлан ба санхүү', description: 'Орлого, KPI, дүн шинжилгээ' },
    { key: 'growth', label: 'Өсөлт ба маркетинг', description: 'CRM, промо, кампанит ажил' },
    { key: 'people', label: 'Хүн ба хандалт', description: 'Хэрэглэгч, баг, эрхийн удирдлага' },
    { key: 'system', label: 'Систем', description: 'Тохиргоо ба системийн удирдлага' },
];

export const roleHasPermission = (roleKey, permission, rolesSource = ROLES) => {
    const resolvedKey = resolveRoleKey(roleKey);
    const role = rolesSource[resolvedKey];
    if (!role) return false;
    return role.permissions.includes(permission);
};

export const getMenuForRole = (roleKey, rolesSource = ROLES) => {
    const resolvedKey = resolveRoleKey(roleKey);
    const role = rolesSource[resolvedKey];
    if (!role) return [];
    return ADMIN_MENU.filter((item) => role.permissions.includes(item.requiredPermission));
};

export const isStaffRole = (roleKey) => {
    const resolved = resolveRoleKey(roleKey);
    return resolved !== 'customer';
};

export const getRoleInfo = (roleKey, rolesSource = ROLES) => {
    return rolesSource[resolveRoleKey(roleKey)] || rolesSource.customer;
};

export const getAssignableRoles = (rolesSource = ROLES) => {
    return Object.values(rolesSource)
        .filter((role) => role.key !== 'customer')
        .sort((a, b) => a.level - b.level);
};

export const getDefaultAdminPath = (roleKey, rolesSource = ROLES) => {
    const menu = getMenuForRole(roleKey, rolesSource);
    const role = getRoleInfo(roleKey, rolesSource);
    return menu[0]?.path || role.landingPage || '/admin';
};

export const getSectionStateForRole = (roleKey, rolesSource = ROLES) => {
    const role = getRoleInfo(roleKey, rolesSource);
    const menu = getMenuForRole(roleKey, rolesSource);
    const visibleSections = new Set(menu.map((item) => item.section));

    return ADMIN_MENU_SECTIONS.reduce((acc, section) => {
        if (!visibleSections.has(section.key)) {
            acc[section.key] = false;
            return acc;
        }

        const shouldOpen =
            role.primarySections.includes(section.key) ||
            menu.filter((item) => item.section === section.key).length === 1;

        acc[section.key] = shouldOpen;
        return acc;
    }, {});
};
