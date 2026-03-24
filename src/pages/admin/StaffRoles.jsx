import React, { useEffect, useMemo, useState } from 'react';
import {
    collection,
    doc,
    onSnapshot,
    updateDoc,
    serverTimestamp,
    setDoc,
} from 'firebase/firestore';
import {
    Search,
    ShieldCheck,
    Users as UsersIcon,
    UserRoundCog,
    ChevronDown,
    Check,
    X,
    AlertTriangle,
    LoaderCircle,
    Eye,
    EyeOff,
    Info,
    Plus,
    Palette,
    UserPlus,
    Mail,
} from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import {
    ADMIN_MENU,
    PERMISSIONS,
    STAFF_ROLES,
    getAssignableRoles,
    resolveRoleKey,
} from '../../config/roles';

// ─── Helpers ────────────────────────────────────────────────────
const toMs = (timestamp) => {
    if (!timestamp) return 0;
    if (typeof timestamp?.toMillis === 'function') return timestamp.toMillis();
    if (timestamp instanceof Date) return timestamp.getTime();
    if (typeof timestamp === 'number') return timestamp;
    return 0;
};

const PERMISSION_GROUPS = [
    {
        title: 'Удирдлагын самбар',
        permissions: [PERMISSIONS.VIEW_OVERVIEW, PERMISSIONS.VIEW_EXECUTIVE_DASHBOARD, PERMISSIONS.VIEW_BRANCH_DASHBOARD],
    },
    {
        title: 'Худалдаа ба нөөц',
        permissions: [
            PERMISSIONS.VIEW_PRODUCTS,
            PERMISSIONS.MANAGE_PRODUCTS,
            PERMISSIONS.VIEW_INVENTORY,
            PERMISSIONS.MANAGE_INVENTORY,
        ],
    },
    {
        title: 'Захиалга ба ажиллагаа',
        permissions: [
            PERMISSIONS.VIEW_ORDERS,
            PERMISSIONS.MANAGE_ORDERS,
            PERMISSIONS.VIEW_OPERATIONS,
            PERMISSIONS.MANAGE_OPERATIONS,
        ],
    },
    {
        title: 'Харилцагч ба маркетинг',
        permissions: [
            PERMISSIONS.VIEW_CUSTOMERS,
            PERMISSIONS.MANAGE_CUSTOMERS,
            PERMISSIONS.VIEW_MARKETING,
            PERMISSIONS.MANAGE_MARKETING,
        ],
    },
    {
        title: 'Санхүү ба салбар',
        permissions: [
            PERMISSIONS.VIEW_FINANCE,
            PERMISSIONS.MANAGE_FINANCE,
            PERMISSIONS.VIEW_BRANCHES,
            PERMISSIONS.MANAGE_BRANCHES,
        ],
    },
    {
        title: 'Хүний нөөц ба систем',
        permissions: [
            PERMISSIONS.VIEW_HR,
            PERMISSIONS.MANAGE_HR,
            PERMISSIONS.VIEW_USERS,
            PERMISSIONS.MANAGE_USERS,
            PERMISSIONS.VIEW_ROLES,
            PERMISSIONS.MANAGE_ROLES,
            PERMISSIONS.VIEW_SETTINGS,
            PERMISSIONS.MANAGE_SETTINGS,
            PERMISSIONS.VIEW_AUDIT,
        ],
    },
];

const PERMISSION_LABELS = {
    [PERMISSIONS.VIEW_OVERVIEW]: 'Ерөнхий самбар харах',
    [PERMISSIONS.VIEW_EXECUTIVE_DASHBOARD]: 'Executive KPI харах',
    [PERMISSIONS.VIEW_BRANCH_DASHBOARD]: 'Салбарын самбар харах',
    [PERMISSIONS.VIEW_PRODUCTS]: 'Бараа харах',
    [PERMISSIONS.MANAGE_PRODUCTS]: 'Бараа удирдах',
    [PERMISSIONS.VIEW_INVENTORY]: 'Нөөц харах',
    [PERMISSIONS.MANAGE_INVENTORY]: 'Нөөц удирдах',
    [PERMISSIONS.VIEW_ORDERS]: 'Захиалга харах',
    [PERMISSIONS.MANAGE_ORDERS]: 'Захиалга удирдах',
    [PERMISSIONS.VIEW_OPERATIONS]: 'Ажиллагаа харах',
    [PERMISSIONS.MANAGE_OPERATIONS]: 'Ажиллагаа удирдах',
    [PERMISSIONS.VIEW_CUSTOMERS]: 'Харилцагч харах',
    [PERMISSIONS.MANAGE_CUSTOMERS]: 'Харилцагч удирдах',
    [PERMISSIONS.VIEW_MARKETING]: 'Маркетинг харах',
    [PERMISSIONS.MANAGE_MARKETING]: 'Маркетинг удирдах',
    [PERMISSIONS.VIEW_FINANCE]: 'Санхүү харах',
    [PERMISSIONS.MANAGE_FINANCE]: 'Санхүү удирдах',
    [PERMISSIONS.VIEW_BRANCHES]: 'Салбар харах',
    [PERMISSIONS.MANAGE_BRANCHES]: 'Салбар удирдах',
    [PERMISSIONS.VIEW_HR]: 'HR харах',
    [PERMISSIONS.MANAGE_HR]: 'HR удирдах',
    [PERMISSIONS.VIEW_USERS]: 'Хэрэглэгч харах',
    [PERMISSIONS.MANAGE_USERS]: 'Хэрэглэгч удирдах',
    [PERMISSIONS.VIEW_ROLES]: 'Role харах',
    [PERMISSIONS.MANAGE_ROLES]: 'Role удирдах',
    [PERMISSIONS.VIEW_SETTINGS]: 'Тохиргоо харах',
    [PERMISSIONS.MANAGE_SETTINGS]: 'Тохиргоо өөрчлөх',
    [PERMISSIONS.VIEW_AUDIT]: 'Аудит харах',
};

// ─── Main Component ─────────────────────────────────────────────
const StaffRoles = () => {
    const { user: currentUser, roles, isAdmin } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [updatingUid, setUpdatingUid] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState(null);
    const [selectedRoleInfo, setSelectedRoleInfo] = useState(null);
    const [activeTab, setActiveTab] = useState('staff'); // 'staff' | 'roles'
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [newRole, setNewRole] = useState({
        key: '',
        label: '',
        labelEn: '',
        description: '',
        color: '#2563EB',
        icon: '👤',
        permissions: []
    });
    const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
    const [newStaff, setNewStaff] = useState({
        email: '',
        displayName: '',
        role: 'staff_operator'
    });
    // Firestore listener
    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, 'users'),
            (snapshot) => {
                const rows = snapshot.docs
                    .map((docSnap) => {
                        const data = docSnap.data();
                        return {
                            id: docSnap.id,
                            displayName: data.displayName || '',
                            email: data.email || '',
                            role: resolveRoleKey(data.role || 'customer'),
                            status: String(data.status || 'active').toLowerCase(),
                            photoURL: data.photoURL || '',
                            createdAtMs: toMs(data.createdAt),
                            updatedAtMs: toMs(data.updatedAt),
                        };
                    })
                    .sort((a, b) => b.updatedAtMs - a.updatedAtMs);
                setUsers(rows);
                setErrorMessage('');
                setLoading(false);
            },
            (error) => {
                console.error('StaffRoles: users snapshot error:', error);
                setErrorMessage('Хэрэглэгчийн мэдээлэл уншихад алдаа гарлаа.');
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, []);

    // Staff users filtering
    const staffUsers = useMemo(
        () => users.filter((u) => STAFF_ROLES.includes(resolveRoleKey(u.role))),
        [users]
    );

    const filteredUsers = useMemo(() => {
        const source = activeTab === 'staff' ? staffUsers : users;
        return source.filter((u) => {
            const q = searchTerm.trim().toLowerCase();
            const matchSearch =
                !q ||
                u.displayName.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                u.id.toLowerCase().includes(q);
            const matchRole = filterRole === 'all' || u.role === filterRole;
            return matchSearch && matchRole;
        });
    }, [users, staffUsers, searchTerm, filterRole, activeTab]);

    const summary = useMemo(() => {
        const counts = {};
        STAFF_ROLES.forEach((r) => (counts[r] = 0));
        users.forEach((u) => {
            const normalizedRole = resolveRoleKey(u.role);
            if (STAFF_ROLES.includes(normalizedRole)) counts[normalizedRole] = (counts[normalizedRole] || 0) + 1;
        });
        return {
            totalStaff: staffUsers.length,
            totalUsers: users.length,
            ...counts,
        };
    }, [users, staffUsers]);

    // ─── Role Change ────────────────────────────────────────────
    const handleRoleChange = (targetUser, newRoleKey) => {
        // Prevent self-demotion
        if (targetUser.id === currentUser?.uid) {
            setErrorMessage('Та өөрийнхөө эрхийг өөрчлөх боломжгүй!');
            setTimeout(() => setErrorMessage(''), 3000);
            return;
        }

        const roleInfo = roles[newRoleKey] || roles.customer;
        setConfirmDialog({
            targetUser,
            newRole: newRoleKey,
            roleInfo,
            message: `"${targetUser.displayName || targetUser.email}" хэрэглэгчийн эрхийг "${roleInfo.label}" болгох уу?`,
        });
    };

    const confirmRoleChange = async () => {
        if (!confirmDialog) return;
        const { targetUser, newRole } = confirmDialog;
        setConfirmDialog(null);
        setUpdatingUid(targetUser.id);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const userRef = doc(db, 'users', targetUser.id);
            await updateDoc(userRef, {
                role: newRole,
                updatedAt: serverTimestamp(),
                roleUpdatedBy: currentUser?.uid || 'unknown',
                roleUpdatedAt: serverTimestamp(),
            });
            const roleInfo = roles[newRole] || roles.customer;
            setSuccessMessage(
                `✅ "${targetUser.displayName || targetUser.email}" → ${roleInfo.icon} ${roleInfo.label} болгосон`
            );
            setTimeout(() => setSuccessMessage(''), 4000);
        } catch (error) {
            console.error('Role update error:', error);
            setErrorMessage('Эрх өөрчлөхөд алдаа гарлаа. Дахин оролдоно уу.');
            setTimeout(() => setErrorMessage(''), 4000);
        } finally {
            setUpdatingUid(null);
        }
    };

    const handleStatusChange = async (targetUser, newStatus) => {
        if (targetUser.id === currentUser?.uid && newStatus !== 'active') {
            if (!window.confirm('Та өөрийнхөө төлөвийг өөрчлөхдөө итгэлтэй байна уу?')) return;
        }

        setUpdatingUid(targetUser.id);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const userRef = doc(db, 'users', targetUser.id);
            await updateDoc(userRef, {
                status: newStatus,
                updatedAt: serverTimestamp(),
            });
            setSuccessMessage(`✅ "${targetUser.displayName || targetUser.email}" төлөв "${newStatus}" боллоо.`);
            setTimeout(() => setSuccessMessage(''), 4000);
        } catch (error) {
            console.error('Status update error:', error);
            setErrorMessage('Төлөв өөрчлөхөд алдаа гарлаа.');
            setTimeout(() => setErrorMessage(''), 4000);
        } finally {
            setUpdatingUid(null);
        }
    };

    const assignableRoles = useMemo(() => getAssignableRoles(roles), [roles]);

    const handleCreateRole = async (e) => {
        e.preventDefault();
        if (!newRole.key || !newRole.label) {
            setErrorMessage('Ролийн нэр болон түлхүүр үгийг заавал оруулна уу.');
            return;
        }

        // Check if key already exists
        if (roles[newRole.key]) {
            setErrorMessage('Энэ түлхүүр үг аль хэдийн ашиглагдсан байна.');
            return;
        }

        try {
            await setDoc(doc(db, 'role_definitions', newRole.key), {
                ...newRole,
                createdAt: serverTimestamp()
            });
            setSuccessMessage(`✅ "${newRole.label}" роль амжилттай үүсгэгдлээ.`);
            setIsRoleModalOpen(false);
            setNewRole({
                key: '',
                label: '',
                labelEn: '',
                description: '',
                color: '#2563EB',
                icon: '👤',
                permissions: []
            });
            setTimeout(() => setSuccessMessage(''), 4000);
        } catch (error) {
            console.error('Error creating role:', error);
            setErrorMessage('Роль үүсгэхэд алдаа гарлаа.');
        }
    };

    const togglePermission = (perm) => {
        setNewRole(prev => {
            const current = [...prev.permissions];
            const index = current.indexOf(perm);
            if (index > -1) {
                current.splice(index, 1);
            } else {
                current.push(perm);
            }
            return { ...prev, permissions: current };
        });
    };

    const handleAddStaff = async (e) => {
        e.preventDefault();
        if (!newStaff.email || !newStaff.role) {
            setErrorMessage('И-мэйл болон эрхийг заавал оруулна уу.');
            return;
        }

        // Check if email already exists in users list
        const existing = users.find(u => u.email.toLowerCase() === newStaff.email.toLowerCase());
        if (existing) {
            setErrorMessage('Энэ и-мэйл бүртгэлтэй байна. Та жагсаалтаас эрхийг нь сольж болно.');
            return;
        }

        try {
            // Create a placeholder record in users with a temporary ID (or based on email hash)
            // Using setDoc with a custom ID so we don't create multiple docs for same email
            const tempId = `invited_${newStaff.email.replace(/[^a-z0-9]/gi, '_')}`;
            await setDoc(doc(db, 'users', tempId), {
                email: newStaff.email.toLowerCase(),
                displayName: newStaff.displayName,
                role: newStaff.role,
                status: 'invited',
                createdAt: serverTimestamp(),
                invitedBy: currentUser?.uid || 'admin'
            });

            setSuccessMessage(`✅ "${newStaff.email}" ажилтан амжилттай бүртгэгдлээ. Тэр энэ и-мэйлээрээ нэвтрэхэд эрх нь шууд идэвхжинэ.`);
            setIsAddStaffModalOpen(false);
            setNewStaff({ email: '', displayName: '', role: 'staff_operator' });
            setTimeout(() => setSuccessMessage(''), 5000);
        } catch (error) {
            console.error('Error adding staff:', error);
            setErrorMessage('Ажилтан нэмэхэд алдаа гарлаа.');
        }
    };

    return (
        <div className="admin-page staff-roles-page">
            {/* Page Header */}
            <div className="page-header">
                <div className="header-info">
                    <h1>Ажилтны эрхийн удирдлага</h1>
                    <p>Системийн дотоод ажилчдын роль, зөвшөөрлийг удирдана</p>
                </div>
                <div className="staff-header-actions">
                    {isAdmin && (
                        <button className="staff-btn-primary" onClick={() => setIsAddStaffModalOpen(true)}>
                            <UserPlus size={18} />
                            Ажилтан нэмэх
                        </button>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="staff-summary-grid">
                <div className="staff-summary-card">
                    <div className="staff-summary-icon" style={{ background: '#8B000018', color: '#8B0000' }}>
                        <ShieldCheck size={20} />
                    </div>
                    <div>
                        <span>Нийт ажилтан</span>
                        <strong>{summary.totalStaff}</strong>
                    </div>
                </div>
                <div className="staff-summary-card">
                    <div className="staff-summary-icon" style={{ background: '#2563EB18', color: '#2563EB' }}>
                        <UsersIcon size={20} />
                    </div>
                    <div>
                        <span>Нийт хэрэглэгч</span>
                        <strong>{summary.totalUsers}</strong>
                    </div>
                </div>
                <div className="staff-summary-card">
                    <div className="staff-summary-icon" style={{ background: '#7C3AED18', color: '#7C3AED' }}>
                        <UserRoundCog size={20} />
                    </div>
                    <div>
                        <span>Удирдах түвшин</span>
                        <strong>
                            {(summary.super_admin || 0) +
                                (summary.executive_ceo || 0) +
                                (summary.system_admin || 0) +
                                (summary.operation_admin || 0) +
                                (summary.branch_manager || 0)}
                        </strong>
                    </div>
                </div>
                <div className="staff-summary-card">
                    <div className="staff-summary-icon" style={{ background: '#05966918', color: '#059669' }}>
                        <ShieldCheck size={20} />
                    </div>
                    <div>
                        <span>Функцийн баг</span>
                        <strong>
                            {(summary.finance || 0) +
                                (summary.inventory_warehouse || 0) +
                                (summary.sales_customer_service || 0) +
                                (summary.marketing_crm || 0) +
                                (summary.hr_people_admin || 0) +
                                (summary.supervisor_team_lead || 0) +
                                (summary.staff_operator || 0) +
                                (summary.viewer_auditor || 0)}
                        </strong>
                    </div>
                </div>
            </div>

            {/* Tab navigation */}
            <div className="staff-tabs">
                <button
                    className={`staff-tab ${activeTab === 'staff' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('staff'); setFilterRole('all'); }}
                >
                    <ShieldCheck size={16} />
                    Ажилтнууд ({staffUsers.length})
                </button>
                <button
                    className={`staff-tab ${activeTab === 'roles' ? 'active' : ''}`}
                    onClick={() => setActiveTab('roles')}
                >
                    <Info size={16} />
                    Ролийн зөвшөөрлүүд
                </button>
                <button
                    className={`staff-tab ${activeTab === 'all' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('all'); setFilterRole('all'); }}
                >
                    <UsersIcon size={16} />
                    Бүх хэрэглэгч ({users.length})
                </button>
            </div>

            {/* Messages */}
            {errorMessage && (
                <div className="staff-alert staff-alert-error">
                    <AlertTriangle size={16} />
                    <span>{errorMessage}</span>
                    <button onClick={() => setErrorMessage('')}><X size={14} /></button>
                </div>
            )}
            {successMessage && (
                <div className="staff-alert staff-alert-success">
                    <Check size={16} />
                    <span>{successMessage}</span>
                    <button onClick={() => setSuccessMessage('')}><X size={14} /></button>
                </div>
            )}

            {/* Roles Tab Content */}
            {activeTab === 'roles' && (
                <div className="roles-overview">
                    <div className="roles-tab-header">
                        <div className="roles-tab-info">
                            <h3>Бүх ролийн жагсаалт</h3>
                            <p>Системд бүртгэлтэй нийт {Object.keys(roles).length - 1} роль байна.</p>
                        </div>
                        {isAdmin && (
                            <button className="staff-btn-primary" onClick={() => setIsRoleModalOpen(true)}>
                                <Plus size={18} />
                                Эрх нэмэх
                            </button>
                        )}
                    </div>

                    {/* Role Cards */}
                    <div className="roles-card-grid">
                        {Object.values(roles)
                            .filter((r) => r.key !== 'customer')
                            .map((role) => (
                                <div
                                    key={role.key}
                                    className={`role-info-card ${selectedRoleInfo === role.key ? 'expanded' : ''}`}
                                    onClick={() =>
                                        setSelectedRoleInfo(selectedRoleInfo === role.key ? null : role.key)
                                    }
                                >
                                    <div className="role-card-header">
                                        <div className="role-card-icon" style={{ background: role.color + '18', color: role.color }}>
                                            <span>{role.icon}</span>
                                        </div>
                                        <div className="role-card-title">
                                            <h4>{role.label}</h4>
                                            <span className="role-card-subtitle">{role.labelEn}</span>
                                        </div>
                                        <ChevronDown
                                            size={16}
                                            className={`role-card-chevron ${selectedRoleInfo === role.key ? 'rotated' : ''}`}
                                        />
                                    </div>
                                    <p className="role-card-desc">{role.description}</p>

                                    {selectedRoleInfo === role.key && (
                                        <div className="role-permissions-detail">
                                            <h5>Зөвшөөрөгдсөн эрхүүд:</h5>
                                            {PERMISSION_GROUPS.map((group) => {
                                                const hasAny = group.permissions.some((p) =>
                                                    role.permissions.includes(p)
                                                );
                                                if (!hasAny) return null;
                                                return (
                                                    <div key={group.title} className="perm-group">
                                                        <span className="perm-group-title">{group.title}</span>
                                                        <div className="perm-items">
                                                            {group.permissions.map((p) => (
                                                                <div
                                                                    key={p}
                                                                    className={`perm-item ${role.permissions.includes(p) ? 'granted' : 'denied'}`}
                                                                >
                                                                    {role.permissions.includes(p) ? (
                                                                        <Eye size={13} />
                                                                    ) : (
                                                                        <EyeOff size={13} />
                                                                    )}
                                                                    <span>{PERMISSION_LABELS[p] || p}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            <h5 style={{ marginTop: '12px' }}>Харах боломжтой хуудсууд:</h5>
                                            <div className="perm-items">
                                                {ADMIN_MENU.map((menu) => (
                                                    <div
                                                        key={menu.key}
                                                        className={`perm-item ${role.permissions.includes(menu.requiredPermission) ? 'granted' : 'denied'}`}
                                                    >
                                                        {role.permissions.includes(menu.requiredPermission) ? (
                                                            <Check size={13} />
                                                        ) : (
                                                            <X size={13} />
                                                        )}
                                                        <span>{menu.title}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                    </div>

                    {/* Comparison Table */}
                    <div className="roles-comparison">
                        <h3>Роль харьцуулалтын хүснэгт</h3>
                        <div className="table-container">
                            <table className="comparison-table">
                                <thead>
                                    <tr>
                                        <th>Эрх</th>
                                        {Object.values(roles)
                                            .filter((r) => r.key !== 'customer')
                                            .map((role) => (
                                                <th key={role.key} style={{ color: role.color }}>
                                                    {role.icon} {role.label}
                                                </th>
                                            ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.values(PERMISSIONS).map((perm) => (
                                        <tr key={perm}>
                                            <td>{PERMISSION_LABELS[perm] || perm}</td>
                                            {Object.values(roles)
                                                .filter((r) => r.key !== 'customer')
                                                .map((role) => (
                                                    <td key={`${role.key}-${perm}`}>
                                                        {role.permissions.includes(perm) ? (
                                                            <span className="perm-check">
                                                                <Check size={14} />
                                                            </span>
                                                        ) : (
                                                            <span className="perm-cross">
                                                                <X size={14} />
                                                            </span>
                                                        )}
                                                    </td>
                                                ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Staff / All Users Tab Content */}
            {activeTab !== 'roles' && (
                <>
                    {/* Filters */}
                    <div className="staff-filters">
                        <div className="search-box">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Нэр, и-мэйл хайх..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            className="form-select"
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                        >
                            <option value="all">Бүх role</option>
                            {activeTab === 'staff'
                                ? STAFF_ROLES.map((r) => (
                                    <option key={r} value={r}>
                                        {(roles[r] || { label: r }).label}
                                    </option>
                                ))
                                : Object.keys(roles).map((r) => (
                                    <option key={r} value={r}>
                                        {(roles[r] || { label: r }).label}
                                    </option>
                                ))}
                        </select>
                    </div>

                    {/* Users Table */}
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Хэрэглэгч</th>
                                    <th>И-мэйл</th>
                                    <th>Одоогийн роль</th>
                                    <th>Төлөв</th>
                                    <th>Роль өөрчлөх</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={5}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '8px 0' }}>
                                                <LoaderCircle size={16} className="spin" />
                                                <span>Уншиж байна...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredUsers.length ? (
                                    filteredUsers.map((u) => {
                                        const info = roles[resolveRoleKey(u.role)] || roles.customer;
                                        const isSelf = u.id === currentUser?.uid;
                                        const isUpdating = updatingUid === u.id;

                                        return (
                                            <tr key={u.id} className={isSelf ? 'self-row' : ''}>
                                                <td className="product-name-cell">
                                                    <div className="staff-user-cell">
                                                        <div
                                                            className="staff-avatar"
                                                            style={{ background: info.color + '18', color: info.color }}
                                                        >
                                                            {u.displayName ? u.displayName[0].toUpperCase() : '?'}
                                                        </div>
                                                        <div>
                                                            <span>{u.displayName || 'Нэр оруулаагүй'}</span>
                                                            {isSelf && <span className="self-tag">Та</span>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>{u.email || '-'}</td>
                                                <td>
                                                    <span
                                                        className="staff-role-pill"
                                                        style={{
                                                            background: info.color + '14',
                                                            color: info.color,
                                                            borderColor: info.color + '30',
                                                        }}
                                                    >
                                                        {info.icon} {info.label}
                                                    </span>
                                                </td>
                                                <td>
                                                    {!isAdmin ? (
                                                        <span className={`status-pill ${u.status === 'active' ? 'active' : 'inactive'}`}>
                                                            {u.status}
                                                        </span>
                                                    ) : (
                                                        <select
                                                            className={`form-select status-select ${u.status === 'active' ? 'active' : 'inactive'}`}
                                                            style={{
                                                                padding: '4px 8px',
                                                                fontSize: '0.8rem',
                                                                height: 'auto',
                                                                width: '100px',
                                                                borderRadius: '6px'
                                                            }}
                                                            value={u.status}
                                                            onChange={(e) => handleStatusChange(u, e.target.value)}
                                                            disabled={isUpdating}
                                                        >
                                                            <option value="active">active</option>
                                                            <option value="inactive">inactive</option>
                                                            <option value="invited">invited</option>
                                                        </select>
                                                    )}
                                                </td>
                                                <td>
                                                    {isUpdating ? (
                                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                            <LoaderCircle size={14} className="spin" />
                                                            <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>Шинэчилж байна...</span>
                                                        </div>
                                                    ) : isSelf ? (
                                                        <span style={{ fontSize: '0.82rem', color: '#9ca3af' }}>—</span>
                                                    ) : !isAdmin ? (
                                                        <span style={{ fontSize: '0.82rem', color: '#9ca3af' }}>Эрх хүрэлцэхгүй</span>
                                                    ) : (
                                                        <select
                                                            className="form-select staff-role-select"
                                                            value={u.role}
                                                            onChange={(e) => handleRoleChange(u, e.target.value)}
                                                        >
                                                            {assignableRoles.map((r) => (
                                                                <option key={r.key} value={r.key}>
                                                                    {r.icon} {r.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={5}>Илэрц олдсонгүй.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Confirm Dialog Modal */}
            {confirmDialog && (
                <div className="staff-confirm-overlay" onClick={() => setConfirmDialog(null)}>
                    <div className="staff-confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="staff-confirm-icon" style={{ background: confirmDialog.roleInfo.color + '18' }}>
                            <span style={{ fontSize: '2rem' }}>{confirmDialog.roleInfo.icon}</span>
                        </div>
                        <h3>Эрх өөрчлөх</h3>
                        <p>{confirmDialog.message}</p>
                        <div className="staff-confirm-meta">
                            <div className="staff-confirm-from">
                                <span>Одоогийн:</span>
                                <strong>{(roles[resolveRoleKey(confirmDialog.targetUser.role)] || roles.customer).label}</strong>
                            </div>
                            <span className="staff-confirm-arrow">→</span>
                            <div className="staff-confirm-to">
                                <span>Шинэ:</span>
                                <strong style={{ color: confirmDialog.roleInfo.color }}>
                                    {confirmDialog.roleInfo.label}
                                </strong>
                            </div>
                        </div>
                        <div className="staff-confirm-actions">
                            <button className="staff-btn-cancel" onClick={() => setConfirmDialog(null)}>
                                Цуцлах
                            </button>
                            <button
                                className="staff-btn-confirm"
                                style={{ background: confirmDialog.roleInfo.color }}
                                onClick={confirmRoleChange}
                            >
                                <Check size={16} />
                                Баталгаажуулах
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Role Modal */}
            {isRoleModalOpen && (
                <div className="staff-confirm-overlay" onClick={() => setIsRoleModalOpen(false)}>
                    <div className="staff-role-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3>Шинэ роль үүсгэх</h3>
                                <p>Ажилтанд оноох шинэ эрхийн түвшин тохируулна.</p>
                            </div>
                            <button className="close-btn" onClick={() => setIsRoleModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateRole}>
                            <div className="role-form-grid">
                                <div className="form-group-full">
                                    <label>Түлхүүр үг (Key) — *Заавал, Англи хэл дээр, жишээ: branch_support*</label>
                                    <input
                                        type="text"
                                        placeholder="жишээ: logistics"
                                        value={newRole.key}
                                        onChange={e => setNewRole({ ...newRole, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Ролийн нэр (Mongolian)</label>
                                    <input
                                        type="text"
                                        placeholder="жишээ: Түгээгч"
                                        value={newRole.label}
                                        onChange={e => setNewRole({ ...newRole, label: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>English Label</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Delivery"
                                        value={newRole.labelEn}
                                        onChange={e => setNewRole({ ...newRole, labelEn: e.target.value })}
                                    />
                                </div>

                                <div className="form-group-full">
                                    <label>Тайлбар</label>
                                    <textarea
                                        rows="2"
                                        placeholder="Энэ эрхтэй хэрэглэгч юу хийх боломжтой вэ..."
                                        value={newRole.description}
                                        onChange={e => setNewRole({ ...newRole, description: e.target.value })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Icon</label>
                                    <div className="icon-selector">
                                        <input
                                            type="text"
                                            value={newRole.icon}
                                            onChange={e => setNewRole({ ...newRole, icon: e.target.value })}
                                            style={{ fontSize: '1.5rem', width: '60px', textAlign: 'center' }}
                                        />
                                        <span className="hint">Emoji ашиглаж болно</span>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Өнгө (Color)</label>
                                    <div className="color-selector">
                                        <input
                                            type="color"
                                            value={newRole.color}
                                            onChange={e => setNewRole({ ...newRole, color: e.target.value })}
                                        />
                                        <input
                                            type="text"
                                            value={newRole.color}
                                            onChange={e => setNewRole({ ...newRole, color: e.target.value })}
                                            style={{ textTransform: 'uppercase' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="permissions-selector-section">
                                <h4>Зөвшөөрлүүд оноох:</h4>
                                <div className="perm-groups-grid">
                                    {PERMISSION_GROUPS.map(group => (
                                        <div key={group.title} className="perm-group-box">
                                            <span className="group-title">{group.title}</span>
                                            <div className="perm-check-list">
                                                {group.permissions.map(perm => (
                                                    <label key={perm} className="perm-label">
                                                        <input
                                                            type="checkbox"
                                                            checked={newRole.permissions.includes(perm)}
                                                            onChange={() => togglePermission(perm)}
                                                        />
                                                        <span>{PERMISSION_LABELS[perm]}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setIsRoleModalOpen(false)}>
                                    Болих
                                </button>
                                <button type="submit" className="btn-save">
                                    <ShieldCheck size={18} />
                                    Роль үүсгэх
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Add Staff Modal */}
            {isAddStaffModalOpen && (
                <div className="staff-confirm-overlay" onClick={() => setIsAddStaffModalOpen(false)}>
                    <div className="staff-role-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3>Шинэ ажилтан бүртгэх</h3>
                                <p>Ажилтны и-мэйл хаягийг оруулж эрх онооно.</p>
                            </div>
                            <button className="close-btn" onClick={() => setIsAddStaffModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAddStaff}>
                            <div className="role-form-grid">
                                <div className="form-group-full">
                                    <label>И-мэйл хаяг (Required)</label>
                                    <div className="input-with-icon">
                                        <Mail size={16} className="field-icon" />
                                        <input
                                            type="email"
                                            placeholder="staff@sweetsecret.mn"
                                            value={newStaff.email}
                                            onChange={e => setNewStaff({ ...newStaff, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <p className="hint">Ажилтан энэ и-мэйл хаягаараа нэвтрэх ёстойг анхаарна уу.</p>
                                </div>

                                <div className="form-group-full">
                                    <label>Ажилтны нэр (Full Name)</label>
                                    <input
                                        type="text"
                                        placeholder="Жишээ: Бат Болд"
                                        value={newStaff.displayName}
                                        onChange={e => setNewStaff({ ...newStaff, displayName: e.target.value })}
                                    />
                                </div>

                                <div className="form-group-full">
                                    <label>Албан тушаал / Эрх</label>
                                    <select
                                        className="form-select"
                                        value={newStaff.role}
                                        onChange={e => setNewStaff({ ...newStaff, role: e.target.value })}
                                        required
                                    >
                                        {assignableRoles.map(r => (
                                            <option key={r.key} value={r.key}>
                                                {r.icon} {r.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setIsAddStaffModalOpen(false)}>
                                    Болих
                                </button>
                                <button type="submit" className="btn-save">
                                    <UserPlus size={18} />
                                    Бүртгэх
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffRoles;
