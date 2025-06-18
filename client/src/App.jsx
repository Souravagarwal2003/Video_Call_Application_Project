import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import AuthForm from './pages/auth/Auth.jsx';
import Dashboard from './pages/dashboard/Dashboard';
import './App.css'
import IsLogin from './pages/auth/isLogin.jsx';

function App() {
  return (
    <Router>
      <Routes>
          <Route element={<IsLogin />}>
          <Route path="/" element={<Dashboard />} />
        </Route>
        <Route path="/signup" element={<AuthForm type="signup" />} />
        <Route path="/login" element={<AuthForm type="login" />} />
      </Routes>
    </Router>
  );
}

export default App;
