// client/src/context/AuthContext.js
import React, { createContext, useReducer, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { io } from 'socket.io-client';
import { useWarning } from './WarningContext';
import { toast } from 'react-toastify';


const initialState = {
  user: null,
  token: null,
  isInitializing: true,
  mustChangePassword: false, // ADDED: To track if password change is needed
  lowStockItems: [],
  notifications: [],
};

const AuthContext = createContext({
    ...initialState,
    login: () => Promise.resolve(),
    logout: () => {},
    passwordChangeCompleted: () => {}, // ADDED
    markNotificationsAsRead: () => Promise.resolve(),
});

const authReducer = (state, action) => {
  switch (action.type) {
    case 'INITIALIZE':
      return {
        ...state,
        user: action.payload,
        token: action.payload ? action.payload.token : null,
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
        mustChangePassword: action.payload.mustChangePassword, // MODIFIED: Set flag on login
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isInitializing: false,
        mustChangePassword: false, // Reset flag
        lowStockItems: [],
        notifications: [],
      };
    case 'PASSWORD_CHANGED': // ADDED: New action to clear the flag
        return {
            ...state,
            mustChangePassword: false,
        };
    case 'SET_LOW_STOCK_ITEMS':
      return { ...state, lowStockItems: action.payload };
    case 'SET_NOTIFICATIONS':
      return { ...state, notifications: action.payload };
    case 'ADD_NOTIFICATION':
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
        const [lowStockRes, notificationsRes] = await Promise.all([
          api.get('/products/low-stock'),
          api.get('/notifications'),
        ]);
        dispatch({ type: 'SET_LOW_STOCK_ITEMS', payload: lowStockRes.data });
        dispatch({ type: 'SET_NOTIFICATIONS', payload: notificationsRes.data });
      } catch (error) {
        console.error("Could not fetch initial data.", error);
      }
    }
  }, [state.token]);

  useEffect(() => {
    if (!state.isInitializing && state.user) {
      fetchInitialData();
    }
  }, [state.isInitializing, state.user, fetchInitialData]);

  useEffect(() => {
    if (state.user) {
      const socket = io(process.env.REACT_APP_API_URL);

      socket.emit('joinRoom', state.user._id);

      socket.on('new_notification', (notification) => {
        console.log('Real-time notification received:', notification);
        dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
        
        switch (notification.type) {
          case 'LOW_STOCK':
            toast.warn(notification.message);
            break;
          case 'OUT_OF_STOCK':
            toast.error(notification.message);
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

      return () => {
        socket.disconnect();
      };
    }
  }, [state.user, showWarning]);

  const login = async (username, password) => {
    try {
      const res = await api.post('/users/login', { username, password });
      localStorage.setItem('user', JSON.stringify(res.data));
      api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      dispatch({ type: 'LOGIN_SUCCESS', payload: res.data });
      // MODIFIED: Return success and the flag
      return { success: true, mustChangePassword: !!res.data.mustChangePassword };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Network error.';
      return { success: false, message: errorMessage };
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
    dispatch({ type: 'LOGOUT' });
  };
  
  // ADDED: Function to call when password has been successfully changed
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

  return (
    <AuthContext.Provider value={{ ...state, login, logout, passwordChangeCompleted, markNotificationsAsRead }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;