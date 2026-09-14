import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Trash2,
  MoveUp,
  MoveDown,
  Search,
  AlertCircle,
  Shield,
} from 'lucide-react';
import { simulationService } from '@/services/simulation.service';
import { contestService, ContestItem } from '@/services/contest.service';
import { questionService, QuestionItem } from '@/services/question.service';

export const AdminSimulationEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [contests, setContests] = useState<ContestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Campos do formulário
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contestId, setContestId] = useState('');
  const [type, setType] = useState<'FIXED' | 'RANDOM'>('FIXED');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [penaltyRule, setPenaltyRule] = useState('one_error_cancels_one_correct');
  const [difficulty, setDifficulty] = useState('MEDIO');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [isOfficial, setIsOfficial] = useState(true);
  const [totalQuestionsRandom, setTotalQuestionsRandom] = useState(30);

  // Questões selecionadas no modo FIXED
  const [selectedQuestions, setSelectedQuestions] = useState<{ id: string; statement: string; subjectName?: string; points?: string }[]>([]);

  // Modal / Picker de Questões do Banco
  const [bankQuestions, setBankQuestions] = useState<QuestionItem[]>([]);
  const [bankSearch, setBankSearch] = useState('');
  const [loadingBank, setLoadingBank] = useState(false);

  useEffect(() => {
    contestService
      .getContests()
      .then((data) => {
        setContests(data);
        if (!isEdit && data.length > 0) {
          setContestId(data[0].id);
        }
      })
      .catch((err: any) => console.error(err));

    if (isEdit && id) {
      simulationService
        .getById(id)
        .then((sim) => {
          setTitle(sim.title);
          setDescription(sim.description || '');
          setContestId(sim.contestId);
          setType(sim.type as any);
          setDurationMinutes(sim.durationMinutes);
          setPenaltyRule(sim.penaltyRule);
          setDifficulty(sim.difficulty);
          setStatus(sim.status === 'published' ? 'published' : 'draft');
          setIsOfficial(sim.isOfficial);
          setTotalQuestionsRandom(sim.totalQuestions);
        })
        .catch((err: any) => setErrorMessage(err.message))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [id, isEdit]);

  // Carrega questões do banco para o seletor quando concurso estiver definido
  useEffect(() => {
    if (type !== 'FIXED' || !contestId) return;
    setLoadingBank(true);
    questionService
      .getQuestions({ contestId, search: bankSearch || undefined, page: 1, limit: 30 })
      .then((res: any) => {
        setBankQuestions(res.items || []);
      })
      .catch((err: any) => console.error(err))
      .finally(() => setLoadingBank(false));
  }, [contestId, bankSearch, type]);

  const handleAddQuestion = (q: QuestionItem) => {
    if (selectedQuestions.some((sq) => sq.id === q.id)) return;
    setSelectedQuestions((prev) => [
      ...prev,
      {
        id: q.id,
        statement: q.statement,
        subjectName: q.subjectName || 'Geral',
        points: '1.00',
      },
    ]);
  };

  const handleRemoveQuestion = (qId: string) => {
    setSelectedQuestions((prev) => prev.filter((sq) => sq.id !== qId));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const copy = [...selectedQuestions];
    [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
    setSelectedQuestions(copy);
  };

  const handleMoveDown = (index: number) => {
    if (index === selectedQuestions.length - 1) return;
    const copy = [...selectedQuestions];
    [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
    setSelectedQuestions(copy);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Informe um título para o simulado.');
      return;
    }
    if (!contestId) {
      setErrorMessage('Selecione um concurso.');
      return;
    }
    if (type === 'FIXED' && selectedQuestions.length === 0) {
      setErrorMessage('Selecione pelo menos uma questão para o simulado fixo.');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage(null);

      const payload: any = {
        contestId,
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        durationMinutes,
        penaltyRule,
        difficulty,
        status,
        isOfficial,
      };

      if (type === 'FIXED') {
        payload.questionIds = selectedQuestions.map((q) => q.id);
        payload.totalQuestions = selectedQuestions.length;
      } else {
        payload.totalQuestions = totalQuestionsRandom;
        payload.filterConfig = { contestId, difficulty };
      }

      if (isEdit && id) {
        await simulationService.adminUpdate(id, payload);
      } else {
        await simulationService.adminCreate(payload);
      }

      navigate('/admin/simulados');
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao salvar simulado.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-text-secondary text-sm">Carregando editor de simulados...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/admin/simulados')}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary text-xs font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Lista de Simulados</span>
        </button>
      </div>

      <div className="bg-bg-surface border border-border p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" />
            <span>Painel Administrativo</span>
          </div>
          <h1 className="text-2xl font-extrabold text-text-primary">
            {isEdit ? 'Editar Simulado' : 'Novo Simulado Oficial'}
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Configure as regras, duração e questões do simulado.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Metadados Básicos */}
        <div className="bg-bg-surface border border-border p-6 rounded-2xl space-y-4">
          <h3 className="font-extrabold text-xs text-text-primary uppercase tracking-wider">
            Informações Gerais
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Título do Simulado *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Simulado Geral PRF — Prova Completa 01"
                className="w-full px-3.5 py-2 rounded-xl bg-bg-elevated border border-border text-text-primary text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Descrição
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Instruções e escopo da prova..."
                className="w-full px-3.5 py-2 rounded-xl bg-bg-elevated border border-border text-text-primary text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Concurso de Referência *
              </label>
              <select
                required
                value={contestId}
                onChange={(e) => setContestId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-bg-elevated border border-border text-text-primary text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="">Selecione um concurso</option>
                {contests.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.acronym ? `${c.acronym} — ${c.agencyName}` : c.agencyName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Tipo de Simulado *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3.5 py-2 rounded-xl bg-bg-elevated border border-border text-text-primary text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="FIXED">Fixo (Questões Manuais)</option>
                <option value="RANDOM">Aleatório (Gerador por Filtros)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Regras e Cronômetro */}
        <div className="bg-bg-surface border border-border p-6 rounded-2xl space-y-4">
          <h3 className="font-extrabold text-xs text-text-primary uppercase tracking-wider">
            Regras de Prova e Tempo
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Duração (Minutos) *
              </label>
              <input
                type="number"
                min="5"
                max="360"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-bg-elevated border border-border text-text-primary text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Regra de Penalidade
              </label>
              <select
                value={penaltyRule}
                onChange={(e) => setPenaltyRule(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-bg-elevated border border-border text-text-primary text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="one_error_cancels_one_correct">Cebraspe (1 erro anula 1 acerto)</option>
                <option value="none">Pontuação Simples (Sem penalidade)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Dificuldade Geral
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-bg-elevated border border-border text-text-primary text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="FACIL">Fácil</option>
                <option value="MEDIO">Médio</option>
                <option value="DIFICIL">Difícil</option>
                <option value="MISTO">Misto</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Status de Publicação
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-2 rounded-xl bg-bg-elevated border border-border text-text-primary text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="draft">Rascunho (Oculto aos Alunos)</option>
                <option value="published">Publicado (Disponível)</option>
              </select>
            </div>

            {type === 'RANDOM' && (
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">
                  Quantidade Total de Questões
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={totalQuestionsRandom}
                  onChange={(e) => setTotalQuestionsRandom(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-bg-elevated border border-border text-text-primary text-xs focus:outline-none focus:border-brand-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Seletor de Questões para Simulado FIXO */}
        {type === 'FIXED' && (
          <div className="bg-bg-surface border border-border p-6 rounded-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-extrabold text-xs text-text-primary uppercase tracking-wider">
                  Questões Selecionadas ({selectedQuestions.length})
                </h3>
                <p className="text-[11px] text-text-muted">
                  Ordene as questões ou adicione novas questões do banco.
                </p>
              </div>
            </div>

            {/* Lista das Questões Já Adicionadas */}
            <div className="space-y-2">
              {selectedQuestions.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-border rounded-xl text-xs text-text-muted">
                  Nenhuma questão adicionada ainda. Selecione questões na lista abaixo.
                </div>
              ) : (
                selectedQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-3 rounded-xl bg-bg-elevated/70 border border-border flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-brand-500 text-white font-extrabold flex items-center justify-center text-[11px] shrink-0">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <span className="font-bold text-brand-400 mr-2">[{q.subjectName}]</span>
                        <span className="text-text-primary">{q.statement}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveUp(idx)}
                        className="p-1 rounded bg-bg-surface border border-border text-text-secondary hover:text-text-primary disabled:opacity-30"
                        title="Subir posição"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === selectedQuestions.length - 1}
                        onClick={() => handleMoveDown(idx)}
                        className="p-1 rounded bg-bg-surface border border-border text-text-secondary hover:text-text-primary disabled:opacity-30"
                        title="Descer posição"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="p-1 rounded bg-bg-surface border border-border text-rose-400 hover:bg-rose-500/20"
                        title="Remover do simulado"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Busca e Adição do Banco de Questões */}
            <div className="pt-4 border-t border-border space-y-3">
              <h4 className="font-bold text-xs text-text-secondary uppercase tracking-wider">
                Adicionar Questões do Banco
              </h4>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Pesquisar questões por enunciado..."
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-bg-elevated border border-border text-text-primary text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {loadingBank ? (
                  <div className="text-center py-4 text-xs text-text-muted">Carregando questões...</div>
                ) : (
                  bankQuestions.map((bq) => {
                    const alreadyAdded = selectedQuestions.some((sq) => sq.id === bq.id);
                    return (
                      <div
                        key={bq.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                          alreadyAdded ? 'border-border/40 bg-bg-elevated/20 opacity-50' : 'border-border bg-bg-elevated'
                        }`}
                      >
                        <div className="truncate min-w-0">
                          <span className="font-bold text-brand-400 mr-2">
                            [{bq.subjectName || 'Geral'}]
                          </span>
                          <span className="text-text-primary">{bq.statement}</span>
                        </div>
                        <button
                          type="button"
                          disabled={alreadyAdded}
                          onClick={() => handleAddQuestion(bq)}
                          className="px-2.5 py-1 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white font-bold text-[11px] shrink-0"
                        >
                          {alreadyAdded ? 'Adicionada' : '+ Adicionar'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Botão de Envio */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={() => navigate('/admin/simulados')}
            className="px-5 py-2.5 rounded-xl border border-border bg-bg-surface hover:bg-bg-subtle text-text-secondary hover:text-text-primary font-bold text-xs"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-brand-500/25 transition-all"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Simulado</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
