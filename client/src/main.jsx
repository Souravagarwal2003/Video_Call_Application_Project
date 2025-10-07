//import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import process from "process";

import { UserProvider } from './context/UserContextApi.jsx';

window.process = process;
window.global = window;



createRoot(document.getElementById('root')).render(
  // <StrictMode>
  <UserProvider>
    <App />
  </UserProvider>
  // </StrictMode>,
)
