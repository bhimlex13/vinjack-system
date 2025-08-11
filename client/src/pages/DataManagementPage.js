// client/src/pages/DataManagementPage.js
import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import '../styles/DataManagementPage.css';
import Modal from '../components/Modal';

const DataManagementPage = () => {
  const [activeTab, setActiveTab] = useState('categories');
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newItemName, setNewItemName] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const catRes = await api.get('/categories');
      const brandRes = await api.get('/brands');
      setCategories(catRes.data);
      setBrands(brandRes.data);
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = (item = null) => {
    setEditingItem(item);
    setNewItemName(item ? item.name : '');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const endpoint = activeTab === 'categories' ? '/categories' : '/brands';
    const payload = { name: newItemName };
    
    try {
      if (editingItem) {
        // Update
        await api.put(`${endpoint}/${editingItem._id}`, payload);
      } else {
        // Create
        await api.post(endpoint, payload);
      }
      fetchData();
      setIsModalOpen(false);
    } catch (error) {
      alert(`Failed to save: ${error.response?.data?.message || 'Server error'}`);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
        const endpoint = activeTab === 'categories' ? '/categories' : '/brands';
        try {
            await api.delete(`${endpoint}/${id}`);
            fetchData();
        } catch (error) {
            alert(`Failed to delete: ${error.response?.data?.message || 'Server error'}`);
        }
    }
  };

  const renderTable = () => {
    const data = activeTab === 'categories' ? categories : brands;
    return (
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map(item => (
            <tr key={item._id}>
              <td>{item.name}</td>
              <td className="actions">
                <button className="btn-edit" onClick={() => openModal(item)}>Edit</button>
                <button className="btn-delete" onClick={() => handleDelete(item._id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="data-management-container">
      <h1>Data Management</h1>
      <div className="tabs">
        <button 
          className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`} 
          onClick={() => setActiveTab('categories')}
        >
          Categories
        </button>
        <button 
          className={`tab-btn ${activeTab === 'brands' ? 'active' : ''}`} 
          onClick={() => setActiveTab('brands')}
        >
          Brands
        </button>
      </div>

      <div className="tab-content">
        <div className="content-header">
          <h2>Manage {activeTab === 'categories' ? 'Categories' : 'Brands'}</h2>
          <button className="add-btn" onClick={() => openModal()}>
            Add New {activeTab === 'categories' ? 'Category' : 'Brand'}
          </button>
        </div>
        {isLoading ? <p>Loading...</p> : renderTable()}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? 'Edit Item' : 'Add New Item'}>
        <div className="form-group">
          <label>Name</label>
          <input 
            type="text" 
            value={newItemName} 
            onChange={(e) => setNewItemName(e.target.value)} 
          />
        </div>
        <button className="save-btn" onClick={handleSave}>Save</button>
      </Modal>
    </div>
  );
};

export default DataManagementPage;