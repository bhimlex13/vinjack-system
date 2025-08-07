import React, { useState, useEffect, useMemo, useContext } from 'react';
import api from '../api/axios';
import '../styles/InventoryPage.css';
import Modal from '../components/Modal';
import ProductForm from '../components/ProductForm';
import AuthContext from '../context/AuthContext';

const InventoryPage = () => {
  const { user } = useContext(AuthContext); 
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      const productsResponse = await api.get('/products');
      const categoriesResponse = await api.get('/categories');
      setProducts(productsResponse.data);
      setCategories(categoriesResponse.data);
    } catch (err) {
      setError('Failed to fetch data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const searchMatch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.itemCode.toLowerCase().includes(searchTerm.toLowerCase());
      const categoryMatch = filterCategory ? product.category?._id === filterCategory : true;
      return searchMatch && categoryMatch;
    });
  }, [products, searchTerm, filterCategory]);

  const handleFormSubmit = () => {
    fetchInitialData();
  };

  const openModalForEdit = (product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const openModalForAdd = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await api.delete(`/products/${productId}`);
        setProducts(products.filter(p => p._id !== productId));
      } catch (err) {
        setError('Failed to delete product.');
      }
    }
  };

  if (isLoading) return <div className="loading">Loading inventory...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="inventory-container">
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProduct ? 'Edit Product' : 'Add New Product'}>
        <ProductForm
          onFormSubmit={handleFormSubmit} // <-- This line has been corrected
          productToEdit={editingProduct}
          onClose={() => setIsModalOpen(false)}
        />
      </Modal>

      <div className="inventory-header">
        <h1>Inventory Management</h1>
        {user && (user.role === 'Owner' || user.role === 'Clerk') && (
            <button className="add-product-btn" onClick={openModalForAdd}>Add New Product</button>
        )}
      </div>

      <div className="filter-controls">
          <input
            type="text"
            placeholder="Search by name or item code..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="filter-select"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat._id} value={cat._id}>{cat.name}</option>
            ))}
          </select>
      </div>

      <table className="products-table">
        <thead>
          <tr>
            <th>Item Code</th>
            <th>Product Name</th>
            <th>Category</th>
            <th>Brand</th>
            <th>Price</th>
            <th>Quantity</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredProducts.map((product) => (
              <tr key={product._id}>
                <td>{product.itemCode}</td>
                <td>{product.name}</td>
                <td>{product.category?.name || 'N/A'}</td>
                <td>{product.brand?.name || 'N/A'}</td>
                <td>₱{product.price.toFixed(2)}</td>
                <td>{product.quantity}</td>
                <td>
                  <span className={`status ${product.quantity <= product.reorderLevel ? 'status-low' : 'status-ok'}`}>
                    {product.quantity <= product.reorderLevel ? 'Low Stock' : 'In Stock'}
                  </span>
                </td>
                <td className="actions">
                  {user && (user.role === 'Owner' || user.role === 'Clerk') && (
                    <button className="btn-edit" onClick={() => openModalForEdit(product)}>Edit</button>
                  )}
                  {user && user.role === 'Owner' && (
                    <button className="btn-delete" onClick={() => handleDelete(product._id)}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryPage;