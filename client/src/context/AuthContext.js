// client/src/context/AuthContext.js
import React, { createContext, useReducer, useEffect, useCallback, useState } from 'react';
import api from '../api/axios';
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
    socket: null, // --- NEW: Expose socket in context
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
        permissions: action.payload?.permissions || [], 
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
      // Prevent duplicate notifications
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
  
  // --- NEW: State to hold the shared socket instance ---
  const [socket, setSocket] = useState(null);

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

  // --- LOGOUT DEFINITION ---
  const logout = useCallback(async () => {
    try {
      await api.post('/users/logout');
      console.log("Server logout successful");
    } catch (error) {
      console.error("Server logout failed, proceeding with client-side logout:", error.response?.data?.message || error.message);
    } finally {
      localStorage.removeItem('user');
      delete api.defaults.headers.common['Authorization'];
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  // --- FETCH INITIAL DATA DEFINITION ---
  const fetchInitialData = useCallback(async () => {
    if (state.token) {
      try {
        const perms = state.permissions;
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
            logout(); 
        }
      }
    }
  }, [state.token, state.permissions, logout]); 

  // --- USE EFFECT FOR FETCHING DATA ---
  useEffect(() => {
    if (!state.isInitializing && state.user) {
      fetchInitialData();
    }
  }, [state.isInitializing, state.user, fetchInitialData]);

  // --- USE EFFECT FOR SOCKET.IO ---
  useEffect(() => {
    let socketInstance;
    if (state.user && state.token) { 
      
      const SERVER_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      
      // Initialize socket with Auth Token
      socketInstance = io(SERVER_URL, {
          auth: { token: state.token } 
      });

      // --- NEW: Save instance to state so it can be shared ---
      setSocket(socketInstance);

      socketInstance.emit('joinRoom', state.user._id);

      socketInstance.on('new_notification', (notification) => {
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

        if (
          notification.type === 'LOW_STOCK' || 
          notification.type === 'CRITICAL_STOCK' || 
          notification.type === 'OUT_OF_STOCK'
        ) {
          showWarning(notification); 
        }
      });

      socketInstance.on('connect_error', (err) => {
          console.error('Socket connection error:', err.message);
          if (err.message === 'Authentication error') {
              logout(); 
          }
      });

      return () => {
        console.log('Disconnecting socket...');
        socketInstance.disconnect();
        setSocket(null); // Clear socket on cleanup
      };
    }
  }, [state.user, state.token, showWarning, logout]);

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
    if (state.permissions.includes('SUPER_ADMIN_ALL')) {
      return true;
    }
    return state.permissions.includes(permissionKey);
  }, [state.permissions]); 

  return (
    <AuthContext.Provider 
      value={{ 
        ...state, 
        socket, // --- NEW: Expose socket to children
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