// client/src/context/WarningContext.js
import React, { createContext, useState, useContext } from 'react';

const WarningContext = createContext();

export const useWarning = () => useContext(WarningContext);

export const WarningProvider = ({ children }) => {
  // MODIFIED: State is now an array (a queue) instead of a single object
  const [warningQueue, setWarningQueue] = useState([]);

  // MODIFIED: This function now adds a new warning to the end of the queue
  const showWarning = (data) => {
    setWarningQueue(prevQueue => [...prevQueue, data]);
  };

  // MODIFIED: This function now removes the first warning from the queue
  const hideWarning = () => {
    setWarningQueue(prevQueue => prevQueue.slice(1));
  };

  // The modal will only ever see the first item in the queue
  const currentWarning = warningQueue[0] || null;

  const value = {
    warning: currentWarning, // Keep the 'warning' prop name for the modal
    showWarning,
    hideWarning,
  };

  return (
    <WarningContext.Provider value={value}>
      {children}
    </WarningContext.Provider>
  );
};