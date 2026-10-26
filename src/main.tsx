import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { AuthProvider } from './features/auth/AuthProvider';
import { router } from './app/router';
import './styles/tokens.css';
import './styles/glass.css';
if (localStorage.getItem('gather-transparency') === 'reduced') document.documentElement.dataset.transparency = 'reduced';
createRoot(document.getElementById('root')!).render(<StrictMode><AuthProvider><RouterProvider router={router} /></AuthProvider></StrictMode>);
