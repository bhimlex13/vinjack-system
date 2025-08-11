// client/src/pages/InventoryPage.js
import React, { useState, useEffect, useMemo, useContext } from 'react';
import api from '../api/axios';
import '../styles/InventoryPage.css';
import Modal from '../components/Modal';
import ProductForm from '../components/ProductForm';
import AuthContext from '../context/AuthContext';
import ConfirmationContext from '../context/ConfirmationContext';
import { FaSearch, FaFilter, FaTimes } from 'react-icons/fa';

const InventoryPage = () => {
  const { user } = useContext(AuthContext);
  const { confirm } = useContext(ConfirmationContext);
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'status', direction: 'descending' });

  const getStatusValue = (product) => {
    if (product.quantity === 0) return 2;
    if (product.quantity <= product.reorderLevel) return 1;
    return 0;
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        const productsResponse = await api.get('/products');
        const categoriesResponse = await api.get('/categories');
        const brandsResponse = await api.get('/brands');
        
        const productsWithStatus = productsResponse.data.map(p => ({
            ...p,
            statusValue: getStatusValue(p)
        }));

        setProducts(productsWithStatus);
        setCategories(categoriesResponse.data);
        setBrands(brandsResponse.data);
      } catch (err) {
        setError('Failed to fetch data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const processedProducts = useMemo(() => {
    let processableProducts = [...products];

    processableProducts = processableProducts.filter(product => {
      const searchMatch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.itemCode.toLowerCase().includes(searchTerm.toLowerCase());
      const categoryMatch = filterCategory ? product.category?._id === filterCategory : true;
      const brandMatch = filterBrand ? product.brand?._id === filterBrand : true;
      return searchMatch && categoryMatch && brandMatch;
    });

    if (sortConfig.key !== null) {
      processableProducts.sort((a, b) => {
        const aValue = sortConfig.key === 'status' ? a.statusValue : (sortConfig.key.includes('.') ? sortConfig.key.split('.').reduce((o, i) => o?.[i], a) : a[sortConfig.key]);
        const bValue = sortConfig.key === 'status' ? b.statusValue : (sortConfig.key.includes('.') ? sortConfig.key.split('.').reduce((o, i) => o?.[i], b) : b[sortConfig.key]);

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return processableProducts;
  }, [products, searchTerm, filterCategory, filterBrand, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };
  
  const handleFormSubmit = () => {
    const fetchProducts = async () => {
        try {
            const response = await api.get('/products');
            const productsWithStatus = response.data.map(p => ({
                ...p,
                statusValue: getStatusValue(p)
            }));
            setProducts(productsWithStatus);
        } catch (err) {
            setError('Failed to refetch products.');
        }
    };
    fetchProducts();
  };
  
  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterCategory('');
    setFilterBrand('');
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
    // This function now only handles the API call, not the confirmation
    try {
      await api.delete(`/products/${productId}`);
      setProducts(products.filter(p => p._id !== productId));
    } catch (err) {
      setError('Failed to delete product.');
    }
  };

  const getStatusDetails = (product) => {
    if (product.quantity === 0) {
      return { text: 'Out of Stock', className: 'status-out' };
    }
    if (product.quantity <= product.reorderLevel) {
      return { text: 'Low Stock', className: 'status-low' };
    }
    return { text: 'In Stock', className: 'status-ok' };
  };

  if (isLoading) return <div className="loading">Loading inventory...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="inventory-container">
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProduct ? 'Edit Product' : 'Add New Product'}>
        <ProductForm
          onFormSubmit={handleFormSubmit}
          productToEdit={editingProduct}
          onClose={() => setIsModalOpen(false)}
          onProductDelete={handleDelete} // <-- Pass the delete handler
        />
      </Modal>

      <div className="inventory-header">
        <h1>Inventory Management</h1>
        {user && (user.role === 'Owner' || user.role === 'Clerk') && (
            <button className="add-product-btn" onClick={openModalForAdd}>Add New Product</button>
        )}
      </div>

      <div className="filter-controls">
        <div className="search-wrapper">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by name or item code..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-wrapper">
          <FaFilter className="filter-icon" />
          <select
            className={`filter-select ${filterCategory ? 'active' : ''}`}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat._id} value={cat._id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-wrapper">
          <FaFilter className="filter-icon" />
          <select
            className={`filter-select ${filterBrand ? 'active' : ''}`}
            value={filterBrand}
            onChange={(e) => setFilterBrand(e.target.value)}
          >
            <option value="">All Brands</option>
            {brands.map(brand => (
              <option key={brand._id} value={brand._id}>{brand.name}</option>
            ))}
          </select>
        </div>
        <button className="clear-filters-btn" onClick={handleClearFilters}>
          <FaTimes />
          Clear
        </button>
      </div>

      <table className="products-table">
        <thead>
          <tr>
            <th className={sortConfig.key === 'itemCode' ? 'active' : ''} onClick={() => requestSort('itemCode')}>Item Code{getSortIndicator('itemCode')}</th>
            <th className={sortConfig.key === 'name' ? 'active' : ''} onClick={() => requestSort('name')}>Product Name{getSortIndicator('name')}</th>
            <th className={sortConfig.key === 'category.name' ? 'active' : ''} onClick={() => requestSort('category.name')}>Category{getSortIndicator('category.name')}</th>
            <th className={sortConfig.key === 'brand.name' ? 'active' : ''} onClick={() => requestSort('brand.name')}>Brand{getSortIndicator('brand.name')}</th>
            <th className={sortConfig.key === 'price' ? 'active' : ''} onClick={() => requestSort('price')}>Price{getSortIndicator('price')}</th>
            <th className={sortConfig.key === 'quantity' ? 'active' : ''} onClick={() => requestSort('quantity')}>Quantity{getSortIndicator('quantity')}</th>
            <th className={sortConfig.key === 'reorderLevel' ? 'active' : ''} onClick={() => requestSort('reorderLevel')}>Reorder Level{getSortIndicator('reorderLevel')}</th>
            <th className={sortConfig.key === 'status' ? 'active' : ''} onClick={() => requestSort('status')}>Status{getSortIndicator('status')}</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {processedProducts.map((product) => {
            const status = getStatusDetails(product);
            return (
              <tr key={product._id} className={product.quantity === 0 ? 'row-out-of-stock' : ''}>
                <td>{product.itemCode}</td>
                <td>{product.name}</td>
                <td>{product.category?.name || 'N/A'}</td>
                <td>{product.brand?.name || 'N/A'}</td>
                <td>₱{product.price.toFixed(2)}</td>
                <td>{product.quantity}</td>
                <td>{product.reorderLevel}</td>
                <td>
                  <span className={`status ${status.className}`}>
                    {status.text}
                  </span>
                </td>
                <td className="actions">
                  {user && (user.role === 'Owner' || user.role === 'Clerk') && (
                    <button className="btn-edit" onClick={() => openModalForEdit(product)}>Edit</button>
                  )}
                  {/* The Delete button is now gone from the table */}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryPage;