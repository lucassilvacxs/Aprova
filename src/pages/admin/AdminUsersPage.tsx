import React from 'react';
import { Users, Shield, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card, Badge, Avatar, SectionHeader, LoadingState } from '@/components/ui';
import { adminService, AdminUser } from '@/services/admin.service';
import { useAuthStore } from '@/store';

const STATUS_CONFIG = {
  active:   { label: 'Ativo',     variant: 'success' as const, icon: CheckCircle },
  inactive: { label: 'Inativo',   variant: 'neutral' as const, icon: Clock },
  blocked:  { label: 'Bloqueado', variant: 'danger' as const,  icon: XCircle },
};

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const { user: currentUser } = useAuthStore();

  const loadUsers = React.useCallback(() => {
    setIsLoading(true);
    adminService
      .getUsers()
      .then(setUsers)
      .catch((err) => console.error('Erro ao listar usuários:', err))
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleToggleStatus = async (targetUser: AdminUser) => {
    const newStatus = targetUser.status === 'blocked' ? 'active' : 'blocked';
    const actionLabel = newStatus === 'blocked' ? 'bloquear' : 'desbloquear';

    if (!window.confirm(`Tem certeza que deseja ${actionLabel} o acesso de ${targetUser.name}?`)) {
      return;
    }

    setActionLoading(targetUser.id);
    try {
      await adminService.updateUserStatus(targetUser.id, newStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, status: newStatus } : u))
      );
    } catch (err: any) {
      alert(err.message || 'Falha ao alterar status do usuário.');
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingState message="Carregando usuários do sistema..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">Gestão de Usuários</h1>
          <p className="text-sm text-text-secondary mt-1">{users.length} usuários cadastrados no banco de dados</p>
        </div>
      </div>

      <Card noPadding>
        <div className="p-5 border-b border-border">
          <SectionHeader title="Usuários Registrados" icon={<Users className="w-4 h-4" />} />
        </div>
        <div className="divide-y divide-border">
          {users.map((u) => {
            const statusCfg = STATUS_CONFIG[u.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.active;
            const isMe = u.id === currentUser?.id;

            return (
              <div key={u.id} className="flex items-center gap-4 px-5 py-4 hover:bg-bg-elevated transition-all flex-wrap">
                <Avatar
                  initials={u.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-text-primary">{u.name}</p>
                    {isMe && <Badge variant="brand" size="xs">Você</Badge>}
                    {u.role === 'admin' && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-danger-light border border-danger/20">
                        <Shield className="w-2.5 h-2.5 text-danger-text" />
                        <span className="text-[10px] font-bold text-danger-text uppercase">Admin</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">{u.email}</p>
                </div>

                <div className="hidden sm:block text-right">
                  <p className="text-[10px] text-text-muted">Último acesso</p>
                  <p className="text-xs font-medium text-text-secondary">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('pt-BR') : 'Nunca'}
                  </p>
                </div>

                <div className="hidden sm:block text-right">
                  <p className="text-[10px] text-text-muted">Cadastrado em</p>
                  <p className="text-xs font-medium text-text-secondary">
                    {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <Badge variant={statusCfg.variant} size="xs" dot>
                  {statusCfg.label}
                </Badge>

                {!isMe && (
                  <button
                    disabled={actionLoading === u.id}
                    onClick={() => handleToggleStatus(u)}
                    className={`ml-2 text-xs font-semibold transition-colors px-2.5 py-1 rounded-lg border ${
                      u.status === 'blocked'
                        ? 'text-success-text border-success/30 hover:bg-success-light'
                        : 'text-danger-text border-danger/30 hover:bg-danger-light'
                    }`}
                  >
                    {actionLoading === u.id
                      ? 'Processando...'
                      : u.status === 'blocked'
                      ? 'Desbloquear'
                      : 'Bloquear'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
