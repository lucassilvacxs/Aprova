import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, ChevronRight, BookOpen, CheckSquare, FileText } from 'lucide-react';
import { Card, Badge, ProgressBar, EmptyState, LoadingState } from '@/components/ui';
import { contestService, ContestItem } from '@/services/contest.service';

import { useContestStore } from '@/store';

const ContestCard: React.FC<{ contest: ContestItem }> = ({ contest }) => {
  const { selectedContestId, setSelectedContestId } = useContestStore();
  const isSelected = selectedContestId === contest.id;
  const hasStarted = contest.userProgress > 0;

  return (
    <Card hoverable noPadding className={isSelected ? 'border-brand-500/50 shadow-brand/10' : ''}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div
            className="w-12 h-12 rounded-2xl border-2 flex items-center justify-center shrink-0 font-extrabold text-sm"
            style={{
              borderColor: contest.colorAccent + '60',
              background: contest.colorAccent + '15',
              color: contest.colorAccent,
            }}
          >
            {contest.acronym}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {isSelected && (
              <Badge variant="brand" size="xs">
                Principal
              </Badge>
            )}
            <Badge variant={contest.status === 'active' ? 'success' : 'neutral'} size="xs">
              {contest.status === 'active' ? 'Edital Ativo' : contest.status}
            </Badge>
          </div>
        </div>

        <h3 className="text-base font-bold text-text-primary mb-0.5">{contest.agencyName}</h3>
        <p className="text-xs text-text-muted mb-3 line-clamp-1">{contest.agencyFull}</p>

        <div className="space-y-1 mb-4">
          <ProgressBar
            value={contest.userProgress}
            colorKey="brand"
            size="sm"
            showLabel
            label="Seu progresso geral"
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-text-muted pt-3 border-t border-border mb-4">
          <span>Último estudo:</span>
          <span className="font-semibold text-text-secondary">
            {contest.lastStudied || (hasStarted ? 'Recentemente' : 'Não iniciado')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/concursos/${contest.id}/disciplinas`}
            className="flex-1 py-2 px-3 rounded-xl bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 transition-colors text-center flex items-center justify-center gap-1 shadow-sm shadow-brand-500/20"
          >
            {hasStarted ? 'Continuar estudando' : 'Começar preparação'}
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>

          {!isSelected && (
            <button
              onClick={() => setSelectedContestId(contest.id)}
              className="py-2 px-2.5 rounded-xl border border-border bg-bg-elevated hover:bg-bg-overlay text-text-secondary hover:text-text-primary text-[11px] font-medium transition-colors"
              title="Definir como concurso principal para direcionar o Dashboard"
            >
              Fixar
            </button>
          )}
        </div>
      </div>
    </Card>
  );
};

export const ContestsListPage: React.FC = () => {
  const [contests, setContests] = React.useState<ContestItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    contestService
      .getContests()
      .then(setContests)
      .catch((err) => console.error('Erro ao carregar concursos:', err))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingState message="Carregando seus concursos..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">Meus Concursos</h1>
          <p className="text-sm text-text-secondary mt-1">Concursos ativos no banco de dados vinculados à sua conta</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: GraduationCap, label: 'Concursos', value: contests.length, color: 'text-brand-400' },
          { icon: BookOpen,      label: 'Banca', value: 'Cebraspe / FGV', color: 'text-kpi-green-text' },
          { icon: CheckSquare,   label: 'Questões', value: contests.reduce((a, c) => a + c.questionsAnswered, 0).toLocaleString('pt-BR'), color: 'text-kpi-orange-text' },
          { icon: FileText,      label: 'Simulados', value: contests.reduce((a, c) => a + c.simulationsCompleted, 0), color: 'text-kpi-blue-text' },
        ].map((stat) => (
          <Card key={stat.label} className="flex items-center gap-3">
            <stat.icon className={`w-5 h-5 shrink-0 ${stat.color}`} />
            <div>
              <p className="text-lg font-extrabold text-text-primary tabular-nums">{stat.value}</p>
              <p className="text-[11px] text-text-muted">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Contests grid */}
      {contests.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="w-6 h-6" />}
          title="Nenhum concurso disponível"
          description="Você ainda não possui concursos vinculados à sua conta. Solicite liberação à administração."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {contests.map((c) => (
            <ContestCard key={c.id} contest={c} />
          ))}
        </div>
      )}
    </div>
  );
};
