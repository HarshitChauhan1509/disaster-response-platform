import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { IncidentDetailPage } from './pages/IncidentDetailPage';
import { RespondersPage } from './pages/RespondersPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ProtectedRoute } from './layouts/ProtectedRoute';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Authenticated Dashboard Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/incidents" element={<IncidentsPage />} />
            <Route path="/incidents/:id" element={<IncidentDetailPage />} />
            <Route path="/resources" element={<ResourcesPage />} />

            {/* Admin & Coordinator Only Routes */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'COORDINATOR']} />}>
              <Route path="/responders" element={<RespondersPage />} />
              <Route path="/audit-logs" element={<AuditLogsPage />} />
            </Route>
          </Route>
        </Route>

        {/* Fallback 404 Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};
