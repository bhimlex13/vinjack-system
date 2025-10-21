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
};

const AuthContext = createContext({
    ...initialState,
    login: () => Promise.resolve(),
    logout: () => {}, // Changed this to async in the provider value later
    passwordChangeCompleted: () => {},
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
        mustChangePassword: action.payload.mustChangePassword,
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
      // Prevent duplicates in case of rapid events
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
        const [lowStockRes, notificationsRes] = await Promise.all([
          api.get('/products/low-stock'),
          api.get('/notifications'),
        ]);
        dispatch({ type: 'SET_LOW_STOCK_ITEMS', payload: lowStockRes.data });
        dispatch({ type: 'SET_NOTIFICATIONS', payload: notificationsRes.data });
      } catch (error) {
        console.error("Could not fetch initial data.", error);
        // Handle token expiry or invalid token
        if (error.response && error.response.status === 401) {
            console.log("Token expired or invalid. Logging out.");
            logout(); // Call the logout function which now handles API call too
        }
      }
    }
  }, [state.token]); // Added logout to dependency array implicitly via its usage

  useEffect(() => {
    if (!state.isInitializing && state.user) {
      fetchInitialData();
    }
  }, [state.isInitializing, state.user, fetchInitialData]);

  useEffect(() => {
    let socket;
    if (state.user && state.token) { // Make sure token exists too
      socket = io(process.env.REACT_APP_API_URL, {
          auth: { token: state.token } // Send token for authentication if needed
      });

      socket.emit('joinRoom', state.user._id);

      socket.on('new_notification', (notification) => {
        console.log('Real-time notification received:', notification);
        dispatch({ type: 'ADD_NOTIFICATION', payload: notification });

        switch (notification.type) {
          case 'LOW_STOCK':
            toast.warn(notification.message); // Orange
            break;
          case 'CRITICAL_STOCK':
            toast.error(notification.message); // Red
            break;
          case 'OUT_OF_STOCK':
            toast.dark(notification.message); // Grey/Dark
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
          // Handle authentication errors, e.g., invalid token
          if (err.message === 'Authentication error') {
              logout(); // Logout if token is bad
          }
      });

      return () => {
        console.log('Disconnecting socket...');
        socket.disconnect();
      };
    }
    // Cleanup function if user logs out while socket is active
    return () => {
        if (socket) {
            socket.disconnect();
        }
    };
  }, [state.user, state.token, showWarning]); // Added state.token dependency

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

  // --- MODIFIED: Added async and API call ---
  const logout = async () => {
    try {
      // Make API call first to log the action on the server
      await api.post('/users/logout');
      console.log("Server logout successful");
    } catch (error) {
      // Log the error but proceed with client-side logout anyway
      console.error("Server logout failed, proceeding with client-side logout:", error.response?.data?.message || error.message);
    } finally {
      // Always clear client-side data regardless of API call success
      localStorage.removeItem('user');
      delete api.defaults.headers.common['Authorization'];
      dispatch({ type: 'LOGOUT' });
    }
  };
  // --- END MODIFICATION ---

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
    // Make sure the context value provides the async logout
    <AuthContext.Provider value={{ ...state, login, logout, passwordChangeCompleted, markNotificationsAsRead }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;