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
        primarySections: ['company', 'finance', 'website', 'marketing', 'settings'],
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
        primarySections: ['company', 'finance', 'website'],
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
        primarySections: ['settings'],
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
        landingPage: '/admin/orders',
        level: 40,
        primarySections: ['website'],
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
        primarySections: ['website'],
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
        landingPage: '/admin',
        level: 60,
        primarySections: ['finance', 'website'],
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
        landingPage: '/admin/products',
        level: 70,
        primarySections: ['website'],
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
        primarySections: ['website', 'settings'],
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
        primarySections: ['marketing', 'website'],
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
        primarySections: ['settings'],
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
        landingPage: '/admin/orders',
        level: 110,
        scope: 'team',
        primarySections: ['website'],
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
        primarySections: ['website'],
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
        primarySections: ['company', 'finance', 'settings'],
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
    operator: 'staff_operator',
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

// Sweet Secret sitemap (2026) — 5 section, зарим item "Тун удахгүй" (comingSoon)
export const ADMIN_MENU = [
    // 01. Манай компани
    {
        key: 'company-about',
        title: 'Бидний тухай',
        path: '/admin/company/about',
        section: 'company',
        requiredPermission: PERMISSIONS.VIEW_OVERVIEW,
        iconName: 'Building',
        comingSoon: true,
        keyb: 'About us · Бидний тухай',
        cardTitle: { it: 'Бидний', rg: 'тухай' },
        cardDesc: 'Sweet Secret-ийн алсын хараа, үнэт зүйл, түүх, баг бүрийн профайл. Компанийн үндсэн дотоод мэдээллийн сан.',
        bullets: [
            'Алсын хараа, эрхэм зорилго, үнэт зүйл',
            'Манай баг (org chart)',
            'Компанийн түүх, амжилт — 2016 оноос',
            'Салбарууд · Холбоо барих',
        ],
    },
    {
        key: 'company-monthly',
        title: 'Энэ сарын dashboard',
        path: '/admin/company/monthly',
        section: 'company',
        requiredPermission: PERMISSIONS.VIEW_OVERVIEW,
        iconName: 'LayoutDashboard',
        comingSoon: true,
        keyb: 'Monthly pulse · Сарын хэмнэл',
        cardTitle: { it: 'Энэ сарын', rg: 'dashboard' },
        cardDesc: 'Live мэдээлэл, KPI. Энэ сарын төрсөн өдөр, ажлын ой, онцлох үйл явдал, сургалтын хуваарь.',
        bullets: [
            'Live KPI (4 метрик)',
            'Төрсөн өдөр, ажлын ой',
            'Онцлох үйл явдал',
            'Сургалтын хуваарь',
        ],
    },

    // 02. Санхүү
    {
        key: 'sales-dashboard',
        title: 'Борлуулалтын дашбоард',
        path: '/admin',
        section: 'finance',
        requiredPermission: PERMISSIONS.VIEW_FINANCE,
        iconName: 'BarChart3',
        keyb: 'Sales · Борлуулалт',
        cardTitle: { it: 'Борлуулалтын', rg: 'дашбоард' },
        cardDesc: 'Бүх сувгийн live борлуулалтын аналитик. KPI, чиг хандлага, огнооны шүүлтүүр.',
        bullets: [
            'Суваг бүрээр — И-Март, Шангри-Ла, УИД, Хүргэлт',
            'Огноо / хугацааны шүүлтүүр',
            'KPI, чиг хандлага, heatmap',
            'Авто insights',
        ],
    },
    {
        key: 'finance-balance',
        title: 'Үлдэгдэл',
        path: '/admin/finance/balance',
        section: 'finance',
        requiredPermission: PERMISSIONS.VIEW_FINANCE,
        iconName: 'Boxes',
        comingSoon: true,
        keyb: 'Inventory · Нөөц',
        cardTitle: { it: 'Агуулахын', rg: 'үлдэгдэл' },
        cardDesc: 'Салбар болон төв агуулахын бараа материалын үлдэгдэл, хөдөлгөөн, дуусч буй SKU-ийн хяналт.',
        bullets: [
            'Салбар тус бүрийн үлдэгдэл',
            'Дуусч буй / 0 үлдэгдэлтэй SKU',
            'Ангиллаар үнэлгээ',
        ],
    },
    {
        key: 'finance-reports',
        title: 'Тайлан',
        path: '/admin/finance/reports',
        section: 'finance',
        requiredPermission: PERMISSIONS.VIEW_FINANCE,
        iconName: 'FileText',
        comingSoon: true,
        keyb: 'Reports · Тайлан',
        cardTitle: { it: 'Борлуулалтын', rg: 'тайлан' },
        cardDesc: 'Сар, улирлын санхүүгийн нэгдсэн тайлан — орлого, ашиг, төлбөр тооцоо, экспорт.',
        bullets: [
            'Сар / улирлын тайлан',
            'Орлого, ашгийн задаргаа',
            'PDF / Excel экспорт',
        ],
    },

    // 03. Сайтын удирдлага
    {
        key: 'orders',
        title: 'Хүргэлт · захиалга',
        path: '/admin/orders',
        section: 'website',
        requiredPermission: PERMISSIONS.VIEW_ORDERS,
        iconName: 'Truck',
        keyb: 'Delivery · Хүргэлт',
        cardTitle: { it: 'Хүргэлт', rg: 'захиалга' },
        cardDesc: 'Захиалгын төлөв, хүргэлтийн бүс, хугацаа болон төлбөрийн нэгдсэн хяналт.',
        bullets: [
            'Захиалгын төлөв хяналт',
            'Хүргэлтийн бүс, төлбөр',
            'Хүргэгч, маршрут',
            'Нууцлалтай сав баглаа',
        ],
    },
    {
        key: 'promotions',
        title: 'Урамшуулал · Secret Circle',
        path: '/admin/promotions',
        section: 'website',
        requiredPermission: PERMISSIONS.VIEW_MARKETING,
        iconName: 'BadgePercent',
        keyb: 'Rewards · Урамшуулал',
        cardTitle: { it: 'Урамшуулал', rg: 'Secret Circle' },
        cardDesc: 'Secret Circle лоялти — Petal · Bloom · Rose түвшин, оноо, купон, кампанит ажил.',
        bullets: [
            'Secret Circle түвшин',
            'Оноо ба купон',
            'Урамшууллын кампанит ажил',
            'Subscription box хөнгөлөлт',
        ],
    },
    {
        key: 'customers',
        title: 'Үйлчлүүлэгчийн менежмент',
        path: '/admin/customers',
        section: 'website',
        requiredPermission: PERMISSIONS.VIEW_CUSTOMERS,
        iconName: 'Users',
        comingSoon: true,
        keyb: 'Customers · Үйлчлүүлэгч',
        cardTitle: { it: 'Үйлчлүүлэгчийн', rg: 'менежмент' },
        cardDesc: 'Хэрэглэгчийн профайл, захиалгын түүх, сегментчлэл болон харилцааны бүртгэл.',
        bullets: [
            'Хэрэглэгчийн профайл, түүх',
            'Сегментчлэл',
            'Захиалгын түүх',
            'CRM, харилцаа',
        ],
    },
    {
        key: 'products',
        title: 'Барааны удирдлага',
        path: '/admin/products',
        section: 'website',
        requiredPermission: PERMISSIONS.VIEW_PRODUCTS,
        iconName: 'Package',
        keyb: 'Catalog · Бараа',
        cardTitle: { it: 'Барааны', rg: 'удирдлага' },
        cardDesc: 'Бүтээгдэхүүний каталог, ангилал, үнэ, контент болон нөөцтэй холбоо.',
        bullets: [
            'Бараа нэмэх / засах',
            'Ангилал, үнэ',
            'Зураг, тайлбар, контент',
            'Нөөцтэй холбоо',
        ],
    },

    // 04. Маркетинг
    {
        key: 'marketing-social',
        title: 'Social маркетинг',
        path: '/admin/marketing/social',
        section: 'marketing',
        requiredPermission: PERMISSIONS.VIEW_MARKETING,
        iconName: 'Megaphone',
        comingSoon: true,
        keyb: 'Social · Сошиал',
        cardTitle: { it: 'Social', rg: 'маркетинг' },
        cardDesc: 'Instagram, Facebook, TikTok сувгийн контент төлөвлөлт, кампанит ажил, influencer хамтрал.',
        bullets: [
            'Контент календарь',
            'Кампанит ажлын төлөвлөлт',
            'Influencer хамтрал',
            'Пост / сторис хуваарь',
        ],
    },
    {
        key: 'marketing-reports',
        title: 'Маркетингийн тайлан',
        path: '/admin/marketing/reports',
        section: 'marketing',
        requiredPermission: PERMISSIONS.VIEW_MARKETING,
        iconName: 'BarChart3',
        comingSoon: true,
        keyb: 'Analytics · Тайлан',
        cardTitle: { it: 'Маркетингийн', rg: 'тайлан' },
        cardDesc: 'Сувгийн гүйцэтгэл, хүрэлцээ, оролцоо болон кампанит ажлын ROI-ийн нэгдсэн тайлан.',
        bullets: [
            'Сувгийн гүйцэтгэл',
            'Хүрэлцээ, оролцоо',
            'Кампанит ажлын ROI',
            'Хөрвүүлэлтийн тайлан',
        ],
    },

    // 05. Тохиргоо
    {
        key: 'staff-roles',
        title: 'Хүний нөөц ба эрх',
        path: '/admin/staff-roles',
        section: 'settings',
        requiredPermission: PERMISSIONS.VIEW_ROLES,
        iconName: 'ShieldCheck',
        keyb: 'Team & Access · Хүний нөөц',
        cardTitle: { it: 'Хүний нөөц', rg: 'ба эрх' },
        cardDesc: 'Ажилтны бүртгэл, үүрэг, салбараар хандах эрх болон нэвтрэлтийн удирдлага.',
        bullets: [
            'Ажилтны бүртгэл, профайл',
            'Үүрэг ба эрхийн түвшин',
            'Салбараар хандалт',
            'Нэвтрэлт, аюулгүй байдал',
        ],
    },
    {
        key: 'settings-other',
        title: 'Бусад тохиргоо',
        path: '/admin/settings',
        section: 'settings',
        requiredPermission: PERMISSIONS.VIEW_SETTINGS,
        iconName: 'Settings',
        comingSoon: true,
        keyb: 'General · Бусад',
        cardTitle: { it: 'Бусад', rg: 'тохиргоо' },
        cardDesc: 'Системийн ерөнхий тохиргоо, брэнд, мэдэгдэл болон гадаад холболтууд.',
        bullets: [
            'Ерөнхий тохиргоо',
            'Брэнд, лого, өнгө',
            'Мэдэгдэл',
            'Гадаад холболт (integration)',
        ],
    },
];

export const ADMIN_MENU_SECTIONS = [
    {
        key: 'company', number: '01', label: 'Манай компани', englishLabel: 'About us',
        iconName: 'Building', description: 'Бидний тухай, сарын dashboard',
        overviewPath: '/admin/company',
        heroDesc: 'Sweet Secret-ийн дотоод мэдээлэл, баг, алсын хараа болон өдрийн амьдрал.',
        gradTitle: 'Манай', plainTitle: 'компани',
    },
    {
        key: 'finance', number: '02', label: 'Санхүү', englishLabel: 'Finance',
        iconName: 'Wallet', description: 'Борлуулалт, үлдэгдэл, тайлан',
        overviewPath: '/admin/finance',
        heroDesc: 'Борлуулалт, үлдэгдэл, санхүүгийн тайлангийн нэгдсэн төв.',
        gradTitle: 'Санхүү', plainTitle: '',
    },
    {
        key: 'website', number: '03', label: 'Сайтын удирдлага', englishLabel: 'Website',
        iconName: 'Globe', description: 'Захиалга, урамшуулал, бараа, харилцагч',
        overviewPath: '/admin/website',
        heroDesc: 'Захиалга, урамшуулал, үйлчлүүлэгч болон барааны нэгдсэн удирдлага.',
        gradTitle: 'Сайтын', plainTitle: 'удирдлага',
    },
    {
        key: 'marketing', number: '04', label: 'Маркетинг', englishLabel: 'Marketing',
        iconName: 'Megaphone', description: 'Social контент, кампанит ажил, ROI',
        overviewPath: '/admin/marketing',
        heroDesc: 'Сошиал контент, кампанит ажил болон гүйцэтгэлийн тайлангийн төв.',
        gradTitle: 'Маркетинг', plainTitle: '',
    },
    {
        key: 'settings', number: '05', label: 'Тохиргоо', englishLabel: 'Settings',
        iconName: 'Settings', description: 'Хүний нөөц ба системийн тохиргоо',
        overviewPath: '/admin/settings',
        heroDesc: 'Хүний нөөц, хандах эрх болон системийн ерөнхий тохиргоо.',
        gradTitle: 'Тохиргоо', plainTitle: '',
    },
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
    // Coming-soon item нь permission-аас үл хамаарч менюнд харагдана (placeholder).
    return ADMIN_MENU.filter((item) =>
        item.comingSoon || role.permissions.includes(item.requiredPermission)
    );
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
    const role = getRoleInfo(roleKey, rolesSource);
    return role.landingPage || '/admin';
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
