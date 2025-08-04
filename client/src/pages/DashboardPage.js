import React, { useContext } from 'react';
import AuthContext from '../context/AuthContext'; // We'll use this later

const DashboardPage = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <div>
      {/* Display a welcome message if the user object exists */}
      <h1>Welcome to the Dashboard, {user ? user.fullName : 'Guest'}!</h1>
      <p>This is your main hub for managing sales and inventory.</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

export default DashboardPage;