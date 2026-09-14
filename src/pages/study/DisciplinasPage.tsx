import React from 'react';
import { BookOpen, Search, BrainCircuit } from 'lucide-react';
import { Card, Badge, ProgressBar, EmptyState, LoadingState } from '@/components/ui';
import { contestService, SubjectItem } from '@/services/contest.service';

export const DisciplinasPage: React.FC = () => {
  const [subjectsList, setSubjectsList] = React.useState<SubjectItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState<'all' | 'weak' | 'strong'>('all');

  React.useEffect(() => {
    contestService
      .getSubjects()
      .then(setSubjectsList)
      .catch((err) => console.error('Erro ao buscar disciplinas:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = subjectsList
    .filter((d) => d.name.toLowerCase().includes(search.toLowerCase()))
    .filter((d) => {
      if (filter === 'weak') return d.accuracy < 70;
      if (filter === 'strong') return d.accuracy >= 80;
      return true;
    });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingState message="Carregando disciplinas..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">Disciplinas</h1>
          <p className="text-sm text-text-secondary mt-1">
            {subjectsList.length} disciplinas cadastradas no banco de dados (PRF e PF)
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar disciplina..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-bg-elevated border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 hover:border-border-muted transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'strong', 'weak'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                filter === f
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-bg-elevated border-border text-text-secondary hover:text-text-primary hover:border-border-muted'
              }`}
            >
              {f === 'all' ? 'Todas' : f === 'strong' ? '✅ Fortes (≥80%)' : '⚠ Fracas (<70%)'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-6 h-6" />}
          title="Nenhuma disciplina encontrada"
          description="Tente ajustar os filtros ou a busca."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((d) => {
            const accuracyColor =
              d.accuracy >= 80 ? 'text-success-text' : d.accuracy >= 70 ? 'text-warning-text' : 'text-danger-text';
            const progressColor: 'brand' | 'green' | 'orange' | 'rose' =
              d.progress >= 70 ? 'green' : d.progress >= 40 ? 'orange' : 'rose';

            return (
              <Card key={d.id} hoverable noPadding>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-500/12 border border-brand-500/20 flex items-center justify-center shrink-0">
                      <BrainCircuit className="w-5 h-5 text-brand-400" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="neutral" size="xs">{d.shortName || 'Geral'}</Badge>
                      <span className={`text-sm font-extrabold tabular-nums ${accuracyColor}`}>{d.accuracy}%</span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-text-primary mb-1">{d.name}</h3>
                  <p className="text-[10px] text-text-muted mb-4">
                    Último estudo: {d.lastStudied} · {d.questions} questões resolvidas
                  </p>

                  <ProgressBar value={d.progress} colorKey={progressColor} size="xs" showLabel label="Progresso de conteúdo" />
                  <ProgressBar
                    value={d.accuracy}
                    colorKey={d.accuracy >= 80 ? 'green' : d.accuracy >= 70 ? 'orange' : 'rose'}
                    size="xs"
                    label="Taxa de acerto"
                    showLabel
                    className="mt-2"
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
