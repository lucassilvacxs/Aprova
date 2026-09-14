import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, HelpCircle, Clock3, TrendingUp } from 'lucide-react';
import { Card, Badge, ProgressBar, Tabs, TabItem, EmptyState, LoadingState } from '@/components/ui';
import { contestService, ContestDetail } from '@/services/contest.service';

const TABS: TabItem[] = [
  { id: 'overview', label: 'Visão Geral' },
  { id: 'disciplines', label: 'Disciplinas', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'questions',   label: 'Questões',   icon: <HelpCircle className="w-4 h-4" /> },
  { id: 'simulations', label: 'Simulados',  icon: <Clock3 className="w-4 h-4" /> },
  { id: 'performance', label: 'Desempenho', icon: <TrendingUp className="w-4 h-4" /> },
];

export const ContestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = React.useState('overview');
  const [contest, setContest] = React.useState<ContestDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    contestService
      .getContestById(id)
      .then(setContest)
      .catch((err) => setError(err.message || 'Erro ao carregar detalhes do concurso.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingState message="Carregando dados do concurso..." />
      </div>
    );
  }

  if (error || !contest) {
    return (
      <div className="p-8 text-center bg-bg-card border border-border rounded-2xl">
        <p className="text-sm text-danger-text mb-4">{error || 'Concurso não encontrado.'}</p>
        <Link to="/concursos" className="text-xs text-brand-400 font-semibold">
          Voltar para meus concursos
        </Link>
      </div>
    );
  }

  const disciplines = contest.subjects || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back */}
      <Link
        to="/concursos"
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Meus Concursos
      </Link>

      {/* Header */}
      <div className="flex items-start gap-5 flex-wrap">
        <div
          className="w-16 h-16 rounded-2xl border-2 flex items-center justify-center font-extrabold text-lg shrink-0"
          style={{
            borderColor: (contest.acronym === 'PRF' ? '#7C5CFA' : '#22C55E') + '60',
            background: (contest.acronym === 'PRF' ? '#7C5CFA' : '#22C55E') + '15',
            color: contest.acronym === 'PRF' ? '#7C5CFA' : '#22C55E',
          }}
        >
          {contest.acronym}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-extrabold text-text-primary">{contest.agencyName}</h1>
            <Badge variant="brand">{contest.status === 'active' ? 'Edital Ativo' : contest.status}</Badge>
          </div>
          <p className="text-sm text-text-secondary mt-1">{contest.positions?.[0]?.title || contest.agencyFull}</p>
          <div className="mt-3 max-w-sm">
            <ProgressBar value={contest.userProgress} colorKey="brand" size="sm" showLabel label="Seu progresso geral" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      <div className="animate-fade-in">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Questões resolvidas', value: (contest.questionsAnswered || 0).toLocaleString('pt-BR') },
                { label: 'Banca Examinadora', value: contest.boardName || 'Cebraspe' },
                { label: 'Vagas Estimadas', value: contest.vacanciesCount || '-' },
                { label: 'Disciplinas no Edital', value: disciplines.length },
              ].map((s) => (
                <Card key={s.label} className="text-center">
                  <p className="text-2xl font-extrabold text-brand-300 tabular-nums">{s.value}</p>
                  <p className="text-xs text-text-muted mt-1">{s.label}</p>
                </Card>
              ))}
            </div>

            {contest.description && (
              <Card>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Sobre o Concurso</p>
                <p className="text-sm text-text-secondary leading-relaxed">{contest.description}</p>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'disciplines' && (
          <div>
            {disciplines.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="w-6 h-6" />}
                title="Nenhuma disciplina cadastrada"
                description="As disciplinas serão disponibilizadas em breve."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {disciplines.map((d) => (
                  <Card key={d.id} hoverable noPadding>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-text-primary">{d.name}</p>
                        <span
                          className="text-xs font-bold tabular-nums"
                          style={{ color: d.accuracy >= 80 ? '#4ADE80' : d.accuracy >= 70 ? '#FCD34D' : '#F87171' }}
                        >
                          {d.accuracy}%
                        </span>
                      </div>
                      <ProgressBar value={d.progress} size="xs" colorKey="brand" showLabel label="Progresso" />
                      <div className="mt-3 flex items-center justify-between text-[10px] text-text-muted">
                        <span>Peso: {d.weight}x</span>
                        <span>{d.questionsAnswered} questões feitas</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {(activeTab === 'questions' || activeTab === 'simulations' || activeTab === 'performance') && (
          <EmptyState
            icon={<Clock3 className="w-6 h-6" />}
            title="Em breve"
            description="Esta funcionalidade será implementada nas próximas fases."
          />
        )}
      </div>
    </div>
  );
};
