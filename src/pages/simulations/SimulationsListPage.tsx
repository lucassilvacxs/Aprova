import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock3,
  CheckCircle2,
  Award,
  BarChart3,
  PlusCircle,
  History,
  ChevronRight,
  Play,
  RotateCcw,
  Sparkles,
  BookOpen,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { simulationService, SimulationItem, ActiveSimulationBannerData, SimulationStatsData } from '@/services/simulation.service';
import { contestService, ContestItem } from '@/services/contest.service';

export const SimulationsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [simulations, setSimulations] = useState<SimulationItem[]>([]);
  const [stats, setStats] = useState<SimulationStatsData | null>(null);
  const [activeBanner, setActiveBanner] = useState<ActiveSimulationBannerData | null>(null);
  const [contests, setContests] = useState<ContestItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [activeTab, setActiveTab] = useState<'all' | 'available' | 'in_progress' | 'completed' | 'custom'>('all');
  const [selectedContest, setSelectedContest] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [simsData, statsData, activeData, contestsData] = await Promise.all([
        simulationService.list({
          contestId: selectedContest || undefined,
          difficulty: selectedDifficulty || undefined,
          search: search || undefined,
          tab: activeTab !== 'all' ? activeTab : undefined,
        }),
        simulationService.getStats(selectedContest || undefined).catch(() => null),
        simulationService.getActive().catch(() => null),
        contestService.getContests().catch(() => []),
      ]);

      setSimulations(simsData);
      setStats(statsData);
      setActiveBanner(activeData);
      setContests(contestsData);
    } catch (err) {
      console.error('Erro ao carregar simulados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, selectedContest, selectedDifficulty]);

  // Debounce busca
  useEffect(() => {
    const handler = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const formatRemaining = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-bg-surface p-6 rounded-2xl border border-border">
        <div>
          <div className="flex items-center gap-2 text-brand-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Clock3 className="w-4 h-4" />
            <span>Modo Exame Autoritativo</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-text-primary">
            Central de Simulados
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Treine em condições reais de prova com cronômetro, auto-save e gabarito comentado pós-finalização.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate('/simulados/historico')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-bg-elevated hover:bg-bg-subtle text-text-primary text-sm font-semibold transition-all shadow-sm"
          >
            <History className="w-4 h-4 text-text-muted" />
            <span>Histórico & Evolução</span>
          </button>

          <button
            onClick={() => navigate('/simulados/novo')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold shadow-md shadow-brand-500/25 transition-all transform active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Monte seu Simulado</span>
          </button>
        </div>
      </div>

      {/* Banner de Simulado em Andamento (se houver) */}
      {activeBanner && (
        <div className="bg-gradient-to-r from-amber-500/10 via-brand-500/10 to-bg-surface border border-amber-500/30 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-pulse-slow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Clock3 className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300">
                  Em Andamento
                </span>
                <span className="text-text-muted text-xs">
                  Tempo restante: <strong>{formatRemaining(activeBanner.remainingSeconds)}</strong>
                </span>
              </div>
              <h3 className="text-lg font-bold text-text-primary mt-1">
                {activeBanner.simulationTitle}
              </h3>
            </div>
          </div>

          <button
            onClick={() => navigate(`/simulados/${activeBanner.simulationId}/prova`)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-sm transition-all shadow-md shadow-amber-500/20"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Continuar Simulado</span>
          </button>
        </div>
      )}

      {/* KPIs Rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-bg-surface p-4 rounded-2xl border border-border flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-text-primary leading-none">
              {stats?.totalCompleted || 0}
            </div>
            <div className="text-xs text-text-muted font-medium mt-1">Simulados Concluídos</div>
          </div>
        </div>

        <div className="bg-bg-surface p-4 rounded-2xl border border-border flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-text-primary leading-none">
              {stats?.bestPercentage ? `${stats.bestPercentage}%` : '0%'}
            </div>
            <div className="text-xs text-text-muted font-medium mt-1">Melhor Desempenho</div>
          </div>
        </div>

        <div className="bg-bg-surface p-4 rounded-2xl border border-border flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-text-primary leading-none">
              {stats?.averagePercentage ? `${stats.averagePercentage}%` : '0%'}
            </div>
            <div className="text-xs text-text-muted font-medium mt-1">Média Geral</div>
          </div>
        </div>

        <div className="bg-bg-surface p-4 rounded-2xl border border-border flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-text-primary leading-none">
              {stats?.totalQuestionsAnswered || 0}
            </div>
            <div className="text-xs text-text-muted font-medium mt-1">Questões em Provas</div>
          </div>
        </div>
      </div>

      {/* Abas e Filtros */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
          {/* Abas */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'available', label: 'Disponíveis' },
              { id: 'in_progress', label: 'Em Andamento' },
              { id: 'completed', label: 'Concluídos' },
              { id: 'custom', label: 'Meus Simulados' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'bg-bg-elevated text-text-secondary hover:text-text-primary hover:bg-bg-subtle'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filtros em Linha */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[180px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Buscar simulado..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-bg-elevated border border-border text-text-primary text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            <select
              value={selectedContest}
              onChange={(e) => setSelectedContest(e.target.value)}
              aria-label="Filtrar por concurso"
              className="px-3 py-1.5 rounded-lg bg-bg-elevated border border-border text-text-primary text-xs focus:outline-none focus:border-brand-500"
            >
              <option value="">Todos Concursos</option>
              {contests.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.acronym ? `${c.acronym} — ${c.agencyName}` : c.agencyName}
                </option>
              ))}
            </select>

            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              aria-label="Filtrar por dificuldade"
              className="px-3 py-1.5 rounded-lg bg-bg-elevated border border-border text-text-primary text-xs focus:outline-none focus:border-brand-500"
            >
              <option value="">Dificuldade</option>
              <option value="FACIL">Fácil</option>
              <option value="MEDIO">Médio</option>
              <option value="DIFICIL">Difícil</option>
            </select>
          </div>
        </div>

        {/* Lista de Cards de Simulados */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-56 rounded-2xl bg-bg-surface border border-border animate-pulse" />
            ))}
          </div>
        ) : simulations.length === 0 ? (
          <div className="bg-bg-surface rounded-2xl border border-border p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-bg-elevated text-text-muted mx-auto flex items-center justify-center">
              <Clock3 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-text-primary">Nenhum simulado encontrado</h3>
            <p className="text-text-muted text-xs max-w-sm mx-auto">
              Nenhum simulado corresponde aos filtros selecionados. Crie um simulado personalizado ou altere os filtros.
            </p>
            <button
              onClick={() => navigate('/simulados/novo')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold shadow-md hover:bg-brand-600 transition-all mt-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Criar Simulado Personalizado</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {simulations.map((sim) => {
              const isCebraspe = sim.penaltyRule === 'one_error_cancels_one_correct';
              const isDone = sim.userStatus === 'COMPLETED' || sim.userStatus === 'EXPIRED';
              const isInProgress = sim.userStatus === 'IN_PROGRESS';

              return (
                <div
                  key={sim.id}
                  className="bg-bg-surface rounded-2xl border border-border hover:border-border-focus transition-all flex flex-col justify-between overflow-hidden group shadow-sm hover:shadow-md"
                >
                  <div className="p-5 space-y-3.5">
                    {/* Tags de topo */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-400 font-bold text-[11px]">
                          {sim.agencyAcronym || 'CONCURSO'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-bg-elevated text-text-secondary font-semibold text-[11px]">
                          {sim.type === 'FIXED' ? 'Fixo' : sim.type === 'RANDOM' ? 'Aleatório' : 'Personalizado'}
                        </span>
                        {sim.isOfficial && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-bold text-[11px] flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> DEMO
                          </span>
                        )}
                      </div>

                      {/* Status do Aluno */}
                      {isInProgress && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] animate-pulse">
                          Em Prova
                        </span>
                      )}
                      {isDone && sim.userBestPercentage && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold text-[10px]">
                          {sim.userBestPercentage}%
                        </span>
                      )}
                    </div>

                    {/* Título e Descrição */}
                    <div>
                      <h3 className="font-bold text-text-primary text-base group-hover:text-brand-400 transition-colors line-clamp-2">
                        {sim.title}
                      </h3>
                      {sim.description && (
                        <p className="text-text-muted text-xs mt-1 line-clamp-2 leading-relaxed">
                          {sim.description}
                        </p>
                      )}
                    </div>

                    {/* Detalhes de Prova */}
                    <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-xl bg-bg-elevated/60 text-center">
                      <div>
                        <div className="text-[11px] text-text-muted">Questões</div>
                        <div className="text-xs font-bold text-text-primary mt-0.5">
                          {sim.totalQuestions}
                        </div>
                      </div>
                      <div className="border-x border-border">
                        <div className="text-[11px] text-text-muted">Duração</div>
                        <div className="text-xs font-bold text-text-primary mt-0.5">
                          {sim.durationMinutes} min
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-text-muted">Nível</div>
                        <div className="text-xs font-bold text-text-primary mt-0.5 capitalize">
                          {sim.difficulty.toLowerCase()}
                        </div>
                      </div>
                    </div>

                    {/* Regra de Pontuação e Matérias */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-medium text-text-muted flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-text-secondary" />
                        <span>
                          {isCebraspe ? 'Cebraspe: 1 erro anula 1 acerto' : 'Pontuação Simples sem penalidade'}
                        </span>
                      </div>

                      {sim.subjects && sim.subjects.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {sim.subjects.slice(0, 3).map((sub, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] px-2 py-0.5 rounded bg-bg-elevated text-text-secondary font-medium"
                            >
                              {sub}
                            </span>
                          ))}
                          {sim.subjects.length > 3 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-elevated text-text-muted font-medium">
                              +{sim.subjects.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações de Rodapé */}
                  <div className="p-4 bg-bg-elevated/40 border-t border-border flex items-center justify-between gap-2">
                    {isInProgress ? (
                      <button
                        onClick={() => navigate(`/simulados/${sim.id}/prova`)}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-sm transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-slate-950" />
                        <span>Continuar Simulado</span>
                      </button>
                    ) : isDone ? (
                      <div className="w-full flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (sim.userActiveAttemptId) {
                              navigate(`/simulados/tentativas/${sim.userActiveAttemptId}/resultado`);
                            } else {
                              navigate(`/simulados/${sim.id}`);
                            }
                          }}
                          className="flex-1 py-2 px-3 rounded-xl border border-border bg-bg-surface hover:bg-bg-subtle text-text-primary font-bold text-xs transition-all text-center"
                        >
                          Ver Resultado
                        </button>
                        <button
                          onClick={() => navigate(`/simulados/${sim.id}`)}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 font-bold text-xs transition-all"
                          title="Refazer Simulado"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Refazer</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => navigate(`/simulados/${sim.id}`)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-sm shadow-brand-500/20 transition-all"
                      >
                        <span>Iniciar Simulado</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
