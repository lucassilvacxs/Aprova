import React from 'react';
import { BookMarked } from 'lucide-react';
import { Card, Badge, SectionHeader, LoadingState } from '@/components/ui';
import { adminService, AdminContest } from '@/services/admin.service';

export const AdminContestsPage: React.FC = () => {
  const [contests, setContests] = React.useState<AdminContest[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    adminService
      .getContests()
      .then(setContests)
      .catch((err) => console.error('Erro ao listar concursos no admin:', err))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingState message="Carregando concursos..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-text-primary">Concursos Registrados</h1>
        <p className="text-sm text-text-secondary mt-1">
          {contests.length} concursos cadastrados diretamente no banco de dados
        </p>
      </div>

      <Card noPadding>
        <div className="p-5 border-b border-border">
          <SectionHeader title="Lista de Concursos" icon={<BookMarked className="w-4 h-4" />} />
        </div>
        <div className="divide-y divide-border">
          {contests.map((c) => (
            <div key={c.id} className="flex items-center gap-4 px-5 py-4 hover:bg-bg-elevated transition-all flex-wrap">
              <div
                className="w-10 h-10 rounded-xl border-2 flex items-center justify-center font-bold text-xs shrink-0"
                style={{
                  borderColor: (c.agencyAcronym === 'PRF' ? '#7C5CFA' : '#22C55E') + '60',
                  background: (c.agencyAcronym === 'PRF' ? '#7C5CFA' : '#22C55E') + '15',
                  color: c.agencyAcronym === 'PRF' ? '#7C5CFA' : '#22C55E',
                }}
              >
                {c.agencyAcronym}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-text-primary">{c.title}</p>
                  <span className="text-[10px] text-text-muted">({c.slug})</span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  Órgão: {c.agencyName} · Ano: {c.year} · Banca: {c.boardAcronym || 'Cebraspe'}
                </p>
              </div>

              <div className="hidden sm:block text-right">
                <p className="text-[10px] text-text-muted">Salário Base</p>
                <p className="text-xs font-semibold text-text-primary tabular-nums">
                  R$ {Number(c.salaryBase).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <Badge variant={c.status === 'active' ? 'success' : 'neutral'} size="xs" dot>
                {c.status === 'active' ? 'Ativo' : c.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
