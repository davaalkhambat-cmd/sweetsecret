import React, { useEffect, useMemo, useState } from 'react';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Filter,
    ArrowLeft,
    Video,
    UploadCloud,
    LoaderCircle,
} from 'lucide-react';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    serverTimestamp,
    updateDoc,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../../firebase';

const initialFormState = {
    id: null,
    name: '',
    category: 'Skincare',
    price: '',
    stock: '',
    status: 'Active',
    image: '',
};

const Products = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [newProduct, setNewProduct] = useState(initialFormState);
    const [selectedImageFile, setSelectedImageFile] = useState(null);
    const [previewImageUrl, setPreviewImageUrl] = useState('');

    useEffect(
        () => () => {
            if (previewImageUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewImageUrl);
            }
        },
        [previewImageUrl]
    );

    useEffect(() => {
        const productsRef = collection(db, 'products');

        const unsubscribe = onSnapshot(
            productsRef,
            (snapshot) => {
                const rows = snapshot.docs
                    .map((productDoc) => {
                        const data = productDoc.data();
                        return {
                            id: productDoc.id,
                            name: data.name || '',
                            category: data.category || 'Skincare',
                            price: Number(data.price || 0),
                            stock: Number(data.stock || 0),
                            status: data.status || 'Active',
                            image: data.image || '',
                            updatedAtMs: data.updatedAt?.toMillis?.() || 0,
                        };
                    })
                    .sort((a, b) => b.updatedAtMs - a.updatedAtMs);

                setProducts(rows);
                setLoading(false);
                setErrorMessage('');
            },
            (error) => {
                console.error('Products snapshot error:', error);
                setErrorMessage(
                    error.code === 'permission-denied'
                        ? 'Бараа удирдах эрх хүрэлцэхгүй байна. Админ эрхээ шалгана уу.'
                        : 'Барааны мэдээлэл татахад алдаа гарлаа.'
                );
                setLoading(false);
            }
        );

        return unsubscribe;
    }, []);

    const handleOpenModal = (product = null) => {
        if (product) {
            setNewProduct({
                id: product.id,
                name: product.name,
                category: product.category,
                price: String(product.price),
                stock: String(product.stock),
                status: product.status,
                image: product.image || '',
            });
            setPreviewImageUrl(product.image || '');
        } else {
            setNewProduct(initialFormState);
            setPreviewImageUrl('');
        }
        setSelectedImageFile(null);

        setErrorMessage('');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setNewProduct(initialFormState);
        setSelectedImageFile(null);
        setPreviewImageUrl('');
        setIsSaving(false);
    };

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setNewProduct((prev) => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setErrorMessage('Зөвхөн зураг файл оруулна уу.');
            return;
        }

        const maxBytes = 6 * 1024 * 1024;
        if (file.size > maxBytes) {
            setErrorMessage('Зургийн хэмжээ 6MB-аас бага байх ёстой.');
            return;
        }

        setSelectedImageFile(file);
        setPreviewImageUrl(URL.createObjectURL(file));
        setErrorMessage('');
    };

    const validateForm = () => {
        if (!newProduct.name.trim()) {
            setErrorMessage('Бүтээгдэхүүний нэр заавал оруулна.');
            return false;
        }

        const price = Number(newProduct.price);
        const stock = Number(newProduct.stock);

        if (!Number.isFinite(price) || price < 0) {
            setErrorMessage('Үнэ зөв тоо байх ёстой.');
            return false;
        }

        if (!Number.isFinite(stock) || stock < 0) {
            setErrorMessage('Тоо ширхэг зөв тоо байх ёстой.');
            return false;
        }

        return true;
    };

    const handleSaveProduct = async (event) => {
        event.preventDefault();
        if (!validateForm()) return;

        setIsSaving(true);
        setErrorMessage('');

        try {
            let imageUrl = newProduct.image || '';

            if (selectedImageFile) {
                const fileExtension = selectedImageFile.name.split('.').pop() || 'jpg';
                const uniqueFileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExtension}`;
                const imageRef = ref(storage, `products/${uniqueFileName}`);
                await uploadBytes(imageRef, selectedImageFile, { contentType: selectedImageFile.type });
                imageUrl = await getDownloadURL(imageRef);
            }

            const payload = {
                name: newProduct.name.trim(),
                category: newProduct.category,
                price: Number(newProduct.price),
                stock: Number(newProduct.stock),
                status: newProduct.status,
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
        } catch (error) {
            console.error('Save product error:', error);
            setErrorMessage(
                error.code === 'permission-denied'
                    ? 'Бараа хадгалах эрх хүрэлцэхгүй байна. Админ эрхээ шалгана уу.'
                    : error.code === 'storage/unauthorized'
                      ? 'Зураг upload хийх эрх хүрэлцэхгүй байна. Админ эрхээ шалгана уу.'
                    : 'Бараа хадгалах үед алдаа гарлаа.'
            );
            setIsSaving(false);
        }
    };

    const handleDeleteProduct = async (id) => {
        if (!window.confirm('Та энэ барааг устгахдаа итгэлтэй байна уу?')) return;

        try {
            await deleteDoc(doc(db, 'products', id));
            setErrorMessage('');
        } catch (error) {
            console.error('Delete product error:', error);
            setErrorMessage(
                error.code === 'permission-denied'
                    ? 'Бараа устгах эрх хүрэлцэхгүй байна. Админ эрхээ шалгана уу.'
                    : 'Бараа устгах үед алдаа гарлаа.'
            );
        }
    };

    const filteredProducts = useMemo(
        () =>
            products.filter(
                (product) =>
                    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    product.category.toLowerCase().includes(searchTerm.toLowerCase())
            ),
        [products, searchTerm]
    );

    return (
        <div className="admin-page">
            <div className="page-header">
                <div className="header-info">
                    <h1>Бараа бүтээгдэхүүн</h1>
                    <p>Нийт {products.length} бараа бүртгэлтэй байна</p>
                </div>
                <button className="add-btn" onClick={() => handleOpenModal()}>
                    <Plus size={18} />
                    <span>Шинэ бараа нэмэх</span>
                </button>
            </div>

            {errorMessage && (
                <div
                    style={{
                        marginBottom: '16px',
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

            <div className="table-filters">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Бараа хайх..."
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
                                <th>ID</th>
                                <th>Нэр</th>
                                <th>Ангилал</th>
                                <th>Үнэ</th>
                                <th>Үлдэгдэл</th>
                                <th>Төлөв</th>
                                <th>Үйлдэл</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((product, index) => (
                                <tr key={product.id}>
                                    <td>#{index + 1}</td>
                                    <td className="product-name-cell">{product.name}</td>
                                    <td>{product.category}</td>
                                    <td>₮{product.price.toLocaleString()}</td>
                                    <td>{product.stock} ширхэг</td>
                                    <td>
                                        <span className={`status-pill ${product.status === 'Active' ? 'active' : 'inactive'}`}>
                                            {product.status}
                                        </span>
                                    </td>
                                    <td className="actions-cell">
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
                                    </td>
                                </tr>
                            ))}
                            {!filteredProducts.length && (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>
                                        Илэрц олдсонгүй
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {isModalOpen && (
                <div className="modal-overlay" style={{ alignItems: 'flex-start', overflowY: 'auto', paddingTop: '2rem' }}>
                    <form
                        className="add-product-container animate-fade-in"
                        style={{ width: '95%', maxWidth: '1200px', background: 'transparent' }}
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
                                    <div className="tab active">Мэдээлэл</div>
                                    <div className="tab">Веб ангилал</div>
                                </div>

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
                                            <input type="number" className="form-input" placeholder="Хямдарсан үнэ" />
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
                                                <input type="text" className="form-input" placeholder="Youtube видео линк" />
                                                <Video size={18} className="input-icon" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-group-row">
                                        <div className="form-group">
                                            <label className="form-label">Ангилал</label>
                                            <select
                                                className="form-select"
                                                name="category"
                                                value={newProduct.category}
                                                onChange={handleInputChange}
                                            >
                                                <option value="Skincare">Skincare</option>
                                                <option value="Serums">Serums</option>
                                                <option value="Masks">Masks</option>
                                                <option value="Toners">Toners</option>
                                                <option value="Makeup">Makeup</option>
                                            </select>
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
                                    </div>

                                    <div className="form-group-row">
                                        <div className="form-group">
                                            <label className="form-label">Код (SKU)</label>
                                            <input type="text" className="form-input" placeholder="Бүтээгдэхүүний код оруулна уу" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">НӨАТ барааны код (заавал биш)</label>
                                            <input type="text" className="form-input" placeholder="НӨАТ барааны код оруулна уу" />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Бренд</label>
                                        <select className="form-select">
                                            <option value="">Сонгох</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Богино тайлбар</label>
                                        <textarea className="form-textarea" rows="3" placeholder="Богино тайлбар оруулна уу"></textarea>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Тайлбар</label>
                                        <textarea className="form-textarea" rows="5" placeholder="Дэлгэрэнгүй тайлбар оруулна уу"></textarea>
                                    </div>
                                </div>
                            </div>

                            <div className="form-sidebar-container">
                                <div className="form-sidebar-card">
                                    <div className="sidebar-section-title">
                                        <span>Мастер ангилал</span>
                                        <button className="add-section-btn" type="button">
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    <div className="empty-state-text">Мастер ангилалгүй байна</div>
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
            )}
        </div>
    );
};

export default Products;
