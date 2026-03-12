import React from 'react';
import { ShoppingCart } from 'lucide-react';

const ProductCard = ({ product, onAddToCart }) => {
    const fallbackImage =
        'https://via.placeholder.com/600x600?text=Sweet+Secret';
    const normalizedPrice = Number(product.price || 0);

    return (
        <div className="product-card">
            <div className="product-image-wrapper">
                <img src={product.image || fallbackImage} alt={product.name} loading="lazy" />
            </div>
            <div className="product-info">
                <span className="product-tag">{product.brand || product.category}</span>
                <h3 className="product-title">{product.name}</h3>
                <p className="product-price">{normalizedPrice.toLocaleString()}₮</p>
                <button
                    className="add-to-cart-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart(product);
                    }}
                >
                    <ShoppingCart size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    Сагсанд хийх
                </button>
            </div>
        </div>
    );
};

export default ProductCard;
