import React from 'react'
import { useUser } from '../../context/UserContextApi';
import { Navigate, Outlet } from 'react-router-dom';

const IsLogin = () => {
     const { user , loading } = useUser();
    console.log("user ",user,"loading",loading)
  // If user data is still loading, show a loader (prevent flickering issues)
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 to-blue-900">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
    </div>
  );
  return (
    user ? <Outlet/> : <Navigate to='/login'/>
  )
}

export default IsLogin;