
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import './i18n'; // Import i18n configuration

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import Prompt from './views/Prompt';
import Contacts from './views/Contacts';
import ChatHistory from './views/ChatHistory';
import Users from './views/Users';
import NotFound from './views/NotFound';
import { Role } from './types';

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="prompt" element={
              <ProtectedRoute allowedRoles={[Role.ADMIN, Role.EDITOR]}>
                <Prompt />
              </ProtectedRoute>
            } />
            <Route path="contacts" element={<Contacts />} />
            <Route path="chats/:contactId" element={<ChatHistory />} />
            <Route path="users" element={
              <ProtectedRoute allowedRoles={[Role.ADMIN]}>
                <Users />
              </ProtectedRoute>
            } />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
