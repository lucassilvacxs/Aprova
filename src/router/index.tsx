import React from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom';
import { useAuthStore } from '@/store';

// Layout
import { AppLayout } from '@/components/layout/AppLayout';

// Auth & Invite
import { LoginPage } from '@/pages/auth/LoginPage';
import { InviteActivationPage } from '@/pages/auth/InviteActivationPage';

// Guards
import { RequireAuth, RequireAdmin } from './guards';

// Pages
import { DashboardPage }       from '@/pages/dashboard/DashboardPage';
import { ContestsListPage }    from '@/pages/contests/ContestsListPage';
import { ContestDetailPage }   from '@/pages/contests/ContestDetailPage';
import { DisciplinasPage }     from '@/pages/study/DisciplinasPage';
import { DesempenhoPage }      from '@/pages/performance/DesempenhoPage';
import { NoticiasPage }        from '@/pages/news/NoticiasPage';
import { ProfilePage }         from '@/pages/profile/ProfilePage';
import { ConfiguracoesPage }   from '@/pages/settings/ConfiguracoesPage';
import { ComingSoonPage }      from '@/pages/common/ComingSoonPage';
import { ContestDisciplinasPage } from '@/pages/contests/ContestDisciplinasPage';
import { DisciplinaDetailPage } from '@/pages/study/DisciplinaDetailPage';
import { CourseDetailPage }     from '@/pages/study/CourseDetailPage';
import { LessonPage }           from '@/pages/study/LessonPage';
import { AdminDashboardPage }  from '@/pages/admin/AdminDashboardPage';
import { AdminUsersPage }      from '@/pages/admin/AdminUsersPage';
import { AdminInvitesPage }    from '@/pages/admin/AdminInvitesPage';
import { AdminContestsPage }   from '@/pages/admin/AdminContestsPage';
import { AdminCoursesPage }    from '@/pages/admin/AdminCoursesPage';
import { AdminCourseDetailPage } from '@/pages/admin/AdminCourseDetailPage';
import { QuestionsListPage }     from '@/pages/questions/QuestionsListPage';
import { QuestionSolverPage }    from '@/pages/questions/QuestionSolverPage';
import { QuestionsHistoryPage }   from '@/pages/questions/QuestionsHistoryPage';
import { QuestionsPerformancePage } from '@/pages/performance/QuestionsPerformancePage';
import { AdminQuestionsPage }    from '@/pages/admin/AdminQuestionsPage';
import { AdminQuestionEditorPage } from '@/pages/admin/AdminQuestionEditorPage';
import { SimulationsListPage } from '@/pages/simulations/SimulationsListPage';
import { CustomSimulationBuilderPage } from '@/pages/simulations/CustomSimulationBuilderPage';
import { SimulationPreparationPage } from '@/pages/simulations/SimulationPreparationPage';
import { SimulationExamRunnerPage } from '@/pages/simulations/SimulationExamRunnerPage';
import { SimulationResultPage } from '@/pages/simulations/SimulationResultPage';
import { SimulationsHistoryPage } from '@/pages/simulations/SimulationsHistoryPage';
import { AdminSimulationsPage } from '@/pages/admin/AdminSimulationsPage';
import { AdminSimulationEditorPage } from '@/pages/admin/AdminSimulationEditorPage';
import { StudyPlanHubPage } from '@/pages/study-plan/StudyPlanHubPage';
import { StudyPlanWizardPage } from '@/pages/study-plan/StudyPlanWizardPage';
import { StudyPlanCalendarPage } from '@/pages/study-plan/StudyPlanCalendarPage';
import { StudyPlanTodayPage } from '@/pages/study-plan/StudyPlanTodayPage';
import { StudyPlanPerformancePage } from '@/pages/study-plan/StudyPlanPerformancePage';
import { EssayHubPage } from '@/pages/essay/EssayHubPage';
import { EssayThemesPage } from '@/pages/essay/EssayThemesPage';
import { EssayThemeDetailPage } from '@/pages/essay/EssayThemeDetailPage';
import { EssayEditorPage } from '@/pages/essay/EssayEditorPage';
import { EssayHistoryPage } from '@/pages/essay/EssayHistoryPage';
import { EssayDetailPage } from '@/pages/essay/EssayDetailPage';
import { EssayPerformancePage } from '@/pages/essay/EssayPerformancePage';
import { AdminEssaysPage } from '@/pages/admin/AdminEssaysPage';
import { AdminEssayCorrectionPage } from '@/pages/admin/AdminEssayCorrectionPage';
import { NoticiaDetailPage } from '@/pages/news/NoticiaDetailPage';
import { EditaisPage } from '@/pages/documents/EditaisPage';
import { EditalDetailPage } from '@/pages/documents/EditalDetailPage';
import { AdminNewsPage } from '@/pages/admin/AdminNewsPage';
import { AdminNewsEditorPage } from '@/pages/admin/AdminNewsEditorPage';
import { AdminNewsSourcesPage } from '@/pages/admin/AdminNewsSourcesPage';
import { AdminDocumentsPage } from '@/pages/admin/AdminDocumentsPage';
import {
  Shield,
} from 'lucide-react';


const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/convite',
    element: <InviteActivationPage />,
  },
  {
    // Protected routes
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard',    element: <DashboardPage /> },
          { path: '/concursos',    element: <ContestsListPage /> },
          { path: '/concursos/:id',element: <ContestDetailPage /> },
          { path: '/concursos/:id/disciplinas', element: <ContestDisciplinasPage /> },
          { path: '/disciplinas',  element: <DisciplinasPage /> },
          { path: '/disciplinas/:id', element: <DisciplinaDetailPage /> },
          { path: '/cursos/:id',   element: <CourseDetailPage /> },
          { path: '/aulas/:id',    element: <LessonPage /> },
          { path: '/desempenho',   element: <DesempenhoPage /> },
          { path: '/noticias',     element: <NoticiasPage /> },
          { path: '/noticias/:id', element: <NoticiaDetailPage /> },
          { path: '/editais',      element: <EditaisPage /> },
          { path: '/editais/:id',  element: <EditalDetailPage /> },
          { path: '/perfil',       element: <ProfilePage /> },
          { path: '/configuracoes',element: <ConfiguracoesPage /> },
          { path: '/questoes',               element: <QuestionsListPage /> },
          { path: '/questoes/historico',     element: <QuestionsHistoryPage /> },
          { path: '/questoes/:id',           element: <QuestionSolverPage /> },
          { path: '/desempenho/questoes',    element: <QuestionsPerformancePage /> },
          { path: '/simulados',              element: <SimulationsListPage /> },
          { path: '/simulados/novo',         element: <CustomSimulationBuilderPage /> },
          { path: '/simulados/historico',    element: <SimulationsHistoryPage /> },
          { path: '/simulados/:id',          element: <SimulationPreparationPage /> },
          { path: '/simulados/:id/prova',    element: <SimulationExamRunnerPage /> },
          { path: '/simulados/:id/resultado',element: <SimulationResultPage /> },
          { path: '/simulados/tentativas/:attemptId/resultado', element: <SimulationResultPage /> },
          { path: '/plano-estudos',             element: <StudyPlanHubPage /> },
          { path: '/plano-estudos/novo',        element: <StudyPlanWizardPage /> },
          { path: '/plano-estudos/calendario',  element: <StudyPlanCalendarPage /> },
          { path: '/plano-estudos/hoje',        element: <StudyPlanTodayPage /> },
          { path: '/plano-estudos/desempenho',  element: <StudyPlanPerformancePage /> },
          { path: '/redacao',             element: <EssayHubPage /> },
          { path: '/redacao/temas',       element: <EssayThemesPage /> },
          { path: '/redacao/temas/:id',   element: <EssayThemeDetailPage /> },
          { path: '/redacao/:id/escrever', element: <EssayEditorPage /> },
          { path: '/redacao/historico',   element: <EssayHistoryPage /> },
          { path: '/redacao/:id',         element: <EssayDetailPage /> },
          { path: '/redacao/desempenho',  element: <EssayPerformancePage /> },

          // Admin routes (apenas papel admin)
          {
            element: <RequireAdmin />,
            children: [
              { path: '/admin',            element: <AdminDashboardPage /> },
              { path: '/admin/usuarios',   element: <AdminUsersPage /> },
              { path: '/admin/convites',   element: <AdminInvitesPage /> },
              { path: '/admin/concursos',  element: <AdminContestsPage /> },
              { path: '/admin/cursos',     element: <AdminCoursesPage /> },
              { path: '/admin/cursos/:id', element: <AdminCourseDetailPage /> },
              { path: '/admin/questoes',   element: <AdminQuestionsPage /> },
              { path: '/admin/questoes/nova', element: <AdminQuestionEditorPage /> },
              { path: '/admin/questoes/:id/editar', element: <AdminQuestionEditorPage /> },
              { path: '/admin/simulados',  element: <AdminSimulationsPage /> },
              { path: '/admin/simulados/novo', element: <AdminSimulationEditorPage /> },
              { path: '/admin/simulados/:id/editar', element: <AdminSimulationEditorPage /> },
              { path: '/admin/redacoes',   element: <AdminEssaysPage /> },
              { path: '/admin/redacoes/:id/corrigir', element: <AdminEssayCorrectionPage /> },
              { path: '/admin/noticias',   element: <AdminNewsPage /> },
              { path: '/admin/noticias/nova', element: <AdminNewsEditorPage /> },
              { path: '/admin/noticias/:id/editar', element: <AdminNewsEditorPage /> },
              { path: '/admin/noticias/fontes', element: <AdminNewsSourcesPage /> },
              { path: '/admin/editais',    element: <AdminDocumentsPage /> },
              {
                path: '/admin/disciplinas',
                element: <ComingSoonPage title="Admin — Disciplinas" description="Gerenciamento de disciplinas disponível em breve." icon={<Shield className="w-6 h-6" />} />,
              },
            ],
          },

          // Catch-all inside app
          { path: '*', element: <Navigate to="/dashboard" replace /> },
        ],
      },
    ],
  },
  // Catch-all outside app
  { path: '*', element: <Navigate to="/login" replace /> },
]);

export const AppRouter: React.FC = () => {
  const { checkSession } = useAuthStore();

  React.useEffect(() => {
    checkSession();
  }, [checkSession]);

  return <RouterProvider router={router} />;
};
