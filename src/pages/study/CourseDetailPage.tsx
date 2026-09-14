import React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Play,
  CheckCircle,
  Circle,
  FileText,
  Video,
  ChevronRight,
} from 'lucide-react';
import { Card, Badge, ProgressBar, LoadingState } from '@/components/ui';
import { courseService, CourseDetail, CourseModule } from '@/services/course.service';

export const CourseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = React.useState<CourseDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [openModules, setOpenModules] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (!id) return;
    setIsLoading(true);

    courseService
      .getCourseById(id)
      .then((data) => {
        setCourse(data);
        // Abre o primeiro módulo por padrão
        if (data.modules && data.modules.length > 0) {
          setOpenModules({ [data.modules[0].id]: true });
        }
      })
      .catch((err) => console.error('Erro ao carregar curso:', err))
      .finally(() => setIsLoading(false));
  }, [id]);

  const toggleModule = (modId: string) => {
    setOpenModules((prev) => ({ ...prev, [modId]: !prev[modId] }));
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingState message="Carregando estrutura do curso..." />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-8 text-center bg-bg-card border border-border rounded-2xl">
        <p className="text-sm text-danger-text mb-4">Curso não encontrado ou indisponível.</p>
        <Link to="/disciplinas" className="text-xs text-brand-400 font-semibold">
          Voltar para disciplinas
        </Link>
      </div>
    );
  }

  // Identifica a primeira aula não concluída para o botão "Continuar"
  let firstPendingLessonId: string | null = null;
  for (const m of course.modules) {
    for (const l of m.lessons) {
      if (!l.isCompleted && !firstPendingLessonId) {
        firstPendingLessonId = l.id;
        break;
      }
    }
    if (firstPendingLessonId) break;
  }

  // Se todas concluídas, aponta para a primeira aula
  const targetLessonId =
    firstPendingLessonId || (course.modules[0]?.lessons[0]?.id ? course.modules[0].lessons[0].id : null);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <Link
        to={course.subjectId ? `/disciplinas/${course.subjectId}` : '/concursos'}
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Voltar para {course.subjectName || 'disciplina'}
      </Link>

      {/* Course Hero Card */}
      <div className="p-6 lg:p-8 bg-gradient-to-br from-bg-card via-bg-elevated to-bg-card border border-border rounded-3xl relative overflow-hidden shadow-xl">
        <div className="flex flex-col lg:flex-row items-start justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              {course.agencyAcronym && <Badge variant="brand">{course.agencyAcronym}</Badge>}
              {course.subjectName && <Badge variant="neutral">{course.subjectName}</Badge>}
              <span className="text-xs text-text-muted flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {course.totalDurationMin} min estimadas
              </span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-extrabold text-text-primary tracking-tight">
              {course.title}
            </h1>

            <p className="text-sm text-text-secondary leading-relaxed">{course.description}</p>

            <div className="pt-2 flex items-center gap-3">
              {targetLessonId ? (
                <Link
                  to={`/aulas/${targetLessonId}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm shadow-brand transition-all hover:shadow-brand/40"
                >
                  <Play className="w-4 h-4 fill-white" />
                  {course.progress > 0 ? 'Continuar Estudos' : 'Começar Agora'}
                </Link>
              ) : (
                <span className="text-xs text-text-muted">Aulas em preparação</span>
              )}
            </div>
          </div>

          {/* Progress Card */}
          <div className="w-full lg:w-72 bg-bg-surface/80 backdrop-blur-md p-5 rounded-2xl border border-border flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-400 mb-2">Seu Desempenho</p>
              <div className="text-3xl font-extrabold text-text-primary tabular-nums mb-1">
                {course.progress}%
              </div>
              <p className="text-xs text-text-muted mb-4">
                {course.completedLessonsCount} de {course.lessonsCount} aulas concluídas
              </p>
              <ProgressBar value={course.progress} colorKey="brand" size="sm" />
            </div>

            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] text-text-muted">
              <span>{course.modulesCount} Módulos</span>
              <span>{course.lessonsCount - course.completedLessonsCount} restantes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modules & Curriculum */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-text-primary">Grade Curricular do Curso</h2>
          <span className="text-xs text-text-muted">{course.modules.length} Módulos organizados</span>
        </div>

        <div className="space-y-3">
          {course.modules.map((mod: CourseModule, idx: number) => {
            const isOpen = openModules[mod.id] !== false;

            return (
              <Card key={mod.id} noPadding className="overflow-hidden border-border/80">
                {/* Module Header */}
                <button
                  onClick={() => toggleModule(mod.id)}
                  className="w-full p-4 lg:p-5 flex items-center justify-between gap-4 text-left hover:bg-bg-elevated/40 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="w-7 h-7 rounded-xl bg-brand-500/10 text-brand-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-text-primary truncate">{mod.title}</h3>
                      {mod.description && (
                        <p className="text-xs text-text-muted line-clamp-1 mt-0.5">{mod.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="hidden sm:block text-right">
                      <p className="text-xs font-semibold text-text-secondary tabular-nums">
                        {mod.completedLessonsCount}/{mod.lessonsCount} aulas ({mod.progress}%)
                      </p>
                      <p className="text-[10px] text-text-muted">{mod.durationMinutes} min</p>
                    </div>
                    <div className="w-16 hidden sm:block">
                      <ProgressBar value={mod.progress} colorKey="brand" size="xs" />
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 text-text-muted transition-transform duration-200 ${
                        isOpen ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </button>

                {/* Lessons List */}
                {isOpen && (
                  <div className="border-t border-border divide-y divide-border/60 bg-bg-surface/50">
                    {mod.lessons.length === 0 ? (
                      <p className="p-4 text-xs text-text-muted text-center italic">
                        Nenhuma aula disponível neste módulo no momento.
                      </p>
                    ) : (
                      mod.lessons.map((lesson) => (
                        <Link
                          key={lesson.id}
                          to={`/aulas/${lesson.id}`}
                          className="p-3.5 sm:px-5 flex items-center justify-between gap-3 hover:bg-bg-elevated/60 transition-colors group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {lesson.isCompleted ? (
                              <CheckCircle className="w-4 h-4 text-success-text shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-text-disabled shrink-0 group-hover:text-brand-400 transition-colors" />
                            )}
                            <div className="min-w-0">
                              <p
                                className={`text-sm font-medium truncate ${
                                  lesson.isCompleted
                                    ? 'text-text-secondary line-through'
                                    : 'text-text-primary group-hover:text-brand-300'
                                }`}
                              >
                                {lesson.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {lesson.type === 'video' ? (
                                  <span className="text-[10px] text-blue-400 flex items-center gap-1">
                                    <Video className="w-3 h-3" /> Vídeo
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-text-muted flex items-center gap-1">
                                    <FileText className="w-3 h-3" /> Texto Teórico
                                  </span>
                                )}
                                <span className="text-[10px] text-text-disabled">•</span>
                                <span className="text-[10px] text-text-muted">
                                  {lesson.estimatedDurationMin} min
                                </span>
                              </div>
                            </div>
                          </div>

                          <span className="text-xs font-semibold text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            Estudar <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </Link>
                      ))
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
