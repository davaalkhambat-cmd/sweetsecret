import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Plus,
    Search,
    Eye,
    EyeOff,
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
    Bold,
    Italic,
    Underline,
    List,
    ListOrdered,
    Quote,
    Link2,
    Heading2,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Image as ImageIcon,
    Undo2,
    Redo2,
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
    primaryCategoryIds: [],
    subCategoryIds: [],
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
const CATEGORY_COLLECTION = 'catalog_categories';
const BRAND_OPTIONS = ['wettrust', 'svakom', 'smilemakers', 'hanamisui', 'intimate earth', 'intime organique', 'medicube'];
const DEFAULT_CATEGORY_BLUEPRINT = [
    {
        name: 'Онцлох',
        tone: 'blue',
        items: ['VALENTINE SALE', 'МАРТ 8', 'Багц'],
    },
    {
        name: 'Эмзэг хэсгийн арчилгаа',
        tone: 'green',
        items: [
            'Эмзэг хэсгийн цайруулах бүтээгдэхүүн',
            'Эмзэг хэсгийн цэвэрлэх бүтээгдэхүүн',
            'Үтрээний серум',
            'Пробиотиктой саван',
            'Саван',
            'Сарын тэмдэг',
        ],
    },
    {
        name: 'Цэвэрлэгээ',
        tone: 'green',
        items: ['Гелэн саван', 'Хөөсөн саван', 'Хатуу саван'],
    },
    {
        name: 'Цайруулах арчилгаа',
        tone: 'blue',
        items: ['Цайруулах серум', 'Цайруулах тос', 'Чапгалах бүтээгдэхүүн'],
    },
    {
        name: 'Насанд хүрэгчдийн цэс',
        tone: 'blue',
        items: ['Тоёёхон (+18)', 'Тоёёхонууд'],
    },
    {
        name: 'Бусад',
        tone: 'green',
        items: ['Чийгшүүлэгч', 'Нүүрний гоо сайхан', 'Бусад', 'Бие арчилгаа', 'Ном'],
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
const formatNumberInput = (value) => {
    const digits = String(value || '').replace(/[^\d]/g, '');
    if (!digits) return '';
    return Number(digits).toLocaleString('en-US');
};

const slugifyName = (value) =>
    String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\u0400-\u04FF-]+/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

const buildFallbackCategoryDocs = () => {
    const docs = [];

    DEFAULT_CATEGORY_BLUEPRINT.forEach((group, groupIndex) => {
        const primaryId = `default-primary-${slugifyName(group.name) || groupIndex}`;
        docs.push({
            id: primaryId,
            name: group.name,
            type: 'primary',
            parentId: '',
            tone: group.tone,
            active: true,
            order: groupIndex,
        });

        group.items.forEach((item, itemIndex) => {
            docs.push({
                id: `default-sub-${slugifyName(group.name)}-${slugifyName(item) || itemIndex}`,
                name: item,
                type: 'sub',
                parentId: primaryId,
                tone: group.tone,
                active: true,
                order: itemIndex,
            });
        });
    });

    return docs;
};

const FALLBACK_CATEGORY_DOCS = buildFallbackCategoryDocs();

const sortCategoryDocs = (rows) =>
    [...rows].sort((a, b) => {
        if ((a.order ?? 0) !== (b.order ?? 0)) return (a.order ?? 0) - (b.order ?? 0);
        return String(a.name || '').localeCompare(String(b.name || ''), 'mn');
    });

const FlatCategorySelectionList = ({
    primaryItems,
    subItemsByParent,
    selectedPrimaryIds,
    selectedSubIds,
    onTogglePrimary,
    onToggleSub,
}) => (
    <div className="web-category-list category-flat-list">
        {primaryItems.flatMap((primary) => {
            const primaryChecked = selectedPrimaryIds.includes(primary.id);
            const primaryRow = (
                <label className="web-category-row category-flat-row" key={primary.id}>
                    <div className="web-category-row-left">
                        <span className="web-category-marker blue"></span>
                        <span className={`web-category-chip ${primaryChecked ? 'selected' : ''}`}>{primary.name}</span>
                    </div>
                    <input type="checkbox" checked={primaryChecked} onChange={() => onTogglePrimary(primary.id)} />
                </label>
            );

            const subRows = (subItemsByParent.get(primary.id) || []).map((item) => {
                const checked = selectedSubIds.includes(item.id);
                return (
                    <label className="web-category-row category-flat-row category-flat-row-sub" key={item.id}>
                        <div className="web-category-row-left">
                            <span className="web-category-marker green"></span>
                            <span className={`web-category-chip ${checked ? 'selected' : ''}`}>{item.name}</span>
                        </div>
                        <input type="checkbox" checked={checked} onChange={() => onToggleSub(item.id)} />
                    </label>
                );
            });

            return [primaryRow, ...subRows];
        })}
    </div>
);

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
    const descriptionTextareaRef = useRef(null);
    const [activeTab, setActiveTab] = useState('info');
    const [categoryDocs, setCategoryDocs] = useState([]);
    const [categoryLoading, setCategoryLoading] = useState(true);
    const [categoryDialog, setCategoryDialog] = useState({
        open: false,
        mode: 'create-primary',
        itemId: '',
        parentId: '',
        name: '',
        active: true,
    });
    const [managerBusy, setManagerBusy] = useState(false);
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
            collection(db, CATEGORY_COLLECTION),
            (snapshot) => {
                const rows = sortCategoryDocs(
                    snapshot.docs.map((categoryDoc) => {
                        const data = categoryDoc.data();
                        return {
                            id: categoryDoc.id,
                            name: data.name || '',
                            type: data.type || 'sub',
                            parentId: data.parentId || '',
                            tone: data.tone || 'blue',
                            active: data.active !== false,
                            order: Number(data.order || 0),
                        };
                    })
                );
                setCategoryDocs(rows);
                setCategoryLoading(false);
            },
            (error) => {
                console.error('Category snapshot error:', error);
                setCategoryLoading(false);
                setFeedback((prev) =>
                    prev.type === 'error'
                        ? prev
                        : {
                              type: 'error',
                              message:
                                  error.code === 'permission-denied'
                                      ? 'Ангиллын мэдээлэл унших эрх хүрэлцэхгүй байна.'
                                      : 'Ангиллын мэдээлэл татахад алдаа гарлаа.',
                          }
                );
            }
        );

        return unsubscribe;
    }, []);

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
                            primaryCategoryIds: toStringList(data.primaryCategoryIds),
                            subCategoryIds: toStringList(data.subCategoryIds),
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

    const availableCategoryDocs = categoryDocs.length ? categoryDocs : FALLBACK_CATEGORY_DOCS;

    const primaryCategories = useMemo(
        () => sortCategoryDocs(availableCategoryDocs.filter((item) => item.type === 'primary')),
        [availableCategoryDocs]
    );

    const subCategories = useMemo(
        () => sortCategoryDocs(availableCategoryDocs.filter((item) => item.type === 'sub')),
        [availableCategoryDocs]
    );

    const categoryMap = useMemo(
        () => new Map(availableCategoryDocs.map((item) => [item.id, item])),
        [availableCategoryDocs]
    );

    const subCategoriesByParent = useMemo(() => {
        const grouped = new Map();
        subCategories.forEach((item) => {
            const list = grouped.get(item.parentId) || [];
            list.push(item);
            grouped.set(item.parentId, list);
        });
        return grouped;
    }, [subCategories]);

    const resolveNamesFromIds = (ids, fallbackNames = []) => {
        const resolved = ids.map((id) => categoryMap.get(id)?.name).filter(Boolean);
        return resolved.length ? resolved : toStringList(fallbackNames);
    };

    const resolveIdsFromNames = (names, type) => {
        const normalizedNames = toStringList(names).map((item) => normalizeValue(item));
        return availableCategoryDocs
            .filter((item) => item.type === type && normalizedNames.includes(normalizeValue(item.name)))
            .map((item) => item.id);
    };

    const getProductPrimaryNames = (product) => resolveNamesFromIds(product.primaryCategoryIds || [], product.category);
    const getProductSubNames = (product) => resolveNamesFromIds(product.subCategoryIds || [], product.webCategories);

    const categoryManagerRows = useMemo(
        () =>
            primaryCategories.flatMap((primary) => [
                primary,
                ...(subCategoriesByParent.get(primary.id) || []).map((item) => ({
                    ...item,
                    primaryName: primary.name,
                })),
            ]),
        [primaryCategories, subCategoriesByParent]
    );

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
            [product.name, product.sku, toDisplayList(getProductPrimaryNames(product)), toDisplayList(getProductSubNames(product)), product.status].some((value) =>
                String(value || '')
                    .toLowerCase()
                    .includes(keyword)
            )
        );
    }, [products, searchTerm, categoryMap]);

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
            const primaryCategoryIds =
                toStringList(product.primaryCategoryIds).length
                    ? toStringList(product.primaryCategoryIds)
                    : resolveIdsFromNames(product.category, 'primary');
            const subCategoryIds =
                toStringList(product.subCategoryIds).length
                    ? toStringList(product.subCategoryIds)
                    : resolveIdsFromNames(product.webCategories, 'sub');

            setNewProduct({
                id: product.id,
                name: product.name,
                sku: product.sku || '',
                vatCode: product.vatCode || '',
                brand: product.brand || '',
                category: resolveNamesFromIds(primaryCategoryIds, product.category),
                webCategories: resolveNamesFromIds(subCategoryIds, product.webCategories),
                primaryCategoryIds,
                subCategoryIds,
                price: formatNumberInput(product.price),
                salePrice: product.salePrice ? formatNumberInput(product.salePrice) : '',
                stock: formatNumberInput(product.stock),
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
        setCategoryDialog({
            open: false,
            mode: 'create-primary',
            itemId: '',
            parentId: '',
            name: '',
            active: true,
        });
    };

    const handleOpenViewModal = (product) => {
        setViewingProduct(product);
    };

    const handleCloseViewModal = () => {
        setViewingProduct(null);
    };

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        if (['price', 'salePrice', 'stock'].includes(name)) {
            setNewProduct((prev) => ({ ...prev, [name]: formatNumberInput(value) }));
            return;
        }
        setNewProduct((prev) => ({ ...prev, [name]: value }));
    };

    const updateDescriptionValue = (nextValue, selectionStart, selectionEnd = selectionStart) => {
        setNewProduct((prev) => ({ ...prev, description: nextValue }));

        requestAnimationFrame(() => {
            const textarea = descriptionTextareaRef.current;
            if (!textarea) return;
            textarea.focus();
            textarea.setSelectionRange(selectionStart, selectionEnd);
        });
    };

    const wrapDescriptionSelection = (prefix, suffix = prefix, placeholder = 'text') => {
        const textarea = descriptionTextareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const value = newProduct.description || '';
        const selected = value.slice(start, end) || placeholder;
        const nextValue = `${value.slice(0, start)}${prefix}${selected}${suffix}${value.slice(end)}`;
        const nextSelectionStart = start + prefix.length;
        const nextSelectionEnd = start + prefix.length + selected.length;

        updateDescriptionValue(nextValue, nextSelectionStart, nextSelectionEnd);
    };

    const prefixDescriptionLines = (prefix, placeholder = 'text') => {
        const textarea = descriptionTextareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const value = newProduct.description || '';
        const selected = value.slice(start, end) || placeholder;
        const transformed = selected
            .split('\n')
            .map((line) => `${prefix}${line}`.trimEnd())
            .join('\n');
        const nextValue = `${value.slice(0, start)}${transformed}${value.slice(end)}`;
        updateDescriptionValue(nextValue, start, start + transformed.length);
    };

    const insertDescriptionBlock = (block, cursorOffset = block.length) => {
        const textarea = descriptionTextareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const value = newProduct.description || '';
        const nextValue = `${value.slice(0, start)}${block}${value.slice(end)}`;
        updateDescriptionValue(nextValue, start + cursorOffset);
    };

    const descriptionToolbarRows = [
        [
            { type: 'select', label: 'Medium', options: ['Small', 'Medium', 'Large'], onChange: (value) => insertDescriptionBlock(`\n[Size: ${value}]\n`) },
            { type: 'select', label: 'Normal', options: ['Normal', 'Heading', 'Title'], onChange: (value) => value === 'Normal' ? insertDescriptionBlock('\n') : prefixDescriptionLines(value === 'Title' ? '# ' : '## ', value) },
            { type: 'button', label: 'Bold', content: <Bold size={16} />, onClick: () => wrapDescriptionSelection('**', '**', 'bold') },
            { type: 'button', label: 'Italic', content: <Italic size={16} />, onClick: () => wrapDescriptionSelection('*', '*', 'italic') },
            { type: 'button', label: 'Underline', content: <Underline size={16} />, onClick: () => wrapDescriptionSelection('__', '__', 'underline') },
            { type: 'button', label: 'Strike', content: <span className="rich-text-symbol">S</span>, onClick: () => wrapDescriptionSelection('~~', '~~', 'strike') },
            { type: 'button', label: 'Numbered List', content: <ListOrdered size={16} />, onClick: () => prefixDescriptionLines('1. ', 'item') },
            { type: 'button', label: 'Bullet List', content: <List size={16} />, onClick: () => prefixDescriptionLines('- ', 'item') },
            { type: 'button', label: 'Indent Left', content: <span className="rich-text-symbol">⇤</span>, onClick: () => prefixDescriptionLines('< ', 'text') },
            { type: 'button', label: 'Indent Right', content: <span className="rich-text-symbol">⇥</span>, onClick: () => prefixDescriptionLines('> ', 'text') },
            { type: 'button', label: 'Superscript', content: <span className="rich-text-symbol">x²</span>, onClick: () => wrapDescriptionSelection('^(', ')', '2') },
            { type: 'button', label: 'Subscript', content: <span className="rich-text-symbol">x₂</span>, onClick: () => wrapDescriptionSelection('~(', ')', '2') },
            { type: 'button', label: 'Quote', content: <Quote size={16} />, onClick: () => prefixDescriptionLines('> ', 'quote') },
            { type: 'button', label: 'Paragraph', content: <span className="rich-text-symbol">¶</span>, onClick: () => insertDescriptionBlock('\n\n') },
            { type: 'button', label: 'Align Left', content: <AlignLeft size={16} />, onClick: () => insertDescriptionBlock('\n[Align: left]\n') },
            { type: 'button', label: 'Text Color', content: <span className="rich-text-symbol">A</span>, onClick: () => insertDescriptionBlock('[color=#000000]text[/color]', 16) },
            { type: 'button', label: 'Highlight', content: <span className="rich-text-symbol rich-text-highlight-symbol">A</span>, onClick: () => insertDescriptionBlock('[bg=#FFF3A3]text[/bg]', 14) },
            { type: 'button', label: 'Link', content: <Link2 size={16} />, onClick: () => insertDescriptionBlock('[text](https://)', 1) },
            { type: 'button', label: 'Image', content: <ImageIcon size={16} />, onClick: () => insertDescriptionBlock('![alt](https://image-url)', 2) },
        ],
        [
            { type: 'button', label: 'Formula', content: <span className="rich-text-symbol">ƒx</span>, onClick: () => insertDescriptionBlock('{{ formula }}', 3) },
            { type: 'button', label: 'Code', content: <span className="rich-text-symbol">&lt;/&gt;</span>, onClick: () => wrapDescriptionSelection('`', '`', 'code') },
            { type: 'button', label: 'Clear Format', content: <span className="rich-text-symbol">T×</span>, onClick: () => wrapDescriptionSelection('', '', 'text') },
            { type: 'button', label: 'Undo', content: <Undo2 size={16} />, onClick: () => {} },
            { type: 'button', label: 'Redo', content: <Redo2 size={16} />, onClick: () => {} },
            { type: 'button', label: 'Align Center', content: <AlignCenter size={16} />, onClick: () => insertDescriptionBlock('\n[Align: center]\n') },
            { type: 'button', label: 'Align Right', content: <AlignRight size={16} />, onClick: () => insertDescriptionBlock('\n[Align: right]\n') },
            { type: 'button', label: 'Heading', content: <Heading2 size={16} />, onClick: () => prefixDescriptionLines('## ', 'Heading') },
        ],
    ];

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
        const subCategory = categoryMap.get(category);
        setNewProduct((prev) => {
            const selectedSubIds = new Set(prev.subCategoryIds || []);
            const selectedPrimaryIds = new Set(prev.primaryCategoryIds || []);

            if (selectedSubIds.has(category)) {
                selectedSubIds.delete(category);
            } else {
                selectedSubIds.add(category);
                if (subCategory?.parentId) {
                    selectedPrimaryIds.add(subCategory.parentId);
                }
            }

            return {
                ...prev,
                primaryCategoryIds: Array.from(selectedPrimaryIds),
                subCategoryIds: Array.from(selectedSubIds),
                category: resolveNamesFromIds(Array.from(selectedPrimaryIds)),
                webCategories: resolveNamesFromIds(Array.from(selectedSubIds)),
            };
        });
    };

    const handleClearWebCategories = () => {
        setNewProduct((prev) => ({ ...prev, webCategories: [], subCategoryIds: [] }));
    };

    const handleToggleCategory = (category) => {
        setNewProduct((prev) => {
            const selectedPrimaryIds = new Set(prev.primaryCategoryIds || []);
            const selectedSubIds = new Set(prev.subCategoryIds || []);

            if (selectedPrimaryIds.has(category)) {
                selectedPrimaryIds.delete(category);
                subCategories
                    .filter((item) => item.parentId === category)
                    .forEach((item) => selectedSubIds.delete(item.id));
            } else {
                selectedPrimaryIds.add(category);
            }

            return {
                ...prev,
                primaryCategoryIds: Array.from(selectedPrimaryIds),
                subCategoryIds: Array.from(selectedSubIds),
                category: resolveNamesFromIds(Array.from(selectedPrimaryIds)),
                webCategories: resolveNamesFromIds(Array.from(selectedSubIds)),
            };
        });
    };

    const handleClearCategories = () => {
        setNewProduct((prev) => ({ ...prev, category: [], webCategories: [], primaryCategoryIds: [], subCategoryIds: [] }));
    };

    const validateForm = () => {
        if (!newProduct.name.trim()) {
            setFeedback({ type: 'error', message: 'Бүтээгдэхүүний нэр заавал оруулна.' });
            return false;
        }

        const price = toNumber(newProduct.price);
        const stock = toNumber(newProduct.stock);

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

            const primaryNames = resolveNamesFromIds(newProduct.primaryCategoryIds || [], newProduct.category);
            const subNames = resolveNamesFromIds(newProduct.subCategoryIds || [], newProduct.webCategories);
            const payload = {
                name: newProduct.name.trim(),
                sku: newProduct.sku.trim(),
                vatCode: newProduct.vatCode.trim(),
                brand: newProduct.brand.trim(),
                category: primaryNames,
                webCategories: subNames,
                primaryCategoryIds: newProduct.primaryCategoryIds || [],
                subCategoryIds: newProduct.subCategoryIds || [],
                price: toNumber(newProduct.price),
                salePrice: toNumber(newProduct.salePrice || 0),
                stock: toNumber(newProduct.stock),
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

    const handleSeedDefaultCategories = async () => {
        if (categoryDocs.length) return true;

        setManagerBusy(true);
        resetMessages();

        try {
            const batch = writeBatch(db);
            FALLBACK_CATEGORY_DOCS.forEach((item) => {
                batch.set(doc(db, CATEGORY_COLLECTION, item.id), {
                    name: item.name,
                    type: item.type,
                    parentId: item.parentId || '',
                    tone: item.tone || 'blue',
                    active: item.active !== false,
                    order: item.order || 0,
                    updatedAt: serverTimestamp(),
                    createdAt: serverTimestamp(),
                });
            });
            await batch.commit();
            setFeedback({ type: 'success', message: 'Суурь ангиллууд үүслээ.' });
            return true;
        } catch (error) {
            console.error('Seed categories error:', error);
            setFeedback({
                type: 'error',
                message:
                    error.code === 'permission-denied'
                        ? 'Суурь ангилал үүсгэх эрх хүрэлцэхгүй байна. Firestore rules-ээ deploy хийсэн эсэхээ шалгана уу.'
                        : error.message || 'Суурь ангилал үүсгэх үед алдаа гарлаа.',
            });
            return false;
        } finally {
            setManagerBusy(false);
        }
    };

    const ensureCategoriesInitialized = async () => {
        if (categoryDocs.length) return true;
        return handleSeedDefaultCategories();
    };

    const closeCategoryDialog = () => {
        setCategoryDialog({
            open: false,
            mode: 'create-primary',
            itemId: '',
            parentId: '',
            name: '',
            active: true,
        });
    };

    const openPrimaryCategoryEditor = async () => {
        const ready = await ensureCategoriesInitialized();
        if (!ready) return;
        setCategoryDialog({
            open: true,
            mode: 'create-primary',
            itemId: '',
            parentId: '',
            name: '',
            active: true,
        });
    };

    const openSubCategoryEditor = async (parentId) => {
        const ready = await ensureCategoriesInitialized();
        if (!ready) return;
        setCategoryDialog({
            open: true,
            mode: 'create-sub',
            itemId: '',
            parentId,
            name: '',
            active: true,
        });
    };

    const openEditCategoryEditor = async (item) => {
        if (!item?.id) return;
        const ready = await ensureCategoriesInitialized();
        if (!ready) return;
        setCategoryDialog({
            open: true,
            mode: 'edit',
            itemId: item.id,
            parentId: item.parentId || '',
            name: item.name || '',
            active: item.active !== false,
        });
    };

    const handleSubmitCategoryDialog = async () => {
        const name = categoryDialog.name.trim();
        if (!name) {
            setFeedback({ type: 'error', message: 'Ангиллын нэр оруулна уу.' });
            return;
        }

        setManagerBusy(true);
        resetMessages();

        try {
            if (!categoryDocs.length && categoryDialog.mode !== 'edit') {
                const ready = await handleSeedDefaultCategories();
                if (!ready) return;
            }

            if (categoryDialog.mode === 'create-primary') {
                await addDoc(collection(db, CATEGORY_COLLECTION), {
                    name,
                    type: 'primary',
                    parentId: '',
                    tone: 'blue',
                    active: categoryDialog.active,
                    order: primaryCategories.length,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                setFeedback({ type: 'success', message: 'Үндсэн ангилал нэмэгдлээ.' });
            } else if (categoryDialog.mode === 'create-sub') {
                const siblings = subCategoriesByParent.get(categoryDialog.parentId) || [];
                await addDoc(collection(db, CATEGORY_COLLECTION), {
                    name,
                    type: 'sub',
                    parentId: categoryDialog.parentId,
                    tone: 'green',
                    active: categoryDialog.active,
                    order: siblings.length,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                setFeedback({ type: 'success', message: 'Дэд ангилал нэмэгдлээ.' });
            } else {
                await updateDoc(doc(db, CATEGORY_COLLECTION, categoryDialog.itemId), {
                    name,
                    active: categoryDialog.active,
                    updatedAt: serverTimestamp(),
                });
                setFeedback({ type: 'success', message: 'Ангиллын нэр шинэчлэгдлээ.' });
            }

            closeCategoryDialog();
        } catch (error) {
            console.error('Submit category dialog error:', error);
            setFeedback({
                type: 'error',
                message:
                    error.code === 'permission-denied'
                        ? 'Ангилал хадгалах эрх хүрэлцэхгүй байна. Firestore rules-ээ deploy хийсэн эсэхээ шалгана уу.'
                        : error.message || 'Ангилал хадгалах үед алдаа гарлаа.',
            });
        } finally {
            setManagerBusy(false);
        }
    };

    const handleDeleteCategory = async (item) => {
        if (!item?.id) return;
        if (!categoryDocs.length) {
            setFeedback({ type: 'error', message: 'Эхлээд суурь ангиллаа Firestore-д үүсгэнэ үү.' });
            return;
        }
        const confirmMessage =
            item.type === 'primary'
                ? 'Энэ үндсэн ангилал болон бүх дэд ангиллыг устгах уу?'
                : 'Энэ дэд ангиллыг устгах уу?';

        if (!window.confirm(confirmMessage)) return;

        setManagerBusy(true);
        resetMessages();

        try {
            if (item.type === 'primary') {
                const batch = writeBatch(db);
                batch.delete(doc(db, CATEGORY_COLLECTION, item.id));
                (subCategoriesByParent.get(item.id) || []).forEach((subItem) => {
                    batch.delete(doc(db, CATEGORY_COLLECTION, subItem.id));
                });
                await batch.commit();
            } else {
                await deleteDoc(doc(db, CATEGORY_COLLECTION, item.id));
            }

            setFeedback({
                type: 'success',
                message: item.type === 'primary' ? 'Үндсэн ангилал устгагдлаа.' : 'Дэд ангилал устгагдлаа.',
            });
        } catch (error) {
            console.error('Delete category error:', error);
            setFeedback({ type: 'error', message: 'Ангилал устгах үед алдаа гарлаа.' });
        } finally {
            setManagerBusy(false);
        }
    };

    const handleToggleCategoryStatus = async (item) => {
        if (!item?.id) return;
        if (!categoryDocs.length) {
            setFeedback({ type: 'error', message: 'Эхлээд суурь ангиллаа Firestore-д үүсгэнэ үү.' });
            return;
        }

        setManagerBusy(true);
        resetMessages();

        try {
            await updateDoc(doc(db, CATEGORY_COLLECTION, item.id), {
                active: item.active === false,
                updatedAt: serverTimestamp(),
            });
            setFeedback({
                type: 'success',
                message: item.active === false ? 'Ангилал идэвхтэй боллоо.' : 'Ангилал идэвхгүй боллоо.',
            });
        } catch (error) {
            console.error('Toggle category status error:', error);
            setFeedback({ type: 'error', message: 'Ангиллын төлөв шинэчлэхэд алдаа гарлаа.' });
        } finally {
            setManagerBusy(false);
        }
    };

    const handleTemplateDownload = () => {
        const templateRows = [
            {
                name: 'Let’s Inclear Gel 10pcs',
                sku: 'INC-10',
                vatCode: 'VAT-001',
                brand: 'Lets',
                category: 'Эмзэг хэсгийн арчилгаа',
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
            category: toDisplayList(getProductPrimaryNames(product)),
            webCategories: toDisplayList(getProductSubNames(product)),
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
                    primaryCategoryIds: resolveIdsFromNames(item.category, 'primary'),
                    subCategoryIds: resolveIdsFromNames(item.webCategories, 'sub'),
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

            {isModalOpen ? (
                <section className="product-editor-page animate-fade-in">
                    <form className="add-product-container product-editor-container" onSubmit={handleSaveProduct}>
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

                        <div className={`product-form-grid ${activeTab === 'categories' ? 'manager-mode' : ''}`}>
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
                                    {activeTab === 'categories' ? (
                                        <button className="tab active" type="button" onClick={() => setActiveTab('categories')}>
                                            Ангилал удирдах
                                        </button>
                                    ) : null}
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
                                                type="text"
                                                inputMode="numeric"
                                                className="form-input"
                                                name="price"
                                                placeholder="Бүтээгдэхүүний үнэ"
                                                value={newProduct.price}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Хямдарсан үнэ</label>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                className="form-input"
                                                name="salePrice"
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
                                                type="text"
                                                inputMode="numeric"
                                                className="form-input"
                                                name="stock"
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
                                        <select
                                            className="form-select"
                                            name="brand"
                                            value={newProduct.brand}
                                            onChange={handleInputChange}
                                        >
                                            <option value="">Брендийн нэр сонгоно уу</option>
                                            {BRAND_OPTIONS.map((brand) => (
                                                <option key={brand} value={brand}>
                                                    {brand}
                                                </option>
                                            ))}
                                        </select>
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
                                        <div className="rich-text-shell">
                                            <div className="rich-text-toolbar">
                                                {descriptionToolbarRows.map((row, rowIndex) => (
                                                    <div key={rowIndex} className="rich-text-toolbar-row">
                                                        {row.map((action) =>
                                                            action.type === 'select' ? (
                                                                <select
                                                                    key={action.label}
                                                                    className="rich-text-select"
                                                                    defaultValue={action.label}
                                                                    onChange={(event) => {
                                                                        action.onChange(event.target.value);
                                                                        event.target.value = action.label;
                                                                    }}
                                                                >
                                                                    <option value={action.label}>{action.label}</option>
                                                                    {action.options.map((option) => (
                                                                        <option key={option} value={option}>
                                                                            {option}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            ) : (
                                                                <button
                                                                    key={action.label}
                                                                    type="button"
                                                                    className="rich-text-tool"
                                                                    onClick={action.onClick}
                                                                    title={action.label}
                                                                >
                                                                    {action.content}
                                                                </button>
                                                            )
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            <textarea
                                                ref={descriptionTextareaRef}
                                                className="form-textarea rich-text-area"
                                                rows="8"
                                                name="description"
                                                placeholder="Дэлгэрэнгүй тайлбар оруулна уу"
                                                value={newProduct.description}
                                                onChange={handleInputChange}
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>
                                ) : activeTab === 'web' ? (
                                    <>
                                        <div className="web-category-panel">
                                            <div className="web-category-panel-copy">
                                                <p>
                                                    Веб ангиллыг үндсэн ангилал, дэд ангилал гэж хоёр түвшнээр сонгоно.
                                                    Дэд ангилал сонгоход харгалзах үндсэн ангилал автоматаар сонгогдоно.
                                                </p>
                                                <div className="category-panel-actions">
                                                    <button className="web-category-clear-btn" type="button" onClick={handleClearCategories}>
                                                        Бүх ангилал цэвэрлэх
                                                    </button>
                                                    <button
                                                        className="category-admin-add-btn"
                                                        type="button"
                                                        onClick={() => setActiveTab('categories')}
                                                    >
                                                        <Plus size={16} />
                                                        <span>Ангилал удирдах</span>
                                                    </button>
                                                </div>
                                            </div>

                                            <FlatCategorySelectionList
                                                primaryItems={primaryCategories}
                                                subItemsByParent={subCategoriesByParent}
                                                selectedPrimaryIds={newProduct.primaryCategoryIds || []}
                                                selectedSubIds={newProduct.subCategoryIds || []}
                                                onTogglePrimary={handleToggleCategory}
                                                onToggleSub={handleToggleWebCategory}
                                            />
                                        </div>

                                    </>
                                ) : (
                                    <div className="category-admin-window category-admin-window-page">
                                        <div className="category-admin-header">
                                            <div>
                                                <h2>Ангилал</h2>
                                            </div>
                                            <button
                                                type="button"
                                                className="category-admin-add-btn"
                                                onClick={openPrimaryCategoryEditor}
                                                disabled={managerBusy}
                                            >
                                                <Plus size={16} />
                                                <span>Ангилал нэмэх</span>
                                            </button>
                                        </div>

                                        {categoryLoading ? <div className="empty-state-text">Ангилал уншиж байна...</div> : null}
                                        <div className="category-admin-list">
                                                {categoryManagerRows.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className={`category-admin-row ${item.type === 'sub' ? 'sub' : 'primary'} ${item.active === false ? 'inactive' : ''}`}
                                                    >
                                                        <div className="category-admin-row-main">
                                                            <span className="category-admin-grip">⋮⋮</span>
                                                            <span className={`web-category-marker ${item.type === 'primary' ? 'blue' : 'green'}`}></span>
                                                            <span className="category-admin-name">{item.name}</span>
                                                        </div>
                                                        <div className="category-admin-actions">
                                                            <button
                                                                type="button"
                                                                className="category-admin-icon plus"
                                                                onClick={() => openSubCategoryEditor(item.type === 'primary' ? item.id : item.parentId)}
                                                                data-tooltip="Дэд ангилал нэмэх"
                                                            >
                                                                <Plus size={16} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="category-admin-icon edit"
                                                                onClick={() => openEditCategoryEditor(item)}
                                                                data-tooltip="Ангилал нэр шинэчлэх"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="category-admin-icon status"
                                                                onClick={() => handleToggleCategoryStatus(item)}
                                                                data-tooltip="Ангиллын төлөв өөрчлөх"
                                                            >
                                                                {item.active === false ? <Eye size={16} /> : <EyeOff size={16} />}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="category-admin-icon delete"
                                                                onClick={() => handleDeleteCategory(item)}
                                                                data-tooltip="Ангилал устгах"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {activeTab !== 'categories' ? (
                            <div className="form-sidebar-container">
                                <div className="form-sidebar-card">
                                    <div className="sidebar-section-title">
                                        <span>Сонгосон ангилал</span>
                                    </div>
                                    {(newProduct.primaryCategoryIds || []).length ? (
                                        <>
                                            <div className="category-summary-label">Үндсэн ангилал</div>
                                            <div className="web-category-summary">
                                                {resolveNamesFromIds(newProduct.primaryCategoryIds || []).slice(0, 6).map((item) => (
                                                    <span key={item} className="web-category-summary-chip">
                                                        {item}
                                                    </span>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="empty-state-text">Үндсэн ангилал сонгоогүй байна</div>
                                    )}

                                    <div className="category-summary-divider"></div>

                                    {(newProduct.subCategoryIds || []).length ? (
                                        <div className="web-category-summary">
                                            {resolveNamesFromIds(newProduct.subCategoryIds || []).slice(0, 6).map((item) => (
                                                <span key={item} className="web-category-summary-chip">
                                                    {item}
                                                </span>
                                            ))}
                                            {(newProduct.subCategoryIds || []).length > 6 ? (
                                                <div className="empty-state-text">+{newProduct.subCategoryIds.length - 6} нэмэлт ангилал</div>
                                            ) : null}
                                        </div>
                                    ) : (
                                        <div className="empty-state-text">Дэд ангилал сонгоогүй байна</div>
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
                            ) : null}
                        </div>
                    </form>
                </section>
            ) : (
                <>
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
                                                <td>{toDisplayList(getProductPrimaryNames(product)) || '-'}</td>
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
                </>
            )}

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
                                            <strong>{toDisplayList(getProductPrimaryNames(viewingProduct)) || '-'}</strong>
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
                                            <span>Дэд ангилал</span>
                                            <strong>
                                            {toDisplayList(getProductSubNames(viewingProduct)) || '-'}
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

            {categoryDialog.open ? (
                <div className="modal-overlay" onClick={closeCategoryDialog}>
                    <div
                        className="category-dialog"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="category-dialog-header">
                            <h3>
                                {categoryDialog.mode === 'create-primary'
                                    ? 'Үндсэн ангилал нэмэх'
                                    : categoryDialog.mode === 'create-sub'
                                      ? 'Дэд ангилал нэмэх'
                                      : 'Ангилал нэр шинэчлэх'}
                            </h3>
                            <button type="button" className="category-dialog-close" onClick={closeCategoryDialog}>
                                ×
                            </button>
                        </div>

                        <div className="category-dialog-body">
                            <div className="form-group">
                                <label className="form-label">Ангиллын нэр</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Ангилал нэр..."
                                    value={categoryDialog.name}
                                    onChange={(event) =>
                                        setCategoryDialog((prev) => ({ ...prev, name: event.target.value }))
                                    }
                                />
                            </div>

                            {categoryDialog.mode === 'create-sub' && categoryDialog.parentId ? (
                                <div className="empty-state-text">
                                    Үндсэн ангилал: {categoryMap.get(categoryDialog.parentId)?.name || '-'}
                                </div>
                            ) : null}

                            <div className="category-dialog-toggle">
                                <span>Ангиллын төлөв</span>
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        checked={categoryDialog.active}
                                        onChange={(event) =>
                                            setCategoryDialog((prev) => ({ ...prev, active: event.target.checked }))
                                        }
                                    />
                                    <span className="slider"></span>
                                </label>
                            </div>
                        </div>

                        <div className="category-dialog-footer">
                            <button type="button" className="filter-btn" onClick={closeCategoryDialog}>
                                Буцах
                            </button>
                            <button type="button" className="save-btn" onClick={handleSubmitCategoryDialog} disabled={managerBusy}>
                                {managerBusy ? 'Хадгалж байна...' : 'Хадгалах'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default Products;
