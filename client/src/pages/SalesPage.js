// client/src/pages/SalesPage.js
import React, { useState, useEffect, useContext, useMemo } from 'react';
import api from '../api/axios';
import AuthContext from '../context/AuthContext';
import '../styles/SalesPage.css';
import ReceiptModal from '../components/ReceiptModal';
import ConfirmationContext from '../context/ConfirmationContext';

const SalesPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const { user } = useContext(AuthContext);
  const { confirm } = useContext(ConfirmationContext);

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastSaleData, setLastSaleData] = useState(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const productsRes = await api.get('/products');
        const categoriesRes = await api.get('/categories');
        const brandsRes = await api.get('/brands');
        setProducts(productsRes.data);
        setCategories(categoriesRes.data);
        setBrands(brandsRes.data);
      } catch (error) {
        console.error("Failed to fetch initial data", error);
      }
    };
    fetchInitialData();
  }, []);

  // --- REWRITTEN: More robust cart logic ---
  const addProductToCart = (product) => {
    // First, check if the product is available in the main list
    const productInState = products.find(p => p._id === product._id);
    if (!productInState || productInState.quantity <= 0) {
      return; // Do nothing if product is out of stock in the main list
    }

    // Use functional update to avoid race conditions
    setCartItems(prevCart => {
      const existingItem = prevCart.find(item => item._id === product._id);

      if (existingItem) {
        // If item exists in cart, increment its quantity if stock allows
        if (existingItem.cartQuantity < existingItem.stock) {
          return prevCart.map(item =>
            item._id === product._id
              ? { ...item, cartQuantity: item.cartQuantity + 1 }
              : item
          );
        }
        // If stock is maxed, return the cart as is
        return prevCart;
      } else {
        // If item is not in cart, add it with a quantity of 1
        // The `stock` property tracks the original quantity available
        return [...prevCart, { ...product, cartQuantity: 1, stock: product.quantity }];
      }
    });

    // Decrement the quantity in the visual product list
    setProducts(prevProducts =>
      prevProducts.map(p =>
        p._id === product._id ? { ...p, quantity: p.quantity - 1 } : p
      )
    );
  };

  // --- REWRITTEN: More robust quantity update logic ---
  const updateQuantity = (product, amount) => {
    // Use functional update for cart to ensure accuracy
    setCartItems(prevCart => {
      const existingItem = prevCart.find(item => item._id === product._id);
      if (!existingItem) return prevCart; // Should not happen, but safe check

      const newQuantity = existingItem.cartQuantity + amount;

      if (newQuantity <= 0) {
        // Remove item from cart if quantity is 0 or less
        return prevCart.filter(item => item._id !== product._id);
      }

      if (newQuantity <= existingItem.stock) {
        // Update quantity if within available stock
        return prevCart.map(item =>
          item._id === product._id ? { ...item, cartQuantity: newQuantity } : item
        );
      }
      
      // If requested quantity exceeds stock, do not change the cart
      return prevCart;
    });

    // Use functional update for products to sync visual stock counter
    setProducts(prevProducts => 
      prevProducts.map(p => {
        if (p._id === product._id) {
          // Check against cart state to prevent visual stock from becoming incorrect
          const cartItem = cartItems.find(item => item._id === product._id);
          const newCartQuantity = cartItem ? cartItem.cartQuantity + amount : 0;
          if (newCartQuantity > p.stock) return p; // prevent going over stock

          return { ...p, quantity: p.quantity - amount };
        }
        return p;
      })
    );
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + item.price * item.cartQuantity, 0);
  };
  
  const handleCompleteSale = async () => {
    if (cartItems.length === 0) {
      alert("Cart is empty.");
      return;
    }

    const total = calculateTotal();
    const isConfirmed = await confirm(`Complete sale for a total of ₱${total.toFixed(2)}? This action cannot be undone.`);

    if (isConfirmed) {
      const saleData = {
        items: cartItems.map(item => ({
          product: item._id,
          quantity: item.cartQuantity,
          priceAtTime: item.price,
          costAtTime: item.cost
        })),
        services: [],
        totalAmount: total,
        recordedBy: user._id,
      };
      
      try {
        const response = await api.post('/sales', saleData);
        setLastSaleData(response.data);
        setShowReceiptModal(true);
        setCartItems([]);
        // Refetch products to ensure stock is 100% accurate from the server
        const productsResponse = await api.get('/products');
        setProducts(productsResponse.data);
      } catch (error) {
        alert(`Sale failed: ${error.response?.data?.message || error.message}`);
        // If sale fails, refetch products to revert optimistic updates
        const productsResponse = await api.get('/products');
        setProducts(productsResponse.data);
      }
    }
  };
  
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
        const searchMatch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
        const brandMatch = selectedBrand ? product.brand._id === selectedBrand : true;
        const categoryMatch = selectedCategory ? product.category._id === selectedCategory : true;
        return searchMatch && brandMatch && categoryMatch;
    });
  }, [products, searchTerm, selectedBrand, selectedCategory]);

  return (
    <div className="pos-container">
      {/* (The JSX for this component remains the same) */}
      <div className="product-selection">
        <input
          type="text"
          placeholder="Search for products..."
          className="search-bar"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="filter-container">
            <button onClick={() => setSelectedBrand(null)} className={!selectedBrand ? 'active' : ''}>All Brands</button>
            {brands.map(brand => (
                <button key={brand._id} onClick={() => setSelectedBrand(brand._id)} className={selectedBrand === brand._id ? 'active' : ''}>
                    {brand.name}
                </button>
            ))}
        </div>
        <div className="filter-container">
            <button onClick={() => setSelectedCategory(null)} className={!selectedCategory ? 'active' : ''}>All Categories</button>
            {categories.map(cat => (
                <button key={cat._id} onClick={() => setSelectedCategory(cat._id)} className={selectedCategory === cat._id ? 'active' : ''}>
                    {cat.name}
                </button>
            ))}
        </div>
        
        <div className="product-grid">
          {filteredProducts.map(product => (
            <div key={product._id} className={`product-card ${product.quantity === 0 ? 'out-of-stock' : ''}`} onClick={() => addProductToCart(product)}>
              <div className="card-image-container">
                <img 
                  src={product.image || 'https://placehold.co/300x200/e2e8f0/e2e8f0?text=No+Image'} 
                  alt={product.name}
                  onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/300x200/e2e8f0/e2e8f0?text=No+Image'; }}
                />
                {product.quantity === 0 && <div className="stock-overlay">Out of Stock</div>}
              </div>
              <div className="product-card-info">
                <span className="product-name">{product.name}</span>
                <span 
                  className={`
                    product-stock 
                    ${product.quantity === 0 ? 'stock-out' : ''}
                    ${(product.quantity > 0 && product.reorderLevel && product.quantity <= product.reorderLevel) ? 'stock-low' : ''}
                  `}
                >
                  {product.quantity} in stock
                </span>
                <span className="product-price">₱{product.price.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="current-sale">
        <h2>Current Sale</h2>
        <div className="cart-items">
          {cartItems.length === 0 && <p className="empty-cart">Cart is empty</p>}
          {cartItems.map(item => (
            <div key={item._id} className="cart-item">
              <div className="item-info">
                <span className="item-name">{item.name}</span>
                <span className="item-price">₱{(item.price * item.cartQuantity).toFixed(2)}</span>
              </div>
              <div className="item-controls">
                <button onClick={() => updateQuantity(item, -1)}>-</button>
                <span>{item.cartQuantity}</span>
                <button onClick={() => updateQuantity(item, 1)}>+</button>
              </div>
            </div>
          ))}
        </div>
        <div className="sale-summary">
          <div className="total">
            <span>Total</span>
            <span>₱{calculateTotal().toFixed(2)}</span>
          </div>
          <button className="complete-sale-btn" onClick={handleCompleteSale}>Complete Sale</button>
        </div>
      </div>

      {showReceiptModal && lastSaleData && (
        <ReceiptModal 
          saleData={lastSaleData}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </div>
  );
};

export default SalesPage;