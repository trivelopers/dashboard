
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import './i18n'; // Import i18n configuration

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import Prompt from './views/Prompt';
import CompanyInfo from './views/CompanyInfo';
import Contacts from './views/Contacts';
import ChatHistory from './views/ChatHistory';
import Users from './views/Users';
import TestAssistant from './views/TestAssistant';
import TestAssistantSimulations from './views/TestAssistantSimulations';
import Integrations from './views/Integrations';
import Help from './views/Help';
import NotFound from './views/NotFound';
import Profile from './views/Profile';
import ChangePassword from './views/ChangePassword';
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
            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="prompt" element={
              <ProtectedRoute allowedRoles={[Role.ADMIN, Role.EDITOR]}>
                <Prompt />
              </ProtectedRoute>
            } />
            <Route path="test-assistant" element={
              <ProtectedRoute allowedRoles={[Role.ADMIN, Role.EDITOR]}>
                <TestAssistantSimulations />
              </ProtectedRoute>
            } />
            <Route path="test-assistant/:chatId" element={
              <ProtectedRoute allowedRoles={[Role.ADMIN, Role.EDITOR]}>
                <TestAssistant />
              </ProtectedRoute>
            } />
            <Route path="company" element={
              <ProtectedRoute allowedRoles={[Role.ADMIN, Role.EDITOR]}>
                <CompanyInfo />
              </ProtectedRoute>
            } />
            <Route path="contacts" element={<Contacts />} />
            <Route path="chats/:contactId" element={<ChatHistory />} />
            <Route path="users" element={
              <ProtectedRoute allowedRoles={[Role.ADMIN, Role.EDITOR]}>
                <Users />
              </ProtectedRoute>
            } />
            <Route path="change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
            <Route
              path="integrations"
              element={
                <ProtectedRoute allowedRoles={[Role.ADMIN]}>
                  <Integrations />
                </ProtectedRoute>
              }
            />
            <Route
              path="help"
              element={
                <ProtectedRoute allowedRoles={[Role.ADMIN]}>
                  <Help />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
