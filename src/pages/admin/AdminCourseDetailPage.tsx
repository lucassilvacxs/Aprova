import React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Plus, Layers, BookOpen, Edit2, Archive,
  ChevronUp, ChevronDown, FileText,
  AlertCircle, ExternalLink, X, Eye, Video,
} from 'lucide-react';
import { Card, Badge, LoadingState } from '@/components/ui';
import { courseService, CourseDetail, CourseModule } from '@/services/course.service';
import { moduleService } from '@/services/module.service';
import { lessonService } from '@/services/lesson.service';

export const AdminCourseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = React.useState<CourseDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  // Module Modal State
  const [isModuleModalOpen, setIsModuleModalOpen] = React.useState(false);
  const [editingModule, setEditingModule] = React.useState<CourseModule | null>(null);
  const [moduleForm, setModuleForm] = React.useState({ title: '', description: '' });
  const [isModuleSubmitting, setIsModuleSubmitting] = React.useState(false);

  // Lesson Modal State
  const [isLessonModalOpen, setIsLessonModalOpen] = React.useState(false);
  const [targetModuleId, setTargetModuleId] = React.useState<string>('');
  const [editingLessonId, setEditingLessonId] = React.useState<string | null>(null);
  const [lessonForm, setLessonForm] = React.useState({
    title: '',
    slug: '',
    type: 'mixed' as 'mixed' | 'text' | 'video' | 'pdf',
    estimatedDurationMin: 15,
    videoUrl: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
    contentBody: '',
    resources: [] as Array<{ title: string; type: 'pdf' | 'link' | 'file'; url: string }>,
  });
  const [isLessonSubmitting, setIsLessonSubmitting] = React.useState(false);
  const [lessonModalLoading, setLessonModalLoading] = React.useState(false);
  const [previewTab, setPreviewTab] = React.useState<'editor' | 'preview'>('editor');

  const loadCourse = React.useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await courseService.getCourseById(id);
      setCourse(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar detalhes do curso.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  // ── Module Handlers ────────────────────────────────────────────────────────
  const handleOpenCreateModule = () => {
    setEditingModule(null);
    setModuleForm({ title: '', description: '' });
    setIsModuleModalOpen(true);
  };

  const handleOpenEditModule = (mod: CourseModule) => {
    setEditingModule(mod);
    setModuleForm({ title: mod.title, description: mod.description || '' });
    setIsModuleModalOpen(true);
  };

  const handleSubmitModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course || !moduleForm.title.trim()) return;
    setIsModuleSubmitting(true);
    try {
      if (editingModule) {
        await moduleService.updateModule(editingModule.id, {
          title: moduleForm.title,
          description: moduleForm.description || null,
        });
      } else {
        await moduleService.createModule({
          courseId: course.id,
          subjectId: course.subjectId,
          title: moduleForm.title,
          description: moduleForm.description || null,
        });
      }
      setIsModuleModalOpen(false);
      loadCourse();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar módulo.');
    } finally {
      setIsModuleSubmitting(false);
    }
  };

  const handleReorderModule = async (moduleId: string, direction: 'up' | 'down') => {
    try {
      await moduleService.reorderModule(moduleId, direction);
      loadCourse();
    } catch (err: any) {
      alert(err.message || 'Erro ao reordenar módulo.');
    }
  };

  const handleArchiveModule = async (mod: CourseModule) => {
    if (!window.confirm(`Deseja realmente arquivar o módulo "${mod.title}" e suas aulas?`)) return;
    try {
      await moduleService.archiveModule(mod.id);
      loadCourse();
    } catch (err: any) {
      alert(err.message || 'Erro ao arquivar módulo.');
    }
  };

  // ── Lesson Handlers ────────────────────────────────────────────────────────
  const handleOpenCreateLesson = (moduleId: string) => {
    setTargetModuleId(moduleId);
    setEditingLessonId(null);
    setLessonForm({
      title: '',
      slug: '',
      type: 'mixed',
      estimatedDurationMin: 15,
      videoUrl: '',
      status: 'draft',
      contentBody: '## Visão Geral\n\nEscreva os conceitos fundamentais desta aula...\n\n### Pontos-Chave\n- Ponto 1\n- Ponto 2',
      resources: [],
    });
    setPreviewTab('editor');
    setIsLessonModalOpen(true);
  };

  const handleOpenEditLesson = async (lessonId: string, moduleId: string) => {
    setTargetModuleId(moduleId);
    setEditingLessonId(lessonId);
    setLessonModalLoading(true);
    setIsLessonModalOpen(true);
    try {
      const detail = await lessonService.getLessonById(lessonId);
      const mainContent = detail.contents && detail.contents.length > 0 ? detail.contents[0].body || '' : '';
      setLessonForm({
        title: detail.title,
        slug: detail.slug,
        type: (detail.type as any) || 'mixed',
        estimatedDurationMin: detail.estimatedDurationMin || 15,
        videoUrl: detail.videoUrl || '',
        status: detail.status || 'draft',
        contentBody: mainContent,
        resources: (detail.resources || []).map((r) => ({
          title: r.title,
          type: r.type as any,
          url: r.url,
        })),
      });
    } catch (err: any) {
      alert(err.message || 'Erro ao carregar detalhes da aula.');
      setIsLessonModalOpen(false);
    } finally {
      setLessonModalLoading(false);
    }
  };

  const handleTitleChangeLesson = (val: string) => {
    const slug = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    setLessonForm((prev) => ({
      ...prev,
      title: val,
      slug: editingLessonId ? prev.slug : slug,
    }));
  };

  const handleAddResourceRow = () => {
    setLessonForm((prev) => ({
      ...prev,
      resources: [...prev.resources, { title: '', type: 'pdf', url: '' }],
    }));
  };

  const handleRemoveResourceRow = (idx: number) => {
    setLessonForm((prev) => ({
      ...prev,
      resources: prev.resources.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmitLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonForm.title.trim()) {
      alert('O título da aula é obrigatório.');
      return;
    }
    setIsLessonSubmitting(true);
    try {
      if (editingLessonId) {
        await lessonService.updateLesson(editingLessonId, {
          title: lessonForm.title,
          slug: lessonForm.slug,
          type: lessonForm.type,
          estimatedDurationMin: Number(lessonForm.estimatedDurationMin),
          videoUrl: lessonForm.videoUrl || null,
          status: lessonForm.status,
          contentBody: lessonForm.contentBody,
          resources: lessonForm.resources.filter((r) => r.title.trim() && r.url.trim()),
        });
      } else {
        await lessonService.createLesson({
          moduleId: targetModuleId,
          title: lessonForm.title,
          slug: lessonForm.slug,
          type: lessonForm.type,
          estimatedDurationMin: Number(lessonForm.estimatedDurationMin),
          videoUrl: lessonForm.videoUrl || null,
          status: lessonForm.status,
          contentBody: lessonForm.contentBody,
          resources: lessonForm.resources.filter((r) => r.title.trim() && r.url.trim()),
        });
      }
      setIsLessonModalOpen(false);
      loadCourse();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar aula.');
    } finally {
      setIsLessonSubmitting(false);
    }
  };

  const handleReorderLesson = async (lessonId: string, direction: 'up' | 'down') => {
    try {
      await lessonService.reorderLesson(lessonId, direction);
      loadCourse();
    } catch (err: any) {
      alert(err.message || 'Erro ao reordenar aula.');
    }
  };

  const handleArchiveLesson = async (lesson: { id: string; title: string }) => {
    if (!window.confirm(`Deseja realmente arquivar a aula "${lesson.title}"?`)) return;
    try {
      await lessonService.archiveLesson(lesson.id);
      loadCourse();
    } catch (err: any) {
      alert(err.message || 'Erro ao arquivar aula.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingState message="Carregando estrutura do curso..." />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="p-8 text-center bg-bg-card border border-border rounded-2xl">
        <AlertCircle className="w-8 h-8 text-danger-text mx-auto mb-3" />
        <h3 className="text-base font-bold text-text-primary mb-1">Curso não encontrado</h3>
        <p className="text-xs text-text-muted mb-4">{error || 'Não foi possível carregar o curso.'}</p>
        <Link
          to="/admin/cursos"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Cursos
        </Link>
      </div>
    );
  }

  const isPublished = course.status === 'published';

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <Link to="/admin/cursos" className="hover:text-text-primary transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Gestão de Cursos
        </Link>
        <span>/</span>
        <span className="text-text-primary font-medium truncate">{course.title}</span>
      </div>

      {/* Course Hero Card */}
      <Card noPadding className="p-6 border-brand-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {(course.contestAcronym || course.agencyAcronym) && (
                <span className="text-xs font-bold text-brand-400 bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded-lg">
                  {course.contestAcronym || course.agencyAcronym}
                </span>
              )}
              {course.subjectName && (
                <Badge variant="neutral" size="xs">{course.subjectName}</Badge>
              )}
              <Badge variant={isPublished ? 'success' : 'warning'} size="xs" dot>
                {isPublished ? 'Publicado' : 'Rascunho'}
              </Badge>
            </div>

            <h1 className="text-2xl font-extrabold text-text-primary">{course.title}</h1>
            <p className="text-xs text-text-muted max-w-2xl">
              {course.description || 'Sem descrição cadastrada.'}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Link
              to={`/cursos/${course.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-bg-elevated hover:bg-bg-card border border-border text-text-secondary hover:text-text-primary rounded-xl text-xs font-semibold transition-all"
            >
              <Eye className="w-4 h-4" />
              Ver como Aluno
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </Link>

            <button
              onClick={handleOpenCreateModule}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-brand transition-all"
            >
              <Plus className="w-4 h-4" />
              Novo Módulo
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs text-text-muted pt-4 mt-4 border-t border-border">
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-text-muted" />
            <span>{course.modules.length} módulos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-text-muted" />
            <span>{course.lessonsCount} aulas</span>
          </div>
        </div>
      </Card>

      {/* Modules & Lessons Curriculum */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-400" />
            Estrutura da Grade Pedagógica
          </h2>
          <span className="text-xs text-text-muted">Use as setas ↑ ↓ para organizar o fluxo de estudo</span>
        </div>

        {course.modules.length === 0 ? (
          <Card noPadding className="p-12 text-center border-dashed border-border">
            <Layers className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <h3 className="text-base font-bold text-text-primary mb-1">Nenhum módulo cadastrado</h3>
            <p className="text-xs text-text-muted max-w-sm mx-auto mb-4">
              Crie o primeiro módulo para começar a organizar as aulas e conteúdos deste curso.
            </p>
            <button
              onClick={handleOpenCreateModule}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold shadow-brand transition-all"
            >
              Adicionar Módulo 1
            </button>
          </Card>
        ) : (
          course.modules.map((mod, modIdx) => (
            <Card key={mod.id} noPadding className="border-border">
              {/* Module Header */}
              <div className="p-4 bg-bg-elevated/40 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleReorderModule(mod.id, 'up')}
                      disabled={modIdx === 0}
                      title="Mover módulo para cima"
                      className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-elevated disabled:opacity-20 transition-all"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleReorderModule(mod.id, 'down')}
                      disabled={modIdx === course.modules.length - 1}
                      title="Mover módulo para baixo"
                      className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-elevated disabled:opacity-20 transition-all"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-md">
                        Módulo {mod.orderIndex}
                      </span>
                      <h3 className="text-sm font-bold text-text-primary">{mod.title}</h3>
                    </div>
                    {mod.description && (
                      <p className="text-xs text-text-muted mt-0.5">{mod.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleOpenEditModule(mod)}
                    className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-elevated transition-colors text-xs flex items-center gap-1"
                    title="Editar título e descrição do módulo"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => handleArchiveModule(mod)}
                    className="p-1.5 text-text-muted hover:text-danger-text rounded-lg hover:bg-bg-elevated transition-colors text-xs flex items-center gap-1"
                    title="Arquivar módulo"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenCreateLesson(mod.id)}
                    className="px-3 py-1.5 bg-brand-500/15 hover:bg-brand-500 hover:text-white text-brand-400 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nova Aula</span>
                  </button>
                </div>
              </div>

              {/* Lessons List in Module */}
              <div className="divide-y divide-border">
                {mod.lessons.length === 0 ? (
                  <div className="p-6 text-center text-xs text-text-muted">
                    Nenhuma aula cadastrada neste módulo. Clique em &quot;Nova Aula&quot; acima para adicionar.
                  </div>
                ) : (
                  mod.lessons.map((lesson, lessonIdx) => {
                    const isLessonPub = lesson.status === 'published';
                    return (
                      <div
                        key={lesson.id}
                        className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-bg-elevated/30 transition-all flex-wrap"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => handleReorderLesson(lesson.id, 'up')}
                              disabled={lessonIdx === 0}
                              title="Mover aula para cima"
                              className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-elevated disabled:opacity-20 transition-all"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleReorderLesson(lesson.id, 'down')}
                              disabled={lessonIdx === mod.lessons.length - 1}
                              title="Mover aula para baixo"
                              className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-elevated disabled:opacity-20 transition-all"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="w-7 h-7 rounded-lg bg-bg-elevated flex items-center justify-center shrink-0">
                            {lesson.type === 'video' ? (
                              <Video className="w-3.5 h-3.5 text-brand-400" />
                            ) : (
                              <FileText className="w-3.5 h-3.5 text-text-muted" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-text-primary truncate">
                                {lesson.orderIndex}. {lesson.title}
                              </span>
                              <Badge variant={isLessonPub ? 'success' : 'warning'} size="xs">
                                {isLessonPub ? 'Publicada' : 'Rascunho'}
                              </Badge>
                              <span className="text-[10px] text-text-muted">
                                {lesson.estimatedDurationMin} min
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Link
                            to={`/aulas/${lesson.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-elevated transition-colors text-xs flex items-center gap-1"
                            title="Visualizar aula"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handleOpenEditLesson(lesson.id, mod.id)}
                            className="px-2.5 py-1 bg-bg-elevated hover:bg-bg-card border border-border text-text-secondary hover:text-text-primary rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Editar Conteúdo</span>
                          </button>
                          <button
                            onClick={() => handleArchiveLesson(lesson)}
                            className="p-1.5 text-text-muted hover:text-danger-text rounded-lg hover:bg-bg-elevated transition-colors"
                            title="Arquivar aula"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal Módulo (Criar / Editar) */}
      {isModuleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                <Layers className="w-5 h-5 text-brand-400" />
                {editingModule ? 'Editar Módulo' : 'Novo Módulo'}
              </h2>
              <button
                onClick={() => setIsModuleModalOpen(false)}
                className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-elevated transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitModule} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Título do Módulo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Módulo 1 - Disposições Preliminares"
                  value={moduleForm.title}
                  onChange={(e) => setModuleForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:border-brand-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Descrição (Opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Explicação do conteúdo abordado neste módulo..."
                  value={moduleForm.description}
                  onChange={(e) => setModuleForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:border-brand-500 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModuleModalOpen(false)}
                  className="px-4 py-2 bg-bg-elevated hover:bg-bg-card border border-border text-text-secondary hover:text-text-primary rounded-xl text-xs font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isModuleSubmitting}
                  className="px-5 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-brand transition-all"
                >
                  {isModuleSubmitting ? 'Salvando...' : editingModule ? 'Salvar Módulo' : 'Criar Módulo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Aula & Conteúdo (Editor Completo) */}
      {isLessonModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-bg-card border border-border rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-fade-in my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
              <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-brand-400" />
                {editingLessonId ? 'Editar Aula e Conteúdo' : 'Nova Aula'}
              </h2>
              <button
                onClick={() => setIsLessonModalOpen(false)}
                className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-elevated transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {lessonModalLoading ? (
              <div className="p-12 text-center">
                <LoadingState message="Carregando conteúdo da aula..." />
              </div>
            ) : (
              <form onSubmit={handleSubmitLesson} className="p-5 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                      Título da Aula *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Introdução ao CTB e Sistema Nacional de Trânsito"
                      value={lessonForm.title}
                      onChange={(e) => handleTitleChangeLesson(e.target.value)}
                      className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:border-brand-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                      Slug *
                    </label>
                    <input
                      type="text"
                      required
                      value={lessonForm.slug}
                      onChange={(e) => setLessonForm((prev) => ({ ...prev, slug: e.target.value }))}
                      className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:border-brand-500 transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                      Tipo de Aula
                    </label>
                    <select
                      value={lessonForm.type}
                      onChange={(e) => setLessonForm((prev) => ({ ...prev, type: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:border-brand-500 transition-all cursor-pointer"
                    >
                      <option value="mixed" className="bg-bg-card">Misto (Vídeo + Texto)</option>
                      <option value="video" className="bg-bg-card">Vídeo Aula</option>
                      <option value="text" className="bg-bg-card">Texto / Artigo</option>
                      <option value="pdf" className="bg-bg-card">Material PDF</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                      Duração Estimada (min)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={lessonForm.estimatedDurationMin}
                      onChange={(e) => setLessonForm((prev) => ({ ...prev, estimatedDurationMin: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:border-brand-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                      Status de Publicação
                    </label>
                    <select
                      value={lessonForm.status}
                      onChange={(e) => setLessonForm((prev) => ({ ...prev, status: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:border-brand-500 transition-all cursor-pointer"
                    >
                      <option value="draft" className="bg-bg-card">Rascunho (Oculto)</option>
                      <option value="published" className="bg-bg-card">Publicada (Visível)</option>
                      <option value="archived" className="bg-bg-card">Arquivada</option>
                    </select>
                  </div>
                </div>

                {/* Video URL */}
                {(lessonForm.type === 'video' || lessonForm.type === 'mixed') && (
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                      URL do Vídeo (YouTube, Vimeo, MP4)
                    </label>
                    <input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={lessonForm.videoUrl}
                      onChange={(e) => setLessonForm((prev) => ({ ...prev, videoUrl: e.target.value }))}
                      className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:border-brand-500 transition-all"
                    />
                  </div>
                )}

                {/* Markdown Content Editor */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-text-secondary">
                      Conteúdo da Aula (Markdown Rico com Suporte a Alertas e Callouts)
                    </label>
                    <div className="flex items-center gap-1 bg-bg-elevated rounded-lg p-0.5 border border-border">
                      <button
                        type="button"
                        onClick={() => setPreviewTab('editor')}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                          previewTab === 'editor'
                            ? 'bg-brand-500 text-white shadow-sm'
                            : 'text-text-muted hover:text-text-primary'
                        }`}
                      >
                        Editor
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewTab('preview')}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                          previewTab === 'preview'
                            ? 'bg-brand-500 text-white shadow-sm'
                            : 'text-text-muted hover:text-text-primary'
                        }`}
                      >
                        Prévia
                      </button>
                    </div>
                  </div>

                  {previewTab === 'editor' ? (
                    <textarea
                      rows={10}
                      value={lessonForm.contentBody}
                      onChange={(e) => setLessonForm((prev) => ({ ...prev, contentBody: e.target.value }))}
                      placeholder="Escreva em Markdown formatado..."
                      className="w-full px-3 py-2.5 bg-bg-elevated border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:border-brand-500 transition-all font-mono leading-relaxed"
                    />
                  ) : (
                    <div className="min-h-[220px] max-h-[300px] overflow-y-auto p-4 bg-bg-elevated border border-border rounded-xl text-xs text-text-primary prose prose-invert max-w-none">
                      <div className="whitespace-pre-wrap">{lessonForm.contentBody || 'Nenhum conteúdo digitado.'}</div>
                    </div>
                  )}
                </div>

                {/* Supplementary Resources */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-text-secondary">
                      Materiais Complementares (PDF, Leis, Links Úteis)
                    </label>
                    <button
                      type="button"
                      onClick={handleAddResourceRow}
                      className="text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar Material
                    </button>
                  </div>

                  {lessonForm.resources.length === 0 ? (
                    <p className="text-[11px] text-text-disabled italic">
                      Nenhum material complementar anexado a esta aula.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {lessonForm.resources.map((res, rIdx) => (
                        <div key={rIdx} className="flex items-center gap-2 p-2 bg-bg-elevated rounded-xl border border-border">
                          <input
                            type="text"
                            placeholder="Título do Material (ex: Lei 9.503/97 Comentada)"
                            value={res.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setLessonForm((prev) => ({
                                ...prev,
                                resources: prev.resources.map((item, i) =>
                                  i === rIdx ? { ...item, title: val } : item
                                ),
                              }));
                            }}
                            className="flex-1 px-2.5 py-1.5 bg-bg-card border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-brand-500"
                          />

                          <select
                            value={res.type}
                            onChange={(e) => {
                              const val = e.target.value as any;
                              setLessonForm((prev) => ({
                                ...prev,
                                resources: prev.resources.map((item, i) =>
                                  i === rIdx ? { ...item, type: val } : item
                                ),
                              }));
                            }}
                            className="px-2 py-1.5 bg-bg-card border border-border rounded-lg text-xs text-text-primary focus:outline-none cursor-pointer"
                          >
                            <option value="pdf">PDF</option>
                            <option value="link">Link</option>
                            <option value="file">Arquivo</option>
                          </select>

                          <input
                            type="url"
                            placeholder="https://..."
                            value={res.url}
                            onChange={(e) => {
                              const val = e.target.value;
                              setLessonForm((prev) => ({
                                ...prev,
                                resources: prev.resources.map((item, i) =>
                                  i === rIdx ? { ...item, url: val } : item
                                ),
                              }));
                            }}
                            className="flex-1 px-2.5 py-1.5 bg-bg-card border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-brand-500"
                          />

                          <button
                            type="button"
                            onClick={() => handleRemoveResourceRow(rIdx)}
                            className="p-1.5 text-text-muted hover:text-danger-text rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsLessonModalOpen(false)}
                    className="px-4 py-2 bg-bg-elevated hover:bg-bg-card border border-border text-text-secondary hover:text-text-primary rounded-xl text-xs font-semibold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLessonSubmitting}
                    className="px-5 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-brand transition-all"
                  >
                    {isLessonSubmitting ? 'Salvando...' : editingLessonId ? 'Salvar Aula' : 'Criar Aula'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
