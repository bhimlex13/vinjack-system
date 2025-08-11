// client/src/context/ConfirmationContext.js
import React, { createContext, useState, useCallback } from 'react';
import ConfirmationModal from '../components/ConfirmationModal';

const ConfirmationContext = createContext();

export const ConfirmationProvider = ({ children }) => {
  const [confirmationState, setConfirmationState] = useState(null);

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      setConfirmationState({
        message,
        resolve,
      });
    });
  }, []);

  const handleConfirm = () => {
    if (confirmationState) {
      confirmationState.resolve(true);
      setConfirmationState(null);
    }
  };

  const handleCancel = () => {
    if (confirmationState) {
      confirmationState.resolve(false);
      setConfirmationState(null);
    }
  };

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      <ConfirmationModal
        isOpen={!!confirmationState}
        message={confirmationState?.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmationContext.Provider>
  );
};

export default ConfirmationContext;