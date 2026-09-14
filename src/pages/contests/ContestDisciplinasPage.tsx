import React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Filter,
  ArrowUpDown,
} from 'lucide-react';
import { Card, Badge, ProgressBar, EmptyState, LoadingState } from '@/components/ui';
import { contestService, ContestDetail } from '@/services/contest.service';
import { courseService, CourseItem } from '@/services/course.service';

type FilterType = 'all' | 'in_progress' | 'completed' | 'not_started';
type SortType = 'priority' | 'progress' | 'name' | 'activity';

export const ContestDisciplinasPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [contest, setContest] = React.useState<ContestDetail | null>(null);
  const [courses, setCourses] = React.useState<CourseItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<FilterType>('all');
  const [sort, setSort] = React.useState<SortType>('priority');

  React.useEffect(() => {
    if (!id) return;
    setIsLoading(true);

    Promise.all([
      contestService.getContestById(id),
      courseService.getCourses({ contestId: id }),
    ])
      .then(([contestData, coursesData]) => {
        setContest(contestData);
        setCourses(coursesData);
      })
      .catch((err) => console.error('Erro ao carregar dados:', err))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingState message="Carregando disciplinas do concurso..." />
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="p-8 text-center bg-bg-card border border-border rounded-2xl">
        <p className="text-sm text-danger-text mb-4">Concurso não encontrado.</p>
        <Link to="/concursos" className="text-xs text-brand-400 font-semibold">
          Voltar para meus concursos
        </Link>
      </div>
    );
  }

  // Mapeia cursos por disciplina
  const coursesBySubject: Record<string, CourseItem[]> = {};
  for (const c of courses) {
    if (c.subjectId) {
      if (!coursesBySubject[c.subjectId]) coursesBySubject[c.subjectId] = [];
      coursesBySubject[c.subjectId].push(c);
    }
  }

  const subjectsList = (contest.subjects || []).map((s) => {
    const subCourses = coursesBySubject[s.id] || [];
    const totalLessons = subCourses.reduce((acc, c) => acc + c.lessonsCount, 0);
    const completedLessons = subCourses.reduce((acc, c) => acc + c.completedLessonsCount, 0);

    return {
      ...s,
      coursesCount: subCourses.length,
      totalLessons,
      completedLessons,
    };
  });

  // Filtros
  const filteredSubjects = subjectsList.filter((s) => {
    if (filter === 'in_progress') return s.progress > 0 && s.progress < 100;
    if (filter === 'completed') return s.progress >= 100;
    if (filter === 'not_started') return s.progress === 0;
    return true;
  });

  // Ordenação
  const sortedSubjects = [...filteredSubjects].sort((a, b) => {
    if (sort === 'progress') return b.progress - a.progress;
    if (sort === 'name') return a.name.localeCompare(b.name);
    if (sort === 'activity') return b.questionsAnswered - a.questionsAnswered;
    return (b.weight || 1) - (a.weight || 1); // prioridade por peso no edital
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Back */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link
          to={`/concursos/${contest.id}`}
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Voltar para detalhes do {contest.acronym}
        </Link>
      </div>

      <div className="flex items-start gap-4 flex-wrap">
        <div
          className="w-14 h-14 rounded-2xl border-2 flex items-center justify-center font-extrabold text-base shrink-0"
          style={{
            borderColor: (contest.acronym === 'PRF' ? '#7C5CFA' : '#22C55E') + '60',
            background: (contest.acronym === 'PRF' ? '#7C5CFA' : '#22C55E') + '15',
            color: contest.acronym === 'PRF' ? '#7C5CFA' : '#22C55E',
          }}
        >
          {contest.acronym}
        </div>
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-extrabold text-text-primary">Disciplinas no Edital</h1>
            <Badge variant="brand">{contest.agencyName}</Badge>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Plano programático organizado por peso e incidência de prova
          </p>
        </div>
      </div>

      {/* Toolbar: Filtros & Ordenação */}
      <div className="flex items-center justify-between flex-wrap gap-3 p-3 bg-bg-card border border-border rounded-2xl">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-4 h-4 text-text-muted ml-1 mr-1" />
          {[
            { id: 'all', label: 'Todas' },
            { id: 'in_progress', label: 'Em andamento' },
            { id: 'completed', label: 'Concluídas' },
            { id: 'not_started', label: 'Não iniciadas' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilter(btn.id as FilterType)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filter === btn.id
                  ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-text-muted" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortType)}
            className="bg-bg-elevated border border-border rounded-xl px-3 py-1.5 text-xs font-medium text-text-primary focus:outline-none focus:border-brand-500"
          >
            <option value="priority">Ordenar por Peso no Edital</option>
            <option value="progress">Ordenar por Progresso</option>
            <option value="name">Ordenar por Nome (A-Z)</option>
            <option value="activity">Ordenar por Atividade</option>
          </select>
        </div>
      </div>

      {/* Grid de Disciplinas */}
      {sortedSubjects.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-6 h-6" />}
          title="Nenhuma disciplina encontrada"
          description="Nenhuma disciplina corresponde aos filtros selecionados."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedSubjects.map((s) => (
            <Card key={s.id} hoverable noPadding className="flex flex-col">
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-xs font-bold text-brand-400 uppercase tracking-wider">
                      Peso {s.weight || '1.0'}
                    </span>
                    <Badge variant={s.progress >= 100 ? 'success' : s.progress > 0 ? 'brand' : 'neutral'} size="xs">
                      {s.progress >= 100 ? 'Concluída' : s.progress > 0 ? 'Em andamento' : 'Não iniciada'}
                    </Badge>
                  </div>

                  <h3 className="text-base font-bold text-text-primary mb-1">{s.name}</h3>
                  <p className="text-xs text-text-muted line-clamp-2 mb-4">
                    {s.questionsCount || 10} questões estimadas no edital oficial.
                  </p>
                </div>

                <div>
                  <ProgressBar
                    value={s.progress}
                    colorKey="brand"
                    size="sm"
                    showLabel
                    label="Seu progresso"
                  />

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-text-muted">
                      {s.totalLessons > 0 ? `${s.completedLessons}/${s.totalLessons} aulas` : 'Teoria e Questões'}
                    </span>
                    <Link
                      to={`/disciplinas/${s.id}`}
                      className="font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
                    >
                      Acessar aulas <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
