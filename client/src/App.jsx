import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import AuthForm from './pages/auth/Auth.jsx';
import Dashboard from './pages/dashboard/Dashboard';
import './App.css'
import IsLogin from './pages/auth/isLogin.jsx';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route element={<IsLogin />}>
            <Route path="/" element={<Dashboard />} />
          </Route>
          <Route path="/signup" element={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 to-blue-900">
              <AuthForm type="signup" />
            </div>
          } />
          <Route path="/login" element={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 to-blue-900">
              <AuthForm type="login" />
            </div>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
