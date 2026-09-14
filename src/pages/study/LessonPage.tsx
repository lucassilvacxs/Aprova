import React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Circle,
  Clock,
  Download,
  ExternalLink,
  Menu,
  X,
} from 'lucide-react';
import { Card, LoadingState } from '@/components/ui';
import { lessonService, LessonDetail } from '@/services/lesson.service';
import { progressService } from '@/services/progress.service';

export const LessonPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [lesson, setLesson] = React.useState<LessonDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isUpdatingProgress, setIsUpdatingProgress] = React.useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  React.useEffect(() => {
    if (!id) return;
    setIsLoading(true);

    lessonService
      .getLessonById(id)
      .then(setLesson)
      .catch((err) => console.error('Erro ao carregar aula:', err))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleToggleComplete = async () => {
    if (!lesson || isUpdatingProgress) return;

    setIsUpdatingProgress(true);
    try {
      const res = await progressService.toggleLessonComplete(lesson.id);
      setLesson((prev) =>
        prev
          ? {
              ...prev,
              isCompleted: res.isCompleted,
              curriculum: prev.curriculum.map((c) =>
                c.id === lesson.id ? { ...c, isCompleted: res.isCompleted } : c
              ),
            }
          : null
      );
    } catch (err) {
      console.error('Falha ao atualizar progresso:', err);
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingState message="Carregando conteúdo da aula..." />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="p-8 text-center bg-bg-card border border-border rounded-2xl max-w-lg mx-auto mt-10">
        <p className="text-sm text-danger-text mb-4">Aula não encontrada ou indisponível para seu perfil.</p>
        <Link to="/cursos" className="text-xs text-brand-400 font-semibold">
          Voltar para meus cursos
        </Link>
      </div>
    );
  }

  const primaryContent = lesson.contents[0]?.body || lesson.description || '';

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-16">
      {/* Top Breadcrumb & Navigation Bar */}
      <div className="flex items-center justify-between gap-3 border-b border-border pb-4 flex-wrap">
        <Link
          to={`/cursos/${lesson.courseId}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Voltar para o curso
        </Link>

        <div className="flex items-center gap-2">
          {/* Mobile drawer toggle */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="lg:hidden px-3 py-1.5 rounded-xl bg-bg-elevated border border-border text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center gap-1.5"
          >
            <Menu className="w-3.5 h-3.5" />
            Índice de Aulas
          </button>

          {/* Toggle Complete Button */}
          <button
            onClick={handleToggleComplete}
            disabled={isUpdatingProgress}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${
              lesson.isCompleted
                ? 'bg-success-base/15 text-success-text border border-success-base/30 hover:bg-success-base/25'
                : 'bg-brand-500 hover:bg-brand-600 text-white shadow-brand/20'
            }`}
          >
            <CheckCircle className={`w-4 h-4 ${lesson.isCompleted ? 'text-success-text' : 'text-white'}`} />
            {lesson.isCompleted ? 'Concluída' : 'Marcar como concluída'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Main Lesson Content (3 columns) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-brand-400 uppercase tracking-wider">
                {lesson.subjectName || 'Disciplina'}
              </span>
              <span className="text-text-disabled">•</span>
              <span className="text-xs text-text-muted">{lesson.moduleTitle}</span>
              <span className="text-text-disabled">•</span>
              <span className="text-xs text-text-muted flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {lesson.estimatedDurationMin} min
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
              {lesson.title}
            </h1>
          </div>

          {/* Video Player (if applicable) */}
          {lesson.videoUrl && (
            <div className="rounded-2xl overflow-hidden border border-border bg-black aspect-video shadow-xl">
              <iframe
                src={lesson.videoUrl}
                title={lesson.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {/* Rich Content Article */}
          <article className="p-6 sm:p-8 bg-bg-card border border-border rounded-3xl space-y-6 leading-relaxed text-text-primary shadow-sm text-sm sm:text-base">
            {primaryContent ? (
              <div className="prose prose-invert max-w-none space-y-4">
                {primaryContent.split('\n\n').map((paragraph, pIdx) => {
                  // Títulos H1
                  if (paragraph.startsWith('# ')) {
                    return (
                      <h2 key={pIdx} className="text-xl sm:text-2xl font-extrabold text-text-primary pt-2 border-b border-border pb-2">
                        {paragraph.replace('# ', '')}
                      </h2>
                    );
                  }
                  // Títulos H2
                  if (paragraph.startsWith('## ')) {
                    return (
                      <h3 key={pIdx} className="text-lg sm:text-xl font-bold text-text-primary pt-2">
                        {paragraph.replace('## ', '')}
                      </h3>
                    );
                  }
                  // Títulos H3
                  if (paragraph.startsWith('### ')) {
                    return (
                      <h4 key={pIdx} className="text-base sm:text-lg font-bold text-brand-300 pt-1">
                        {paragraph.replace('### ', '')}
                      </h4>
                    );
                  }
                  // Destaque / Citação
                  if (paragraph.startsWith('> ')) {
                    return (
                      <div key={pIdx} className="p-4 rounded-2xl bg-brand-500/10 border-l-4 border-brand-500 text-sm text-text-secondary italic">
                        {paragraph.replace(/^>\s*/gm, '')}
                      </div>
                    );
                  }
                  // Lista
                  if (paragraph.startsWith('- ') || paragraph.startsWith('1. ')) {
                    const items = paragraph.split('\n');
                    return (
                      <ul key={pIdx} className="space-y-1.5 pl-5 list-disc text-sm text-text-secondary">
                        {items.map((it, itIdx) => (
                          <li key={itIdx}>{it.replace(/^[-*]\s+|\d+\.\s+/, '')}</li>
                        ))}
                      </ul>
                    );
                  }
                  // Parágrafo normal
                  return (
                    <p key={pIdx} className="text-sm sm:text-base text-text-secondary leading-relaxed">
                      {paragraph}
                    </p>
                  );
                })}
              </div>
            ) : (
              <p className="text-text-muted italic text-center py-6">Conteúdo textual em atualização.</p>
            )}
          </article>

          {/* Supplementary Materials */}
          {lesson.resources.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted">
                Materiais Complementares ({lesson.resources.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lesson.resources.map((res) => (
                  <a
                    key={res.id}
                    href={res.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-4 rounded-2xl bg-bg-card hover:bg-bg-elevated border border-border hover:border-brand-500/40 transition-all flex items-center justify-between gap-3 group shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center shrink-0">
                        {res.type === 'pdf' ? <Download className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-text-primary group-hover:text-brand-300 truncate">
                          {res.title}
                        </p>
                        <p className="text-[10px] text-text-muted uppercase tracking-wider">{res.type}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-muted group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Previous & Next Navigation */}
          <div className="pt-6 border-t border-border flex items-center justify-between gap-4">
            {lesson.previousLesson ? (
              <Link
                to={`/aulas/${lesson.previousLesson.id}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-bg-elevated hover:bg-bg-overlay text-text-secondary hover:text-text-primary text-xs font-semibold transition-all group"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span className="hidden sm:inline">Aula Anterior:</span> {lesson.previousLesson.title}
              </Link>
            ) : (
              <div />
            )}

            {lesson.nextLesson ? (
              <Link
                to={`/aulas/${lesson.nextLesson.id}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition-all shadow-sm group ml-auto"
              >
                <span className="hidden sm:inline">Próxima Aula:</span> {lesson.nextLesson.title}
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : (
              <Link
                to={`/cursos/${lesson.courseId}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-success-base text-white text-xs font-bold transition-all ml-auto"
              >
                Concluir Módulo
                <CheckCircle className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>

        {/* Lesson Sidebar Curriculum (1 column) */}
        <div className="hidden lg:block space-y-4 sticky top-24">
          <Card noPadding className="border-border">
            <div className="p-4 border-b border-border bg-bg-elevated/40">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-400">
                Currículo do Módulo
              </p>
              <h4 className="text-sm font-bold text-text-primary line-clamp-1 mt-0.5">
                {lesson.moduleTitle}
              </h4>
            </div>

            <div className="divide-y divide-border/60 max-h-[60vh] overflow-y-auto">
              {lesson.curriculum.map((item) => (
                <Link
                  key={item.id}
                  to={`/aulas/${item.id}`}
                  className={`p-3 flex items-start gap-2.5 text-xs transition-colors ${
                    item.isCurrent
                      ? 'bg-brand-500/10 text-brand-300 font-bold'
                      : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                  }`}
                >
                  <span className="mt-0.5 shrink-0">
                    {item.isCompleted ? (
                      <CheckCircle className="w-3.5 h-3.5 text-success-text" />
                    ) : item.isCurrent ? (
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-brand-400 bg-brand-500 inline-block" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-text-disabled" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="line-clamp-2 leading-snug">{item.title}</p>
                    <span className="text-[10px] text-text-muted mt-0.5 block">
                      {item.estimatedDurationMin} min
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Mobile Drawer (Curriculum) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsDrawerOpen(false)}
          />
          <aside className="relative w-80 max-w-[85vw] h-full bg-bg-surface border-r border-border flex flex-col p-5 animate-slide-in ml-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-text-primary">Aulas do Módulo</h3>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="w-8 h-8 rounded-lg bg-bg-elevated border border-border flex items-center justify-center text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-border/60">
              {lesson.curriculum.map((item) => (
                <Link
                  key={item.id}
                  to={`/aulas/${item.id}`}
                  onClick={() => setIsDrawerOpen(false)}
                  className={`p-3 flex items-start gap-2.5 text-xs ${
                    item.isCurrent ? 'bg-brand-500/10 text-brand-300 font-bold' : 'text-text-secondary'
                  }`}
                >
                  <span className="mt-0.5 shrink-0">
                    {item.isCompleted ? (
                      <CheckCircle className="w-3.5 h-3.5 text-success-text" />
                    ) : item.isCurrent ? (
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-brand-400 bg-brand-500 inline-block" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-text-disabled" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="line-clamp-2 leading-snug">{item.title}</p>
                    <span className="text-[10px] text-text-muted mt-0.5 block">{item.estimatedDurationMin} min</span>
                  </div>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
