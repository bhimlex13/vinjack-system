// client/src/pages/SalesPage.js
import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import AuthContext from '../context/AuthContext';
import '../styles/SalesPage.css';

const SalesPage = () => {
  const [products, setProducts] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useContext(AuthContext); // To get the user who recorded the sale

  // Fetch all products when the component loads
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await api.get('/products');
        setProducts(response.data);
      } catch (error) {
        console.error("Failed to fetch products", error);
      }
    };
    fetchProducts();
  }, []);

  const addProductToCart = (product) => {
    // Check if the product is already in the cart
    const exist = cartItems.find((item) => item._id === product._id);
    if (exist) {
      // If it exists, increase quantity, but don't exceed available stock
      setCartItems(
        cartItems.map((item) =>
          item._id === product._id && exist.quantity < product.quantity
            ? { ...exist, quantity: exist.quantity + 1 }
            : item
        )
      );
    } else {
      // If it doesn't exist, add it to the cart with a quantity of 1
      if (product.quantity > 0) {
        setCartItems([...cartItems, { ...product, quantity: 1 }]);
      }
    }
  };
  
  const updateQuantity = (product, amount) => {
    const exist = cartItems.find((item) => item._id === product._id);
    if (!exist) return;
  
    const newQuantity = exist.quantity + amount;
  
    if (newQuantity <= 0) {
      // If quantity becomes 0 or less, remove the item
      setCartItems(cartItems.filter((item) => item._id !== product._id));
    } else if (newQuantity <= product.quantity) {
      // Otherwise, update the quantity
      setCartItems(
        cartItems.map((item) =>
          item._id === product._id ? { ...exist, quantity: newQuantity } : item
        )
      );
    }
  };
  
  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  };
  
  const handleCompleteSale = async () => {
    if (cartItems.length === 0) {
      alert("Cart is empty.");
      return;
    }

    const saleData = {
      items: cartItems.map(item => ({
        product: item._id,
        quantity: item.quantity,
        priceAtTime: item.price,
        costAtTime: item.cost
      })),
      services: [], // We'll add services later
      totalAmount: calculateTotal(),
      recordedBy: user._id,
    };
    
    try {
      await api.post('/sales', saleData);
      alert('Sale completed successfully!');
      setCartItems([]); // Clear the cart
      // You might want to refetch products here to update stock numbers visually
    } catch (error) {
      alert(`Sale failed: ${error.response?.data?.message || error.message}`);
    }
  };
  
  // Filter products based on search term
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pos-container">
      {/* Left Column: Product List */}
      <div className="product-selection">
        <h2>Products</h2>
        <input
          type="text"
          placeholder="Search for products..."
          className="search-bar"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="product-list">
          {filteredProducts.map(product => (
            <div key={product._id} className="product-item" onClick={() => addProductToCart(product)}>
              <span>{product.name}</span>
              <span>₱{product.price.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Current Sale (Cart) */}
      <div className="current-sale">
        <h2>Current Sale</h2>
        <div className="cart-items">
          {cartItems.length === 0 && <p className="empty-cart">Cart is empty</p>}
          {cartItems.map(item => (
            <div key={item._id} className="cart-item">
              <div className="item-info">
                <span className="item-name">{item.name}</span>
                <span className="item-price">₱{(item.price * item.quantity).toFixed(2)}</span>
              </div>
              <div className="item-controls">
                <button onClick={() => updateQuantity(item, -1)}>-</button>
                <span>{item.quantity}</span>
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
    </div>
  );
};

export default SalesPage;