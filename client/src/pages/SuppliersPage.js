// client/src/pages/SuppliersPage.js
import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import '../styles/InventoryPage.css'; // We can reuse these styles
import Modal from '../components/Modal';
import SupplierForm from '../components/SupplierForm';

const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers');
      setSuppliers(response.data);
    } catch (err) {
      console.error("Failed to fetch suppliers", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (newSupplierData) => {
    if (editingSupplier) {
      // Update existing supplier in the list
      setSuppliers(suppliers.map(s => s._id === newSupplierData._id ? newSupplierData : s));
    } else {
      // Add new supplier to the list
      setSuppliers([...suppliers, newSupplierData]);
    }
  };

  const openModalForAdd = () => {
    setEditingSupplier(null);
    setIsModalOpen(true);
  };
  
  const openModalForEdit = (supplier) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleDelete = async (supplierId) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await api.delete(`/suppliers/${supplierId}`);
        setSuppliers(suppliers.filter(s => s._id !== supplierId));
      } catch (err) {
        console.error('Failed to delete supplier', err);
      }
    }
  };

  if (isLoading) return <div className="loading">Loading suppliers...</div>;

  return (
    <div className="inventory-container">
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
      >
        <SupplierForm
          onFormSubmit={handleFormSubmit}
          supplierToEdit={editingSupplier}
          onClose={() => setIsModalOpen(false)}
        />
      </Modal>

      <div className="inventory-header">
        <h1>Supplier Management</h1>
        <div>
          <button className="add-product-btn" onClick={openModalForAdd} style={{ marginRight: '1rem' }}>
            Add Supplier
          </button>
          <button className="add-product-btn" style={{ backgroundColor: '#28a745' }}>
            Record Delivery
          </button>
        </div>
      </div>

      <table className="products-table">
        <thead>
          <tr>
            <th>Supplier Name</th>
            <th>Contact Person</th>
            <th>Contact Number</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {suppliers.length > 0 ? (
            suppliers.map((supplier) => (
              <tr key={supplier._id}>
                <td>{supplier.name}</td>
                <td>{supplier.contactPerson || 'N/A'}</td>
                <td>{supplier.contactNumber || 'N/A'}</td>
                <td className="actions">
                  <button className="btn-edit" onClick={() => openModalForEdit(supplier)}>Edit</button>
                  <button className="btn-delete" onClick={() => handleDelete(supplier._id)}>Delete</button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" className="no-products">
                No suppliers found. Add one to get started.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default SuppliersPage;