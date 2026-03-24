import React, { useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { LoaderCircle, Search, ShieldCheck, Users as UsersIcon, UserRoundCog } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { getAssignableRoles, getRoleInfo, resolveRoleKey } from '../../config/roles';

const toNumber = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const cleaned = value.replace(/[^\d.-]/g, '');
        const parsed = Number(cleaned);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
};

const toMs = (timestamp) => {
    if (!timestamp) return 0;
    if (typeof timestamp?.toMillis === 'function') return timestamp.toMillis();
    if (timestamp instanceof Date) return timestamp.getTime();
    if (typeof timestamp === 'number') return timestamp;
    return 0;
};

const formatMoney = (value) => `₮${Math.round(value || 0).toLocaleString()}`;

const normalizeTier = (rawTier) => {
    const tier = String(rawTier || '').toLowerCase();
    if (tier.includes('diamond')) return 'Diamond';
    if (tier.includes('rouge')) return 'Rouge';
    if (tier.includes('glow')) return 'Glow';
    if (tier.includes('pink')) return 'Pink';
    return '';
};

const getMembershipTier = (user) => {
    const directTier =
        normalizeTier(user.membershipTier) ||
        normalizeTier(user.loyaltyTier) ||
        normalizeTier(user.loyaltyLevel);
    if (directTier) return directTier;

    const quarterSpent = toNumber(user.quarterSpent || user.totalSpent);
    if (quarterSpent >= 1000000) return 'Diamond';
    if (quarterSpent >= 500000) return 'Rouge';
    if (quarterSpent >= 250000) return 'Glow';

    const points = toNumber(user.loyaltyPoints);
    if (points >= 7000) return 'Diamond';
    if (points >= 3500) return 'Rouge';
    if (points >= 1200) return 'Glow';
    return 'Pink';
};

const tierClassName = (tier) => {
    const normalized = String(tier || '').toLowerCase();
    if (normalized === 'diamond') return 'tier-diamond';
    if (normalized === 'rouge') return 'tier-rouge';
    if (normalized === 'glow') return 'tier-glow';
    return 'tier-pink';
};

const Users = () => {
    const { roles } = useAuth();
    const [users, setUsers] = useState([]);
    const [totalSpentByUser, setTotalSpentByUser] = useState({});
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [tierFilter, setTierFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [spentSort, setSpentSort] = useState('desc');

    React.useEffect(() => {
        const unsubscribers = [
            onSnapshot(
                collection(db, 'users'),
                (snapshot) => {
                    const rows = snapshot.docs
                        .map((docSnap) => {
                            const data = docSnap.data();
                            return {
                                id: docSnap.id,
                                displayName: data.displayName || '',
                                email: data.email || '',
                                role: resolveRoleKey(data.role),
                                status: String(data.status || 'active').toLowerCase(),
                                loyaltyPoints: toNumber(data.loyaltyPoints),
                                membershipTier: getMembershipTier(data),
                                createdAtMs: toMs(data.createdAt),
                            };
                        })
                        .sort((a, b) => b.createdAtMs - a.createdAtMs);

                    setUsers(rows);
                    setErrorMessage('');
                    setLoading(false);
                },
                (error) => {
                    console.error('Users snapshot error:', error);
                    setErrorMessage(
                        error.code === 'permission-denied'
                            ? 'Хэрэглэгчийн мэдээлэл харах эрх хүрэлцэхгүй байна.'
                            : 'Хэрэглэгчийн мэдээлэл уншихад алдаа гарлаа.'
                    );
                    setLoading(false);
                }
            ),
            onSnapshot(
                collection(db, 'orders'),
                (snapshot) => {
                    const totals = {};
                    snapshot.docs.forEach((docSnap) => {
                        const data = docSnap.data();
                        const userIdKey = String(data.userId || '').trim().toLowerCase();
                        const emailKey = String(data.email || '').trim().toLowerCase();
                        const total = toNumber(data.totalAmount ?? data.total ?? data.amount);

                        if (userIdKey) totals[userIdKey] = (totals[userIdKey] || 0) + total;
                        if (emailKey) totals[emailKey] = (totals[emailKey] || 0) + total;
                    });
                    setTotalSpentByUser(totals);
                },
                (error) => {
                    console.error('Orders snapshot error:', error);
                    setErrorMessage(
                        error.code === 'permission-denied'
                            ? 'Захиалгын мэдээлэл харах эрх хүрэлцэхгүй байна.'
                            : 'Захиалгын мэдээлэл уншихад алдаа гарлаа.'
                    );
                }
            ),
        ];

        return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
    }, []);

    const filteredUsers = useMemo(
        () =>
            users
                .filter((user) => {
                    const q = searchTerm.trim().toLowerCase();
                    const matchSearch =
                        !q ||
                        user.displayName.toLowerCase().includes(q) ||
                        user.email.toLowerCase().includes(q) ||
                        user.id.toLowerCase().includes(q);
                    const matchRole = roleFilter === 'all' || user.role === roleFilter;
                    const matchTier = tierFilter === 'all' || user.membershipTier.toLowerCase() === tierFilter;
                    const matchStatus = statusFilter === 'all' || user.status === statusFilter;
                    return matchSearch && matchRole && matchTier && matchStatus;
                })
                .sort((a, b) => {
                    const aSpent = Math.max(
                        totalSpentByUser[a.id.toLowerCase()] || 0,
                        totalSpentByUser[a.email.toLowerCase()] || 0
                    );
                    const bSpent = Math.max(
                        totalSpentByUser[b.id.toLowerCase()] || 0,
                        totalSpentByUser[b.email.toLowerCase()] || 0
                    );

                    if (spentSort === 'asc') return aSpent - bSpent;
                    return bSpent - aSpent;
                }),
        [users, searchTerm, roleFilter, tierFilter, statusFilter, totalSpentByUser, spentSort]
    );

    const summary = useMemo(() => {
        const adminCount = users.filter((user) => user.role !== 'customer').length;
        const activeCount = users.filter((user) => user.status === 'active').length;
        const avgPoints = users.length
            ? Math.round(users.reduce((sum, user) => sum + user.loyaltyPoints, 0) / users.length)
            : 0;
        return {
            total: users.length,
            active: activeCount,
            admin: adminCount,
            avgPoints,
        };
    }, [users]);

    return (
        <div className="admin-page">
            <div className="page-header">
                <div className="header-info">
                    <h1>Хэрэглэгчид</h1>
                    <p>Бүртгэл, эрх болон гишүүнчлэлийн зэрэглэлийг удирдана</p>
                </div>
            </div>

            <div className="users-summary-grid">
                <div className="users-summary-card">
                    <div className="users-summary-icon"><UsersIcon size={18} /></div>
                    <div>
                        <span>Нийт хэрэглэгч</span>
                        <strong>{summary.total.toLocaleString()}</strong>
                    </div>
                </div>
                <div className="users-summary-card">
                    <div className="users-summary-icon"><ShieldCheck size={18} /></div>
                    <div>
                        <span>Идэвхтэй хэрэглэгч</span>
                        <strong>{summary.active.toLocaleString()}</strong>
                    </div>
                </div>
                <div className="users-summary-card">
                    <div className="users-summary-icon"><UserRoundCog size={18} /></div>
                    <div>
                        <span>Backoffice эрхтэй</span>
                        <strong>{summary.admin.toLocaleString()}</strong>
                    </div>
                </div>
                <div className="users-summary-card">
                    <div className="users-summary-icon"><UsersIcon size={18} /></div>
                    <div>
                        <span>Дундаж оноо</span>
                        <strong>{summary.avgPoints.toLocaleString()} pts</strong>
                    </div>
                </div>
            </div>

            {errorMessage && (
                <div
                    style={{
                        border: '1px solid #f2c7c7',
                        background: '#fff4f4',
                        color: '#9c1f1f',
                        borderRadius: '10px',
                        padding: '10px 14px',
                    }}
                >
                    {errorMessage}
                </div>
            )}

            <div className="users-filters">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Нэр, и-мэйл, UID хайх..."
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                    />
                </div>

                <select className="form-select users-filter-select" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                    <option value="all">Бүх role</option>
                    <option value="customer">Customer</option>
                    {getAssignableRoles(roles).map((role) => (
                        <option key={role.key} value={role.key}>{role.label}</option>
                    ))}
                </select>

                <select className="form-select users-filter-select" value={tierFilter} onChange={(event) => setTierFilter(event.target.value)}>
                    <option value="all">Бүх tier</option>
                    <option value="pink">Pink</option>
                    <option value="glow">Glow</option>
                    <option value="rouge">Rouge</option>
                    <option value="diamond">Diamond</option>
                </select>

                <select className="form-select users-filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <option value="all">Бүх төлөв</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="blocked">Blocked</option>
                </select>

                <select className="form-select users-filter-select" value={spentSort} onChange={(event) => setSpentSort(event.target.value)}>
                    <option value="desc">Худалдан авалт: Ихээс бага</option>
                    <option value="asc">Худалдан авалт: Багаас их</option>
                </select>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Хэрэглэгч</th>
                            <th>И-мэйл</th>
                            <th>Role</th>
                            <th>Гишүүнчлэл</th>
                            <th>Оноо</th>
                            <th>Нийт худалдан авалт</th>
                            <th>Төлөв</th>
                            <th>Бүртгүүлсэн</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={8}>
                                    <div style={{ padding: '4px 0', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <LoaderCircle size={16} className="spin" />
                                        <span>Хэрэглэгчийн мэдээлэл уншиж байна...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredUsers.length ? (
                            filteredUsers.map((user) => {
                                const byUid = totalSpentByUser[user.id.toLowerCase()] || 0;
                                const byEmail = totalSpentByUser[user.email.toLowerCase()] || 0;
                                const totalSpent = Math.max(byUid, byEmail);
                                const roleInfo = getRoleInfo(user.role, roles);

                                return (
                                    <tr key={user.id}>
                                        <td className="product-name-cell">{user.displayName || 'Нэр оруулаагүй'}</td>
                                        <td>{user.email || '-'}</td>
                                        <td>
                                            <span className={`status-pill ${user.role === 'customer' ? 'active' : 'processing'}`}>
                                                {roleInfo.label}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`membership-pill ${tierClassName(user.membershipTier)}`}>
                                                {user.membershipTier}
                                            </span>
                                        </td>
                                        <td>{user.loyaltyPoints.toLocaleString()} pts</td>
                                        <td>{formatMoney(totalSpent)}</td>
                                        <td>
                                            <span className={`status-pill ${user.status === 'active' ? 'active' : 'inactive'}`}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td>{user.createdAtMs ? new Date(user.createdAtMs).toLocaleDateString('mn-MN') : '-'}</td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={8}>Илэрц олдсонгүй.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Users;
