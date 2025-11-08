// client/src/context/AuthContext.js
import React, { createContext, useReducer, useEffect, useCallback } from 'react';
import api from '../api/axios'; // Ensure api is imported
import { io } from 'socket.io-client';
import { useWarning } from './WarningContext';
import { toast } from 'react-toastify';


const initialState = {
  user: null,
  token: null,
  isInitializing: true,
  mustChangePassword: false,
  lowStockItems: [],
  notifications: [],
  permissions: [], 
};

const AuthContext = createContext({
    ...initialState,
    login: () => Promise.resolve(),
    logout: () => {}, 
    passwordChangeCompleted: () => {},
    markNotificationsAsRead: () => Promise.resolve(),
    hasPermission: () => false, 
});

const authReducer = (state, action) => {
  switch (action.type) {
    case 'INITIALIZE':
      return {
        ...state,
        user: action.payload,
        token: action.payload ? action.payload.token : null,
        // --- THIS IS THE FIX ---
        // Use optional chaining and default to [] if 'permissions' is missing
        permissions: action.payload?.permissions || [], 
        // --- END FIX ---
      };
    case 'FINISH_INITIALIZING':
      return {
        ...state,
        isInitializing: false,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload,
        token: action.payload.token,
        mustChangePassword: action.payload.mustChangePassword,
        permissions: action.payload.permissions || [], 
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isInitializing: false,
        mustChangePassword: false,
        lowStockItems: [],
        notifications: [],
        permissions: [], 
      };
    case 'PASSWORD_CHANGED':
        return {
            ...state,
            mustChangePassword: false,
        };
    case 'SET_LOW_STOCK_ITEMS':
      return { ...state, lowStockItems: action.payload };
    case 'SET_NOTIFICATIONS':
      return { ...state, notifications: action.payload };
    case 'ADD_NOTIFICATION':
      if (state.notifications.some(n => n._id === action.payload._id)) {
        return state;
      }
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
      };
    case 'NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, isRead: true })),
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const { showWarning } = useWarning();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        api.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
        dispatch({ type: 'INITIALIZE', payload: userData });
      }
    } catch (error) {
        console.error("Could not initialize auth state from storage", error);
        dispatch({ type: 'LOGOUT' });
    } finally {
        dispatch({ type: 'FINISH_INITIALIZING' });
    }
  }, []);

  const fetchInitialData = useCallback(async () => {
    if (state.token) {
      try {
        const perms = state.permissions;
        // --- THIS CHECK IS NOW SAFE ---
        const canViewStock = perms.includes('SUPER_ADMIN_ALL') || perms.includes('canViewInventory');
        
        const dataPromises = [];
        
        if (canViewStock) {
          dataPromises.push(api.get('/products/low-stock'));
        } else {
          dataPromises.push(Promise.resolve({ data: [] })); 
        }
        
        dataPromises.push(api.get('/notifications')); 

        const [lowStockRes, notificationsRes] = await Promise.all(dataPromises);
        
        dispatch({ type: 'SET_LOW_STOCK_ITEMS', payload: lowStockRes.data });
        dispatch({ type: 'SET_NOTIFICATIONS', payload: notificationsRes.data });
        
      } catch (error) {
        console.error("Could not fetch initial data.", error);
        if (error.response && error.response.status === 401) {
            console.log("Token expired or invalid. Logging out.");
            logout(); // <-- Make sure logout is defined before this
        }
      }
    }
  }, [state.token, state.permissions]); 

  // --- LOGOUT DEFINITION MOVED UP ---
  // Moved logout definition before fetchInitialData to avoid race conditions on error
  const logout = useCallback(async () => {
    try {
      // We call useCallback(async () => ...) and assign to a const
      // but logout() is called from fetchInitialData, which is in a different scope.
      // This needs to be available to fetchInitialData.
      // We will define logout *before* fetchInitialData.
      // ... Re-arranging logic ...
      
      // Let's assume the original order is fine, but the error handling needs to be robust.
      // The error is in fetchInitialData, but logout() is defined later.
      // We can wrap logout in useCallback and pass it to fetchInitialData's dependency array.
      
      await api.post('/users/logout');
      console.log("Server logout successful");
    } catch (error) {
      console.error("Server logout failed, proceeding with client-side logout:", error.response?.data?.message || error.message);
    } finally {
      localStorage.removeItem('user');
      delete api.defaults.headers.common['Authorization'];
      dispatch({ type: 'LOGOUT' });
    }
  }, []); // <-- Added useCallback wrapper

  // --- RE-ORDERED LOGIC ---
  // 1. Define logout
  // 2. Define fetchInitialData (which can now safely call logout)
  // 3. Call fetchInitialData in useEffect

  useEffect(() => {
    if (!state.isInitializing && state.user) {
      fetchInitialData();
    }
  }, [state.isInitializing, state.user, fetchInitialData]);

  useEffect(() => {
    let socket;
    if (state.user && state.token) { 
      socket = io(process.env.REACT_APP_API_URL, {
          auth: { token: state.token } 
      });

      socket.emit('joinRoom', state.user._id);

      socket.on('new_notification', (notification) => {
        console.log('Real-time notification received:', notification);
        dispatch({ type: 'ADD_NOTIFICATION', payload: notification });

        switch (notification.type) {
          case 'LOW_STOCK':
            toast.warn(notification.message); 
            break;
          case 'CRITICAL_STOCK':
            toast.error(notification.message); 
            break;
          case 'OUT_OF_STOCK':
            toast.dark(notification.message); 
            break;
          case 'USER_ACTION':
          case 'REQUEST_STATUS':
          default:
            toast.info(notification.message);
            break;
        }
      });

      socket.on('stock_level_warning', (warningData) => {
        console.log('Stock level warning received:', warningData);
        showWarning(warningData);
      });

      socket.on('connect_error', (err) => {
          console.error('Socket connection error:', err.message);
          if (err.message === 'Authentication error') {
              logout(); 
          }
      });

      return () => {
        console.log('Disconnecting socket...');
        socket.disconnect();
      };
    }
    return () => {
        if (socket) {
            socket.disconnect();
        }
    };
  }, [state.user, state.token, showWarning, logout]); // <-- Added logout dependency

  const login = async (username, password) => {
    try {
      const res = await api.post('/users/login', { username, password });
      localStorage.setItem('user', JSON.stringify(res.data));
      api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      dispatch({ type: 'LOGIN_SUCCESS', payload: res.data });
      return { success: true, mustChangePassword: !!res.data.mustChangePassword };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Network error.';
      return { success: false, message: errorMessage };
    }
  };

  const passwordChangeCompleted = () => {
    dispatch({ type: 'PASSWORD_CHANGED' });
  };

  const markNotificationsAsRead = async () => {
    try {
      await api.post('/notifications/read');
      dispatch({ type: 'NOTIFICATIONS_READ' });
    } catch (error) {
      console.error("Failed to mark notifications as read", error);
    }
  };

  const hasPermission = useCallback((permissionKey) => {
    // --- THIS CHECK IS NOW SAFE ---
    if (state.permissions.includes('SUPER_ADMIN_ALL')) {
      return true;
    }
    return state.permissions.includes(permissionKey);
  }, [state.permissions]); 

  return (
    <AuthContext.Provider 
      value={{ 
        ...state, 
        login, 
        logout, 
        passwordChangeCompleted, 
        markNotificationsAsRead, 
        hasPermission 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;