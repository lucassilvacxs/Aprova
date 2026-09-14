import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { LoadingState } from '@/components/ui';

// ── Auth Guard: redireciona não-autenticados para /login ──────────────────────
export const RequireAuth: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <LoadingState message="Verificando autenticação..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

// ── Admin Guard: redireciona não-admins para o dashboard ─────────────────────
export const RequireAdmin: React.FC = () => {
  const { user } = useAuthStore();

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
