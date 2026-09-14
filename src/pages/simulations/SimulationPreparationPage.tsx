import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock3,
  Shield,
  AlertCircle,
  Play,
  ArrowLeft,
  CheckCircle2,
  BookOpen,
  Sparkles,
  Info,
  Lock,
} from 'lucide-react';
import { simulationService, SimulationDetail } from '@/services/simulation.service';

export const SimulationPreparationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [simulation, setSimulation] = useState<SimulationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    simulationService
      .getById(id)
      .then((data) => setSimulation(data))
      .catch((err) => setError(err.message || 'Erro ao carregar simulado.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleStartOrResume = async () => {
    if (!id) return;
    try {
      setStarting(true);
      setError(null);
      await simulationService.startAttempt(id);
      navigate(`/simulados/${id}/prova`);
    } catch (err: any) {
      setError(err.message || 'Erro ao iniciar simulado.');
      setStarting(false);
    }
  };

  const formatRemaining = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-12 space-y-6">
        <div className="h-64 rounded-2xl bg-bg-surface border border-border animate-pulse" />
      </div>
    );
  }

  if (error || !simulation) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-text-primary">Simulado Indisponível</h2>
        <p className="text-text-secondary text-xs">{error || 'Não foi possível encontrar este simulado.'}</p>
        <button
          onClick={() => navigate('/simulados')}
          className="px-4 py-2 rounded-xl bg-bg-elevated border border-border text-text-primary text-xs font-bold hover:bg-bg-subtle transition-all"
        >
          Voltar para Central
        </button>
      </div>
    );
  }

  const isCebraspe = simulation.penaltyRule === 'one_error_cancels_one_correct';
  const hasActiveAttempt = simulation.activeAttempt && !simulation.activeAttempt.isExpired;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16 animate-fade-in">
      {/* Botão de Voltar */}
      <button
        onClick={() => navigate('/simulados')}
        className="flex items-center gap-2 text-text-secondary hover:text-text-primary text-xs font-bold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar para Simulados</span>
      </button>

      {/* Alerta de Tentativa em Andamento */}
      {hasActiveAttempt && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock3 className="w-5 h-5 text-amber-400 shrink-0 animate-spin-slow" />
            <div>
              <strong>Você já possui uma tentativa em andamento!</strong>
              <div className="text-text-muted mt-0.5">
                Tempo restante no servidor: {formatRemaining(simulation.activeAttempt!.remainingSeconds)}
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate(`/simulados/${simulation.id}/prova`)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shrink-0 transition-all shadow-sm"
          >
            Continuar Prova
          </button>
        </div>
      )}

      {/* Card Principal de Instruções */}
      <div className="bg-bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
        {/* Header Superior */}
        <div className="p-6 md:p-8 border-b border-border space-y-3 bg-gradient-to-br from-bg-surface to-bg-elevated/40">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-brand-500/10 text-brand-400 font-extrabold text-xs">
              {simulation.agencyAcronym || 'CONCURSO'}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-bg-elevated text-text-secondary font-bold text-xs">
              {simulation.type === 'FIXED' ? 'Simulado Fixo' : simulation.type === 'RANDOM' ? 'Simulado Aleatório' : 'Simulado Personalizado'}
            </span>
            {simulation.isOfficial && (
              <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 font-extrabold text-xs flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Oficial DEMO
              </span>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-text-primary">
            {simulation.title}
          </h1>

          {simulation.description && (
            <p className="text-text-secondary text-sm leading-relaxed">
              {simulation.description}
            </p>
          )}
        </div>

        {/* Métricas Principais da Prova */}
        <div className="grid grid-cols-3 border-b border-border divide-x divide-border text-center py-4 bg-bg-elevated/20">
          <div>
            <div className="text-xs text-text-muted">Total de Questões</div>
            <div className="text-xl font-extrabold text-text-primary mt-0.5">
              {simulation.totalQuestions}
            </div>
          </div>
          <div>
            <div className="text-xs text-text-muted">Tempo Limite</div>
            <div className="text-xl font-extrabold text-text-primary mt-0.5">
              {simulation.durationMinutes} min
            </div>
          </div>
          <div>
            <div className="text-xs text-text-muted">Nível de Dificuldade</div>
            <div className="text-xl font-extrabold text-text-primary mt-0.5 capitalize">
              {simulation.difficulty.toLowerCase()}
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          {/* Distribuição por Disciplina */}
          {simulation.subjectsBreakdown && simulation.subjectsBreakdown.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-brand-400" />
                <span>Distribuição de Conteúdo</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {simulation.subjectsBreakdown.map((sub, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-bg-elevated/60 border border-border flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-text-primary">{sub.name}</span>
                    <span className="font-bold text-brand-400">{sub.count} questões</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regras e Recomendações */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <Info className="w-4 h-4 text-brand-400" />
              <span>Regras e Funcionamento do Modo Exame</span>
            </h3>

            <div className="space-y-2.5 text-xs text-text-secondary leading-relaxed">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-bg-elevated/40 border border-border">
                <Clock3 className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-text-primary">Cronômetro Autoritativo:</strong> O tempo
                  começará a contar imediatamente após clicar no botão abaixo. Se o tempo zerar, o
                  simulado será encerrado e corrigido automaticamente pelo servidor.
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-bg-elevated/40 border border-border">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-text-primary">Auto-Save Contínuo:</strong> Cada resposta e
                  marcação é salva em tempo real. Se sua página recarregar ou você fechar o
                  navegador, você poderá retomar a prova exatamente de onde parou.
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-bg-elevated/40 border border-border">
                <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-text-primary">
                    {isCebraspe ? 'Régua Cebraspe de Penalidade:' : 'Pontuação Simples:'}
                  </strong>{' '}
                  {isCebraspe
                    ? 'Cada questão marcada incorretamente anulará 1 questão certa. Questões deixadas em branco não somam nem subtraem pontos.'
                    : 'Cada questão certa vale 1 ponto. Erros não anulam questões corretas.'}
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-bg-elevated/40 border border-border">
                <Lock className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-text-primary">Gabarito e Comentários:</strong> Para simular
                  a experiência real de concurso, o gabarito e os comentários dos professores só
                  estarão disponíveis na tela de revisão após a finalização da prova.
                </div>
              </div>
            </div>
          </div>

          {/* Ação de Início */}
          <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-text-muted text-center sm:text-left">
              Ambiente preparado. Pronto para iniciar quando você estiver.
            </div>

            <button
              onClick={handleStartOrResume}
              disabled={starting}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-extrabold text-sm shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 transform active:scale-95"
            >
              {starting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Iniciando...</span>
                </>
              ) : hasActiveAttempt ? (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>CONTINUAR SIMULADO</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>COMEÇAR SIMULADO</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
