// client/src/pages/SuppliersPage.js
import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import '../styles/InventoryPage.css';
import Modal from '../components/Modal';
import SupplierForm from '../components/SupplierForm';
import RecordDeliveryForm from '../components/RecordDeliveryForm'; // <-- Import the new form

const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false); // <-- New state for delivery modal
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
      setSuppliers(suppliers.map(s => s._id === newSupplierData._id ? newSupplierData : s));
    } else {
      setSuppliers([...suppliers, newSupplierData]);
    }
  };

  const openSupplierModalForAdd = () => {
    setEditingSupplier(null);
    setIsSupplierModalOpen(true);
  };
  
  const openSupplierModalForEdit = (supplier) => {
    setEditingSupplier(supplier);
    setIsSupplierModalOpen(true);
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
      {/* Modal for adding/editing a supplier */}
      <Modal 
        isOpen={isSupplierModalOpen} 
        onClose={() => setIsSupplierModalOpen(false)} 
        title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
      >
        <SupplierForm
          onFormSubmit={handleFormSubmit}
          supplierToEdit={editingSupplier}
          onClose={() => setIsSupplierModalOpen(false)}
        />
      </Modal>

      {/* New Modal for recording a delivery */}
      <Modal
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
        title="Record New Delivery"
      >
        <RecordDeliveryForm onClose={() => setIsDeliveryModalOpen(false)} />
      </Modal>

      <div className="inventory-header">
        <h1>Supplier Management</h1>
        <div>
          <button className="add-product-btn" onClick={openSupplierModalForAdd} style={{ marginRight: '1rem' }}>
            Add Supplier
          </button>
          <button 
            className="add-product-btn" 
            onClick={() => setIsDeliveryModalOpen(true)} // <-- This opens the delivery modal
            style={{ backgroundColor: '#28a745' }}
          >
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
                  <button className="btn-edit" onClick={() => openSupplierModalForEdit(supplier)}>Edit</button>
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