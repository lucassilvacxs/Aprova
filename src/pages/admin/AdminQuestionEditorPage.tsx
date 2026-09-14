import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  Card,
  Button,
  IconButton,
  LoadingState,
} from '@/components/ui';
import {
  questionService,
  FilterOptionData,
  CreateQuestionInput,
} from '@/services/question.service';

interface OptionFormState {
  letter: string;
  text: string;
  isCorrect: boolean;
  orderIndex: number;
}

export const AdminQuestionEditorPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterData, setFilterData] = useState<FilterOptionData | null>(null);

  // Form Fields
  const [contestId, setContestId] = useState<string>('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [topicId, setTopicId] = useState<string>('');
  const [boardId, setBoardId] = useState<string>('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'very_hard'>('medium');
  const [format, setFormat] = useState<'multiple_choice' | 'true_false'>('multiple_choice');
  const [source, setSource] = useState<'BANCA_OFICIAL' | 'QUESTAO_AUTORAL' | 'IMPORTADA' | 'DEMO' | 'OUTRA'>('BANCA_OFICIAL');
  const [sourceReference, setSourceReference] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('published');
  const [statement, setStatement] = useState('');
  const [officialExplanation, setOfficialExplanation] = useState('');

  // Opções
  const [options, setOptions] = useState<OptionFormState[]>([
    { letter: 'A', text: '', isCorrect: true, orderIndex: 1 },
    { letter: 'B', text: '', isCorrect: false, orderIndex: 2 },
    { letter: 'C', text: '', isCorrect: false, orderIndex: 3 },
    { letter: 'D', text: '', isCorrect: false, orderIndex: 4 },
    { letter: 'E', text: '', isCorrect: false, orderIndex: 5 },
  ]);

  // Carrega opções de apoio para os selects
  useEffect(() => {
    questionService.getFiltersData().then((data) => {
      setFilterData(data);
      if (!isEditing && data) {
        if (data.boards.length > 0) setBoardId(data.boards[0].id);
        if (data.subjects.length > 0) {
          setSubjectId(data.subjects[0].id);
          const relatedTopic = data.topics.find((t) => t.subjectId === data.subjects[0].id);
          if (relatedTopic) setTopicId(relatedTopic.id);
        }
      }
    });
  }, [isEditing]);

  // Se estiver editando, busca os dados da questão
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    questionService
      .getQuestion(id)
      .then((q) => {
        setContestId(q.contestId || '');
        setSubjectId(q.subjectId || '');
        setTopicId(q.topicId);
        setBoardId(q.boardId);
        setYear(q.year);
        setDifficulty(q.difficulty);
        setFormat(q.format);
        setSource(q.source);
        setSourceReference(q.sourceReference || '');
        setStatus(q.status === 'published' ? 'published' : 'draft');
        setStatement(q.statement);
        setOfficialExplanation(q.officialExplanation || '');

        if (q.options && q.options.length > 0) {
          setOptions(
            q.options.map((opt, idx) => ({
              letter: opt.letter,
              text: opt.text,
              isCorrect: Boolean(opt.isCorrect),
              orderIndex: opt.orderIndex || idx + 1,
            }))
          );
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar questão para edição:', err);
        alert('Não foi possível carregar os dados desta questão.');
        navigate('/admin/questoes');
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Altera formato entre Múltipla Escolha e Certo/Errado
  const handleFormatChange = (newFormat: 'multiple_choice' | 'true_false') => {
    setFormat(newFormat);
    if (newFormat === 'true_false') {
      setOptions([
        { letter: 'C', text: 'Certo', isCorrect: true, orderIndex: 1 },
        { letter: 'E', text: 'Errado', isCorrect: false, orderIndex: 2 },
      ]);
    } else {
      setOptions([
        { letter: 'A', text: '', isCorrect: true, orderIndex: 1 },
        { letter: 'B', text: '', isCorrect: false, orderIndex: 2 },
        { letter: 'C', text: '', isCorrect: false, orderIndex: 3 },
        { letter: 'D', text: '', isCorrect: false, orderIndex: 4 },
        { letter: 'E', text: '', isCorrect: false, orderIndex: 5 },
      ]);
    }
  };

  const handleSetCorrectOption = (index: number) => {
    setOptions((prev) =>
      prev.map((opt, i) => ({
        ...opt,
        isCorrect: i === index,
      }))
    );
  };

  const handleUpdateOptionText = (index: number, text: string) => {
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, text } : opt))
    );
  };

  const handleAddOption = () => {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const nextLetter = letters[options.length] || String.fromCharCode(65 + options.length);
    setOptions((prev) => [
      ...prev,
      {
        letter: nextLetter,
        text: '',
        isCorrect: false,
        orderIndex: prev.length + 1,
      },
    ]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      alert('Uma questão precisa ter pelo menos 2 alternativas.');
      return;
    }
    const wasCorrect = options[index].isCorrect;
    const remaining = options.filter((_, i) => i !== index);
    if (wasCorrect && remaining.length > 0) {
      remaining[0].isCorrect = true;
    }
    setOptions(remaining);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!statement.trim()) {
      alert('Informe o enunciado da questão.');
      return;
    }
    if (!officialExplanation.trim()) {
      alert('Informe o comentário oficial / explicação da questão.');
      return;
    }
    if (!topicId) {
      alert('Selecione uma disciplina e assunto válidos.');
      return;
    }
    if (!boardId) {
      alert('Selecione a banca examinadora.');
      return;
    }

    const emptyOption = options.find((o) => !o.text.trim());
    if (emptyOption) {
      alert(`Preencha o texto da alternativa ${emptyOption.letter}.`);
      return;
    }

    const correctCount = options.filter((o) => o.isCorrect).length;
    if (correctCount !== 1) {
      alert('Selecione exatamente UMA alternativa como correta.');
      return;
    }

    setSaving(true);

    const payload: CreateQuestionInput = {
      contestId: contestId || null,
      subjectId: subjectId || null,
      topicId,
      boardId,
      year: Number(year),
      difficulty,
      format,
      source,
      sourceReference: sourceReference.trim() || null,
      status,
      statement: statement.trim(),
      officialExplanation: officialExplanation.trim(),
      options: options.map((o) => ({
        letter: o.letter,
        text: o.text.trim(),
        isCorrect: o.isCorrect,
        orderIndex: o.orderIndex,
      })),
    };

    try {
      if (isEditing && id) {
        await questionService.updateQuestion(id, payload);
        alert('Questão atualizada com sucesso!');
      } else {
        await questionService.createQuestion(payload);
        alert('Questão criada com sucesso no banco de dados!');
      }
      navigate('/admin/questoes');
    } catch (err: any) {
      console.error('Erro ao salvar questão:', err);
      alert('Erro ao salvar questão: ' + (err.message || 'Desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const filteredTopics = filterData?.topics.filter((t) =>
    subjectId ? t.subjectId === subjectId : true
  ) || [];

  if (loading) {
    return (
      <div className="py-20">
        <LoadingState message="Carregando formulário da questão..." />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 animate-fade-in">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/admin/questoes')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Voltar
          </Button>
          <div>
            <h1 className="text-xl font-extrabold text-text-primary">
              {isEditing ? 'Editar Questão' : 'Cadastrar Nova Questão'}
            </h1>
            <p className="text-xs text-text-secondary">
              Preencha todos os campos pedagógicos e defina o gabarito oficial.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="md"
          isLoading={saving}
          onClick={handleSubmit}
          leftIcon={<Save className="w-4 h-4" />}
        >
          {isEditing ? 'Salvar Alterações' : 'Salvar Questão'}
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Metadados e Classificação */}
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-text-primary border-b border-border/40 pb-2">
            1. Classificação e Origem
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-text-muted font-medium mb-1">Concurso (Opcional)</label>
              <select
                value={contestId}
                onChange={(e) => setContestId(e.target.value)}
                className="w-full bg-bg-surface border border-border rounded-lg p-2 text-text-primary"
              >
                <option value="">Nenhum (Questão Geral)</option>
                {filterData?.contests.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-text-muted font-medium mb-1">Disciplina *</label>
              <select
                required
                value={subjectId}
                onChange={(e) => {
                  const newSubId = e.target.value;
                  setSubjectId(newSubId);
                  const firstTopic = filterData?.topics.find((t) => t.subjectId === newSubId);
                  if (firstTopic) setTopicId(firstTopic.id);
                  else setTopicId('');
                }}
                className="w-full bg-bg-surface border border-border rounded-lg p-2 text-text-primary"
              >
                {filterData?.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-text-muted font-medium mb-1">Assunto / Tópico *</label>
              <select
                required
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                className="w-full bg-bg-surface border border-border rounded-lg p-2 text-text-primary"
              >
                {filteredTopics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-text-muted font-medium mb-1">Banca Examinadora *</label>
              <select
                required
                value={boardId}
                onChange={(e) => setBoardId(e.target.value)}
                className="w-full bg-bg-surface border border-border rounded-lg p-2 text-text-primary"
              >
                {filterData?.boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.acronym})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-text-muted font-medium mb-1">Ano *</label>
              <input
                type="number"
                required
                min={1990}
                max={2050}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full bg-bg-surface border border-border rounded-lg p-2 text-text-primary"
              />
            </div>

            <div>
              <label className="block text-text-muted font-medium mb-1">Dificuldade</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full bg-bg-surface border border-border rounded-lg p-2 text-text-primary"
              >
                <option value="easy">Fácil</option>
                <option value="medium">Média</option>
                <option value="hard">Difícil</option>
                <option value="very_hard">Muito Difícil</option>
              </select>
            </div>

            <div>
              <label className="block text-text-muted font-medium mb-1">Formato</label>
              <select
                value={format}
                onChange={(e) => handleFormatChange(e.target.value as any)}
                className="w-full bg-bg-surface border border-border rounded-lg p-2 text-text-primary"
              >
                <option value="multiple_choice">Múltipla Escolha (A-E)</option>
                <option value="true_false">Certo / Errado (C/E)</option>
              </select>
            </div>

            <div>
              <label className="block text-text-muted font-medium mb-1">Origem / Fonte</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as any)}
                className="w-full bg-bg-surface border border-border rounded-lg p-2 text-text-primary"
              >
                <option value="BANCA_OFICIAL">Banca Oficial</option>
                <option value="QUESTAO_AUTORAL">Questão Autoral</option>
                <option value="IMPORTADA">Importada</option>
                <option value="DEMO">Demonstração (Demo)</option>
                <option value="OUTRA">Outra</option>
              </select>
            </div>

            <div>
              <label className="block text-text-muted font-medium mb-1">Referência da Prova</label>
              <input
                type="text"
                placeholder="Ex: PRF 2021 - Cargo Policial Rodoviário Federal"
                value={sourceReference}
                onChange={(e) => setSourceReference(e.target.value)}
                className="w-full bg-bg-surface border border-border rounded-lg p-2 text-text-primary"
              />
            </div>
          </div>
        </Card>

        {/* Enunciado */}
        <Card className="p-6 space-y-3">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <h3 className="text-sm font-bold text-text-primary">
              2. Enunciado da Questão *
            </h3>
            <span className="text-xs text-text-muted">{statement.length} caracteres</span>
          </div>

          <textarea
            required
            rows={6}
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            placeholder="Digite aqui o texto completo do enunciado da questão..."
            className="w-full bg-bg-surface border border-border rounded-xl p-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/30 leading-relaxed"
          />
        </Card>

        {/* Alternativas e Gabarito */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <div>
              <h3 className="text-sm font-bold text-text-primary">
                3. Alternativas e Gabarito Oficial *
              </h3>
              <p className="text-xs text-text-secondary">
                Marque o botão de rádio na alternativa correspondente ao gabarito oficial.
              </p>
            </div>

            {format === 'multiple_choice' && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddOption}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Adicionar Alternativa
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {options.map((opt, idx) => (
              <div
                key={opt.letter}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                  opt.isCorrect
                    ? 'border-success-500/60 bg-success-500/10'
                    : 'border-border bg-bg-surface'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleSetCorrectOption(idx)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-all border ${
                    opt.isCorrect
                      ? 'bg-success-500 text-white border-success-400 shadow-sm'
                      : 'bg-bg-elevated text-text-secondary border-border hover:border-brand-400'
                  }`}
                  title={opt.isCorrect ? 'Esta é a resposta correta' : 'Marcar como correta'}
                >
                  {opt.letter}
                </button>

                <div className="flex-1">
                  <textarea
                    rows={2}
                    required
                    value={opt.text}
                    onChange={(e) => handleUpdateOptionText(idx, e.target.value)}
                    placeholder={`Texto da alternativa ${opt.letter}...`}
                    className="w-full bg-transparent border-0 text-sm text-text-primary placeholder:text-text-muted focus:outline-none resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {opt.isCorrect && (
                    <span className="text-[11px] font-bold text-success-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Correta
                    </span>
                  )}
                  {format === 'multiple_choice' && options.length > 2 && (
                    <IconButton
                      variant="ghost"
                      size="sm"
                      label="Remover alternativa"
                      onClick={() => handleRemoveOption(idx)}
                      icon={<Trash2 className="w-4 h-4 text-text-muted hover:text-danger-400" />}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Comentário Oficial / Explicação */}
        <Card className="p-6 space-y-3">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-400" />
              <h3 className="text-sm font-bold text-text-primary">
                4. Comentário Oficial do Professor / Explicação *
              </h3>
            </div>
            <span className="text-xs text-text-muted">{officialExplanation.length} caracteres</span>
          </div>

          <textarea
            required
            rows={5}
            value={officialExplanation}
            onChange={(e) => setOfficialExplanation(e.target.value)}
            placeholder="Forneça a fundamentação jurídica/teórica completa, referências a artigos de lei e o raciocínio detalhado para o gabarito..."
            className="w-full bg-bg-surface border border-border rounded-xl p-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/30 leading-relaxed"
          />
        </Card>

        {/* Publicação e Salvar */}
        <Card className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-text-muted uppercase">Status Inicial:</span>
            <label className="flex items-center gap-2 text-xs text-text-primary cursor-pointer">
              <input
                type="radio"
                name="status"
                value="published"
                checked={status === 'published'}
                onChange={() => setStatus('published')}
                className="text-brand-500"
              />
              Publicada (Disponível aos Alunos)
            </label>
            <label className="flex items-center gap-2 text-xs text-text-primary cursor-pointer">
              <input
                type="radio"
                name="status"
                value="draft"
                checked={status === 'draft'}
                onChange={() => setStatus('draft')}
                className="text-brand-500"
              />
              Rascunho (Apenas Admin)
            </label>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => navigate('/admin/questoes')}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={saving}
              leftIcon={<Save className="w-4 h-4" />}
            >
              {isEditing ? 'Salvar Alterações' : 'Salvar Questão'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
};
