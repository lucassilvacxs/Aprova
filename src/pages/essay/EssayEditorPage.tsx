import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Send,
  Save,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
} from 'lucide-react';
import {
  Button,
  Modal,
  LoadingState,
  EmptyState,
} from '@/components/ui';
import { essayService, EssayDetail } from '@/services/essay.service';

export const EssayEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [essay, setEssay] = useState<EssayDetail | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'idle'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>('');

  // Carrega a redação
  useEffect(() => {
    if (id) {
      loadEssay(id);
    }
  }, [id]);

  const loadEssay = async (essayId: string) => {
    setLoading(true);
    try {
      const data = await essayService.getEssayDetail(essayId);
      if (data) {
        // Se a redação já estiver enviada, redireciona para visualização
        if (data.status !== 'DRAFT' && data.status !== ('draft' as any)) {
          navigate(`/redacao/${essayId}`, { replace: true });
          return;
        }

        setEssay(data);
        setTitle(data.title || '');
        setContent(data.content || '');
        lastSavedContentRef.current = data.content || '';
        if (data.lastSavedAt) {
          setLastSavedTime(new Date(data.lastSavedAt));
          setSaveStatus('saved');
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar redação:', err);
    } finally {
      setLoading(false);
    }
  };

  // Função central de autosave
  const performSave = useCallback(
    async (newContent: string, newTitle: string) => {
      if (!id) return;
      setSaveStatus('saving');
      try {
        await essayService.autosave(id, {
          title: newTitle,
          content: newContent,
        });
        lastSavedContentRef.current = newContent;
        setLastSavedTime(new Date());
        setSaveStatus('saved');
      } catch (err) {
        console.error('Erro no autosave:', err);
        setSaveStatus('error');
      }
    },
    [id]
  );

  // Debounce no evento de digitação (2 segundos)
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setContent(text);
    setSaveStatus('idle');

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      performSave(text, title);
    }, 2000);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setSaveStatus('idle');

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      performSave(content, newTitle);
    }, 2000);
  };

  // Salvar ao perder o foco (blur)
  const handleBlur = () => {
    if (content !== lastSavedContentRef.current) {
      performSave(content, title);
    }
  };

  // Submissão formal
  const handleSubmitEssay = async () => {
    if (!id || !essay) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Salva o conteúdo mais recente antes de submeter
      await essayService.autosave(id, { title, content });
      // 2. Dispara a submissão definitiva
      await essayService.submitEssay(id);
      setSubmitModalOpen(false);
      navigate(`/redacao/${id}`, { replace: true });
    } catch (err: any) {
      setSubmitError(err.message || 'Erro ao submeter redação.');
    } finally {
      setSubmitting(false);
    }
  };

  // Contadores em tempo real
  const trimmed = content.trim();
  const wordCount = trimmed.length > 0 ? trimmed.split(/\s+/).length : 0;
  const charCount = content.length;

  let estimatedLines = 0;
  if (trimmed.length > 0) {
    const paragraphs = content.split('\n');
    for (const p of paragraphs) {
      estimatedLines += Math.max(1, Math.ceil((p.length || 1) / 70));
    }
  }

  const prompt = essay?.prompt;
  const minWords = prompt?.minWords || 150;
  const maxWords = prompt?.maxWords || 350;
  const minLines = prompt?.minLines || 20;
  const maxLines = prompt?.maxLines || 30;

  if (loading) {
    return (
      <div className="py-12">
        <LoadingState message="Carregando editor de redação..." />
      </div>
    );
  }

  if (!essay) {
    return (
      <EmptyState
        title="Redação não encontrada"
        description="Não foi possível carregar os dados desta redação."
        action={
          <Button variant="secondary" size="sm" onClick={() => navigate('/redacao')}>
            Voltar ao Hub
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] -m-4 sm:-m-6 lg:-m-8 overflow-hidden bg-bg-surface">
      {/* Topbar do Editor */}
      <header className="h-14 border-b border-border-subtle px-4 flex items-center justify-between gap-4 shrink-0 bg-bg-surface z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/redacao')}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
            title="Voltar ao Hub"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-text-primary truncate">
              {prompt?.title || 'Redação em Andamento'}
            </h1>
            <div className="flex items-center gap-2 text-[11px] text-text-muted">
              {saveStatus === 'saving' && (
                <span className="flex items-center gap-1 text-brand-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-ping" />
                  Salvando alterações...
                </span>
              )}
              {saveStatus === 'saved' && lastSavedTime && (
                <span className="flex items-center gap-1 text-emerald-500">
                  <CheckCircle2 className="w-3 h-3" />
                  Salvo automaticamente às {lastSavedTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="flex items-center gap-1 text-red-500">
                  <AlertCircle className="w-3 h-3" />
                  Falha ao salvar rascunho
                </span>
              )}
              {saveStatus === 'idle' && (
                <span>Digitando...</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidePanelOpen(!sidePanelOpen)}
            className="hidden md:flex"
            leftIcon={<BookOpen className="w-4 h-4" />}
          >
            {sidePanelOpen ? 'Ocultar Proposta' : 'Ver Proposta'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => performSave(content, title)}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Salvar
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setSubmitModalOpen(true)}
            rightIcon={<Send className="w-4 h-4" />}
          >
            Enviar Redação
          </Button>
        </div>
      </header>

      {/* Área Central: Proposta Lateral Retrátil + Editor de Escrita */}
      <div className="flex flex-1 overflow-hidden">
        {/* Painel Lateral com a Proposta e Textos Motivadores */}
        {sidePanelOpen && (
          <aside className="w-full md:w-96 lg:w-[420px] border-r border-border-subtle bg-bg-elevated/30 flex flex-col shrink-0 overflow-hidden">
            <div className="p-3 border-b border-border-subtle flex items-center justify-between bg-bg-surface">
              <div className="flex items-center gap-2 text-xs font-bold text-text-primary uppercase tracking-wide">
                <BookOpen className="w-4 h-4 text-brand-500" />
                <span>Textos e Proposta</span>
              </div>
              <button
                onClick={() => setSidePanelOpen(false)}
                className="p-1 rounded text-text-muted hover:text-text-primary"
                title="Recolher painel"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5 text-sm">
              {/* Proposta de Redação */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-brand-500 uppercase tracking-wider">
                  Proposta de Redação
                </span>
                <div className="p-3 rounded-xl bg-bg-surface border border-brand-500/20 text-xs sm:text-sm text-text-primary leading-relaxed whitespace-pre-line font-serif">
                  {prompt?.statement}
                </div>
              </div>

              {/* Textos Motivadores */}
              {prompt?.context && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                    Textos Motivadores
                  </span>
                  <div className="p-3 rounded-xl bg-bg-surface border border-border-subtle text-xs text-text-secondary leading-relaxed whitespace-pre-line">
                    {prompt.context}
                  </div>
                </div>
              )}

              {/* Instruções */}
              {prompt?.instructions && prompt.instructions.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                    Instruções
                  </span>
                  <ul className="text-xs text-text-muted space-y-1 list-disc pl-4">
                    {prompt.instructions.map((inst, i) => (
                      <li key={i}>{inst}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Editor de Texto Livre de Distrações */}
        <main className="flex-1 flex flex-col overflow-hidden bg-bg-surface">
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center">
            <div className="w-full max-w-3xl space-y-4">
              {/* Título da Redação */}
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                onBlur={handleBlur}
                placeholder="Título da sua redação (opcional)"
                className="w-full text-lg sm:text-xl font-bold text-text-primary bg-transparent border-b border-border-subtle pb-2 focus:outline-none focus:border-brand-500 transition-colors placeholder:text-text-muted/60"
              />

              {/* Área de Escrita */}
              <div className="relative rounded-xl border border-border-subtle focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition-all bg-bg-elevated/10">
                <textarea
                  value={content}
                  onChange={handleContentChange}
                  onBlur={handleBlur}
                  rows={26}
                  placeholder="Inicie aqui o desenvolvimento do seu texto dissertativo-argumentativo..."
                  className="w-full p-4 sm:p-6 text-sm sm:text-base text-text-primary bg-transparent focus:outline-none resize-none leading-relaxed font-serif"
                  spellCheck
                />
              </div>
            </div>
          </div>

          {/* Rodapé de Métricas em Tempo Real */}
          <footer className="h-12 border-t border-border-subtle px-4 sm:px-6 flex items-center justify-between text-xs text-text-secondary bg-bg-surface shrink-0">
            <div className="flex items-center gap-4">
              <div>
                Palavras:{' '}
                <strong className={wordCount < minWords ? 'text-amber-500' : 'text-emerald-500'}>
                  {wordCount}
                </strong>{' '}
                <span className="text-text-muted">/ {minWords}-{maxWords}</span>
              </div>

              <div className="hidden sm:block">
                Linhas estimadas:{' '}
                <strong className={estimatedLines < minLines ? 'text-amber-500' : 'text-emerald-500'}>
                  {estimatedLines}
                </strong>{' '}
                <span className="text-text-muted">/ {minLines}-{maxLines}</span>
              </div>

              <div className="hidden md:block">
                Caracteres: <strong>{charCount}</strong>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-text-muted text-[11px]">
                Autosave ativo
              </span>
              <div className={`w-2 h-2 rounded-full ${saveStatus === 'saving' ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
            </div>
          </footer>
        </main>
      </div>

      {/* Modal de Confirmação de Envio */}
      <Modal
        isOpen={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        title="Enviar Redação para Correção?"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Após o envio definitivo, a redação será <strong>bloqueada para edições</strong> e encaminhada para avaliação detalhada por critérios da banca examinadora.
          </p>

          {/* Validação de limites */}
          <div className="p-3 rounded-xl bg-bg-elevated border border-border-subtle space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-text-secondary">Palavras escritas:</span>
              <strong className={wordCount < minWords ? 'text-amber-500' : 'text-emerald-500'}>
                {wordCount} (mínimo: {minWords})
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Linhas estimadas:</span>
              <strong className={estimatedLines < minLines ? 'text-amber-500' : 'text-emerald-500'}>
                {estimatedLines} (mínimo: {minLines})
              </strong>
            </div>
          </div>

          {wordCount < minWords && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Atenção: Seu texto possui <strong>{wordCount} palavras</strong>, abaixo do mínimo estipulado pelo edital ({minWords} palavras).
              </span>
            </div>
          )}

          {submitError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setSubmitModalOpen(false)}
              disabled={submitting}
            >
              Voltar ao Editor
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitEssay}
              disabled={submitting || wordCount === 0}
              rightIcon={<Send className="w-4 h-4" />}
            >
              {submitting ? 'Enviando...' : 'Confirmar Envio'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
