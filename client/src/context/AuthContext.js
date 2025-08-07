// client/src/context/AuthContext.js
import React, { createContext, useReducer, useEffect } from 'react';
import api from '../api/axios';

const initialState = {
  user: null,
  token: null,
  lowStockItems: [],
};

// Check for user info in localStorage when the app starts
const storedUser = localStorage.getItem('user');
if (storedUser) {
  const userData = JSON.parse(storedUser);
  initialState.user = userData;
  initialState.token = userData.token;
}

const AuthContext = createContext(initialState);

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return { ...state, user: action.payload, token: action.payload.token };
    case 'LOGOUT':
      return { ...state, user: null, token: null, lowStockItems: [] };
    case 'SET_LOW_STOCK_ITEMS':
      return { ...state, lowStockItems: action.payload };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // THIS IS THE CORRECTED useEffect
  // It now runs once when the app loads (due to the empty dependency array [])
  useEffect(() => {
    const fetchLowStock = async () => {
      // It still checks if a user is logged in before trying to fetch
      if (state.user) {
        try {
          const res = await api.get('/products/low-stock');
          dispatch({ type: 'SET_LOW_STOCK_ITEMS', payload: res.data });
        } catch (error) {
          console.error("Could not fetch low stock items.", error);
        }
      }
    };
    fetchLowStock();
  }, [state.user]); // We keep state.user here to refetch when the user changes (login/logout)


  const login = async (username, password) => {
    try {
      const res = await api.post('/users/login', {
        username,
        password,
      });
      localStorage.setItem('user', JSON.stringify(res.data));
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: res.data,
      });
      // After a successful login, we manually trigger the alert fetch
      try {
        const lowStockRes = await api.get('/products/low-stock');
        dispatch({ type: 'SET_LOW_STOCK_ITEMS', payload: lowStockRes.data });
      } catch (error) {
        console.error("Could not fetch low stock items after login.", error);
      }
      return { success: true };
    } catch (error) {
        const errorMessage = error.response?.data?.message || 'Network error or server is not responding.';
        return { success: false, message: errorMessage };
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;