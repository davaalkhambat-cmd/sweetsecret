import React, { useEffect, useMemo, useState } from 'react';
import {
    Plus,
    Search,
    Eye,
    Edit2,
    Trash2,
    Filter,
    ArrowLeft,
    Video,
    UploadCloud,
    LoaderCircle,
    Download,
    FileSpreadsheet,
    Upload,
    Package2,
    Boxes,
    CircleDollarSign,
    AlertTriangle,
} from 'lucide-react';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    serverTimestamp,
    updateDoc,
    writeBatch,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import * as XLSX from 'xlsx';
import { db, storage } from '../../firebase';

const initialFormState = {
    id: null,
    name: '',
    sku: '',
    vatCode: '',
    brand: '',
    category: [],
    webCategories: [],
    price: '',
    salePrice: '',
    stock: '',
    status: 'Active',
    youtubeUrl: '',
    shortDescription: '',
    description: '',
    image: '',
};

const PRODUCT_IMPORT_STORAGE_KEY = 'products-import-meta';
const CATEGORY_GROUPS = [
    {
        tone: 'blue',
        items: ['Skincare', 'Serums', 'Masks', 'Toners', 'Makeup'],
    },
    {
        tone: 'green',
        items: ['Cleanser', 'Cream', 'Essence', 'Sun care', 'Body care'],
    },
];
const WEB_CATEGORY_GROUPS = [
    {
        tone: 'blue',
        items: ['VALENTINE SALE', 'МАРТ 8', 'Багц', 'Эмзэг хэсгийн цайруулах бүтээгдэхүүн', 'Эмзэг хэсгийн цэвэрлэх бүтээгдэхүүн'],
    },
    {
        tone: 'green',
        items: ['Цайруулах серум', 'Цайруулах тос', 'Гелэн саван', 'Хөөсөн саван', 'Хатуу саван', 'Тоёёхон (+18)', 'Тоёёхонууд'],
    },
    {
        tone: 'blue',
        items: ['Үтрээний серум', 'Пробиотиктой саван', 'Саван', 'Чийгшүүлэгч', 'Чапгалах бүтээгдэхүүн', 'Нүүрний гоо сайхан', 'Бусад', 'Сарын тэмдэг', 'Бие арчилгаа', 'Ном'],
    },
];

const normalizeHeader = (value) =>
    String(value || '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '')
        .replace(/[_-]/g, '');

const normalizeValue = (value) => String(value || '').trim().toLowerCase();

const HEADER_MAP = {
    name: ['name', 'productname', 'бүтээгдэхүүн', 'бүтээгдэхүүнийнэр', 'нэр'],
    sku: ['sku', 'code', 'productcode', 'код', 'барааныкод', 'баркод'],
    vatCode: ['vatcode', 'vat', 'ebarimtcode', 'ebarimt', 'ноаткод', 'нөаткод', 'нөатбарааныкод'],
    brand: ['brand', 'бренд', 'brandname'],
    category: ['category', 'ангилал', 'төрөл'],
    webCategories: ['webcategories', 'webcategory', 'mastercategory', 'mastercategories', 'вебангилал', 'мастерангилал'],
    price: ['price', 'үнэ', 'sellingprice', 'unitprice'],
    salePrice: ['saleprice', 'discountprice', 'promoprice', 'хямдралтайүнэ', 'зарахүнэ'],
    stock: ['stock', 'qty', 'quantity', 'үлдэгдэл', 'тоо', 'ширхэг'],
    status: ['status', 'төлөв'],
    youtubeUrl: ['youtubeurl', 'youtube', 'video', 'videourl', 'youtubeлинк'],
    shortDescription: ['shortdescription', 'shortdesc', 'summary', 'товчтайлбар', 'богинотайлбар'],
    description: ['description', 'desc', 'detail', 'дэлгэрэнгүйтайлбар', 'тайлбар'],
    image: ['image', 'зураг', 'imageurl', 'photo', 'img'],
};

const detectColumn = (headers, field) => {
    const candidates = HEADER_MAP[field];
    return headers.find((header) => candidates.includes(normalizeHeader(header))) || '';
};

const toNumber = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number(value.replace(/[^\d.-]/g, ''));
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
};

const formatMoney = (value) => `₮${Number(value || 0).toLocaleString('en-US')}`;

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

const valueOrDash = (value) => {
    const normalized = String(value || '').trim();
    return normalized || '-';
};

const toStringValue = (value) => String(value || '').trim();

const toStringList = (value) => {
    if (Array.isArray(value)) {
        return value.map((item) => String(item || '').trim()).filter(Boolean);
    }

    return String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
};

const toDisplayList = (value) => toStringList(value).join(', ');

const mapImportedProducts = (rows) => {
    if (!rows.length) return [];

    const headers = Object.keys(rows[0] || {});
    const nameKey = detectColumn(headers, 'name');
    const skuKey = detectColumn(headers, 'sku');
    const vatCodeKey = detectColumn(headers, 'vatCode');
    const brandKey = detectColumn(headers, 'brand');
    const categoryKey = detectColumn(headers, 'category');
    const webCategoriesKey = detectColumn(headers, 'webCategories');
    const priceKey = detectColumn(headers, 'price');
    const salePriceKey = detectColumn(headers, 'salePrice');
    const stockKey = detectColumn(headers, 'stock');
    const statusKey = detectColumn(headers, 'status');
    const youtubeUrlKey = detectColumn(headers, 'youtubeUrl');
    const shortDescriptionKey = detectColumn(headers, 'shortDescription');
    const descriptionKey = detectColumn(headers, 'description');
    const imageKey = detectColumn(headers, 'image');

    return rows
        .map((row) => ({
            name: toStringValue(row[nameKey]),
            sku: toStringValue(row[skuKey]),
            vatCode: toStringValue(row[vatCodeKey]),
            brand: toStringValue(row[brandKey]),
            category: toStringList(row[categoryKey]),
            webCategories: toStringList(row[webCategoriesKey]),
            price: toNumber(row[priceKey]),
            salePrice: toNumber(row[salePriceKey]),
            stock: toNumber(row[stockKey]),
            status: toStringValue(row[statusKey] || 'Active') || 'Active',
            youtubeUrl: toStringValue(row[youtubeUrlKey]),
            shortDescription: toStringValue(row[shortDescriptionKey]),
            description: toStringValue(row[descriptionKey]),
            image: toStringValue(row[imageKey]),
        }))
        .filter((item) => item.name);
};

const Products = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [feedback, setFeedback] = useState({ type: '', message: '' });
    const [newProduct, setNewProduct] = useState(initialFormState);
    const [viewingProduct, setViewingProduct] = useState(null);
    const [selectedImageFile, setSelectedImageFile] = useState(null);
    const [previewImageUrl, setPreviewImageUrl] = useState('');
    const [activeTab, setActiveTab] = useState('info');
    const [importMeta, setImportMeta] = useState(() => {
        try {
            if (typeof window === 'undefined') return null;
            const raw = window.localStorage.getItem(PRODUCT_IMPORT_STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    });

    useEffect(
        () => () => {
            if (previewImageUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewImageUrl);
            }
        },
        [previewImageUrl]
    );

    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, 'products'),
            (snapshot) => {
                const rows = snapshot.docs
                    .map((productDoc) => {
                        const data = productDoc.data();
                        return {
                            id: productDoc.id,
                            name: data.name || '',
                            sku: data.sku || '',
                            vatCode: data.vatCode || '',
                            brand: data.brand || '',
                            category: toStringList(data.category),
                            webCategories: toStringList(data.webCategories),
                            price: Number(data.price || 0),
                            salePrice: Number(data.salePrice || 0),
                            stock: Number(data.stock || 0),
                            status: data.status || 'Active',
                            youtubeUrl: data.youtubeUrl || '',
                            shortDescription: data.shortDescription || '',
                            description: data.description || '',
                            image: data.image || '',
                            updatedAtMs: data.updatedAt?.toMillis?.() || 0,
                        };
                    })
                    .sort((a, b) => b.updatedAtMs - a.updatedAtMs);

                setProducts(rows);
                setLoading(false);
                setFeedback((prev) => (prev.type === 'error' ? { type: '', message: '' } : prev));
            },
            (error) => {
                console.error('Products snapshot error:', error);
                setFeedback({
                    type: 'error',
                    message:
                        error.code === 'permission-denied'
                            ? 'Бараа удирдах эрх хүрэлцэхгүй байна. Админ эрхээ шалгана уу.'
                            : 'Барааны мэдээлэл татахад алдаа гарлаа.',
                });
                setLoading(false);
            }
        );

        return unsubscribe;
    }, []);

    const analytics = useMemo(() => {
        const totalProducts = products.length;
        const totalUnits = products.reduce((sum, item) => sum + item.stock, 0);
        const totalValue = products.reduce((sum, item) => sum + item.stock * item.price, 0);
        const activeProducts = products.filter((item) => item.status === 'Active').length;
        const lowStock = products.filter((item) => item.stock > 0 && item.stock <= 5).length;

        return { totalProducts, totalUnits, totalValue, activeProducts, lowStock };
    }, [products]);

    const filteredProducts = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();
        if (!keyword) return products;

        return products.filter((product) =>
            [product.name, product.sku, toDisplayList(product.category), product.status].some((value) =>
                String(value || '')
                    .toLowerCase()
                    .includes(keyword)
            )
        );
    }, [products, searchTerm]);

    const persistImportMeta = (meta) => {
        setImportMeta(meta);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(PRODUCT_IMPORT_STORAGE_KEY, JSON.stringify(meta));
        }
    };

    const resetMessages = () => setFeedback({ type: '', message: '' });

    const handleOpenModal = (product = null) => {
        resetMessages();

        if (product) {
            setNewProduct({
                id: product.id,
                name: product.name,
                sku: product.sku || '',
                vatCode: product.vatCode || '',
                brand: product.brand || '',
                category: toStringList(product.category),
                webCategories: toStringList(product.webCategories),
                price: String(product.price),
                salePrice: product.salePrice ? String(product.salePrice) : '',
                stock: String(product.stock),
                status: product.status,
                youtubeUrl: product.youtubeUrl || '',
                shortDescription: product.shortDescription || '',
                description: product.description || '',
                image: product.image || '',
            });
            setPreviewImageUrl(product.image || '');
        } else {
            setNewProduct(initialFormState);
            setPreviewImageUrl('');
        }

        setSelectedImageFile(null);
        setActiveTab('info');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setNewProduct(initialFormState);
        setSelectedImageFile(null);
        setPreviewImageUrl('');
        setIsSaving(false);
        setActiveTab('info');
    };

    const handleOpenViewModal = (product) => {
        setViewingProduct(product);
    };

    const handleCloseViewModal = () => {
        setViewingProduct(null);
    };

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setNewProduct((prev) => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setFeedback({ type: 'error', message: 'Зөвхөн зураг файл оруулна уу.' });
            return;
        }

        if (file.size > 6 * 1024 * 1024) {
            setFeedback({ type: 'error', message: 'Зургийн хэмжээ 6MB-аас бага байх ёстой.' });
            return;
        }

        setSelectedImageFile(file);
        setPreviewImageUrl(URL.createObjectURL(file));
        resetMessages();
    };

    const handleToggleWebCategory = (category) => {
        setNewProduct((prev) => {
            const selected = new Set(prev.webCategories || []);
            if (selected.has(category)) selected.delete(category);
            else selected.add(category);

            return { ...prev, webCategories: Array.from(selected) };
        });
    };

    const handleClearWebCategories = () => {
        setNewProduct((prev) => ({ ...prev, webCategories: [] }));
    };

    const handleToggleCategory = (category) => {
        setNewProduct((prev) => {
            const selected = new Set(prev.category || []);
            if (selected.has(category)) selected.delete(category);
            else selected.add(category);

            return { ...prev, category: Array.from(selected) };
        });
    };

    const handleClearCategories = () => {
        setNewProduct((prev) => ({ ...prev, category: [] }));
    };

    const validateForm = () => {
        if (!newProduct.name.trim()) {
            setFeedback({ type: 'error', message: 'Бүтээгдэхүүний нэр заавал оруулна.' });
            return false;
        }

        const price = Number(newProduct.price);
        const stock = Number(newProduct.stock);

        if (!Number.isFinite(price) || price < 0) {
            setFeedback({ type: 'error', message: 'Үнэ зөв тоо байх ёстой.' });
            return false;
        }

        if (!Number.isFinite(stock) || stock < 0) {
            setFeedback({ type: 'error', message: 'Үлдэгдэл зөв тоо байх ёстой.' });
            return false;
        }

        return true;
    };

    const handleSaveProduct = async (event) => {
        event.preventDefault();
        if (!validateForm()) return;

        setIsSaving(true);
        resetMessages();

        try {
            let imageUrl = newProduct.image || '';

            if (selectedImageFile) {
                const extension = selectedImageFile.name.split('.').pop() || 'jpg';
                const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
                const imageRef = ref(storage, `products/${fileName}`);
                await uploadBytes(imageRef, selectedImageFile, { contentType: selectedImageFile.type });
                imageUrl = await getDownloadURL(imageRef);
            }

            const payload = {
                name: newProduct.name.trim(),
                sku: newProduct.sku.trim(),
                vatCode: newProduct.vatCode.trim(),
                brand: newProduct.brand.trim(),
                category: newProduct.category || [],
                webCategories: newProduct.webCategories || [],
                price: Number(newProduct.price),
                salePrice: Number(newProduct.salePrice || 0),
                stock: Number(newProduct.stock),
                status: newProduct.status,
                youtubeUrl: newProduct.youtubeUrl.trim(),
                shortDescription: newProduct.shortDescription.trim(),
                description: newProduct.description.trim(),
                image: imageUrl,
                updatedAt: serverTimestamp(),
            };

            if (newProduct.id) {
                await updateDoc(doc(db, 'products', newProduct.id), payload);
            } else {
                await addDoc(collection(db, 'products'), {
                    ...payload,
                    createdAt: serverTimestamp(),
                });
            }

            handleCloseModal();
            setFeedback({
                type: 'success',
                message: newProduct.id ? 'Бүтээгдэхүүний мэдээлэл шинэчлэгдлээ.' : 'Шинэ бүтээгдэхүүн нэмэгдлээ.',
            });
        } catch (error) {
            console.error('Save product error:', error);
            setFeedback({
                type: 'error',
                message:
                    error.code === 'permission-denied'
                        ? 'Бараа хадгалах эрх хүрэлцэхгүй байна. Админ эрхээ шалгана уу.'
                        : error.code === 'storage/unauthorized'
                          ? 'Зураг upload хийх эрх хүрэлцэхгүй байна. Админ эрхээ шалгана уу.'
                          : 'Бараа хадгалах үед алдаа гарлаа.',
            });
            setIsSaving(false);
        }
    };

    const handleDeleteProduct = async (id) => {
        if (!window.confirm('Та энэ барааг устгахдаа итгэлтэй байна уу?')) return;

        try {
            await deleteDoc(doc(db, 'products', id));
            setFeedback({ type: 'success', message: 'Бүтээгдэхүүн устгагдлаа.' });
        } catch (error) {
            console.error('Delete product error:', error);
            setFeedback({
                type: 'error',
                message:
                    error.code === 'permission-denied'
                        ? 'Бараа устгах эрх хүрэлцэхгүй байна. Админ эрхээ шалгана уу.'
                        : 'Бараа устгах үед алдаа гарлаа.',
            });
        }
    };

    const handleTemplateDownload = () => {
        const templateRows = [
            {
                name: 'Let’s Inclear Gel 10pcs',
                sku: 'INC-10',
                vatCode: 'VAT-001',
                brand: 'Lets',
                category: 'Skincare',
                webCategories: 'Цайруулах серум, Бие арчилгаа',
                price: 450000,
                salePrice: 399000,
                stock: 12,
                status: 'Active',
                youtubeUrl: 'https://www.youtube.com/watch?v=example',
                shortDescription: 'Товч тайлбар энд бичнэ.',
                description: 'Дэлгэрэнгүй тайлбар энд бичнэ.',
                image: 'https://example.com/product-image.jpg',
            },
        ];

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(templateRows);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
        XLSX.writeFile(workbook, 'products-template.xlsx');
    };

    const handleExportProducts = () => {
        const rows = products.map((product) => ({
            name: product.name,
            sku: product.sku,
            vatCode: product.vatCode || '',
            brand: product.brand || '',
            category: toDisplayList(product.category),
            webCategories: toDisplayList(product.webCategories),
            price: product.price,
            salePrice: product.salePrice || 0,
            stock: product.stock,
            status: product.status,
            youtubeUrl: product.youtubeUrl || '',
            shortDescription: product.shortDescription || '',
            description: product.description || '',
            image: product.image,
        }));

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
        XLSX.writeFile(workbook, `products-${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const handleImportFile = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        resetMessages();

        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const firstSheet = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheet];
            const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
            const mappedRows = mapImportedProducts(rows);

            if (!mappedRows.length) {
                throw new Error('Excel файлаас танигдсан бүтээгдэхүүний мөр олдсонгүй.');
            }

            const existingBySku = new Map(
                products.filter((item) => item.sku).map((item) => [normalizeValue(item.sku), item])
            );
            const existingByName = new Map(products.map((item) => [normalizeValue(item.name), item]));

            const batch = writeBatch(db);
            let created = 0;
            let updated = 0;

            mappedRows.forEach((item) => {
                const match =
                    (item.sku && existingBySku.get(normalizeValue(item.sku))) ||
                    existingByName.get(normalizeValue(item.name));

                const payload = {
                    name: item.name,
                    sku: item.sku,
                    vatCode: item.vatCode,
                    brand: item.brand,
                    category: item.category,
                    webCategories: item.webCategories,
                    price: item.price,
                    salePrice: item.salePrice,
                    stock: item.stock,
                    status: item.status,
                    youtubeUrl: item.youtubeUrl,
                    shortDescription: item.shortDescription,
                    description: item.description,
                    image: item.image,
                    updatedAt: serverTimestamp(),
                };

                if (match) {
                    batch.update(doc(db, 'products', match.id), payload);
                    updated += 1;
                } else {
                    const newRef = doc(collection(db, 'products'));
                    batch.set(newRef, {
                        ...payload,
                        createdAt: serverTimestamp(),
                    });
                    created += 1;
                }
            });

            await batch.commit();

            const meta = {
                fileName: file.name,
                rowCount: mappedRows.length,
                created,
                updated,
                updatedAt: new Date().toISOString(),
            };

            persistImportMeta(meta);
            setFeedback({
                type: 'success',
                message: `${mappedRows.length} мөр импорт хийлээ. ${created} шинэ, ${updated} шинэчлэлт.`,
            });
        } catch (error) {
            console.error('Import products error:', error);
            setFeedback({
                type: 'error',
                message: error.message || 'Excel файл импортлох үед алдаа гарлаа.',
            });
        } finally {
            setIsImporting(false);
            event.target.value = '';
        }
    };

    return (
        <div className="inventory-page">
            <div className="page-header">
                <div className="header-info">
                    <h1>Бараа бүтээгдэхүүн</h1>
                    <p>Excel файлаар бараагаа бөөнөөр оруулж, одоогийн листээ нэг товшоод татах боломжтой.</p>
                </div>
                <button className="add-btn" onClick={() => handleOpenModal()} type="button">
                    <Plus size={18} />
                    <span>Шинэ бараа нэмэх</span>
                </button>
            </div>

            <div className="section-card inventory-upload-card">
                <div className="section-heading-row">
                    <div>
                        <h3>Excel import / export</h3>
                        <p>`.xlsx`, `.xls`, `.csv` файлаас эхний sheet-ийг уншиж SKU эсвэл нэрээр нь update хийнэ.</p>
                    </div>
                    {importMeta ? (
                        <div className="inventory-upload-note">
                            <span>Сүүлд шинэчлэгдсэн</span>
                            <strong>{formatSavedAt(importMeta.updatedAt)}</strong>
                            <small>
                                {importMeta.fileName} • {importMeta.rowCount} мөр
                            </small>
                        </div>
                    ) : null}
                </div>

                <label className="inventory-upload-dropzone">
                    <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleImportFile}
                        disabled={isImporting}
                    />
                    <div className="inventory-upload-copy">
                        <div className="inventory-upload-icon">
                            <FileSpreadsheet size={22} />
                        </div>
                        <div>
                            <strong>{isImporting ? 'Excel файл уншиж байна...' : 'Excel файл сонгох'}</strong>
                            <p>Нэр, SKU, НӨАТ код, бренд, ангилал, веб ангилал, үнэ, хямдралтай үнэ, үлдэгдэл, төлөв, YouTube, тайлбар, зураг зэрэг бүх баганыг танина.</p>
                        </div>
                    </div>
                    <span className="inventory-upload-btn">
                        <Upload size={16} />
                        <span>Файл оруулах</span>
                    </span>
                </label>

                <div className="product-import-actions">
                    <button className="product-import-btn product-import-btn-template" type="button" onClick={handleTemplateDownload}>
                        <FileSpreadsheet size={16} />
                        <span>Загвар Excel татах</span>
                    </button>
                    <button className="product-import-btn product-import-btn-export" type="button" onClick={handleExportProducts}>
                        <Download size={16} />
                        <span>Одоогийн бараа татах</span>
                    </button>
                </div>

                {feedback.message ? (
                    <div className={`dashboard-alert ${feedback.type === 'error' ? 'dashboard-alert-error' : ''}`}>
                        {feedback.type === 'error' ? <AlertTriangle size={16} /> : <FileSpreadsheet size={16} />}
                        <span>{feedback.message}</span>
                    </div>
                ) : null}
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">
                        <Package2 size={22} color="#7c3aed" />
                    </div>
                    <div className="stat-info">
                        <span className="stat-title">Нийт бүтээгдэхүүн</span>
                        <h3 className="stat-value">{analytics.totalProducts.toLocaleString()}</h3>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">
                        <Boxes size={22} color="#0f766e" />
                    </div>
                    <div className="stat-info">
                        <span className="stat-title">Нийт үлдэгдэл</span>
                        <h3 className="stat-value">{analytics.totalUnits.toLocaleString()} ш</h3>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">
                        <CircleDollarSign size={22} color="#2563eb" />
                    </div>
                    <div className="stat-info">
                        <span className="stat-title">Нийт үнийн дүн</span>
                        <h3 className="stat-value">{formatMoney(analytics.totalValue)}</h3>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">
                        <Boxes size={22} color="#ea580c" />
                    </div>
                    <div className="stat-info">
                        <span className="stat-title">Active SKU</span>
                        <h3 className="stat-value">{analytics.activeProducts.toLocaleString()}</h3>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">
                        <AlertTriangle size={22} color="#dc2626" />
                    </div>
                    <div className="stat-info">
                        <span className="stat-title">Low stock</span>
                        <h3 className="stat-value">{analytics.lowStock.toLocaleString()}</h3>
                    </div>
                </div>
            </div>

            <div className="table-filters">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Нэр, SKU, ангиллаар хайх..."
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                    />
                </div>
                <button className="filter-btn" type="button">
                    <Filter size={18} />
                    <span>Шүүлтүүр</span>
                </button>
            </div>

            <div className="table-container">
                {loading ? (
                    <div style={{ padding: '24px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <LoaderCircle size={18} className="spin" />
                        <span>Барааны мэдээлэл уншиж байна...</span>
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Бүтээгдэхүүн</th>
                                <th>SKU</th>
                                <th>Ангилал</th>
                                <th>Үнэ</th>
                                <th>Үлдэгдэл</th>
                                <th>Төлөв</th>
                                <th>Үйлдэл</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.length ? (
                                filteredProducts.map((product, index) => (
                                    <tr key={product.id}>
                                        <td>#{index + 1}</td>
                                        <td>
                                            <div className="product-table-item">
                                                {product.image ? (
                                                    <img src={product.image} alt={product.name} className="product-table-thumb" />
                                                ) : (
                                                    <div className="product-table-thumb product-table-thumb-fallback">
                                                        {product.name.slice(0, 1).toUpperCase()}
                                                    </div>
                                                )}
                                                <div className="product-table-copy">
                                                    <strong>{product.name}</strong>
                                                    <small>{product.image ? 'Зурагтай' : 'Зураггүй'}</small>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{product.sku || '-'}</td>
                                        <td>{toDisplayList(product.category) || '-'}</td>
                                        <td>{formatMoney(product.price)}</td>
                                        <td>{product.stock.toLocaleString()} ш</td>
                                        <td>
                                            <span className={`status-pill ${product.status === 'Active' ? 'active' : 'inactive'}`}>
                                                {product.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="actions-cell">
                                                <button
                                                    title="Дэлгэрэнгүй харах"
                                                    className="action-icon view"
                                                    type="button"
                                                    onClick={() => handleOpenViewModal(product)}
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    title="Засах"
                                                    className="action-icon edit"
                                                    type="button"
                                                    onClick={() => handleOpenModal(product)}
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    title="Устгах"
                                                    className="action-icon delete"
                                                    type="button"
                                                    onClick={() => handleDeleteProduct(product.id)}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '24px' }}>
                                        Илэрц олдсонгүй
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {isModalOpen ? (
                <div className="modal-overlay" style={{ alignItems: 'flex-start', overflowY: 'auto', paddingTop: '2rem' }}>
                    <form
                        className="add-product-container animate-fade-in"
                        style={{ width: '95%', maxWidth: '980px', background: 'transparent' }}
                        onSubmit={handleSaveProduct}
                    >
                        <div className="add-product-header">
                            <div className="header-left">
                                <button className="back-btn" onClick={handleCloseModal} type="button">
                                    <ArrowLeft size={20} />
                                </button>
                                <h1 style={{ fontSize: '1.5rem', margin: 0 }}>
                                    {newProduct.id ? 'Бүтээгдэхүүн засах' : 'Бүтээгдэхүүн нэмэх'}
                                </h1>
                            </div>
                            <button className="save-btn" type="submit" disabled={isSaving}>
                                {isSaving ? 'Хадгалж байна...' : 'Хадгалах'}
                            </button>
                        </div>

                        <div className="product-form-grid">
                            <div className="form-main-card">
                                <div className="form-tabs">
                                    <button
                                        className={`tab ${activeTab === 'info' ? 'active' : ''}`}
                                        type="button"
                                        onClick={() => setActiveTab('info')}
                                    >
                                        Мэдээлэл
                                    </button>
                                    <button
                                        className={`tab ${activeTab === 'web' ? 'active' : ''}`}
                                        type="button"
                                        onClick={() => setActiveTab('web')}
                                    >
                                        Веб ангилал
                                    </button>
                                </div>

                                {activeTab === 'info' ? (
                                <div className="modal-form" style={{ padding: 0 }}>
                                    <div className="form-group">
                                        <label className="form-label">Нэр</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            name="name"
                                            placeholder="Бүтээгдэхүүний нэрээ оруулна уу"
                                            value={newProduct.name}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-group-row">
                                        <div className="form-group">
                                            <label className="form-label">Үнэ</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                name="price"
                                                min="0"
                                                placeholder="Бүтээгдэхүүний үнэ"
                                                value={newProduct.price}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Хямдарсан үнэ</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                name="salePrice"
                                                min="0"
                                                placeholder="Хямдарсан үнэ"
                                                value={newProduct.salePrice}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group-row">
                                        <div className="form-group">
                                            <label className="form-label">Тоо ширхэг</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                name="stock"
                                                min="0"
                                                placeholder="Тоо ширхэг"
                                                value={newProduct.stock}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Youtube линк</label>
                                            <div className="input-with-icon">
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    name="youtubeUrl"
                                                    placeholder="Youtube видео линк"
                                                    value={newProduct.youtubeUrl}
                                                    onChange={handleInputChange}
                                                />
                                                <Video size={18} className="input-icon" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="web-category-panel" style={{ marginBottom: '1rem' }}>
                                        <div className="web-category-panel-copy">
                                            <p>Үндсэн ангиллыг энд сонгоно. Нэг бүтээгдэхүүнд хэд хэдэн үндсэн ангилал өгч болно.</p>
                                            <button className="web-category-clear-btn" type="button" onClick={handleClearCategories}>
                                                Үндсэн ангилал цэвэрлэх
                                            </button>
                                        </div>

                                        <div className="category-chip-list">
                                            {CATEGORY_GROUPS.flatMap((group) =>
                                                group.items.map((item) => {
                                                    const checked = (newProduct.category || []).includes(item);
                                                    return (
                                                        <label className={`category-chip-option ${checked ? 'selected' : ''}`} key={item}>
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={() => handleToggleCategory(item)}
                                                            />
                                                            <span className={`category-chip-marker ${group.tone}`}></span>
                                                            <span className="category-chip-label">{item}</span>
                                                        </label>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Төлөв</label>
                                        <select
                                            className="form-select"
                                            name="status"
                                            value={newProduct.status}
                                            onChange={handleInputChange}
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Out of Stock">Out of Stock</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                    </div>

                                    <div className="form-group-row">
                                        <div className="form-group">
                                            <label className="form-label">Код (SKU)</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                name="sku"
                                                placeholder="Бүтээгдэхүүний код оруулна уу"
                                                value={newProduct.sku}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">НӨАТ барааны код (заавал биш)</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                name="vatCode"
                                                placeholder="НӨАТ барааны код оруулна уу"
                                                value={newProduct.vatCode}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Бренд</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            name="brand"
                                            placeholder="Брендийн нэр"
                                            value={newProduct.brand}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Богино тайлбар</label>
                                        <textarea
                                            className="form-textarea"
                                            rows="3"
                                            name="shortDescription"
                                            placeholder="Богино тайлбар оруулна уу"
                                            value={newProduct.shortDescription}
                                            onChange={handleInputChange}
                                        ></textarea>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Тайлбар</label>
                                        <textarea
                                            className="form-textarea"
                                            rows="5"
                                            name="description"
                                            placeholder="Дэлгэрэнгүй тайлбар оруулна уу"
                                            value={newProduct.description}
                                            onChange={handleInputChange}
                                        ></textarea>
                                    </div>
                                </div>
                                ) : (
                                    <div className="web-category-panel">
                                        <div className="web-category-panel-copy">
                                            <p>
                                                Хэрэв уг бүтээгдэхүүний ангилал ойлгомжгүй эсвэл олон ангилалд багтаж байвал
                                                доорх жагсаалтаас веб ангиллуудыг сонгоно уу.
                                            </p>
                                            <button className="web-category-clear-btn" type="button" onClick={handleClearWebCategories}>
                                                Веб ангилал цэвэрлэх
                                            </button>
                                        </div>

                                        <div className="web-category-list">
                                            {WEB_CATEGORY_GROUPS.flatMap((group) =>
                                                group.items.map((item) => {
                                                    const checked = (newProduct.webCategories || []).includes(item);
                                                    return (
                                                        <label className="web-category-row" key={item}>
                                                            <div className="web-category-row-left">
                                                                <span className={`web-category-marker ${group.tone}`}></span>
                                                                <span className={`web-category-chip ${checked ? 'selected' : ''}`}>{item}</span>
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={() => handleToggleWebCategory(item)}
                                                            />
                                                        </label>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="form-sidebar-container">
                                <div className="form-sidebar-card">
                                    <div className="sidebar-section-title">
                                        <span>Үндсэн ангилал</span>
                                    </div>
                                    {(newProduct.category || []).length ? (
                                        <div className="web-category-summary">
                                            {(newProduct.category || []).slice(0, 6).map((item) => (
                                                <span key={item} className="web-category-summary-chip">
                                                    {item}
                                                </span>
                                            ))}
                                            {(newProduct.category || []).length > 6 ? (
                                                <div className="empty-state-text">+{newProduct.category.length - 6} нэмэлт ангилал</div>
                                            ) : null}
                                        </div>
                                    ) : (
                                        <div className="empty-state-text">Үндсэн ангилал сонгоогүй байна</div>
                                    )}
                                </div>

                                <div className="form-sidebar-card">
                                    <div className="sidebar-section-title">
                                        <span>Веб ангилал</span>
                                        <button className="add-section-btn" type="button">
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    {(newProduct.webCategories || []).length ? (
                                        <div className="web-category-summary">
                                            {(newProduct.webCategories || []).slice(0, 6).map((item) => (
                                                <span key={item} className="web-category-summary-chip">
                                                    {item}
                                                </span>
                                            ))}
                                            {(newProduct.webCategories || []).length > 6 ? (
                                                <div className="empty-state-text">+{newProduct.webCategories.length - 6} нэмэлт ангилал</div>
                                            ) : null}
                                        </div>
                                    ) : (
                                        <div className="empty-state-text">Веб ангилалгүй байна</div>
                                    )}
                                </div>

                                <div className="form-sidebar-card">
                                    <div className="sidebar-section-title">
                                        <span>Бүтээгдэхүүний төлөв</span>
                                    </div>
                                    <div className="toggle-list">
                                        {[
                                            'Бүтээгдэхүүний төлөв',
                                            'Бүтээгдэхүүний тоо ширхэгийг удирдана',
                                            'Хүргэлттэй бүтээгдэхүүн',
                                            'Тасалбар',
                                            'Үнэ нуух',
                                            'Файл эсвэл зураг авах',
                                        ].map((label, idx) => (
                                            <div className="toggle-item" key={idx}>
                                                <span className="toggle-label">{label}</span>
                                                <label className="switch">
                                                    <input type="checkbox" defaultChecked={idx < 3} />
                                                    <span className="slider"></span>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="form-sidebar-card">
                                    <div className="sidebar-section-title">
                                        <span>Бүтээгдэхүүний зураг</span>
                                    </div>
                                    <p className="upload-hint">Зургийн хэмжээ 6MB-аас бага байхыг анхаарна уу.</p>
                                    <label className="upload-zone" htmlFor="product-image-input" style={{ cursor: 'pointer' }}>
                                        <input
                                            id="product-image-input"
                                            type="file"
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                            onChange={handleImageChange}
                                        />
                                        {previewImageUrl ? (
                                            <img
                                                src={previewImageUrl}
                                                alt="Бүтээгдэхүүний зураг"
                                                style={{
                                                    width: '100%',
                                                    maxHeight: '220px',
                                                    objectFit: 'cover',
                                                    borderRadius: '12px',
                                                    marginBottom: '10px',
                                                }}
                                            />
                                        ) : (
                                            <div className="upload-icon-box">
                                                <UploadCloud size={40} />
                                            </div>
                                        )}
                                        <p className="upload-text">
                                            {previewImageUrl
                                                ? 'Зургийг солих бол дахин дарна уу.'
                                                : 'Бүтээгдэхүүний зургаа энд дарж эсвэл зөөж оруулна уу.'}
                                        </p>
                                        <div className="empty-state-text" style={{ marginTop: '8px', textAlign: 'left' }}>
                                            {selectedImageFile
                                                ? `Сонгосон файл: ${selectedImageFile.name}`
                                                : newProduct.image
                                                  ? 'Одоогийн зураг хадгалагдсан.'
                                                  : 'Зураг оруулаагүй байна'}
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            ) : null}

            {viewingProduct ? (
                <div className="modal-overlay" onClick={handleCloseViewModal}>
                    <div
                        className="section-card"
                        style={{ width: '92%', maxWidth: '720px', padding: '1.5rem' }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="section-heading-row">
                            <div>
                                <h3 style={{ marginBottom: '0.3rem' }}>Бүтээгдэхүүний дэлгэрэнгүй</h3>
                                <p>Read-only preview</p>
                            </div>
                            <button className="filter-btn" type="button" onClick={handleCloseViewModal}>
                                Хаах
                            </button>
                        </div>

                        <div className="product-view-grid">
                            <div className="product-view-media">
                                {viewingProduct.image ? (
                                    <img src={viewingProduct.image} alt={viewingProduct.name} className="product-view-image" />
                                ) : (
                                    <div className="product-view-image product-table-thumb-fallback">
                                        {viewingProduct.name.slice(0, 1).toUpperCase()}
                                    </div>
                                )}
                            </div>

                            <div className="product-view-copy">
                                <h2>{viewingProduct.name}</h2>
                                    <div className="product-view-meta-grid">
                                        <div className="product-view-meta-item">
                                            <span>SKU</span>
                                            <strong>{valueOrDash(viewingProduct.sku)}</strong>
                                        </div>
                                        <div className="product-view-meta-item">
                                            <span>Бренд</span>
                                            <strong>{valueOrDash(viewingProduct.brand)}</strong>
                                        </div>
                                        <div className="product-view-meta-item">
                                            <span>Үндсэн ангилал</span>
                                            <strong>{toDisplayList(viewingProduct.category) || '-'}</strong>
                                        </div>
                                        <div className="product-view-meta-item">
                                            <span>Үнэ</span>
                                            <strong>{formatMoney(viewingProduct.price)}</strong>
                                        </div>
                                        <div className="product-view-meta-item">
                                            <span>Хямдарсан үнэ</span>
                                            <strong>{viewingProduct.salePrice ? formatMoney(viewingProduct.salePrice) : '-'}</strong>
                                        </div>
                                        <div className="product-view-meta-item">
                                            <span>Үлдэгдэл</span>
                                            <strong>{viewingProduct.stock?.toLocaleString?.() || 0} ш</strong>
                                        </div>
                                        <div className="product-view-meta-item">
                                            <span>Төлөв</span>
                                            <strong>{valueOrDash(viewingProduct.status)}</strong>
                                        </div>
                                        <div className="product-view-meta-item">
                                            <span>НӨАТ код</span>
                                            <strong>{valueOrDash(viewingProduct.vatCode)}</strong>
                                        </div>
                                        <div className="product-view-meta-item">
                                            <span>Youtube</span>
                                            <strong>{valueOrDash(viewingProduct.youtubeUrl)}</strong>
                                        </div>
                                        <div className="product-view-meta-item">
                                            <span>Веб ангилал</span>
                                            <strong>
                                            {toDisplayList(viewingProduct.webCategories) || '-'}
                                        </strong>
                                        </div>
                                        <div className="product-view-meta-item product-view-meta-item-wide">
                                            <span>Богино тайлбар</span>
                                            <strong>{valueOrDash(viewingProduct.shortDescription)}</strong>
                                        </div>
                                        <div className="product-view-meta-item product-view-meta-item-wide">
                                            <span>Дэлгэрэнгүй тайлбар</span>
                                            <strong>{valueOrDash(viewingProduct.description)}</strong>
                                        </div>
                                    </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default Products;
