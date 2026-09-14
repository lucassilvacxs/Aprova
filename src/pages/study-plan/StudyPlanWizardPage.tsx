import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Sparkles,
  Sliders,
  Target,
  BookOpen,
  Calendar,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { contestService, ContestItem } from '@/services/contest.service';
import {
  StudyPlanFrontendService,
  StudyAvailability,
  GeneratePreviewResult,
} from '@/services/study-plan.service';

const DAYS_OF_WEEK = [
  { day: 0, label: 'Domingo', short: 'Dom' },
  { day: 1, label: 'Segunda-feira', short: 'Seg' },
  { day: 2, label: 'Terça-feira', short: 'Ter' },
  { day: 3, label: 'Quarta-feira', short: 'Qua' },
  { day: 4, label: 'Quinta-feira', short: 'Qui' },
  { day: 5, label: 'Sexta-feira', short: 'Sex' },
  { day: 6, label: 'Sábado', short: 'Sáb' },
];

export const StudyPlanWizardPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dados carregados
  const [contests, setContests] = useState<ContestItem[]>([]);

  // Estado do formulário
  const [selectedContestId, setSelectedContestId] = useState<string>('');
  const [planName, setPlanName] = useState<string>('');
  const [planDescription, setPlanDescription] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>('');

  // Disponibilidade (Step 2)
  const [availabilities, setAvailabilities] = useState<StudyAvailability[]>([
    { dayOfWeek: 0, startTime: '08:00', endTime: '10:00', availableMinutes: 120, enabled: true },
    { dayOfWeek: 1, startTime: '19:00', endTime: '21:30', availableMinutes: 150, enabled: true },
    { dayOfWeek: 2, startTime: '19:00', endTime: '21:30', availableMinutes: 150, enabled: true },
    { dayOfWeek: 3, startTime: '19:00', endTime: '21:30', availableMinutes: 150, enabled: true },
    { dayOfWeek: 4, startTime: '19:00', endTime: '21:30', availableMinutes: 150, enabled: true },
    { dayOfWeek: 5, startTime: '19:00', endTime: '21:30', availableMinutes: 150, enabled: true },
    { dayOfWeek: 6, startTime: '08:00', endTime: '12:00', availableMinutes: 240, enabled: true },
  ]);

  // Disciplinas e prioridades (Step 3)
  const [selectedSubjects, setSelectedSubjects] = useState<
    Array<{
      subjectId: string;
      name: string;
      weight: number;
      priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      enabled: boolean;
      colorToken?: string;
    }>
  >([]);

  // Preferências & Ritmo (Step 4)
  const [strategy, setStrategy] = useState<'BALANCED' | 'EDICT_WEIGHTED' | 'WEAKNESS_FOCUSED' | 'CUSTOM'>('BALANCED');
  const minSessionMinutes = 30;
  const [maxSessionMinutes, setMaxSessionMinutes] = useState(60);
  const [breakMinutes, setBreakMinutes] = useState(10);
  const [defaultQuestions, setDefaultQuestions] = useState(20);
  const [prioritizeWeakSubjects, setPrioritizeWeakSubjects] = useState(true);
  const [prioritizeBehindSchedule, setPrioritizeBehindSchedule] = useState(true);
  const balancedDistribution = true;

  // Prévia gerada (Step 5)
  const [createdPlanId, setCreatedPlanId] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<GeneratePreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Carrega lista de concursos
  useEffect(() => {
    contestService
      .getContests()
      .then((data) => {
        setContests(data);
        if (data.length > 0) {
          handleSelectContest(data[0].id);
        }
      })
      .catch((err) => console.error('Erro ao listar concursos:', err));
  }, []);

  const handleSelectContest = async (contestId: string) => {
    setSelectedContestId(contestId);
    try {
      const detail = await contestService.getContestById(contestId);
      setPlanName(`Plano Tático — ${detail.acronym || detail.agencyName} ${detail.year || ''}`);
      setPlanDescription(`Cronograma adaptativo orientado para o edital ${detail.acronym}.`);

      if (detail.subjects && detail.subjects.length > 0) {
        setSelectedSubjects(
          detail.subjects.map((s) => ({
            subjectId: s.id,
            name: s.name,
            weight: Number(s.weight) || 1.0,
            priority: (Number(s.weight) >= 2.5 ? 'CRITICAL' : Number(s.weight) >= 1.5 ? 'HIGH' : 'MEDIUM') as any,
            enabled: true,
            colorToken: s.colorToken,
          }))
        );
      }
    } catch (err) {
      console.error('Erro ao carregar detalhes do concurso:', err);
    }
  };

  // Cálculo de minutos totais por semana
  const totalWeeklyMinutes = availabilities.reduce((acc, a) => (a.enabled ? acc + a.availableMinutes : acc), 0);
  const totalWeeklyHours = (totalWeeklyMinutes / 60).toFixed(1);

  const handleAvailabilityChange = (index: number, field: keyof StudyAvailability, value: any) => {
    setAvailabilities((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      if (field === 'startTime' || field === 'endTime') {
        const [sh, sm] = item.startTime.split(':').map(Number);
        const [eh, em] = item.endTime.split(':').map(Number);
        const startTotal = (sh || 0) * 60 + (sm || 0);
        const endTotal = (eh || 0) * 60 + (em || 0);
        const diff = endTotal > startTotal ? endTotal - startTotal : 0;
        item.availableMinutes = diff;
      }

      updated[index] = item;
      return updated;
    });
  };

  // Cria rascunho e gera prévia ao avançar para o Step 5
  const generatePreview = async () => {
    try {
      setPreviewLoading(true);
      setError(null);

      // Prepara payload do plano
      const activeSubjects = selectedSubjects.filter((s) => s.enabled);
      if (activeSubjects.length === 0) {
        throw new Error('Selecione pelo menos uma disciplina para o plano.');
      }

      const payload = {
        contestId: selectedContestId,
        name: planName || 'Plano de Estudos',
        description: planDescription,
        targetDate: targetDate || undefined,
        weeklyHours: Math.round(Number(totalWeeklyHours)),
        dailyMinutes: Math.round(totalWeeklyMinutes / 7),
        strategy,
        availabilities: availabilities.filter((a) => a.enabled),
        preferences: {
          minSessionMinutes,
          maxSessionMinutes,
          breakMinutes,
          defaultQuestionsPerSession: defaultQuestions,
          revisionFrequency: 'spaced',
          prioritizeWeakSubjects,
          prioritizeBehindSchedule,
          balancedDistribution,
        },
        subjects: activeSubjects.map((s) => ({
          subjectId: s.subjectId,
          priority: s.priority,
          weight: s.weight,
          targetPercentage: 100,
        })),
      };

      let planId = createdPlanId;
      if (!planId) {
        const created = await StudyPlanFrontendService.createPlan(payload);
        planId = created.id;
        setCreatedPlanId(planId);
      } else {
        await StudyPlanFrontendService.updatePlan(planId, payload);
      }

      // Chama endpoint de prévia
      const preview = await StudyPlanFrontendService.previewGeneration(planId);
      setPreviewResult(preview);
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar prévia do cronograma.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleNextStep = async () => {
    if (currentStep === 1) {
      if (!selectedContestId) {
        setError('Por favor, selecione um concurso alvo.');
        return;
      }
    }
    if (currentStep === 2) {
      if (totalWeeklyMinutes < 60) {
        setError('Por favor, defina pelo menos 1 hora de estudos na semana.');
        return;
      }
    }
    if (currentStep === 4) {
      setCurrentStep(5);
      await generatePreview();
      return;
    }
    setError(null);
    setCurrentStep((prev) => Math.min(prev + 1, 6));
  };

  const handlePrevStep = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFinalActivation = async () => {
    if (!createdPlanId) return;
    try {
      setLoading(true);
      setError(null);
      await StudyPlanFrontendService.activatePlan(createdPlanId);
      navigate('/plano-estudos/hoje');
    } catch (err: any) {
      setError(err.message || 'Erro ao ativar plano de estudos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/plano-estudos')}
            className="text-xs font-bold text-text-muted hover:text-text-primary flex items-center gap-1 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Hub</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
            Assistente de Planejamento Inteligente
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Passo a passo guiado para construir sua rotina de estudos de alta performance.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Etapa {currentStep} de 6</span>
        </div>
      </div>

      {/* Barra de Progresso das Etapas */}
      <div className="grid grid-cols-6 gap-2">
        {[
          { step: 1, label: 'Concurso' },
          { step: 2, label: 'Horários' },
          { step: 3, label: 'Disciplinas' },
          { step: 4, label: 'Estratégia' },
          { step: 5, label: 'Prévia' },
          { step: 6, label: 'Ativação' },
        ].map((item) => (
          <div key={item.step} className="space-y-1.5">
            <div
              className={`h-2 rounded-full transition-all ${
                currentStep >= item.step ? 'bg-brand-500' : 'bg-bg-subtle border border-border'
              }`}
            />
            <span
              className={`block text-[11px] font-bold text-center truncate ${
                currentStep === item.step
                  ? 'text-brand-400'
                  : currentStep > item.step
                  ? 'text-text-primary'
                  : 'text-text-muted'
              }`}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Alerta de Erro */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm font-semibold flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* CONTEÚDO DAS ETAPAS */}
      <div className="bg-bg-surface border border-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
        {/* ETAPA 1: CONCURSO ALVO */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-text-primary flex items-center gap-2">
                <Target className="w-5 h-5 text-brand-400" />
                <span>Escolha o Concurso Alvo & Detalhes</span>
              </h2>
              <p className="text-xs text-text-muted">
                O edital e os pesos das disciplinas serão herdados automaticamente deste concurso.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {contests.map((c) => {
                const isSelected = selectedContestId === c.id;
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => handleSelectContest(c.id)}
                    className={`p-4 rounded-2xl border text-left transition-all flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-brand-500/10 border-brand-500 text-text-primary ring-2 ring-brand-500/20'
                        : 'bg-bg-subtle border-border hover:border-brand-500/40 text-text-muted'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-black uppercase tracking-wider text-brand-400">
                        {c.acronym || 'CONCURSO'}
                      </div>
                      <h3 className="text-sm font-bold text-text-primary">{c.agencyFull || c.agencyName}</h3>
                      <p className="text-xs text-text-muted">{c.vacanciesCount} vagas previstos • {c.year}</p>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-brand-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-secondary">Nome do Plano</label>
                <input
                  type="text"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="Ex.: Reta Final PRF 2026"
                  className="w-full px-4 py-2.5 rounded-xl bg-bg-subtle border border-border text-text-primary text-sm font-medium focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-text-secondary">Data Prevista da Prova (Opcional)</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-bg-subtle border border-border text-text-primary text-sm font-medium focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-text-secondary">Descrição ou Observações</label>
              <textarea
                rows={2}
                value={planDescription}
                onChange={(e) => setPlanDescription(e.target.value)}
                placeholder="Ex.: Foco intensivo nos finais de semana e revisão diária rápida."
                className="w-full px-4 py-2.5 rounded-xl bg-bg-subtle border border-border text-text-primary text-sm font-medium focus:outline-none focus:border-brand-500 resize-none"
              />
            </div>
          </div>
        )}

        {/* ETAPA 2: DISPONIBILIDADE SEMANAL */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-1">
                <h2 className="text-lg font-black text-text-primary flex items-center gap-2">
                  <Clock className="w-5 h-5 text-brand-400" />
                  <span>Sua Disponibilidade Semanal</span>
                </h2>
                <p className="text-xs text-text-muted">
                  Defina os horários em que você realmente tem capacidade de estudar com foco.
                </p>
              </div>

              <div className="px-3.5 py-1.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-black">
                Total: {totalWeeklyHours}h / semana
              </div>
            </div>

            <div className="space-y-3">
              {availabilities.map((item, idx) => {
                const dayObj = DAYS_OF_WEEK.find((d) => d.day === item.dayOfWeek) || { label: 'Dia', short: 'Dia' };
                return (
                  <div
                    key={item.dayOfWeek}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      item.enabled ? 'bg-bg-subtle border-border' : 'bg-bg-subtle/40 border-border/40 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 w-40">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(e) => handleAvailabilityChange(idx, 'enabled', e.target.checked)}
                        className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 border-border"
                      />
                      <span className="text-sm font-bold text-text-primary">{dayObj.label}</span>
                    </div>

                    {item.enabled ? (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs text-text-muted">
                          <span>Início:</span>
                          <input
                            type="time"
                            value={item.startTime}
                            onChange={(e) => handleAvailabilityChange(idx, 'startTime', e.target.value)}
                            className="px-2 py-1 rounded-lg bg-bg-surface border border-border text-xs text-text-primary font-bold"
                          />
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-text-muted">
                          <span>Fim:</span>
                          <input
                            type="time"
                            value={item.endTime}
                            onChange={(e) => handleAvailabilityChange(idx, 'endTime', e.target.value)}
                            className="px-2 py-1 rounded-lg bg-bg-surface border border-border text-xs text-text-primary font-bold"
                          />
                        </div>

                        <div className="w-24 text-right text-xs font-black text-brand-400">
                          {(item.availableMinutes / 60).toFixed(1)}h
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-text-muted italic">Dia livre para descanso</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ETAPA 3: DISCIPLINAS & PRIORIDADES */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-text-primary flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-brand-400" />
                <span>Disciplinas & Níveis de Prioridade</span>
              </h2>
              <p className="text-xs text-text-muted">
                Ajuste a prioridade pedagógica de acordo com seu domínio. O algoritmo balanceia com os pesos oficiais do edital.
              </p>
            </div>

            <div className="space-y-2.5">
              {selectedSubjects.map((sub, idx) => (
                <div
                  key={sub.subjectId}
                  className="p-3.5 rounded-2xl bg-bg-subtle border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={sub.enabled}
                      onChange={(e) => {
                        const updated = [...selectedSubjects];
                        updated[idx].enabled = e.target.checked;
                        setSelectedSubjects(updated);
                      }}
                      className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 border-border"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-text-primary">{sub.name}</h4>
                      <span className="text-xs text-text-muted">Peso no edital: {sub.weight}x</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-muted font-medium">Prioridade:</span>
                    <select
                      value={sub.priority}
                      onChange={(e) => {
                        const updated = [...selectedSubjects];
                        updated[idx].priority = e.target.value as any;
                        setSelectedSubjects(updated);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-bg-surface border border-border text-xs font-bold text-text-primary focus:outline-none focus:border-brand-500"
                    >
                      <option value="CRITICAL">🔥 Crítica</option>
                      <option value="HIGH">⭐ Alta</option>
                      <option value="MEDIUM">⚖️ Média</option>
                      <option value="LOW">🌱 Baixa</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ETAPA 4: ESTRATÉGIA & RITMO */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-text-primary flex items-center gap-2">
                <Sliders className="w-5 h-5 text-brand-400" />
                <span>Estratégia & Configuração de Sessão</span>
              </h2>
              <p className="text-xs text-text-muted">
                Escolha o comportamento do motor de distribuição e o tempo ideal de cada bloco.
              </p>
            </div>

            {/* Seleção de Estratégia */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  key: 'BALANCED',
                  title: 'Equilibrado',
                  desc: 'Pondera pesos do edital e fraquezas do aluno simultaneamente.',
                },
                {
                  key: 'EDICT_WEIGHTED',
                  title: 'Foco no Edital',
                  desc: 'Aloca a maior parte do tempo nas matérias com maior peso na prova.',
                },
                {
                  key: 'WEAKNESS_FOCUSED',
                  title: 'Ataque a Fraquezas',
                  desc: 'Prioriza matérias onde sua taxa de acertos nas questões é menor.',
                },
              ].map((st) => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setStrategy(st.key as any)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    strategy === st.key
                      ? 'bg-brand-500/10 border-brand-500 text-text-primary ring-2 ring-brand-500/20'
                      : 'bg-bg-subtle border-border text-text-muted hover:border-brand-500/40'
                  }`}
                >
                  <h3 className="text-sm font-bold text-text-primary">{st.title}</h3>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">{st.desc}</p>
                </button>
              ))}
            </div>

            {/* Parâmetros de Bloco de Estudo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-secondary">Duração Máxima por Sessão</label>
                <select
                  value={maxSessionMinutes}
                  onChange={(e) => setMaxSessionMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-bg-subtle border border-border text-text-primary text-xs font-bold"
                >
                  <option value={45}>45 minutos</option>
                  <option value={60}>60 minutos (Recomendado)</option>
                  <option value={75}>75 minutos</option>
                  <option value={90}>90 minutos</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-text-secondary">Intervalo entre Sessões</label>
                <select
                  value={breakMinutes}
                  onChange={(e) => setBreakMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-bg-subtle border border-border text-text-primary text-xs font-bold"
                >
                  <option value={5}>5 minutos</option>
                  <option value={10}>10 minutos (Recomendado)</option>
                  <option value={15}>15 minutos</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-text-secondary">Meta de Questões por Bloco</label>
                <select
                  value={defaultQuestions}
                  onChange={(e) => setDefaultQuestions(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-bg-subtle border border-border text-text-primary text-xs font-bold"
                >
                  <option value={15}>15 questões</option>
                  <option value={20}>20 questões (Padrão)</option>
                  <option value={30}>30 questões</option>
                </select>
              </div>
            </div>

            {/* Toggles Inteligentes */}
            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-3 p-3 rounded-xl bg-bg-subtle border border-border cursor-pointer">
                <input
                  type="checkbox"
                  checked={prioritizeWeakSubjects}
                  onChange={(e) => setPrioritizeWeakSubjects(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 border-border"
                />
                <span className="text-xs font-bold text-text-primary">
                  Ajustar prioridade dinamicamente conforme meu índice de acerto em simulados e questões
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-bg-subtle border border-border cursor-pointer">
                <input
                  type="checkbox"
                  checked={prioritizeBehindSchedule}
                  onChange={(e) => setPrioritizeBehindSchedule(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 border-border"
                />
                <span className="text-xs font-bold text-text-primary">
                  Priorizar aulas pendentes em matérias que estão atrasadas em relação ao cronograma
                </span>
              </label>
            </div>
          </div>
        )}

        {/* ETAPA 5: PRÉVIA DO CRONOGRAMA GERADO */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-text-primary flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand-400" />
                <span>Prévia do Horizonte Gerado (4 Semanas)</span>
              </h2>
              <p className="text-xs text-text-muted">
                Veja como o algoritmo organizou suas sessões, alternando teoria, questões, revisões e simulados.
              </p>
            </div>

            {previewLoading ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-8 h-8 mx-auto border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-text-muted font-bold">
                  Executando o motor pedagógico de distribuição...
                </p>
              </div>
            ) : previewResult ? (
              <div className="space-y-5">
                {/* Resumo da Prévia */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-bg-subtle border border-border text-center">
                    <div className="text-xl font-black text-brand-400">
                      {previewResult.totalHours.toFixed(1)}h
                    </div>
                    <div className="text-xs text-text-muted font-bold mt-0.5">Carga Total (4 sem)</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-bg-subtle border border-border text-center">
                    <div className="text-xl font-black text-purple-400">
                      {previewResult.totalSessions}
                    </div>
                    <div className="text-xs text-text-muted font-bold mt-0.5">Sessões Planejadas</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-bg-subtle border border-border text-center">
                    <div className="text-xl font-black text-emerald-400">
                      {previewResult.totalQuestions}
                    </div>
                    <div className="text-xs text-text-muted font-bold mt-0.5">Questões Meta</div>
                  </div>
                </div>

                {/* Lista de Sessões da Semana 1 */}
                <div className="space-y-2">
                  <div className="text-xs font-black uppercase tracking-wider text-text-secondary">
                    Primeiras Sessões do Cronograma
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {previewResult.sessions.slice(0, 8).map((sess, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-bg-subtle border border-border flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-text-primary">
                              {new Date(sess.sessionDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                            </span>
                            <span className="text-text-muted">• {sess.startTime}</span>
                            <span className="px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 font-extrabold text-[10px]">
                              {sess.type}
                            </span>
                          </div>
                          <p className="text-text-muted truncate font-medium">
                            {sess.subjectName} — {sess.lessonTitle || sess.simulationTitle || `${sess.plannedMinutes} minutos`}
                          </p>
                        </div>
                        <span className="font-black text-text-primary shrink-0">
                          {sess.plannedMinutes} min
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ETAPA 6: CONFIRMAÇÃO & ATIVAÇÃO */}
        {currentStep === 6 && (
          <div className="space-y-6 text-center py-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="text-xl font-black text-text-primary">
                Tudo Pronto para Começar!
              </h2>
              <p className="text-xs text-text-muted leading-relaxed">
                Ao ativar seu plano de estudos, as sessões das próximas 4 semanas serão confirmadas
                na sua agenda. Você poderá reprogramar ou pausar a qualquer momento.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-bg-subtle border border-border max-w-md mx-auto text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-text-muted font-medium">Plano:</span>
                <span className="font-bold text-text-primary">{planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted font-medium">Carga Semanal:</span>
                <span className="font-bold text-brand-400">{totalWeeklyHours} horas</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted font-medium">Estratégia:</span>
                <span className="font-bold text-text-primary">{strategy}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted font-medium">Revisão Espaçada:</span>
                <span className="font-bold text-emerald-400">Ativa (D+1, D+7, D+14, D+30)</span>
              </div>
            </div>

            <button
              onClick={handleFinalActivation}
              disabled={loading}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-sm shadow-xl shadow-brand-500/25 transition-all transform hover:scale-105"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>{loading ? 'Ativando...' : 'Ativar Meu Plano de Estudos'}</span>
            </button>
          </div>
        )}

        {/* NAVEGAÇÃO ENTRE ETAPAS */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={currentStep === 1 || loading}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-text-muted hover:text-text-primary transition-all ${
              currentStep === 1 ? 'opacity-0 pointer-events-none' : ''
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Etapa Anterior</span>
          </button>

          {currentStep < 6 && (
            <button
              type="button"
              onClick={handleNextStep}
              disabled={loading || previewLoading}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all transform active:scale-95"
            >
              <span>{currentStep === 4 ? 'Gerar Cronograma' : 'Próxima Etapa'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
