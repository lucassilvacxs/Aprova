import React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  ChevronRight,
  FolderOpen,
} from 'lucide-react';
import { Card, Badge, ProgressBar, LoadingState } from '@/components/ui';
import { contestService, SubjectItem } from '@/services/contest.service';
import { courseService, CourseItem } from '@/services/course.service';

export const DisciplinaDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [subject, setSubject] = React.useState<SubjectItem | null>(null);
  const [courses, setCourses] = React.useState<CourseItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!id) return;
    setIsLoading(true);

    Promise.all([
      contestService.getSubjects(),
      courseService.getCourses({ subjectId: id }),
    ])
      .then(([allSubjects, coursesData]) => {
        const found = allSubjects.find((s) => s.id === id);
        setSubject(found || null);
        setCourses(coursesData);
      })
      .catch((err) => console.error('Erro ao carregar disciplina:', err))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingState message="Carregando disciplina..." />
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="p-8 text-center bg-bg-card border border-border rounded-2xl">
        <p className="text-sm text-danger-text mb-4">Disciplina não encontrada.</p>
        <Link to="/disciplinas" className="text-xs text-brand-400 font-semibold">
          Voltar para disciplinas
        </Link>
      </div>
    );
  }

  const totalLessons = courses.reduce((acc, c) => acc + c.lessonsCount, 0);
  const completedLessons = courses.reduce((acc, c) => acc + c.completedLessonsCount, 0);
  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : subject.progress;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <Link
        to="/disciplinas"
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Voltar para todas as disciplinas
      </Link>

      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-bg-card to-bg-elevated border border-border rounded-2xl flex items-start justify-between flex-wrap gap-4">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="brand">{subject.shortName || 'Disciplina'}</Badge>
            <span className="text-xs text-text-muted">Precisão média: {subject.accuracy}%</span>
          </div>
          <h1 className="text-2xl font-extrabold text-text-primary">{subject.name}</h1>
          <p className="text-sm text-text-secondary">
            {subject.description || 'Conteúdo teórico e resolução comentada de questões.'}
          </p>
        </div>

        <div className="w-full sm:w-64 bg-bg-surface p-4 rounded-xl border border-border">
          <ProgressBar
            value={overallProgress}
            colorKey="brand"
            size="md"
            showLabel
            label="Progresso da disciplina"
          />
          <p className="text-[11px] text-text-muted mt-2 text-center">
            {totalLessons > 0 ? `${completedLessons} de ${totalLessons} aulas concluídas` : 'Inicie seus estudos'}
          </p>
        </div>
      </div>

      {/* Cursos Disponíveis nesta Disciplina */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Cursos Teóricos & Práticos</h2>
            <p className="text-xs text-text-muted">Módulos estruturados para sua preparação</p>
          </div>
        </div>

        {courses.length === 0 ? (
          <Card className="p-8 text-center text-text-muted text-sm">
            <FolderOpen className="w-8 h-8 mx-auto mb-2 text-text-disabled" />
            Nenhum curso cadastrado diretamente nesta disciplina no momento.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((course) => (
              <Card key={course.id} hoverable noPadding className="flex flex-col justify-between">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant={course.status === 'published' ? 'brand' : 'neutral'} size="xs">
                      {course.contestTitle || 'Concurso Geral'}
                    </Badge>
                    <span className="text-xs font-semibold text-text-secondary flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-text-muted" />
                      {course.totalDurationMin} min
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-text-primary mb-1.5">{course.title}</h3>
                  <p className="text-xs text-text-muted line-clamp-2 mb-4">{course.description}</p>

                  <ProgressBar
                    value={course.progress}
                    colorKey="brand"
                    size="sm"
                    showLabel
                    label="Seu progresso no curso"
                  />
                </div>

                <div className="p-4 bg-bg-elevated/40 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-text-muted font-medium">
                    {course.modulesCount} módulos • {course.lessonsCount} aulas
                  </span>
                  <Link
                    to={`/cursos/${course.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 transition-colors shadow-sm"
                  >
                    {course.progress > 0 ? 'Continuar' : 'Acessar Curso'}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
