import React from 'react';
import { MailPlus, Copy, CheckCheck, Clock, Trash2 } from 'lucide-react';
import { Card, Badge, Button, SectionHeader, LoadingState, Modal } from '@/components/ui';
import { adminService, AdminInvitation } from '@/services/admin.service';

export const AdminInvitesPage: React.FC = () => {
  const [invitations, setInvitations] = React.useState<AdminInvitation[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [copied, setCopied] = React.useState<string | null>(null);

  // Modal de Criação de Convite
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [newEmail, setNewEmail] = React.useState('');
  const [newRole, setNewRole] = React.useState<'student' | 'admin'>('student');
  const [newDays, setNewDays] = React.useState(7);
  const [isCreating, setIsCreating] = React.useState(false);
  const [createdInviteUrl, setCreatedInviteUrl] = React.useState<string | null>(null);

  const loadInvitations = React.useCallback(() => {
    setIsLoading(true);
    adminService
      .getInvitations()
      .then(setInvitations)
      .catch((err) => console.error('Erro ao buscar convites:', err))
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  const copyLink = (code: string) => {
    const url = `${window.location.origin}/convite?code=${code}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await adminService.createInvitation({
        email: newEmail.trim() || undefined,
        role: newRole,
        expirationDays: Number(newDays),
      });

      const url = res.data?.inviteUrl || `${window.location.origin}/convite?code=${res.data?.code}`;
      setCreatedInviteUrl(url);
      loadInvitations();
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar convite.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja revogar este convite?')) return;
    try {
      await adminService.revokeInvitation(id);
      loadInvitations();
    } catch (err: any) {
      alert(err.message || 'Falha ao revogar convite.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingState message="Carregando convites..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">Gestão de Convites</h1>
          <p className="text-sm text-text-secondary mt-1">
            Gere tokens de acesso exclusivo para novos alunos da plataforma privada.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<MailPlus className="w-4 h-4" />}
          onClick={() => {
            setCreatedInviteUrl(null);
            setNewEmail('');
            setIsModalOpen(true);
          }}
        >
          + Novo Convite
        </Button>
      </div>

      <Card noPadding>
        <div className="p-5 border-b border-border">
          <SectionHeader title="Histórico de Convites" icon={<MailPlus className="w-4 h-4" />} />
        </div>
        {invitations.length === 0 ? (
          <div className="p-10 text-center text-sm text-text-muted">
            Nenhum convite emitido até o momento. Clique em "+ Novo Convite" para gerar o primeiro link.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center gap-4 px-5 py-4 flex-wrap hover:bg-bg-elevated transition-all">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-text-primary">
                      {inv.email || 'Qualquer pessoa com o link'}
                    </p>
                    <Badge variant={inv.role === 'admin' ? 'danger' : 'brand'} size="xs">
                      {inv.role === 'admin' ? 'Administrador' : 'Aluno'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-text-muted flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Expira em: {new Date(inv.expiresAt).toLocaleDateString('pt-BR')}
                    </span>
                    <span>Criado por: {inv.createdByName}</span>
                    {inv.usedAt && (
                      <span className="text-success-text">
                        Utilizado em: {new Date(inv.usedAt).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>

                <Badge
                  variant={
                    inv.status === 'pending'
                      ? 'warning'
                      : inv.status === 'used'
                      ? 'success'
                      : 'danger'
                  }
                  size="xs"
                >
                  {inv.status === 'pending' ? 'Pendente' : inv.status === 'used' ? 'Utilizado' : inv.status}
                </Badge>

                {inv.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyLink(inv.code)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-elevated border border-border text-xs text-text-secondary hover:text-text-primary hover:border-border-muted transition-all"
                    >
                      {copied === inv.code ? (
                        <>
                          <CheckCheck className="w-3.5 h-3.5 text-success" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copiar link
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleRevoke(inv.id)}
                      className="p-1.5 rounded-xl text-text-muted hover:text-danger-text hover:bg-danger-light transition-all"
                      title="Revogar convite"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal de Criação */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Gerar Novo Convite">
        {createdInviteUrl ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-success-light border border-success/20 text-center">
              <p className="text-sm font-bold text-success-text mb-1">Convite gerado com sucesso!</p>
              <p className="text-xs text-text-secondary">Envie o link abaixo para o usuário convidado:</p>
            </div>
            <div className="p-3 bg-bg-elevated border border-border rounded-xl flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={createdInviteUrl}
                className="w-full bg-transparent text-xs text-text-primary focus:outline-none"
              />
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  navigator.clipboard.writeText(createdInviteUrl);
                  alert('Link copiado para a área de transferência!');
                }}
              >
                Copiar
              </Button>
            </div>
            <Button variant="outline" fullWidth onClick={() => setIsModalOpen(false)}>
              Fechar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleCreateInvite} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Email do Convidado (Opcional)
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="deixe em branco para link público genérico"
                className="w-full px-3.5 py-2.5 bg-bg-elevated border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">Papel</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-xl text-sm text-text-primary focus:outline-none"
                >
                  <option value="student">Aluno</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">Validade (dias)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={newDays}
                  onChange={(e) => setNewDays(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-xl text-sm text-text-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" isLoading={isCreating}>
                Gerar Convite
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
