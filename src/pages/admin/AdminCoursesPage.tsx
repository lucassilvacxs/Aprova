import React from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap, Plus, Search, Filter, Layers, BookOpen,
  Edit2, Archive, AlertCircle, ExternalLink, X,
} from 'lucide-react';
import { Card, Badge, LoadingState } from '@/components/ui';
import { courseService, CourseItem, CreateCourseInput, UpdateCourseInput } from '@/services/course.service';
import { contestService, ContestItem, SubjectItem } from '@/services/contest.service';

export const AdminCoursesPage: React.FC = () => {
  const [courses, setCourses] = React.useState<CourseItem[]>([]);
  const [contests, setContests] = React.useState<ContestItem[]>([]);
  const [subjects, setSubjects] = React.useState<SubjectItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'published' | 'draft' | 'archived'>('all');
  const [contestFilter, setContestFilter] = React.useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingCourse, setEditingCourse] = React.useState<CourseItem | null>(null);
  const [modalForm, setModalForm] = React.useState({
    title: '',
    slug: '',
    description: '',
    contestId: '',
    subjectId: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [modalError, setModalError] = React.useState('');

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [courseList, contestList, subjectList] = await Promise.all([
        courseService.listCourses({
          status: statusFilter !== 'all' ? statusFilter : undefined,
          contestId: contestFilter !== 'all' ? contestFilter : undefined,
        }),
        contestService.getContests().catch(() => []),
        contestService.getSubjects().catch(() => []),
      ]);
      setCourses(courseList);
      setContests(contestList);
      setSubjects(subjectList);
    } catch (err) {
      console.error('Erro ao carregar cursos no admin:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, contestFilter]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreateModal = () => {
    setEditingCourse(null);
    setModalForm({
      title: '',
      slug: '',
      description: '',
      contestId: contests[0]?.id || '',
      subjectId: subjects[0]?.id || '',
      status: 'draft',
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (course: CourseItem) => {
    setEditingCourse(course);
    setModalForm({
      title: course.title,
      slug: course.slug,
      description: course.description || '',
      contestId: course.contestId || contests[0]?.id || '',
      subjectId: course.subjectId || subjects[0]?.id || '',
      status: (course.status as any) || 'draft',
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleTitleChange = (val: string) => {
    const slug = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    setModalForm((prev) => ({
      ...prev,
      title: val,
      slug: editingCourse ? prev.slug : slug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalForm.title.trim()) {
      setModalError('O título do curso é obrigatório.');
      return;
    }
    if (!modalForm.slug.trim()) {
      setModalError('O slug do curso é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    setModalError('');

    try {
      if (editingCourse) {
        const updateInput: UpdateCourseInput = {
          title: modalForm.title,
          slug: modalForm.slug,
          description: modalForm.description || undefined,
          status: modalForm.status,
          contestId: modalForm.contestId || null,
          subjectId: modalForm.subjectId || null,
        };
        await courseService.updateCourse(editingCourse.id, updateInput);
      } else {
        const createInput: CreateCourseInput = {
          title: modalForm.title,
          slug: modalForm.slug,
          description: modalForm.description || undefined,
          contestId: modalForm.contestId || undefined,
          subjectId: modalForm.subjectId || undefined,
          status: modalForm.status,
        };
        await courseService.createCourse(createInput);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Erro ao salvar o curso.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleArchive = async (course: CourseItem) => {
    const isArchived = course.status === 'archived';
    const action = isArchived ? 'restaurar' : 'arquivar';
    if (!window.confirm(`Deseja realmente ${action} o curso "${course.title}"?`)) return;

    try {
      if (isArchived) {
        await courseService.updateCourse(course.id, { status: 'draft' });
      } else {
        await courseService.archiveCourse(course.id);
      }
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar status do curso.');
    }
  };

  const filteredCourses = courses.filter((c) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchesTitle = c.title.toLowerCase().includes(q);
      const matchesSubject = c.subjectName?.toLowerCase().includes(q);
      const matchesContest = c.contestAcronym?.toLowerCase().includes(q);
      if (!matchesTitle && !matchesSubject && !matchesContest) return false;
    }
    return true;
  });

  const totalPublished = courses.filter((c) => c.status === 'published').length;
  const totalDraft = courses.filter((c) => c.status === 'draft').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">Gestão de Cursos</h1>
          <p className="text-sm text-text-secondary mt-1">
            Organize a grade curricular de disciplinas, módulos e aulas da plataforma APROVA.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-brand transition-all"
        >
          <Plus className="w-4 h-4" />
          Novo Curso
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-bg-card border border-border">
          <p className="text-xs text-text-muted">Total de Cursos</p>
          <p className="text-xl font-extrabold text-text-primary mt-1">{courses.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-bg-card border border-border">
          <p className="text-xs text-success-text">Publicados</p>
          <p className="text-xl font-extrabold text-success-text mt-1">{totalPublished}</p>
        </div>
        <div className="p-4 rounded-xl bg-bg-card border border-border">
          <p className="text-xs text-amber-400">Rascunhos</p>
          <p className="text-xl font-extrabold text-amber-400 mt-1">{totalDraft}</p>
        </div>
        <div className="p-4 rounded-xl bg-bg-card border border-border">
          <p className="text-xs text-text-muted">Concursos Vinculados</p>
          <p className="text-xl font-extrabold text-brand-400 mt-1">{contests.length}</p>
        </div>
      </div>

      {/* Filters bar */}
      <Card noPadding className="p-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por título, matéria ou concurso..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-bg-elevated border border-border rounded-xl text-xs text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-bg-elevated border border-border rounded-xl px-2.5 py-1">
              <Filter className="w-3.5 h-3.5 text-text-muted" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent text-xs text-text-primary font-medium focus:outline-none cursor-pointer py-1"
              >
                <option value="all" className="bg-bg-card">Todos os status</option>
                <option value="published" className="bg-bg-card">Publicados</option>
                <option value="draft" className="bg-bg-card">Rascunhos</option>
                <option value="archived" className="bg-bg-card">Arquivados</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-bg-elevated border border-border rounded-xl px-2.5 py-1">
              <select
                value={contestFilter}
                onChange={(e) => setContestFilter(e.target.value)}
                className="bg-transparent text-xs text-text-primary font-medium focus:outline-none cursor-pointer py-1"
              >
                <option value="all" className="bg-bg-card">Todos os Concursos</option>
                {contests.map((c) => (
                  <option key={c.id} value={c.id} className="bg-bg-card">
                    {c.acronym} - {c.agencyName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Courses List */}
      {isLoading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <LoadingState message="Carregando cursos pedagógicos..." />
        </div>
      ) : filteredCourses.length === 0 ? (
        <Card noPadding className="p-12 text-center border-dashed border-border">
          <BookOpen className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <h3 className="text-base font-bold text-text-primary mb-1">Nenhum curso encontrado</h3>
          <p className="text-xs text-text-muted max-w-sm mx-auto mb-4">
            Não encontramos cursos com os filtros selecionados. Crie um novo curso para iniciar.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold shadow-brand transition-all"
          >
            Cadastrar Primeiro Curso
          </button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCourses.map((course) => {
            const isPublished = course.status === 'published';
            const isDraft = course.status === 'draft';

            return (
              <Card key={course.id} noPadding className="flex flex-col justify-between hover:border-brand-500/40 transition-all">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {course.contestAcronym && (
                        <span className="text-xs font-bold text-brand-400 bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded-lg">
                          {course.contestAcronym}
                        </span>
                      )}
                      {course.subjectName && (
                        <Badge variant="neutral" size="xs">{course.subjectName}</Badge>
                      )}
                    </div>
                    <Badge
                      variant={isPublished ? 'success' : isDraft ? 'warning' : 'neutral'}
                      size="xs"
                      dot
                    >
                      {isPublished ? 'Publicado' : isDraft ? 'Rascunho' : 'Arquivado'}
                    </Badge>
                  </div>

                  <h3 className="text-base font-bold text-text-primary mb-1.5 line-clamp-1">
                    {course.title}
                  </h3>
                  <p className="text-xs text-text-muted line-clamp-2 mb-4 leading-relaxed">
                    {course.description || 'Sem descrição cadastrada.'}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-text-secondary pt-3 border-t border-border">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-text-muted" />
                      <span>{course.modulesCount ?? 0} módulos</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-text-muted" />
                      <span>{course.lessonsCount ?? 0} aulas</span>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3.5 bg-bg-elevated/40 border-t border-border flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(course)}
                      title="Editar informações básicas"
                      className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-elevated transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleArchive(course)}
                      title={course.status === 'archived' ? 'Restaurar rascunho' : 'Arquivar curso'}
                      className="p-1.5 text-text-muted hover:text-danger-text rounded-lg hover:bg-bg-elevated transition-colors"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/cursos/${course.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Visualizar no portal do aluno"
                      className="text-[11px] font-semibold text-text-muted hover:text-text-primary flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-bg-elevated transition-colors"
                    >
                      <span>Aluno</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                    <Link
                      to={`/admin/cursos/${course.id}`}
                      className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold transition-all shadow-brand flex items-center gap-1"
                    >
                      <span>Gerenciar Grade</span>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Criar / Editar Curso */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-bg-card border border-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in my-8">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-brand-400" />
                {editingCourse ? 'Editar Curso' : 'Novo Curso Pedagógico'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-elevated transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {modalError && (
                <div className="p-3 bg-danger-light border border-danger/30 rounded-xl flex items-center gap-2 text-xs text-danger-text">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Título do Curso *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Legislação de Trânsito Completa"
                  value={modalForm.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:border-brand-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Slug (URL amigável) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="legislacao-de-transito-completa"
                  value={modalForm.slug}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, slug: e.target.value }))}
                  className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:border-brand-500 transition-all font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                    Concurso Vinculado
                  </label>
                  <select
                    value={modalForm.contestId}
                    onChange={(e) => setModalForm((prev) => ({ ...prev, contestId: e.target.value }))}
                    className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:border-brand-500 transition-all cursor-pointer"
                  >
                    <option value="" className="bg-bg-card">Nenhum concurso específico</option>
                    {contests.map((c) => (
                      <option key={c.id} value={c.id} className="bg-bg-card">
                        {c.acronym} - {c.agencyName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                    Disciplina
                  </label>
                  <select
                    value={modalForm.subjectId}
                    onChange={(e) => setModalForm((prev) => ({ ...prev, subjectId: e.target.value }))}
                    className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:border-brand-500 transition-all cursor-pointer"
                  >
                    <option value="" className="bg-bg-card">Nenhuma disciplina específica</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id} className="bg-bg-card">
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Status de Publicação
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'draft', label: 'Rascunho' },
                    { id: 'published', label: 'Publicado' },
                    { id: 'archived', label: 'Arquivado' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setModalForm((prev) => ({ ...prev, status: st.id as any }))}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        modalForm.status === st.id
                          ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                          : 'bg-bg-elevated border-border text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-text-disabled mt-1">
                  * Apenas cursos com status <strong>Publicado</strong> ficam visíveis aos alunos.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Descrição do Curso
                </label>
                <textarea
                  rows={3}
                  placeholder="Resumo pedagógico, objetivos e público-alvo do curso..."
                  value={modalForm.description}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:border-brand-500 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-bg-elevated hover:bg-bg-card border border-border text-text-secondary hover:text-text-primary rounded-xl text-xs font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-brand transition-all"
                >
                  {isSubmitting ? 'Salvando...' : editingCourse ? 'Atualizar Curso' : 'Criar Curso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
