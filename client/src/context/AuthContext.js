// client/src/context/AuthContext.js
import React, { createContext, useReducer, useEffect } from 'react';
import api from '../api/axios';

// Initial state: check localStorage for existing user data
const initialState = {
  user: null,
  token: null,
};

// Check for user info in localStorage when the app starts
const storedUser = localStorage.getItem('user');
if (storedUser) {
  const userData = JSON.parse(storedUser);
  initialState.user = userData;
  initialState.token = userData.token;
}

const AuthContext = createContext(initialState);

// Reducer function to manage state changes
const authReducer = (state, action) => {
  switch (action.type) {
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
      };
    default:
      return state;
  }
};

// Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Login action
  const login = async (username, password) => {
    try {
     const res = await api.post('/users/login', {
        username,
        password,
      });
      // Store user and token in localStorage to persist login
      localStorage.setItem('user', JSON.stringify(res.data));
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: res.data,
      });
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error.response.data.message);
      return { success: false, message: error.response.data.message };
    }
  };

  // Logout action
  const logout = () => {
    localStorage.removeItem('user');
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider value={{ user: state.user, token: state.token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;