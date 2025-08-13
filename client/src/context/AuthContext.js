// client/src/context/AuthContext.js
import React, { createContext, useReducer, useEffect, useCallback } from 'react';
import api from '../api/axios';
// --- ADDED: Import the socket.io client ---
import { io } from 'socket.io-client';

const initialState = {
  user: null,
  token: null,
  isInitializing: true,
  lowStockItems: [],
  notifications: [],
};

const AuthContext = createContext({
    ...initialState,
    login: () => Promise.resolve(),
    logout: () => {},
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
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isInitializing: false,
        lowStockItems: [],
        notifications: [],
      };
    case 'SET_LOW_STOCK_ITEMS':
      return { ...state, lowStockItems: action.payload };
    case 'SET_NOTIFICATIONS':
      return { ...state, notifications: action.payload };
    // --- ADDED: New reducer case to handle incoming real-time notifications ---
    case 'ADD_NOTIFICATION':
      // Prepend the new notification to the top of the list
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

  // This useEffect handles session persistence from localStorage
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

  // This useEffect handles fetching initial data like notifications
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

  // --- ADDED: useEffect for managing the Socket.IO connection ---
  useEffect(() => {
    // Only connect if there is a logged-in user
    if (state.user) {
      // Connect to the server. Make sure the URL is correct.
      const socket = io(process.env.REACT_APP_API_URL);

      // Join a private room based on the user's ID
      socket.emit('joinRoom', state.user._id);

      // Listen for the 'new_notification' event from the server
      socket.on('new_notification', (notification) => {
        console.log('Real-time notification received:', notification);
        dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
      });

      // Cleanup on component unmount or when user logs out
      return () => {
        socket.disconnect();
      };
    }
  }, [state.user]); // This effect depends on the user state

  const login = async (username, password) => {
    try {
      const res = await api.post('/users/login', { username, password });
      localStorage.setItem('user', JSON.stringify(res.data));
      api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      dispatch({ type: 'LOGIN_SUCCESS', payload: res.data });
      return { success: true };
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

  const markNotificationsAsRead = async () => {
    try {
      await api.post('/notifications/read');
      dispatch({ type: 'NOTIFICATIONS_READ' });
    } catch (error) {
      console.error("Failed to mark notifications as read", error);
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, markNotificationsAsRead }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;