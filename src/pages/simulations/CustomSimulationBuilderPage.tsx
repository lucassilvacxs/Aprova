import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Check,
} from 'lucide-react';
import { contestService, ContestItem, ContestDetail } from '@/services/contest.service';
import { simulationService } from '@/services/simulation.service';

export const CustomSimulationBuilderPage: React.FC = () => {
  const navigate = useNavigate();

  // Dados carregados
  const [contests, setContests] = useState<ContestItem[]>([]);
  const [contestDetail, setContestDetail] = useState<ContestDetail | null>(null);

  // Estados do formulário
  const [selectedContestId, setSelectedContestId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<string>('misto');
  const [penaltyRule, setPenaltyRule] = useState<string>('one_error_cancels_one_correct');
  const [questionCount, setQuestionCount] = useState<number>(30);
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [customDuration, setCustomDuration] = useState<boolean>(false);

  // Validação de disponibilidade de questões
  const [availableCount, setAvailableCount] = useState<number | null>(null);
  const [validatingQuestions, setValidatingQuestions] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Carrega lista inicial de concursos
  useEffect(() => {
    contestService
      .getContests()
      .then((data: ContestItem[]) => {
        setContests(data);
        if (data.length > 0) {
          setSelectedContestId(data[0].id);
        }
      })
      .catch((err: any) => console.error(err));
  }, []);

  // Garante lista única de disciplinas sem duplicidade
  const uniqueSubjects = React.useMemo(() => {
    if (!contestDetail?.subjects) return [];
    const map = new Map<string, any>();
    for (const sub of contestDetail.subjects) {
      if (!map.has(sub.id)) {
        map.set(sub.id, sub);
      }
    }
    return Array.from(map.values());
  }, [contestDetail]);

  // Carrega disciplinas quando o concurso muda
  useEffect(() => {
    if (!selectedContestId) return;
    contestService
      .getContestById(selectedContestId)
      .then((detail: ContestDetail) => {
        setContestDetail(detail);
        const rawSubjects = detail.subjects || [];
        const uniqueIds = Array.from(new Set(rawSubjects.map((s: any) => s.id)));
        setSelectedSubjectIds(uniqueIds);
      })
      .catch((err: any) => {
        console.error(err);
        setErrorMessage(err.message || 'Erro ao carregar dados do concurso.');
      });
  }, [selectedContestId]);

  // Atualiza tempo recomendado automaticamente caso o usuário não tenha definido tempo customizado
  useEffect(() => {
    if (!customDuration) {
      // Regra Cebraspe / Concursos: ~2 minutos por questão
      setDurationMinutes(Math.max(15, questionCount * 2));
    }
  }, [questionCount, customDuration]);

  // Checa disponibilidade de questões no banco
  useEffect(() => {
    if (!selectedContestId) return;
    setValidatingQuestions(true);
    setErrorMessage(null);

    const timer = setTimeout(() => {
      simulationService
        .validateCustom({
          contestId: selectedContestId,
          subjectIds: selectedSubjectIds.length > 0 ? selectedSubjectIds : undefined,
          difficulty: difficulty !== 'misto' ? difficulty : undefined,
        })
        .then((res) => {
          setAvailableCount(res.availableQuestions);
          setErrorMessage(null);
        })
        .catch((err) => {
          console.error(err);
          setAvailableCount(null);
          setErrorMessage(err.message || 'Não foi possível verificar a disponibilidade de questões no servidor.');
        })
        .finally(() => {
          setValidatingQuestions(false);
        });
    }, 200);

    return () => clearTimeout(timer);
  }, [selectedContestId, selectedSubjectIds, difficulty]);

  const handleToggleSubject = (subjectId: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId]
    );
  };

  const handleSelectAllSubjects = () => {
    setSelectedSubjectIds(uniqueSubjects.map((s: any) => s.id));
  };

  const handleDeselectAllSubjects = () => {
    setSelectedSubjectIds([]);
  };

  const handleCreate = async () => {
    if (!selectedContestId) {
      setErrorMessage('Selecione um concurso.');
      return;
    }
    if (selectedSubjectIds.length === 0) {
      setErrorMessage('Selecione pelo menos uma disciplina.');
      return;
    }
    if (availableCount !== null && availableCount < questionCount) {
      setErrorMessage(
        `O banco possui apenas ${availableCount} questões para os filtros selecionados. Reduza o número de questões ou ajuste as disciplinas.`
      );
      return;
    }

    try {
      setCreating(true);
      setErrorMessage(null);

      const created = await simulationService.createCustom({
        contestId: selectedContestId,
        title: title.trim() || undefined,
        subjectIds: selectedSubjectIds,
        difficulty: difficulty !== 'misto' ? difficulty : undefined,
        questionCount,
        durationMinutes,
        penaltyRule,
      });

      // Redireciona para a tela de preparação do simulado criado
      navigate(`/simulados/${created.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao gerar simulado personalizado.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/simulados')}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary text-xs font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Central de Simulados</span>
        </button>
      </div>

      <div className="bg-bg-surface border border-border p-6 rounded-2xl space-y-1">
        <div className="flex items-center gap-2 text-brand-400 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>Assistente de Montagem</span>
        </div>
        <h1 className="text-2xl font-extrabold text-text-primary">
          Monte seu Simulado Personalizado
        </h1>
        <p className="text-text-secondary text-sm">
          Escolha os parâmetros exatos do seu treinamento. O sistema selecionará automaticamente questões com algoritmo anti-repetição.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1">
            <strong>Atenção:</strong> {errorMessage}
          </div>
        </div>
      )}

      {/* Formulário Passo a Passo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna Principal de Configuração (2/3) */}
        <div className="md:col-span-2 space-y-6">
          {/* Passo 1: Concurso e Título */}
          <div className="bg-bg-surface border border-border p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] flex items-center justify-center font-extrabold">
                1
              </span>
              Concurso de Referência
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">
                  Selecione o Concurso
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {contests.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedContestId(c.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedContestId === c.id
                          ? 'border-brand-500 bg-brand-500/10 text-brand-300 shadow-sm'
                          : 'border-border bg-bg-elevated text-text-secondary hover:text-text-primary hover:bg-bg-subtle'
                      }`}
                    >
                      <div className="font-extrabold text-xs">{c.acronym || c.agencyName}</div>
                      <div className="text-[11px] text-text-muted truncate mt-0.5">{c.agencyFull || c.agencyName}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">
                  Nome do Simulado (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Treinamento Especial Legislação e Português"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-bg-elevated border border-border text-text-primary text-xs focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Passo 2: Disciplinas */}
          <div className="bg-bg-surface border border-border p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] flex items-center justify-center font-extrabold">
                  2
                </span>
                Disciplinas Incluídas
              </h3>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={handleSelectAllSubjects}
                  className="text-brand-400 hover:underline font-semibold"
                >
                  Todas
                </button>
                <span className="text-border">|</span>
                <button
                  type="button"
                  onClick={handleDeselectAllSubjects}
                  className="text-text-muted hover:underline font-semibold"
                >
                  Nenhuma
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {uniqueSubjects.map((sub: any) => {
                const isSelected = selectedSubjectIds.includes(sub.id);
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleToggleSubject(sub.id)}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'border-brand-500 bg-brand-500/10 text-text-primary'
                        : 'border-border bg-bg-elevated text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    <span className="text-xs font-semibold truncate pr-2">{sub.name}</span>
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-brand-500 text-white' : 'border border-border'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Passo 3: Nível de Dificuldade e Regra de Penalidade */}
          <div className="bg-bg-surface border border-border p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] flex items-center justify-center font-extrabold">
                3
              </span>
              Dificuldade & Regras
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1.5">
                  Nível de Dificuldade
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'misto', label: 'Misto' },
                    { id: 'facil', label: 'Fácil' },
                    { id: 'medio', label: 'Médio' },
                    { id: 'dificil', label: 'Difícil' },
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDifficulty(d.id)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        difficulty === d.id
                          ? 'border-brand-500 bg-brand-500/15 text-brand-300 shadow-sm'
                          : 'border-border bg-bg-elevated text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1.5">
                  Sistema de Pontuação
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPenaltyRule('one_error_cancels_one_correct')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      penaltyRule === 'one_error_cancels_one_correct'
                        ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                        : 'border-border bg-bg-elevated text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <div className="font-extrabold text-xs flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-brand-400" />
                      Regra Cebraspe
                    </div>
                    <div className="text-[11px] text-text-muted mt-0.5">
                      1 questão errada anula 1 certa
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPenaltyRule('none')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      penaltyRule === 'none'
                        ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                        : 'border-border bg-bg-elevated text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <div className="font-extrabold text-xs">Pontuação Simples</div>
                    <div className="text-[11px] text-text-muted mt-0.5">
                      Erros não descontam pontos certos
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Passo 4: Questões e Tempo */}
          <div className="bg-bg-surface border border-border p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] flex items-center justify-center font-extrabold">
                4
              </span>
              Volume e Duração
            </h3>

            <div className="space-y-4">
              {/* Quantidade de Questões */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <span className="text-text-secondary">Quantidade de Questões</span>
                  <span className="text-brand-400 font-extrabold text-sm">{questionCount} questões</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full accent-brand-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-text-muted mt-1">
                  <span>5 q</span>
                  <span>30 q</span>
                  <span>60 q</span>
                  <span>100 q</span>
                </div>
              </div>

              {/* Tempo de Prova */}
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <span className="text-text-secondary">Tempo Disponível</span>
                  <span className="text-text-primary font-extrabold text-sm">{durationMinutes} minutos</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="10"
                    max="240"
                    step="5"
                    value={durationMinutes}
                    onChange={(e) => {
                      setDurationMinutes(Number(e.target.value));
                      setCustomDuration(true);
                    }}
                    className="flex-1 accent-brand-500 cursor-pointer"
                  />
                  {customDuration && (
                    <button
                      type="button"
                      onClick={() => setCustomDuration(false)}
                      className="text-[11px] text-brand-400 hover:underline font-semibold shrink-0"
                    >
                      Padrão ({questionCount * 2} min)
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Lateral: Resumo e Verificação em Tempo Real (1/3) */}
        <div className="space-y-5">
          <div className="bg-bg-surface border border-border p-5 rounded-2xl sticky top-6 space-y-4">
            <h3 className="font-extrabold text-sm text-text-primary uppercase tracking-wider pb-3 border-b border-border">
              Resumo da Prova
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Concurso:</span>
                <span className="font-bold text-text-primary">
                  {contests.find((c) => c.id === selectedContestId)?.acronym || 'PRF'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-text-muted">Disciplinas:</span>
                <span className="font-bold text-text-primary">
                  {selectedSubjectIds.length} selecionada(s)
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-text-muted">Dificuldade:</span>
                <span className="font-bold text-text-primary capitalize">{difficulty}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-text-muted">Questões solicitadas:</span>
                <span className="font-bold text-text-primary">{questionCount}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-text-muted">Duração da prova:</span>
                <span className="font-bold text-text-primary">{durationMinutes} min</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-text-muted">Regra de penalidade:</span>
                <span className="font-bold text-text-primary">
                  {penaltyRule === 'one_error_cancels_one_correct' ? 'Cebraspe' : 'Simples'}
                </span>
              </div>
            </div>

            {/* Verificação de Disponibilidade de Questões */}
            <div className="pt-3 border-t border-border space-y-2">
              <div className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                Disponibilidade no Banco
              </div>

              {validatingQuestions ? (
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <div className="w-3.5 h-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  <span>Verificando questões...</span>
                </div>
              ) : availableCount !== null ? (
                availableCount >= questionCount ? (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      <strong>{availableCount}</strong> questões encontradas. Simulado pronto para gerar!
                    </span>
                  </div>
                ) : availableCount > 0 ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        Existem <strong>{availableCount}</strong> questões para estes filtros (solicitadas: {questionCount}).
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuestionCount(availableCount)}
                      className="w-full py-1.5 px-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-[11px] transition-all"
                    >
                      Ajustar para {availableCount} questões
                    </button>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-1.5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span className="font-semibold">Nenhuma questão encontrada para este filtro.</span>
                    </div>
                    <p className="text-[11px] text-text-muted pl-6">
                      Dica: Alterne o nível de dificuldade para <strong>Misto</strong> ou selecione outras disciplinas para encontrar questões no banco.
                    </p>
                  </div>
                )
              ) : null}
            </div>

            {/* Botão de Criação */}
            <button
              type="button"
              disabled={
                creating ||
                validatingQuestions ||
                (availableCount !== null && availableCount < questionCount) ||
                selectedSubjectIds.length === 0
              }
              onClick={handleCreate}
              className="w-full py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow-md shadow-brand-500/25 transition-all flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Gerando Simulado...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Criar Simulado</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
