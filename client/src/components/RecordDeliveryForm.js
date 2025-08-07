// client/src/components/RecordDeliveryForm.js
import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import AuthContext from '../context/AuthContext';
import '../styles/DeliveryForm.css'; // We'll create this next

const RecordDeliveryForm = ({ onClose }) => {
  const { user } = useContext(AuthContext);

  // State for form data
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [productsReceived, setProductsReceived] = useState([]);

  // State for the "add item" row
  const [currentItem, setCurrentItem] = useState({ product: '', quantity: '', costAtTime: '' });

  // Fetch initial data for dropdowns
  useEffect(() => {
    const fetchData = async () => {
      try {
        const suppliersRes = await api.get('/suppliers');
        const productsRes = await api.get('/products');
        setSuppliers(suppliersRes.data);
        setProducts(productsRes.data);
      } catch (error) {
        console.error("Failed to fetch data for delivery form", error);
      }
    };
    fetchData();
  }, []);

  const handleItemChange = (e) => {
    setCurrentItem({ ...currentItem, [e.target.name]: e.target.value });
  };

  const handleAddItem = () => {
    if (!currentItem.product || !currentItem.quantity || !currentItem.costAtTime) {
      alert("Please fill all fields for the item.");
      return;
    }
    const productDetails = products.find(p => p._id === currentItem.product);
    setProductsReceived([...productsReceived, { ...currentItem, name: productDetails.name }]);
    // Reset the item form
    setCurrentItem({ product: '', quantity: '', costAtTime: '' });
  };

  const handleRemoveItem = (productId) => {
    setProductsReceived(productsReceived.filter(p => p.product !== productId));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSupplier || productsReceived.length === 0) {
      alert("Please select a supplier and add at least one product.");
      return;
    }
    
    const deliveryData = {
      supplier: selectedSupplier,
      productsReceived: productsReceived.map(({ name, ...rest }) => rest), // Remove the 'name' property before sending
      recordedBy: user._id
    };

    try {
      await api.post('/deliveries', deliveryData);
      alert('Delivery recorded successfully! Inventory has been updated.');
      onClose();
    } catch (error) {
      alert(`Failed to record delivery: ${error.response?.data?.message || error.message}`);
    }
  };

  return (
    <form className="delivery-form" onSubmit={handleSubmit}>
      <div className="form-section">
        <div className="form-group">
          <label>Supplier</label>
          <select value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)} required>
            <option value="">Select a supplier</option>
            {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="add-item-section">
        <h4>Add Products to Delivery</h4>
        <div className="add-item-controls">
          <select name="product" value={currentItem.product} onChange={handleItemChange}>
            <option value="">Select a product</option>
            {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
          <input type="number" name="quantity" placeholder="Quantity" value={currentItem.quantity} onChange={handleItemChange} />
          <input type="number" name="costAtTime" placeholder="Cost per Item" value={currentItem.costAtTime} onChange={handleItemChange} />
          <button type="button" onClick={handleAddItem}>Add Item</button>
        </div>
      </div>

      <div className="received-items-list">
        <h4>Products in this Delivery</h4>
        {productsReceived.length === 0 ? <p>No products added yet.</p> : (
          <ul>
            {productsReceived.map(item => (
              <li key={item.product}>
                <span>{item.quantity}x {item.name} @ ₱{item.costAtTime} each</span>
                <button type="button" onClick={() => handleRemoveItem(item.product)}>&times;</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <button type="submit" className="form-submit-btn">Save Delivery</button>
    </form>
  );
};

export default RecordDeliveryForm;