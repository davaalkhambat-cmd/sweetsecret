import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { AlertTriangle, FileSpreadsheet, Package2, RefreshCcw, Upload, Boxes, ArchiveX, CircleDollarSign } from 'lucide-react';

const STORAGE_KEY = 'inventory-dashboard-sheet';

const normalizeHeader = (value) =>
    String(value || '')
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[_-]/g, '');

const HEADER_CANDIDATES = {
    name: ['name', 'productname', 'бүтээгдэхүүн', 'бүтээгдэхүүнийнэр', 'бараанынэр', 'product'],
    sku: ['sku', 'code', 'productcode', 'barcode', 'баркод', 'код'],
    stock: ['stock', 'qty', 'quantity', 'available', 'balance', 'onhand', 'үлдэгдэл', 'тоо', 'ширхэг'],
    price: ['price', 'unitprice', 'cost', 'amount', 'өртөг', 'үнэ', 'зарахүнэ', 'нийлүүлэхүнэ'],
    category: ['category', 'ангилал', 'төрөл'],
    branch: ['branch', 'salbar', 'store', 'location', 'салбар', 'байршил'],
};

const toNumber = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number(value.replace(/[^\d.-]/g, ''));
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
};

const detectColumn = (headers, field) => {
    const candidates = HEADER_CANDIDATES[field];
    return headers.find((header) => candidates.includes(normalizeHeader(header))) || headers[0] || '';
};

const mapRows = (rows) => {
    if (!rows.length) return [];
    const headers = Object.keys(rows[0] || {});
    const nameKey = detectColumn(headers, 'name');
    const skuKey = detectColumn(headers, 'sku');
    const stockKey = detectColumn(headers, 'stock');
    const priceKey = detectColumn(headers, 'price');
    const categoryKey = detectColumn(headers, 'category');
    const branchKey = detectColumn(headers, 'branch');

    return rows
        .map((row, index) => ({
            id: `${row[skuKey] || row[nameKey] || index}`,
            name: String(row[nameKey] || `Бараа ${index + 1}`).trim(),
            sku: String(row[skuKey] || '-').trim(),
            stock: toNumber(row[stockKey]),
            unitPrice: toNumber(row[priceKey]),
            category: String(row[categoryKey] || 'Ангилагдаагүй').trim(),
            branch: String(row[branchKey] || 'Нийт үлдэгдэл').trim(),
        }))
        .filter((item) => item.name);
};

const formatMoney = (value) => `₮${Math.round(value || 0).toLocaleString()}`;

const formatSavedAt = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('mn-MN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const readStoredInventory = () => {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return { rows: [], meta: null };
        const parsed = JSON.parse(raw);
        return {
            rows: Array.isArray(parsed?.rows) ? parsed.rows : [],
            meta: parsed?.meta || null,
        };
    } catch (error) {
        console.error('Inventory storage read error:', error);
        return { rows: [], meta: null };
    }
};

const Inventory = () => {
    const stored = typeof window !== 'undefined' ? readStoredInventory() : { rows: [], meta: null };
    const [inventoryRows, setInventoryRows] = useState(stored.rows);
    const [inventoryMeta, setInventoryMeta] = useState(stored.meta);
    const [isUploading, setIsUploading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const analytics = useMemo(() => {
        const totalSku = inventoryRows.length;
        const totalUnits = inventoryRows.reduce((sum, item) => sum + item.stock, 0);
        const totalValue = inventoryRows.reduce((sum, item) => sum + item.stock * item.unitPrice, 0);
        const outOfStock = inventoryRows.filter((item) => item.stock <= 0).length;
        const lowStock = inventoryRows.filter((item) => item.stock > 0 && item.stock <= 5).length;
        const branchMap = new Map();

        inventoryRows.forEach((item) => {
            const current = branchMap.get(item.branch) || { branch: item.branch, units: 0, skuCount: 0 };
            current.units += item.stock;
            current.skuCount += 1;
            branchMap.set(item.branch, current);
        });

        const branchSummary = [...branchMap.values()].sort((a, b) => b.units - a.units).slice(0, 5);
        const lowStockRows = [...inventoryRows]
            .filter((item) => item.stock <= 5)
            .sort((a, b) => a.stock - b.stock)
            .slice(0, 8);

        return { totalSku, totalUnits, totalValue, outOfStock, lowStock, branchSummary, lowStockRows };
    }, [inventoryRows]);

    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setErrorMessage('');

        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
            const mappedRows = mapRows(rows);

            if (!mappedRows.length) {
                setErrorMessage('Файлаас унших барааны мөр олдсонгүй. Header-аа шалгана уу.');
                return;
            }

            const meta = {
                fileName: file.name,
                sheetName,
                updatedAt: new Date().toISOString(),
                rowCount: mappedRows.length,
            };

            setInventoryRows(mappedRows);
            setInventoryMeta(meta);
            window.localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    rows: mappedRows,
                    meta,
                })
            );
        } catch (error) {
            console.error('Inventory upload error:', error);
            setErrorMessage('Excel файл уншихад алдаа гарлаа. .xlsx эсвэл .csv файлаар дахин оролдоно уу.');
        } finally {
            setIsUploading(false);
            event.target.value = '';
        }
    };

    return (
        <div className="inventory-page">
            <div className="dashboard-header">
                <h1>Үлдэгдэл</h1>
                <p>Excel файлаар үлдэгдлээ оруулаад доор нь богино хяналтын самбар, эрсдэлтэй SKU-гаа шууд харна.</p>
            </div>

            <div className="section-card inventory-upload-card">
                <div className="section-heading-row">
                    <div>
                        <h3>Үлдэгдлийн файл оруулах</h3>
                        <p>`.xlsx`, `.xls`, `.csv` файлаас эхний sheet-ийг уншина</p>
                    </div>
                    {inventoryMeta ? (
                        <div className="inventory-upload-note">
                            <span>Сүүлд шинэчлэгдсэн</span>
                            <strong>{formatSavedAt(inventoryMeta.updatedAt)}</strong>
                            <small>{inventoryMeta.fileName}</small>
                        </div>
                    ) : null}
                </div>

                <label className="inventory-upload-dropzone">
                    <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                    />
                    <div className="inventory-upload-copy">
                        <div className="inventory-upload-icon">
                            <FileSpreadsheet size={22} />
                        </div>
                        <div>
                            <strong>{isUploading ? 'Файл уншиж байна...' : 'Excel файл сонгох'}</strong>
                            <p>Бүтээгдэхүүний нэр, код, үлдэгдэл, үнэ, ангилал, салбар гэсэн багануудтай байвал илүү зөв танина.</p>
                        </div>
                    </div>
                    <span className="inventory-upload-btn">
                        <Upload size={16} />
                        <span>Файл оруулах</span>
                    </span>
                </label>

                {errorMessage ? (
                    <div className="dashboard-alert">
                        <AlertTriangle size={16} />
                        <span>{errorMessage}</span>
                    </div>
                ) : null}
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon"><Package2 size={22} color="#7c3aed" /></div>
                    <div className="stat-info">
                        <span className="stat-title">Нийт SKU</span>
                        <h3 className="stat-value">{analytics.totalSku.toLocaleString()}</h3>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><Boxes size={22} color="#0f766e" /></div>
                    <div className="stat-info">
                        <span className="stat-title">Нийт үлдэгдэл</span>
                        <h3 className="stat-value">{analytics.totalUnits.toLocaleString()} ш</h3>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><CircleDollarSign size={22} color="#2563eb" /></div>
                    <div className="stat-info">
                        <span className="stat-title">Нийт үнийн дүн</span>
                        <h3 className="stat-value">{formatMoney(analytics.totalValue)}</h3>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><RefreshCcw size={22} color="#ea580c" /></div>
                    <div className="stat-info">
                        <span className="stat-title">Low stock</span>
                        <h3 className="stat-value">{analytics.lowStock.toLocaleString()}</h3>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><ArchiveX size={22} color="#dc2626" /></div>
                    <div className="stat-info">
                        <span className="stat-title">Дууссан SKU</span>
                        <h3 className="stat-value">{analytics.outOfStock.toLocaleString()}</h3>
                    </div>
                </div>
            </div>

            <div className="dashboard-sections dashboard-sections-equal inventory-dashboard-grid">
                <div className="section-card">
                    <div className="section-heading-row">
                        <div>
                            <h3>Салбарын үлдэгдлийн тойм</h3>
                            <p>Салбар бүрийн нийт ширхэг болон SKU тоо</p>
                        </div>
                    </div>
                    <div className="inventory-branch-list">
                        {analytics.branchSummary.length ? (
                            analytics.branchSummary.map((branch) => (
                                <div key={branch.branch} className="inventory-branch-row">
                                    <div>
                                        <strong>{branch.branch}</strong>
                                        <small>{branch.skuCount} SKU</small>
                                    </div>
                                    <span>{branch.units.toLocaleString()} ш</span>
                                </div>
                            ))
                        ) : (
                            <p className="empty-state-text">Файл оруулсны дараа салбарын тойм харагдана.</p>
                        )}
                    </div>
                </div>

                <div className="section-card">
                    <div className="section-heading-row">
                        <div>
                            <h3>Анхаарах SKU</h3>
                            <p>0-5 ширхэг үлдсэн барааг түрүүлж харуулна</p>
                        </div>
                    </div>
                    <div className="inventory-risk-list">
                        {analytics.lowStockRows.length ? (
                            analytics.lowStockRows.map((item) => (
                                <div key={item.id} className="inventory-risk-row">
                                    <div>
                                        <strong>{item.name}</strong>
                                        <small>{item.branch} • {item.sku}</small>
                                    </div>
                                    <span className={item.stock <= 0 ? 'danger' : 'warn'}>{item.stock} ш</span>
                                </div>
                            ))
                        ) : (
                            <p className="empty-state-text">Low stock бараа алга байна.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="section-card">
                <div className="section-heading-row">
                    <div>
                        <h3>Үлдэгдлийн жагсаалт</h3>
                        <p>Сүүлд оруулсан Excel файлаас уншсан мөрүүдийн preview</p>
                    </div>
                </div>
                <div className="inventory-table-wrap">
                    <table className="inventory-table">
                        <thead>
                            <tr>
                                <th>Бүтээгдэхүүн</th>
                                <th>Код</th>
                                <th>Салбар</th>
                                <th>Ангилал</th>
                                <th>Нэгж үнэ</th>
                                <th>Үлдэгдэл</th>
                                <th>Нийт дүн</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inventoryRows.length ? (
                                inventoryRows.map((row) => (
                                    <tr key={`${row.id}-${row.branch}`}>
                                        <td>{row.name}</td>
                                        <td>{row.sku}</td>
                                        <td>{row.branch}</td>
                                        <td>{row.category}</td>
                                        <td>{row.unitPrice ? formatMoney(row.unitPrice) : '-'}</td>
                                        <td>{row.stock}</td>
                                        <td>{row.unitPrice ? formatMoney(row.stock * row.unitPrice) : '-'}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="inventory-empty-cell">Одоогоор файл оруулаагүй байна.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Inventory;
