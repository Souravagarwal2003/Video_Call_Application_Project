//import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import process from "process";
//import { Buffer } from "buffer";
import { UserProvider } from './context/UserContextApi.jsx';

window.process = process;
window.global = window;

//if (!window.Buffer) window.Buffer = Buffer;

createRoot(document.getElementById('root')).render(
  // <StrictMode>
  <UserProvider>
    <App />
  </UserProvider>
  // </StrictMode>,
)
