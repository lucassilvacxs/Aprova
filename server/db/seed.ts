import bcrypt from 'bcryptjs';
import { db } from './index';
import {
  users,
  roles,
  permissions,
  userRoles,
  rolePermissions,
  agencies,
  examBoards,
  contests,
  subjects,
  topics,
  contestSubjects,
  courses,
  modules,
  lessons,
  contents,
  lessonResources,
  userLessonProgress,
  userProgress,
  userSubjectProgress,
  questions,
  questionOptions,
  questionAttempts,
  questionFavorites,
  questionReviewFlags,
  simulations,
  simulationQuestions,
  simulationAttempts,
  simulationAnswers,
  settings,
  newsSources,
  news,
  documents,
  newsReads,
  newsFavorites,
  newsTags,
  newsToTags,
  studyPlans,
  studyPlanSessions,
  essayPrompts,
  essayCriteria,
  essays,
  essayVersions,
  essayCorrections,
  essayCorrectionCriteria,
} from './schema';
import { eq, and, count } from 'drizzle-orm';
import { StudyPlanService } from '../services/study-plan.service';

/**
 * Seed oficial de desenvolvimento da plataforma APROVA.
 * Regra: Todos os dados demonstrativos são claramente marcados como DEMO/SEED.
 * Senhas são criptografadas com bcrypt.
 */
export async function seed() {
  console.log('🌱 Iniciando seed da plataforma APROVA (Fase 3)...');

  try {
    // 1. Papéis (Roles)
    console.log('👥 Cadastrando papéis...');
    const [adminRole] = await db
      .insert(roles)
      .values({
        name: 'admin',
        description: 'Administrador do sistema com acesso total ao painel de controle.',
      })
      .onConflictDoNothing()
      .returning();

    const [studentRole] = await db
      .insert(roles)
      .values({
        name: 'student',
        description: 'Aluno da plataforma com acesso aos cursos e simulados autorizados.',
      })
      .onConflictDoNothing()
      .returning();

    // Se já existiam, busca os registros
    const actualAdminRole =
      adminRole ||
      (await db.select().from(roles).where(eq(roles.name, 'admin')))[0];
    const actualStudentRole =
      studentRole ||
      (await db.select().from(roles).where(eq(roles.name, 'student')))[0];

    // 2. Permissões
    console.log('🔑 Cadastrando permissões do sistema...');
    const systemPermissions = [
      { name: 'users.view', description: 'Visualizar lista e detalhes de usuários' },
      { name: 'users.manage', description: 'Criar, editar e bloquear usuários' },
      { name: 'invitations.manage', description: 'Criar, revogar e listar convites de acesso' },
      { name: 'contests.view', description: 'Visualizar concursos autorizados' },
      { name: 'contests.manage', description: 'Cadastrar e editar concursos e órgãos' },
      { name: 'subjects.view', description: 'Visualizar disciplinas e conteúdos' },
      { name: 'subjects.manage', description: 'Cadastrar e editar disciplinas e assuntos' },
      { name: 'study.access', description: 'Acessar área de estudos e responder questões' },
      { name: 'analytics.view', description: 'Visualizar métricas e desempenho' },
      { name: 'audit.view', description: 'Visualizar trilha de auditoria' },
    ];

    const insertedPermissions = [];
    for (const perm of systemPermissions) {
      const [p] = await db.insert(permissions).values(perm).onConflictDoNothing().returning();
      if (p) {
        insertedPermissions.push(p);
      } else {
        const [existing] = await db.select().from(permissions).where(eq(permissions.name, perm.name));
        if (existing) insertedPermissions.push(existing);
      }
    }

    // 3. Matriz de Permissões por Papel
    console.log('🛡️ Associando permissões aos papéis...');
    if (actualAdminRole) {
      for (const p of insertedPermissions) {
        await db
          .insert(rolePermissions)
          .values({ roleId: actualAdminRole.id, permissionId: p.id })
          .onConflictDoNothing();
      }
    }

    if (actualStudentRole) {
      const studentPermNames = ['contests.view', 'subjects.view', 'study.access', 'analytics.view'];
      for (const p of insertedPermissions) {
        if (studentPermNames.includes(p.name)) {
          await db
            .insert(rolePermissions)
            .values({ roleId: actualStudentRole.id, permissionId: p.id })
            .onConflictDoNothing();
        }
      }
    }

    // 4. Usuários Iniciais (Admin e Aluno Demo)
    console.log('👤 Criando usuários iniciais (com hash bcrypt)...');
    const adminPasswordHash = await bcrypt.hash('Admin@123456', 10);
    const studentPasswordHash = await bcrypt.hash('Aluno@123456', 10);
    const lucasAdminPasswordHash = await bcrypt.hash('36546944', 10);

    const [adminUser] = await db
      .insert(users)
      .values({
        name: 'Administrador APROVA',
        email: 'admin@aprova.app',
        passwordHash: adminPasswordHash,
        status: 'active',
        allowedContestIds: [],
      })
      .onConflictDoNothing()
      .returning();

    const actualAdminUser =
      adminUser ||
      (await db.select().from(users).where(eq(users.email, 'admin@aprova.app')))[0];

    const [lucasUser] = await db
      .insert(users)
      .values({
        name: 'Lucas Silva',
        email: 'lucassilvaytb1999@gmail.com',
        passwordHash: lucasAdminPasswordHash,
        status: 'active',
        allowedContestIds: [],
      })
      .onConflictDoNothing()
      .returning();

    const actualLucasUser =
      lucasUser ||
      (await db.select().from(users).where(eq(users.email, 'lucassilvaytb1999@gmail.com')))[0];

    const [studentUser] = await db
      .insert(users)
      .values({
        name: 'Lucas Silva (Aluno Demo)',
        email: 'aluno@aprova.app',
        passwordHash: studentPasswordHash,
        status: 'active',
        allowedContestIds: [],
      })
      .onConflictDoNothing()
      .returning();

    const actualStudentUser =
      studentUser ||
      (await db.select().from(users).where(eq(users.email, 'aluno@aprova.app')))[0];

    // Vincula papéis aos usuários
    if (actualAdminUser && actualAdminRole) {
      await db
        .insert(userRoles)
        .values({ userId: actualAdminUser.id, roleId: actualAdminRole.id })
        .onConflictDoNothing();
    }

    if (actualLucasUser && actualAdminRole) {
      await db
        .insert(userRoles)
        .values({ userId: actualLucasUser.id, roleId: actualAdminRole.id })
        .onConflictDoNothing();
    }

    if (actualStudentUser && actualStudentRole) {
      await db
        .insert(userRoles)
        .values({ userId: actualStudentUser.id, roleId: actualStudentRole.id })
        .onConflictDoNothing();
    }

    // 5. Órgãos Oficiais (Agencies)
    console.log('🏛️ Cadastrando órgãos (PRF e PF)...');
    const [prfAgency] = await db
      .insert(agencies)
      .values({
        name: 'Polícia Rodoviária Federal',
        acronym: 'PRF',
        sphere: 'federal',
        websiteUrl: 'https://www.gov.br/prf',
      })
      .onConflictDoNothing()
      .returning();

    const [pfAgency] = await db
      .insert(agencies)
      .values({
        name: 'Polícia Federal',
        acronym: 'PF',
        sphere: 'federal',
        websiteUrl: 'https://www.gov.br/pf',
      })
      .onConflictDoNothing()
      .returning();

    const actualPrfAgency =
      prfAgency ||
      (await db.select().from(agencies).where(eq(agencies.acronym, 'PRF')))[0];
    const actualPfAgency =
      pfAgency ||
      (await db.select().from(agencies).where(eq(agencies.acronym, 'PF')))[0];

    // 6. Bancas Examinadoras
    console.log('📝 Cadastrando bancas examinadoras...');
    const [cebraspe] = await db
      .insert(examBoards)
      .values({
        name: 'Centro Brasileiro de Pesquisa em Avaliação e Seleção (Cebraspe)',
        acronym: 'Cebraspe',
        scoringStyle: 'cebraspe_negative_points',
        websiteUrl: 'https://www.cebraspe.org.br',
      })
      .onConflictDoNothing()
      .returning();

    await db
      .insert(examBoards)
      .values({
        name: 'Fundação Getulio Vargas (FGV)',
        acronym: 'FGV',
        scoringStyle: 'standard_multiple_choice',
        websiteUrl: 'https://conhecimento.fgv.br',
      })
      .onConflictDoNothing()
      .returning();

    const actualCebraspe =
      cebraspe ||
      (await db.select().from(examBoards).where(eq(examBoards.acronym, 'Cebraspe')))[0];

    // 7. Concursos Oficiais (PRF e PF)
    console.log('🎯 Cadastrando concursos PRF e PF...');
    const [prfContest] = await db
      .insert(contests)
      .values({
        agencyId: actualPrfAgency.id,
        boardId: actualCebraspe?.id,
        title: 'Polícia Rodoviária Federal — Policial Rodoviário Federal',
        slug: 'prf-2026',
        year: 2026,
        status: 'active',
        vacanciesCount: 1500,
        salaryBase: '10742.00',
        description: 'Preparação completa para o concurso da PRF. Carreira Policial Federal com foco no edital Cebraspe.',
        officialPageUrl: 'https://www.gov.br/prf/pt-br/acesso-a-informacao/concursos-publicos',
      })
      .onConflictDoNothing()
      .returning();

    const [pfContest] = await db
      .insert(contests)
      .values({
        agencyId: actualPfAgency.id,
        boardId: actualCebraspe?.id,
        title: 'Polícia Federal — Agente e Escrivão',
        slug: 'pf-2026',
        year: 2026,
        status: 'active',
        vacanciesCount: 2000,
        salaryBase: '13649.52',
        description: 'Preparação de alto rendimento para Agente e Escrivão da Polícia Federal com ênfase em TI e Contabilidade.',
        officialPageUrl: 'https://www.gov.br/pf/pt-br/acesso-a-informacao/concursos',
      })
      .onConflictDoNothing()
      .returning();

    const actualPrfContest =
      prfContest ||
      (await db.select().from(contests).where(eq(contests.slug, 'prf-2026')))[0];
    const actualPfContest =
      pfContest ||
      (await db.select().from(contests).where(eq(contests.slug, 'pf-2026')))[0];

    // Atualiza concursos permitidos para o aluno demo
    if (actualStudentUser && actualPrfContest && actualPfContest) {
      await db
        .update(users)
        .set({ allowedContestIds: [actualPrfContest.id, actualPfContest.id] })
        .where(eq(users.id, actualStudentUser.id));
    }

    // 8. Disciplinas Fundamentais
    console.log('📚 Cadastrando disciplinas fundamentais...');
    const baseSubjects = [
      { name: 'Língua Portuguesa', slug: 'lingua-portuguesa', shortName: 'Português', colorToken: 'green' },
      { name: 'Raciocínio Lógico-Matemático', slug: 'raciocinio-logico', shortName: 'RLM', colorToken: 'rose' },
      { name: 'Informática', slug: 'informatica', shortName: 'Informática', colorToken: 'blue' },
      { name: 'Direito Constitucional', slug: 'direito-constitucional', shortName: 'Dir. Constitucional', colorToken: 'orange' },
      { name: 'Direito Administrativo', slug: 'direito-administrativo', shortName: 'Dir. Administrativo', colorToken: 'amber' },
      { name: 'Direito Penal & Processual Penal', slug: 'direito-penal', shortName: 'Dir. Penal', colorToken: 'purple' },
      { name: 'Legislação de Trânsito', slug: 'legislacao-de-transito', shortName: 'Trânsito', colorToken: 'green' },
    ];

    const insertedSubjects: Record<string, any> = {};
    for (const sub of baseSubjects) {
      const [s] = await db.insert(subjects).values(sub).onConflictDoNothing().returning();
      if (s) {
        insertedSubjects[sub.slug] = s;
      } else {
        const [existing] = await db.select().from(subjects).where(eq(subjects.slug, sub.slug));
        if (existing) insertedSubjects[sub.slug] = existing;
      }
    }

    // 9. Vinculação Concurso <-> Disciplinas (com pesos)
    console.log('🔗 Vinculando disciplinas aos concursos...');
    if (actualPrfContest) {
      const prfLinks = [
        { slug: 'legislacao-de-transito', weight: '3.00', count: 30 },
        { slug: 'lingua-portuguesa', weight: '2.00', count: 20 },
        { slug: 'direito-constitucional', weight: '1.50', count: 15 },
        { slug: 'direito-administrativo', weight: '1.50', count: 15 },
        { slug: 'direito-penal', weight: '1.50', count: 15 },
        { slug: 'raciocinio-logico', weight: '1.00', count: 10 },
        { slug: 'informatica', weight: '1.00', count: 10 },
      ];

      for (const item of prfLinks) {
        const sub = insertedSubjects[item.slug];
        if (sub) {
          const [existingLink] = await db
            .select({ id: contestSubjects.id })
            .from(contestSubjects)
            .where(
              and(
                eq(contestSubjects.contestId, actualPrfContest.id),
                eq(contestSubjects.subjectId, sub.id)
              )
            )
            .limit(1);

          if (!existingLink) {
            await db.insert(contestSubjects).values({
              contestId: actualPrfContest.id,
              subjectId: sub.id,
              weight: item.weight,
              expectedQuestionsCount: item.count,
            });
          }
        }
      }
    }

    if (actualPfContest) {
      const pfLinks = [
        { slug: 'informatica', weight: '3.00', count: 36 },
        { slug: 'lingua-portuguesa', weight: '2.00', count: 24 },
        { slug: 'raciocinio-logico', weight: '1.50', count: 16 },
        { slug: 'direito-constitucional', weight: '1.00', count: 10 },
        { slug: 'direito-administrativo', weight: '1.00', count: 10 },
        { slug: 'direito-penal', weight: '1.00', count: 10 },
      ];

      for (const item of pfLinks) {
        const sub = insertedSubjects[item.slug];
        if (sub) {
          const [existingLink] = await db
            .select({ id: contestSubjects.id })
            .from(contestSubjects)
            .where(
              and(
                eq(contestSubjects.contestId, actualPfContest.id),
                eq(contestSubjects.subjectId, sub.id)
              )
            )
            .limit(1);

          if (!existingLink) {
            await db.insert(contestSubjects).values({
              contestId: actualPfContest.id,
              subjectId: sub.id,
              weight: item.weight,
              expectedQuestionsCount: item.count,
            });
          }
        }
      }
    }

    // 10. Progresso Real Demonstrativo do Aluno Demo
    console.log('📈 Criando progresso de estudos real para aluno demo...');
    if (actualStudentUser && actualPrfContest) {
      await db
        .insert(userProgress)
        .values({
          userId: actualStudentUser.id,
          contestId: actualPrfContest.id,
          completedLessonsCount: 48,
          totalStudyHours: '94.00',
          questionsAnswered: 1248,
          correctQuestionsCount: 978,
          wrongQuestionsCount: 270,
          overallPercentage: '78.40',
          currentStreakDays: 12,
          lastActivityAt: new Date(),
        })
        .onConflictDoNothing();

      // Progresso por disciplina do aluno
      const subjectMetrics = [
        { slug: 'legislacao-de-transito', acc: '91.00', answered: 210, correct: 191, wrong: 19, prog: '88.00' },
        { slug: 'lingua-portuguesa', acc: '87.00', answered: 180, correct: 157, wrong: 23, prog: '72.00' },
        { slug: 'direito-penal', acc: '82.00', answered: 140, correct: 115, wrong: 25, prog: '55.00' },
        { slug: 'informatica', acc: '79.00', answered: 100, correct: 79, wrong: 21, prog: '60.00' },
        { slug: 'direito-constitucional', acc: '74.00', answered: 220, correct: 163, wrong: 57, prog: '80.00' },
        { slug: 'direito-administrativo', acc: '68.00', answered: 190, correct: 129, wrong: 61, prog: '45.00' },
        { slug: 'raciocinio-logico', acc: '63.00', answered: 160, correct: 101, wrong: 59, prog: '38.00' },
      ];

      for (const sm of subjectMetrics) {
        const sub = insertedSubjects[sm.slug];
        if (sub) {
          await db
            .insert(userSubjectProgress)
            .values({
              userId: actualStudentUser.id,
              subjectId: sub.id,
              contestId: actualPrfContest.id,
              accuracyPercentage: sm.acc,
              questionsAnswered: sm.answered,
              correctCount: sm.correct,
              wrongCount: sm.wrong,
              progressPercentage: sm.prog,
              lastStudiedAt: new Date(),
            })
            .onConflictDoNothing();
        }
      }
    }

    // 11. Tópicos, Cursos, Módulos e Aulas Demonstrativas (Fase 4 - DEMO)
    console.log('🎓 Cadastrando cursos, módulos, aulas e conteúdos demonstrativos...');

    // Tópicos fundamentais
    if (insertedSubjects['direito-constitucional']) {
      const constId = insertedSubjects['direito-constitucional'].id;
      await db.insert(topics).values([
        { subjectId: constId, name: 'Direitos e Deveres Individuais e Coletivos (Art. 5º)', orderIndex: 1 },
        { subjectId: constId, name: 'Da Segurança Pública (Art. 144 da CF/88)', orderIndex: 2 },
        { subjectId: constId, name: 'Da Organização Político-Administrativa do Estado', orderIndex: 3 },
      ]).onConflictDoNothing();
    }

    if (insertedSubjects['legislacao-de-transito']) {
      const transId = insertedSubjects['legislacao-de-transito'].id;
      await db.insert(topics).values([
        { subjectId: transId, name: 'Do Sistema Nacional de Trânsito e Competências da PRF', orderIndex: 1 },
        { subjectId: transId, name: 'Das Normas Gerais de Circulação e Conduta', orderIndex: 2 },
        { subjectId: transId, name: 'Dos Crimes de Trânsito (Art. 301 a 312 do CTB)', orderIndex: 3 },
      ]).onConflictDoNothing();
    }

    if (insertedSubjects['lingua-portuguesa']) {
      const portId = insertedSubjects['lingua-portuguesa'].id;
      await db.insert(topics).values([
        { subjectId: portId, name: 'Compreensão e Interpretação de Textos', orderIndex: 1 },
        { subjectId: portId, name: 'Concordância Verbal e Nominal', orderIndex: 2 },
        { subjectId: portId, name: 'Regência Verbal e Crase', orderIndex: 3 },
      ]).onConflictDoNothing();
    }

    if (insertedSubjects['informatica']) {
      const infoId = insertedSubjects['informatica'].id;
      await db.insert(topics).values([
        { subjectId: infoId, name: 'Segurança da Informação e Criptografia', orderIndex: 1 },
        { subjectId: infoId, name: 'Redes de Computadores e Protocolos', orderIndex: 2 },
        { subjectId: infoId, name: 'Computação em Nuvem e Big Data', orderIndex: 3 },
      ]).onConflictDoNothing();
    }

    if (insertedSubjects['direito-administrativo']) {
      const admId = insertedSubjects['direito-administrativo'].id;
      await db.insert(topics).values([
        { subjectId: admId, name: 'Princípios da Administração Pública (LIMPE)', orderIndex: 1 },
        { subjectId: admId, name: 'Atos Administrativos e Poderes', orderIndex: 2 },
        { subjectId: admId, name: 'Responsabilidade Civil do Estado', orderIndex: 3 },
      ]).onConflictDoNothing();
    }

    if (insertedSubjects['direito-penal']) {
      const penalId = insertedSubjects['direito-penal'].id;
      await db.insert(topics).values([
        { subjectId: penalId, name: 'Teoria do Crime: Fato Típico e Culpabilidade', orderIndex: 1 },
        { subjectId: penalId, name: 'Crimes contra a Administração Pública', orderIndex: 2 },
      ]).onConflictDoNothing();
    }

    if (insertedSubjects['raciocinio-logico']) {
      const rlmId = insertedSubjects['raciocinio-logico'].id;
      await db.insert(topics).values([
        { subjectId: rlmId, name: 'Estruturas Lógicas e Conectivos', orderIndex: 1 },
        { subjectId: rlmId, name: 'Equivalências e Negações Lógicas', orderIndex: 2 },
      ]).onConflictDoNothing();
    }

    // CURSO 1: PRF - Trânsito
    let prfLesson1Id: string | null = null;
    if (actualPrfContest && insertedSubjects['legislacao-de-transito']) {
      const [c1] = await db
        .insert(courses)
        .values({
          contestId: actualPrfContest.id,
          subjectId: insertedSubjects['legislacao-de-transito'].id,
          title: 'Legislação de Trânsito para PRF — Teoria & Aplicação Operacional (DEMO)',
          slug: 'legislacao-transito-prf-demo',
          description: 'Curso completo cobrindo a Lei nº 9.503/1997 (CTB), competências específicas da PRF no Art. 20, procedimentos de fiscalização e principais resoluções do CONTRAN exigidas na prova.',
          thumbnailUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800',
          status: 'published',
          orderIndex: 1,
        })
        .onConflictDoNothing()
        .returning();

      const course1 = c1 || (await db.select().from(courses).where(eq(courses.slug, 'legislacao-transito-prf-demo')))[0];

      if (course1) {
        // Módulo 1
        const [m1] = await db
          .insert(modules)
          .values({
            courseId: course1.id,
            subjectId: insertedSubjects['legislacao-de-transito'].id,
            title: 'Módulo 1: Sistema Nacional de Trânsito & Competências da PRF',
            description: 'Estrutura organizacional do SNT, órgãos normativos, executivos e fiscalizadores com ênfase no Artigo 20 do CTB.',
            orderIndex: 1,
            status: 'published',
          })
          .onConflictDoNothing()
          .returning();

        const mod1 = m1 || (await db.select().from(modules).where(eq(modules.courseId, course1.id)))[0];

        if (mod1) {
          // Aula 1
          const [l1] = await db
            .insert(lessons)
            .values({
              moduleId: mod1.id,
              title: 'Composição do SNT e Artigo 20 do CTB (Competências da PRF)',
              slug: 'snt-competencias-prf-art-20',
              description: 'Análise detalhada das competências privativas e concorrentes da Polícia Rodoviária Federal no âmbito das rodovias e estradas federais.',
              orderIndex: 1,
              estimatedDurationMin: 45,
              type: 'mixed',
              videoUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
              status: 'published',
            })
            .onConflictDoNothing()
            .returning();

          const lesson1 = l1 || (await db.select().from(lessons).where(eq(lessons.moduleId, mod1.id)))[0];
          if (lesson1) {
            prfLesson1Id = lesson1.id;
            await db.insert(contents).values({
              lessonId: lesson1.id,
              type: 'text_markdown',
              body: `# Composição do SNT e Competências da Polícia Rodoviária Federal

O **Sistema Nacional de Trânsito (SNT)** é o conjunto de órgãos e entidades da União, dos Estados, do Distrito Federal e dos Municípios que tem por finalidade o exercício das atividades de planejamento, administração, normatização, pesquisa, registro e licenciamento de veículos, formação, habilitação e fiscalização de trânsito.

---

### 1. Objetivos Básicos do SNT (Art. 6º do CTB)
- Estabelecer diretrizes da Política Nacional de Trânsito com vistas à segurança, à fluidez, ao conforto e à defesa ambiental;
- Fixar, mediante normas e procedimentos, a padronização de critérios técnicos;
- Estabelecer a sistemática de fluxos de informação permanentes entre os seus diversos órgãos.

---

### 2. O Artigo 20 do CTB: Competências da PRF
Compete privativamente à **Polícia Rodoviária Federal**, no âmbito das rodovias e estradas federais:

1. **Cumprir e fazer cumprir** a legislação e as normas de trânsito;
2. **Patrulhamento ostensivo**, executando operações relacionadas com a segurança pública;
3. **Aplicar e arrecadar multas** por infrações de trânsito e medidas administrativas decorrentes;
4. **Efetuar levantamento dos locais de acidentes** de trânsito e dos serviços de socorro às vítimas;
5. **Fiscalização de peso, dimensões e lotação** de veículos.

> **Importante para Prova:**  
> A fiscalização da PRF possui natureza de **polícia administrativa de segurança viária**, atuando preventivamente e repressivamente para preservar vidas e patrimônio público nas rodovias federais.`,
              orderIndex: 1,
            }).onConflictDoNothing();

            await db.insert(lessonResources).values([
              {
                lessonId: lesson1.id,
                title: 'Esquema Síntese — Competências PRF Art. 20 (PDF)',
                type: 'pdf',
                url: 'https://arquivos.aprova.app/materiais/prf-art20-resumo.pdf',
                orderIndex: 1,
                status: 'published',
              },
              {
                lessonId: lesson1.id,
                title: 'Texto Integral da Lei nº 9.503/1997 (Planalto)',
                type: 'link',
                url: 'https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm',
                orderIndex: 2,
                status: 'published',
              },
            ]).onConflictDoNothing();
          }

          // Aula 2
          await db.insert(lessons).values({
            moduleId: mod1.id,
            title: 'Normas Gerais de Circulação e Conduta nas Rodovias Federais',
            slug: 'normas-gerais-circulacao-rodovias',
            description: 'Regras de ultrapassagem, preferência de passagem em cruzamentos e rotatórias, e velocidade regulamentar.',
            orderIndex: 2,
            estimatedDurationMin: 40,
            type: 'text',
            status: 'published',
          }).onConflictDoNothing();

          // Aula 3
          await db.insert(lessons).values({
            moduleId: mod1.id,
            title: 'Crimes de Trânsito: Embriaguez ao Volante e Homicídio Culposo',
            slug: 'crimes-transito-embriaguez-ctb',
            description: 'Artigos 302, 303 e 306 do CTB com aplicação dos entendimentos dos Tribunais Superiores.',
            orderIndex: 3,
            estimatedDurationMin: 50,
            type: 'text',
            status: 'published',
          }).onConflictDoNothing();
        }

        // Módulo 2 (com aula em rascunho para testar segurança)
        const [m2] = await db
          .insert(modules)
          .values({
            courseId: course1.id,
            subjectId: insertedSubjects['legislacao-de-transito'].id,
            title: 'Módulo 2: Resoluções do CONTRAN em Destaque',
            description: 'Normatizações infralegais do Conselho Nacional de Trânsito.',
            orderIndex: 2,
            status: 'published',
          })
          .onConflictDoNothing()
          .returning();

        const mod2 = m2 || (await db.select().from(modules).where(eq(modules.courseId, course1.id)))[1];
        if (mod2) {
          await db.insert(lessons).values({
            moduleId: mod2.id,
            title: 'Resolução CONTRAN nº 918/2022 — Fiscalização Eletrônica de Velocidade (Rascunho)',
            slug: 'resolucao-contran-918-rascunho',
            description: 'Aula em fase de elaboração pela equipe pedagógica. Não deve ser visível ao aluno.',
            orderIndex: 1,
            estimatedDurationMin: 35,
            type: 'text',
            status: 'draft',
          }).onConflictDoNothing();
        }
      }
    }

    // CURSO 2: Constitucional
    let constLesson1Id: string | null = null;
    if (actualPrfContest && insertedSubjects['direito-constitucional']) {
      const [c2] = await db
        .insert(courses)
        .values({
          contestId: actualPrfContest.id,
          subjectId: insertedSubjects['direito-constitucional'].id,
          title: 'Direito Constitucional Aplicado à Atividade Policial (DEMO)',
          slug: 'direito-constitucional-policial-demo',
          description: 'Estudo aprofundado dos direitos individuais e da segurança pública com foco na jurisprudência recente do STF e STJ.',
          thumbnailUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800',
          status: 'published',
          orderIndex: 2,
        })
        .onConflictDoNothing()
        .returning();

      const course2 = c2 || (await db.select().from(courses).where(eq(courses.slug, 'direito-constitucional-policial-demo')))[0];
      if (course2) {
        const [mConst] = await db
          .insert(modules)
          .values({
            courseId: course2.id,
            subjectId: insertedSubjects['direito-constitucional'].id,
            title: 'Módulo 1: Direitos Fundamentais e Restrições na Ação Policial',
            description: 'Artigo 5º da CF/88, inviolabilidade de domicílio, correspondência e comunicações.',
            orderIndex: 1,
            status: 'published',
          })
          .onConflictDoNothing()
          .returning();

        const modConst = mConst || (await db.select().from(modules).where(eq(modules.courseId, course2.id)))[0];
        if (modConst) {
          const [lConst1] = await db
            .insert(lessons)
            .values({
              moduleId: modConst.id,
              title: 'Artigo 5º da CF/88 — Inviolabilidade do Domicílio e Busca Pessoal',
              slug: 'art-5-inviolabilidade-domicilio-policial',
              description: 'Regra geral da inviolabilidade domiciliar, exceções em caso de flagrante delito (Tema 280/STF) e requisitos legais.',
              orderIndex: 1,
              estimatedDurationMin: 40,
              type: 'text',
              status: 'published',
            })
            .onConflictDoNothing()
            .returning();

          const lessonConst = lConst1 || (await db.select().from(lessons).where(eq(lessons.moduleId, modConst.id)))[0];
          if (lessonConst) {
            constLesson1Id = lessonConst.id;
            await db.insert(contents).values({
              lessonId: lessonConst.id,
              type: 'text_markdown',
              body: `# Inviolabilidade do Domicílio na Prática Policial (Art. 5º, XI, CF/88)

A Constituição Federal estabelece que:
> *"a casa é asilo inviolável do indivíduo, ninguém nela podendo penetrar sem consentimento do morador, salvo em caso de flagrante delito ou desastre, ou para prestar socorro, ou, durante o dia, por determinação judicial."*

---

### Exceções Constitucionais
1. **Durante a Noite:**
   - Com consentimento do morador;
   - Flagrante delito;
   - Desastre ou para prestar socorro.
2. **Durante o Dia:**
   - Todas as hipóteses acima;
   - **Determinação judicial** (mandado de busca e apreensão).

---

### Jurisprudência de Referência (STF — Tema 280)
A entrada forçada em domicílio sem mandado judicial só é lícita, mesmo em período noturno, quando amparada em **fundadas razões**, devidamente justificadas *a posteriori*, que indiquem que dentro da casa ocorre situação de flagrante delito, sob pena de responsabilidade disciplinar, civil e penal do agente e de nulidade dos atos praticados.`,
              orderIndex: 1,
            }).onConflictDoNothing();
          }

          await db.insert(lessons).values({
            moduleId: modConst.id,
            title: 'Remédios Constitucionais: Habeas Corpus e Mandado de Segurança',
            slug: 'remedios-constitucionais-hc-ms',
            description: 'Instrumentos de proteção às liberdades fundamentais em matéria penal e processual penal.',
            orderIndex: 2,
            estimatedDurationMin: 35,
            type: 'text',
            status: 'published',
          }).onConflictDoNothing();
        }
      }
    }

    // CURSO 3: PF - Informática
    if (actualPfContest && insertedSubjects['informatica']) {
      const [c3] = await db
        .insert(courses)
        .values({
          contestId: actualPfContest.id,
          subjectId: insertedSubjects['informatica'].id,
          title: 'Informática e Redes de Computadores para a Polícia Federal (DEMO)',
          slug: 'informatica-redes-pf-demo',
          description: 'Conteúdo focado nos 36 tópicos de maior incidência no edital de Agente e Escrivão da Polícia Federal.',
          thumbnailUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=800',
          status: 'published',
          orderIndex: 1,
        })
        .onConflictDoNothing()
        .returning();

      const course3 = c3 || (await db.select().from(courses).where(eq(courses.slug, 'informatica-redes-pf-demo')))[0];
      if (course3) {
        const [mInf] = await db
          .insert(modules)
          .values({
            courseId: course3.id,
            subjectId: insertedSubjects['informatica'].id,
            title: 'Módulo 1: Arquitetura de Redes e Protocolos TCP/IP',
            description: 'Pilha de protocolos, roteamento, endereçamento IPv4/IPv6 e serviços da camada de aplicação.',
            orderIndex: 1,
            status: 'published',
          })
          .onConflictDoNothing()
          .returning();

        const modInf = mInf || (await db.select().from(modules).where(eq(modules.courseId, course3.id)))[0];
        if (modInf) {
          await db.insert(lessons).values([
            {
              moduleId: modInf.id,
              title: 'Modelo TCP/IP e Portas de Rede Essenciais em Perícia',
              slug: 'modelo-tcp-ip-portas-essenciais',
              description: 'Funcionamento do handshake de três vias (SYN, SYN-ACK, ACK), portas DNS (53), HTTP (80), HTTPS (443) e SSH (22).',
              orderIndex: 1,
              estimatedDurationMin: 40,
              type: 'text',
              status: 'published',
            },
            {
              moduleId: modInf.id,
              title: 'Fundamentos de Criptografia Simétrica, Assimétrica e Hashes',
              slug: 'criptografia-hashes-seguranca',
              description: 'Algoritmos AES, RSA, curvas elípticas e funções de hash SHA-256 aplicadas à preservação de cadeia de custódia.',
              orderIndex: 2,
              estimatedDurationMin: 45,
              type: 'text',
              status: 'published',
            },
          ]).onConflictDoNothing();
        }
      }
    }

    // Registra progresso do aluno demo nas primeiras aulas
    if (actualStudentUser) {
      if (prfLesson1Id) {
        await db.insert(userLessonProgress).values({
          userId: actualStudentUser.id,
          lessonId: prfLesson1Id,
          status: 'completed',
          completedAt: new Date(),
        }).onConflictDoNothing();
      }

      if (constLesson1Id) {
        await db.insert(userLessonProgress).values({
          userId: actualStudentUser.id,
          lessonId: constLesson1Id,
          status: 'completed',
          completedAt: new Date(),
        }).onConflictDoNothing();
      }
    }

    // 12. BANCO DE QUESTÕES DEMO (Fase 5)
    console.log('📝 Cadastrando banco de questões demonstrativas e alternativas...');
    const allTopics = await db.select().from(topics);
    const getTopicId = (subjectSlug: string, topicNameSubstring: string) => {
      const sub = insertedSubjects[subjectSlug];
      if (!sub) return null;
      const found = allTopics.find(
        (t: any) => t.subjectId === sub.id && t.name.toLowerCase().includes(topicNameSubstring.toLowerCase())
      );
      return found ? found.id : allTopics.find((t: any) => t.subjectId === sub.id)?.id || null;
    };

    const cebraspeBoard = await db.select().from(examBoards).where(eq(examBoards.acronym, 'Cebraspe'));
    const fgvBoard = await db.select().from(examBoards).where(eq(examBoards.acronym, 'FGV'));
    const cebraspeId = cebraspeBoard[0]?.id;
    const fgvId = fgvBoard[0]?.id || cebraspeId;

    const seedQuestionsData = [
      {
        slugKey: 'prf-ctb-competencias-art20',
        contestId: actualPrfContest?.id,
        subjectId: insertedSubjects['legislacao-de-transito']?.id,
        topicId: getTopicId('legislacao-de-transito', 'Sistema Nacional') || allTopics[0].id,
        boardId: cebraspeId,
        year: 2021,
        difficulty: 'medium',
        format: 'multiple_choice',
        source: 'BANCA_OFICIAL',
        sourceReference: 'Prova PRF 2021 - Policial Rodoviário Federal - Questão 31 (DEMO)',
        statement: `De acordo com o Código de Trânsito Brasileiro (Lei nº 9.503/1997, art. 20), compete privativamente à Polícia Rodoviária Federal, no âmbito das rodovias e estradas federais:`,
        officialExplanation: `Gabarito: B. Conforme o Art. 20, inciso II, do CTB, compete à PRF realizar o patrulhamento ostensivo, executando operações relacionadas com a segurança pública, objetivando a preservação da ordem e do patrimônio público e de terceiros nas rodovias e estradas federais.`,
        tags: ['CTB', 'Artigo 20', 'Competências', 'PRF', 'SNT'],
        status: 'published',
        options: [
          { letter: 'A', text: 'Planejar, projetar, regulamentar e operar o trânsito de veículos em vias municipais.', isCorrect: false },
          { letter: 'B', text: 'Realizar o patrulhamento ostensivo, executando operações relacionadas com a segurança pública, com o objetivo de preservar a ordem, a incolumidade das pessoas, o patrimônio da União e o de terceiros.', isCorrect: true },
          { letter: 'C', text: 'Julgar os recursos interpostos contra decisões da JARI em primeira instância administrativa.', isCorrect: false },
          { letter: 'D', text: 'Expedir a Carteira Nacional de Habilitação (CNH) e fiscalizar autoescolas credenciadas.', isCorrect: false },
          { letter: 'E', text: 'Arrecadar valores provenientes do seguro obrigatório DPVAT e gerir fundos estaduais de saúde.', isCorrect: false },
        ],
      },
      {
        slugKey: 'prf-ctb-crimes-art301',
        contestId: actualPrfContest?.id,
        subjectId: insertedSubjects['legislacao-de-transito']?.id,
        topicId: getTopicId('legislacao-de-transito', 'Crimes de Trânsito') || allTopics[0].id,
        boardId: cebraspeId,
        year: 2021,
        difficulty: 'hard',
        format: 'multiple_choice',
        source: 'BANCA_OFICIAL',
        sourceReference: 'Prova PRF 2021 - Policial Rodoviário Federal - Questão 38 (DEMO)',
        statement: `No que concerne aos crimes de trânsito previstos na Lei nº 9.503/1997 e à jurisprudência pacificada dos Tribunais Superiores, assinale a alternativa correta:`,
        officialExplanation: `Gabarito: B. Nos termos expressos do Art. 301 do CTB: 'Ao condutor de veículo, nos casos de sinistros de trânsito de que resulte vítima, não se imporá a prisão em flagrante, nem se exigirá fiança, se prestar pronto e integral socorro àquela'.`,
        tags: ['Crimes de Trânsito', 'Artigo 301', 'Embriaguez', 'Socorro à Vítima'],
        status: 'published',
        options: [
          { letter: 'A', text: 'O crime de embriaguez ao volante (art. 306 do CTB) é de perigo concreto, exigindo a demonstração inequívoca de condução anormal que cause perigo real a outrem.', isCorrect: false },
          { letter: 'B', text: 'Ao condutor de veículo que prestar pronto e integral socorro à vítima de sinistro de trânsito não se imporá a prisão em flagrante, nem se exigirá fiança.', isCorrect: true },
          { letter: 'C', text: 'A penalidade de suspensão ou de proibição de se obter a permissão ou habilitação para dirigir não pode ser imposta cumulativamente com pena privativa de liberdade.', isCorrect: false },
          { letter: 'D', text: 'O homicídio culposo na direção de veículo automotor admite perdão judicial concedido de ofício pela autoridade policial na lavratura do termo circunstanciado.', isCorrect: false },
          { letter: 'E', text: 'A ausência de habilitação do condutor em qualquer crime de trânsito é sempre tratada como causa extintiva de ilicitude do condutor.', isCorrect: false },
        ],
      },
      {
        slugKey: 'pf-const-inviolabilidade-tema280',
        contestId: actualPfContest?.id,
        subjectId: insertedSubjects['direito-constitucional']?.id,
        topicId: getTopicId('direito-constitucional', 'Direitos e Deveres') || allTopics[0].id,
        boardId: cebraspeId,
        year: 2021,
        difficulty: 'medium',
        format: 'multiple_choice',
        source: 'BANCA_OFICIAL',
        sourceReference: 'Prova PF 2021 - Agente de Polícia Federal - Questão 42 (DEMO)',
        statement: `A respeito da garantia fundamental da inviolabilidade do domicílio consagrada no art. 5º, inciso XI, da Constituição Federal de 1988 e do Tema 280 de Repercussão Geral do STF, é correto afirmar:`,
        officialExplanation: `Gabarito: A. Conforme tese fixada pelo STF no Tema 280: 'A entrada forçada em domicílio sem mandado judicial só é lícita, mesmo em período noturno, quando amparada em fundadas razões, devidamente justificadas a posteriori, que indiquem que dentro da casa ocorre situação de flagrante delito'.`,
        tags: ['Artigo 5º', 'Tema 280 STF', 'Inviolabilidade de Domicílio', 'CF/88'],
        status: 'published',
        options: [
          { letter: 'A', text: 'A entrada forçada em domicílio sem mandado judicial é lícita, mesmo em período noturno, quando amparada em fundadas razões, devidamente justificadas a posteriori, que indiquem situação de flagrante delito.', isCorrect: true },
          { letter: 'B', text: 'A determinação judicial para busca e apreensão domiciliar pode ser cumprida no período noturno, desde que haja autorização expressa do Delegado de Polícia condutor do inquérito.', isCorrect: false },
          { letter: 'C', text: 'O conceito constitucional de casa restringe-se exclusivamente a residências unifamiliares fixas, excluindo quartos de hotel ocupados e escritórios profissionais.', isCorrect: false },
          { letter: 'D', text: 'O consentimento do morador torna dispensável qualquer registro ou justificação da entrada policial, prevalecendo presunção absoluta de veracidade.', isCorrect: false },
          { letter: 'E', text: 'Em caso de desastre ou para prestar socorro, a entrada em domicílio depende de autorização prévia por escrito de vizinhos imediatos.', isCorrect: false },
        ],
      },
      {
        slugKey: 'prf-const-seguranca-publica-art144',
        contestId: actualPrfContest?.id,
        subjectId: insertedSubjects['direito-constitucional']?.id,
        topicId: getTopicId('direito-constitucional', 'Segurança Pública') || allTopics[0].id,
        boardId: cebraspeId,
        year: 2021,
        difficulty: 'easy',
        format: 'multiple_choice',
        source: 'BANCA_OFICIAL',
        sourceReference: 'Prova PRF 2021 - Questão 45 (DEMO)',
        statement: `De acordo com o artigo 144 da Constituição Federal de 1988, a segurança pública é dever do Estado, direito e responsabilidade de todos. Integram o rol constitucional de órgãos de segurança pública:`,
        officialExplanation: `Gabarito: A. O art. 144 da CF elenca como órgãos: Polícia Federal, Polícia Rodoviária Federal, Polícia Ferroviária Federal, Polícias Civis, Polícias Militares, Corpos de Bombeiros Militares e Polícias Penais.`,
        tags: ['Artigo 144', 'Segurança Pública', 'CF/88', 'Polícia Rodoviária Federal'],
        status: 'published',
        options: [
          { letter: 'A', text: 'Polícia Federal, Polícia Rodoviária Federal, Polícias Civis, Polícias Militares, Corpos de Bombeiros Militares e Polícias Penais federal, estaduais e distrital.', isCorrect: true },
          { letter: 'B', text: 'Forças Armadas (Exército, Marinha e Aeronáutica) como órgãos ordinários permanentes de segurança viária urbana.', isCorrect: false },
          { letter: 'C', text: 'Guardas Municipais e Força Nacional de Segurança Pública com competências privativas de polícia judiciária.', isCorrect: false },
          { letter: 'D', text: 'Agência Brasileira de Inteligência (ABIN) e Receita Federal do Brasil como órgãos policiais repressivos.', isCorrect: false },
          { letter: 'E', text: 'Polícias Civis, Guarda Portuária e Corpos de Segurança Privada devidamente credenciados.', isCorrect: false },
        ],
      },
      {
        slugKey: 'pf-info-criptografia-assinatura',
        contestId: actualPfContest?.id,
        subjectId: insertedSubjects['informatica']?.id,
        topicId: getTopicId('informatica', 'Segurança') || allTopics[0].id,
        boardId: cebraspeId,
        year: 2021,
        difficulty: 'hard',
        format: 'multiple_choice',
        source: 'BANCA_OFICIAL',
        sourceReference: 'Prova PF 2021 - Escrivão de Polícia Federal - Questão 52 (DEMO)',
        statement: `No âmbito da segurança da informação e criptografia assimétrica, assinale a alternativa que descreve com exatidão a geração e finalidade de uma assinatura digital:`,
        officialExplanation: `Gabarito: A. A assinatura digital é obtida cifrando o hash do documento com a chave privada do remetente. Qualquer destinatário com a chave pública pode verificar a integridade, autenticidade e o não repúdio.`,
        tags: ['Criptografia Assimétrica', 'Assinatura Digital', 'Hash', 'Segurança da Informação'],
        status: 'published',
        options: [
          { letter: 'A', text: 'A assinatura digital é gerada mediante a encriptação do hash da mensagem com a chave privada do remetente, garantindo autenticidade, integridade e o não repúdio.', isCorrect: true },
          { letter: 'B', text: 'A assinatura digital utiliza chave simétrica secreta única compartilhada para cifrar e decifrar os metadados do documento.', isCorrect: false },
          { letter: 'C', text: 'A chave pública do remetente deve ser mantida em sigilo absoluto pelo emissor para validar o certificado digital.', isCorrect: false },
          { letter: 'D', text: 'O algoritmo SHA-256 é utilizado para restaurar o conteúdo original do arquivo em caso de ataque cibernético.', isCorrect: false },
          { letter: 'E', text: 'A assinatura digital dispensa o uso de funções hash, operando exclusivamente sobre a chave pública do destinatário.', isCorrect: false },
        ],
      },
      {
        slugKey: 'pf-info-redes-protocolos-dns',
        contestId: actualPfContest?.id,
        subjectId: insertedSubjects['informatica']?.id,
        topicId: getTopicId('informatica', 'Redes') || allTopics[0].id,
        boardId: cebraspeId,
        year: 2021,
        difficulty: 'medium',
        format: 'multiple_choice',
        source: 'BANCA_OFICIAL',
        sourceReference: 'Prova PF 2021 - Agente de Polícia Federal - Questão 61 (DEMO)',
        statement: `Na arquitetura de redes TCP/IP, qual protocolo da camada de aplicação é responsável pela resolução e mapeamento de nomes de domínio amigáveis (como gov.br) em endereços IP numéricos?`,
        officialExplanation: `Gabarito: B. O DNS (Domain Name System) mapeia nomes de domínio para endereços IP na camada de aplicação, utilizando tradicionalmente a porta UDP 53.`,
        tags: ['Redes', 'TCP/IP', 'DNS', 'Camada de Aplicação'],
        status: 'published',
        options: [
          { letter: 'A', text: 'DHCP (Dynamic Host Configuration Protocol)', isCorrect: false },
          { letter: 'B', text: 'DNS (Domain Name System)', isCorrect: true },
          { letter: 'C', text: 'SNMP (Simple Network Management Protocol)', isCorrect: false },
          { letter: 'D', text: 'FTP (File Transfer Protocol)', isCorrect: false },
          { letter: 'E', text: 'ICMP (Internet Control Message Protocol)', isCorrect: false },
        ],
      },
      {
        slugKey: 'prf-port-concordancia-verbal',
        contestId: actualPrfContest?.id,
        subjectId: insertedSubjects['lingua-portuguesa']?.id,
        topicId: getTopicId('lingua-portuguesa', 'Concordância') || allTopics[0].id,
        boardId: cebraspeId,
        year: 2021,
        difficulty: 'easy',
        format: 'multiple_choice',
        source: 'BANCA_OFICIAL',
        sourceReference: 'Prova PRF 2021 - Língua Portuguesa - Questão 04 (DEMO)',
        statement: `Assinale a alternativa em que a concordância verbal está em estrita conformidade com a norma-padrão da língua portuguesa:`,
        officialExplanation: `Gabarito: C. O verbo existir possui sujeito ('razões operacionais sólidas'), devendo a locução concordar no plural: 'Devem existir'. 'Haver' com sentido de existir e 'fazer' indicando tempo são impessoais no singular.`,
        tags: ['Gramática', 'Concordância Verbal', 'Língua Portuguesa'],
        status: 'published',
        options: [
          { letter: 'A', text: 'Houveram muitos acidentes graves nas rodovias federais durante o feriado prolongado.', isCorrect: false },
          { letter: 'B', text: 'Fazem dez anos que a fiscalização eletrônica de velocidade foi aprimorada no Brasil.', isCorrect: false },
          { letter: 'C', text: 'Devem existir razões operacionais sólidas para a realização daquela blitz integrada na rodovia.', isCorrect: true },
          { letter: 'D', text: 'Tratam-se de infrações de trânsito gravíssimas com previsão de suspensão do direito de dirigir.', isCorrect: false },
          { letter: 'E', text: 'Mais de um policial se agrediram mutuamente durante o patrulhamento rotineiro.', isCorrect: false },
        ],
      },
      {
        slugKey: 'pf-adm-atos-imperatividade',
        contestId: actualPfContest?.id,
        subjectId: insertedSubjects['direito-administrativo']?.id,
        topicId: getTopicId('direito-administrativo', 'Atos') || allTopics[0].id,
        boardId: fgvId,
        year: 2022,
        difficulty: 'medium',
        format: 'multiple_choice',
        source: 'BANCA_OFICIAL',
        sourceReference: 'Exame FGV 2022 - Direito Administrativo - Questão 18 (DEMO)',
        statement: `O atributo do ato administrativo em virtude do qual o ato se impõe a terceiros independentemente de sua prévia concordância, constituindo unilateralmente obrigações, denomina-se:`,
        officialExplanation: `Gabarito: B. A imperatividade é o atributo pelo qual os atos administrativos se impõem a terceiros independentemente de sua concordância prévia.`,
        tags: ['Atos Administrativos', 'Atributos', 'Imperatividade', 'Direito Administrativo'],
        status: 'published',
        options: [
          { letter: 'A', text: 'Presunção de Legitimidade e Veracidade', isCorrect: false },
          { letter: 'B', text: 'Imperatividade', isCorrect: true },
          { letter: 'C', text: 'Autoexecutoriedade', isCorrect: false },
          { letter: 'D', text: 'Tipicidade', isCorrect: false },
          { letter: 'E', text: 'Motivação', isCorrect: false },
        ],
      },
      {
        slugKey: 'pf-penal-crimes-concussao',
        contestId: actualPfContest?.id,
        subjectId: insertedSubjects['direito-penal']?.id,
        topicId: getTopicId('direito-penal', 'Crimes contra a Administração') || allTopics[0].id,
        boardId: fgvId,
        year: 2022,
        difficulty: 'hard',
        format: 'multiple_choice',
        source: 'BANCA_OFICIAL',
        sourceReference: 'Exame FGV 2022 - Direito Penal - Questão 27 (DEMO)',
        statement: `O funcionário público que exige, para si ou para outrem, direta ou indiretamente, ainda que fora da função ou antes de assumi-la, mas em razão dela, vantagem indevida, pratica o crime de:`,
        officialExplanation: `Gabarito: B. O núcleo 'exigir' é a conduta nuclear do crime de concussão (art. 316 do Código Penal). Na corrupção passiva (art. 317), os verbos são solicitar, receber ou aceitar promessa.`,
        tags: ['Direito Penal', 'Concussão', 'Crimes Funcionais', 'Código Penal'],
        status: 'published',
        options: [
          { letter: 'A', text: 'Corrupção Passiva (art. 317 do CP)', isCorrect: false },
          { letter: 'B', text: 'Concussão (art. 316 do CP)', isCorrect: true },
          { letter: 'C', text: 'Prevaricação (art. 319 do CP)', isCorrect: false },
          { letter: 'D', text: 'Peculato-Apropriação (art. 312 do CP)', isCorrect: false },
          { letter: 'E', text: 'Condescendência Criminosa (art. 320 do CP)', isCorrect: false },
        ],
      },
      {
        slugKey: 'prf-rlm-negacao-condicional',
        contestId: actualPrfContest?.id,
        subjectId: insertedSubjects['raciocinio-logico']?.id,
        topicId: getTopicId('raciocinio-logico', 'Negações') || allTopics[0].id,
        boardId: cebraspeId,
        year: 2021,
        difficulty: 'medium',
        format: 'multiple_choice',
        source: 'BANCA_OFICIAL',
        sourceReference: 'Prova PRF 2021 - Raciocínio Lógico - Questão 12 (DEMO)',
        statement: `Dada a proposição condicional: 'Se o condutor ingerir bebida alcoólica, então ele será multado e terá sua CNH recolhida', assinale a alternativa que expressa a sua negação lógica correta:`,
        officialExplanation: `Gabarito: B. Para negar 'P -> Q', mantém-se a primeira parte E nega-se a segunda (~Q). Como a segunda parte é 'A e B', sua negação é '~A ou ~B' (Leis de De Morgan). Logo: 'P e (~A ou ~B)'.`,
        tags: ['RLM', 'Lógica Proposicional', 'Negação de Condicional', 'De Morgan'],
        status: 'published',
        options: [
          { letter: 'A', text: 'Se o condutor não ingerir bebida alcoólica, então ele não será multado nem terá sua CNH recolhida.', isCorrect: false },
          { letter: 'B', text: 'O condutor ingere bebida alcoólica e não é multado ou não tem sua CNH recolhida.', isCorrect: true },
          { letter: 'C', text: 'O condutor não ingere bebida alcoólica ou é multado e tem sua CNH recolhida.', isCorrect: false },
          { letter: 'D', text: 'Se o condutor for multado, então ele ingeriu bebida alcoólica.', isCorrect: false },
          { letter: 'E', text: 'O condutor não ingere bebida alcoólica e não é multado.', isCorrect: false },
        ],
      },
      {
        slugKey: 'pf-port-crase-norma',
        contestId: actualPfContest?.id,
        subjectId: insertedSubjects['lingua-portuguesa']?.id,
        topicId: getTopicId('lingua-portuguesa', 'Regência') || allTopics[0].id,
        boardId: fgvId,
        year: 2022,
        difficulty: 'easy',
        format: 'multiple_choice',
        source: 'BANCA_OFICIAL',
        sourceReference: 'Exame FGV 2022 - Língua Portuguesa - Questão 09 (DEMO)',
        statement: `O acento grave indicativo de crase está empregado em estrita consonância com a norma-padrão da língua portuguesa em:`,
        officialExplanation: `Gabarito: B. O verbo 'dirigir-se' rege preposição 'a' e 'cena' é substantivo feminino antecedido de artigo definido 'a' (a + a = à). Não ocorre crase antes de pronomes indefinidos, verbos ou artigos indefinidos.`,
        tags: ['Língua Portuguesa', 'Crase', 'Regência Verbal'],
        status: 'published',
        options: [
          { letter: 'A', text: 'O delegado de polícia solicitou apoio imediato à todos os peritos da unidade.', isCorrect: false },
          { letter: 'B', text: 'A equipe de perícia dirigiu-se à cena do crime logo nas primeiras horas da manhã.', isCorrect: true },
          { letter: 'C', text: 'Os agentes de polícia começaram à analisar os discos rígidos apreendidos.', isCorrect: false },
          { letter: 'D', text: 'O escrivão entregou os autos do inquérito à um perito criminal de plantão.', isCorrect: false },
          { letter: 'E', text: 'Os policiais federais estavam dispostos à colaborar com a corregedoria.', isCorrect: false },
        ],
      },
      {
        slugKey: 'prf-ctb-fiscalizacao-rascunho-admin',
        contestId: actualPrfContest?.id,
        subjectId: insertedSubjects['legislacao-de-transito']?.id,
        topicId: getTopicId('legislacao-de-transito', 'Normas Gerais') || allTopics[0].id,
        boardId: cebraspeId,
        year: 2026,
        difficulty: 'hard',
        format: 'multiple_choice',
        source: 'DEMO',
        sourceReference: 'Elaboração Pedagógica Interna APROVA - Questão Inédita (Rascunho)',
        statement: `[QUESTÃO EM ELABORAÇÃO - RASCUNHO INTERNO] A respeito da fiscalização do tempo de direção e descanso de motoristas profissionais em rodovias federais conforme a Lei nº 13.103/2015, assinale a opção correta:`,
        officialExplanation: `Gabarito: C. É dever do motorista profissional controlar e registrar o tempo de direção por meio do registrador instantâneo inalterável de velocidade e tempo (tacógrafo).`,
        tags: ['Rascunho', 'Teste RBAC', 'Lei 13103', 'Descanso Profissional'],
        status: 'draft', // RASCUNHO: Apenas ADMIN pode visualizar!
        options: [
          { letter: 'A', text: 'O motorista profissional é isento de controle de jornada caso conduza em rodovias concessionadas.', isCorrect: false },
          { letter: 'B', text: 'O descanso mínimo obrigatório pode ser substituído por pagamento de hora extra compensatória.', isCorrect: false },
          { letter: 'C', text: 'É obrigatório o controle fidedigno do tempo de direção e do período de descanso através do registrador instantâneo e inalterável de velocidade e tempo (tacógrafo) ou ficha de trabalho.', isCorrect: true },
          { letter: 'D', text: 'A fiscalização da jornada de trabalho em rodovias federais cabe exclusivamente à Justiça do Trabalho.', isCorrect: false },
          { letter: 'E', text: 'A PRF não tem atribuição legal para fiscalizar discos de tacógrafo em veículos de carga.', isCorrect: false },
        ],
      },
    ];

    const insertedQuestions: any[] = [];
    for (const qData of seedQuestionsData) {
      let quest = (
        await db
          .select()
          .from(questions)
          .where(eq(questions.sourceReference, qData.sourceReference))
          .limit(1)
      )[0];

      if (!quest) {
        const [q] = await db
          .insert(questions)
          .values({
            contestId: qData.contestId,
            subjectId: qData.subjectId,
            topicId: qData.topicId,
            boardId: qData.boardId,
            year: qData.year,
            difficulty: qData.difficulty,
            format: qData.format,
            statement: qData.statement,
            officialExplanation: qData.officialExplanation,
            source: qData.source,
            sourceReference: qData.sourceReference,
            tags: qData.tags,
            status: qData.status,
            createdBy: actualAdminUser?.id,
            updatedBy: actualAdminUser?.id,
          })
          .returning();
        quest = q;

        if (quest) {
          // Insere alternativas
          for (let i = 0; i < qData.options.length; i++) {
            const opt = qData.options[i];
            await db.insert(questionOptions).values({
              questionId: quest.id,
              letter: opt.letter,
              text: opt.text,
              isCorrect: opt.isCorrect,
              orderIndex: i + 1,
            });
          }
        }
      }

      if (quest) {
        insertedQuestions.push(quest);
      }
    }

    // 13. Tentativas Reais Iniciais do Aluno Demo
    if (actualStudentUser && insertedQuestions.length > 0) {
      console.log('🎯 Registrando tentativas e favoritos do aluno demo...');
      // Tentativa 1: Questão 1 (Acerto)
      const q1 = insertedQuestions[0];
      if (q1) {
        const q1Opts = await db.select().from(questionOptions).where(eq(questionOptions.questionId, q1.id));
        const correctOpt = q1Opts.find((o: any) => o.isCorrect);
        if (correctOpt) {
          await db
            .insert(questionAttempts)
            .values({
              userId: actualStudentUser.id,
              questionId: q1.id,
              selectedOptionId: correctOpt.id,
              isCorrect: true,
              durationSeconds: 45,
              source: 'direct_practice',
            })
            .onConflictDoNothing();

          // Favorita a questão 1
          await db
            .insert(questionFavorites)
            .values({
              userId: actualStudentUser.id,
              questionId: q1.id,
            })
            .onConflictDoNothing();
        }
      }

      // Tentativa 2: Questão 2 (Erro para alimentar o caderno de erros / revisão)
      const q2 = insertedQuestions[1];
      if (q2) {
        const q2Opts = await db.select().from(questionOptions).where(eq(questionOptions.questionId, q2.id));
        const wrongOpt = q2Opts.find((o: any) => !o.isCorrect);
        if (wrongOpt) {
          await db
            .insert(questionAttempts)
            .values({
              userId: actualStudentUser.id,
              questionId: q2.id,
              selectedOptionId: wrongOpt.id,
              isCorrect: false,
              durationSeconds: 78,
              source: 'direct_practice',
            })
            .onConflictDoNothing();

          // Marca a questão 2 para revisão
          await db
            .insert(questionReviewFlags)
            .values({
              userId: actualStudentUser.id,
              questionId: q2.id,
              status: 'pending',
            })
            .onConflictDoNothing();
        }
      }

      // Tentativa 3: Questão 3 (Acerto)
      const q3 = insertedQuestions[2];
      if (q3) {
        const q3Opts = await db.select().from(questionOptions).where(eq(questionOptions.questionId, q3.id));
        const correctOpt = q3Opts.find((o: any) => o.isCorrect);
        if (correctOpt) {
          await db
            .insert(questionAttempts)
            .values({
              userId: actualStudentUser.id,
              questionId: q3.id,
              selectedOptionId: correctOpt.id,
              isCorrect: true,
              durationSeconds: 52,
              source: 'direct_practice',
            })
            .onConflictDoNothing();
        }
      }

      // Tentativa 4: Questão 4 (Acerto)
      const q4 = insertedQuestions[3];
      if (q4) {
        const q4Opts = await db.select().from(questionOptions).where(eq(questionOptions.questionId, q4.id));
        const correctOpt = q4Opts.find((o: any) => o.isCorrect);
        if (correctOpt) {
          await db
            .insert(questionAttempts)
            .values({
              userId: actualStudentUser.id,
              questionId: q4.id,
              selectedOptionId: correctOpt.id,
              isCorrect: true,
              durationSeconds: 30,
              source: 'direct_practice',
            })
            .onConflictDoNothing();
        }
      }
    }

    // 14. SIMULADOS DEMONSTRATIVOS E MODO EXAME (Fase 6)
    console.log('📝 Cadastrando simulados demonstrativos e tentativas (Fase 6)...');
    if (actualPrfContest && insertedQuestions.length > 0) {
      // Simulado 1: Fixo - PRF Treinamento Completo
      const [sim1] = await db
        .insert(simulations)
        .values({
          contestId: actualPrfContest.id,
          title: 'Simulado Geral PRF — Treinamento Intensivo (DEMO)',
          description: 'Simulado completo cobrindo Trânsito, Constitucional, Administrativo e Português com régua de penalidade Cebraspe.',
          type: 'FIXED',
          durationMinutes: 45,
          penaltyRule: 'one_error_cancels_one_correct',
          penaltyFactor: '1.00',
          totalQuestions: Math.min(insertedQuestions.length, 8),
          difficulty: 'MEDIO',
          status: 'published',
          isOfficial: true,
          isPublic: true,
          createdBy: actualAdminUser?.id,
          publishedAt: new Date(),
        })
        .onConflictDoNothing()
        .returning();

      const createdSim1 = sim1 || (await db.select().from(simulations).where(eq(simulations.title, 'Simulado Geral PRF — Treinamento Intensivo (DEMO)')))[0];

      if (createdSim1) {
        // Vincula as primeiras questões ao simulado fixo
        const questionsToLink = insertedQuestions.slice(0, 8);
        for (let idx = 0; idx < questionsToLink.length; idx++) {
          await db
            .insert(simulationQuestions)
            .values({
              simulationId: createdSim1.id,
              questionId: questionsToLink[idx].id,
              orderIndex: idx + 1,
              points: '1.00',
            })
            .onConflictDoNothing();
        }

        // Cria uma tentativa finalizada para o aluno demo (para alimentar métricas, histórico e evolução)
        if (actualStudentUser) {
          const attemptStarted = new Date(Date.now() - 48 * 60 * 60 * 1000); // 2 dias atrás
          const attemptFinished = new Date(attemptStarted.getTime() + 35 * 60 * 1000); // 35 min de prova

          const [att1] = await db
            .insert(simulationAttempts)
            .values({
              simulationId: createdSim1.id,
              userId: actualStudentUser.id,
              status: 'COMPLETED',
              startedAt: attemptStarted,
              finishedAt: attemptFinished,
              submittedAt: attemptFinished,
              totalDurationSeconds: 35 * 60,
              totalScore: '5.00',
              correctCount: 6,
              wrongCount: 1,
              blankCount: 1,
              percentage: '75.00',
              markedQuestions: [questionsToLink[1]?.id || ''],
              subjectBreakdown: [
                { subjectName: 'Legislação de Trânsito', total: 4, correct: 3, wrong: 1, blank: 0, percentage: 75 },
                { subjectName: 'Direito Constitucional', total: 2, correct: 2, wrong: 0, blank: 0, percentage: 100 },
                { subjectName: 'Língua Portuguesa', total: 2, correct: 1, wrong: 0, blank: 1, percentage: 50 },
              ],
              topicBreakdown: [
                { topicName: 'Sistema Nacional de Trânsito', isStrength: true, correct: 2, total: 2 },
                { topicName: 'Direitos e Garantias Fundamentais', isStrength: true, correct: 2, total: 2 },
                { topicName: 'Infrações e Penalidades', isStrength: false, correct: 1, total: 2 },
              ],
              difficultyBreakdown: {
                facil: { total: 2, correct: 2, percentage: 100 },
                medio: { total: 5, correct: 4, percentage: 80 },
                dificil: { total: 1, correct: 0, percentage: 0 },
              },
            })
            .onConflictDoNothing()
            .returning();

          const createdAtt1 = att1 || (await db.select().from(simulationAttempts).where(eq(simulationAttempts.simulationId, createdSim1.id)))[0];

          if (createdAtt1) {
            // Insere respostas da tentativa 1
            for (let i = 0; i < questionsToLink.length; i++) {
              const q = questionsToLink[i];
              const qOpts = await db.select().from(questionOptions).where(eq(questionOptions.questionId, q.id));
              const correctOpt = qOpts.find((o: any) => o.isCorrect);
              const wrongOpt = qOpts.find((o: any) => !o.isCorrect);

              if (i === 7) {
                // Deixa em branco a última questão
                continue;
              }

              const isCorrect = i !== 1; // errou a questão 1 (segunda questão)
              const selectedOpt = isCorrect ? correctOpt : wrongOpt;

              await db
                .insert(simulationAnswers)
                .values({
                  simulationAttemptId: createdAtt1.id,
                  questionId: q.id,
                  selectedOptionId: selectedOpt?.id,
                  isCorrect,
                  answeredAt: new Date(attemptStarted.getTime() + (i + 1) * 4 * 60 * 1000),
                  timeSpentSeconds: 240,
                })
                .onConflictDoNothing();
            }
          }
        }
      }

      // Simulado 2: Aleatório - PF Informática e Legislação
      if (actualPfContest) {
        await db
          .insert(simulations)
          .values({
            contestId: actualPfContest.id,
            title: 'Simulado Aleatório PF — Informática & Direito (DEMO)',
            description: 'Gerado automaticamente pelo sistema balanceando Informática e Direito.',
            type: 'RANDOM',
            durationMinutes: 30,
            penaltyRule: 'none',
            penaltyFactor: '1.00',
            totalQuestions: 6,
            difficulty: 'MEDIO',
            status: 'published',
            isOfficial: true,
            isPublic: true,
            createdBy: actualAdminUser?.id,
            publishedAt: new Date(),
            filterConfig: {
              contestId: actualPfContest.id,
              count: 6,
              difficulty: 'MEDIO',
            },
          })
          .onConflictDoNothing();
      }

      // Simulado 3: Fixo - PRF Rápido (Com tentativa IN_PROGRESS para testar "Continuar Simulado")
      const [sim3] = await db
        .insert(simulations)
        .values({
          contestId: actualPrfContest.id,
          title: 'Simulado Expresso PRF — Legislação CTB (DEMO)',
          description: 'Treino rápido de 20 minutos focado exclusivamente no Código de Trânsito Brasileiro.',
          type: 'FIXED',
          durationMinutes: 20,
          penaltyRule: 'one_error_cancels_one_correct',
          penaltyFactor: '1.00',
          totalQuestions: 4,
          difficulty: 'FACIL',
          status: 'published',
          isOfficial: false,
          isPublic: true,
          createdBy: actualAdminUser?.id,
          publishedAt: new Date(),
        })
        .onConflictDoNothing()
        .returning();

      const createdSim3 = sim3 || (await db.select().from(simulations).where(eq(simulations.title, 'Simulado Expresso PRF — Legislação CTB (DEMO)')))[0];

      if (createdSim3 && actualStudentUser) {
        const questionsToLink3 = insertedQuestions.slice(0, 4);
        for (let idx = 0; idx < questionsToLink3.length; idx++) {
          await db
            .insert(simulationQuestions)
            .values({
              simulationId: createdSim3.id,
              questionId: questionsToLink3[idx].id,
              orderIndex: idx + 1,
              points: '1.00',
            })
            .onConflictDoNothing();
        }

        // Cria tentativa IN_PROGRESS iniciada há 5 minutos
        const [attInProgress] = await db
          .insert(simulationAttempts)
          .values({
            simulationId: createdSim3.id,
            userId: actualStudentUser.id,
            status: 'IN_PROGRESS',
            startedAt: new Date(Date.now() - 5 * 60 * 1000), // iniciou há 5 min
            markedQuestions: [questionsToLink3[0]?.id || ''],
          })
          .onConflictDoNothing()
          .returning();

        const createdAttInProg = attInProgress || (await db.select().from(simulationAttempts).where(eq(simulationAttempts.simulationId, createdSim3.id)))[0];

        if (createdAttInProg && questionsToLink3[0]) {
          const q0Opts = await db.select().from(questionOptions).where(eq(questionOptions.questionId, questionsToLink3[0].id));
          await db
            .insert(simulationAnswers)
            .values({
              simulationAttemptId: createdAttInProg.id,
              questionId: questionsToLink3[0].id,
              selectedOptionId: q0Opts[0]?.id,
              answeredAt: new Date(),
              timeSpentSeconds: 65,
            })
            .onConflictDoNothing();
        }
      }
    }

    // 15. Configurações da Plataforma
    console.log('⚙️ Gravando configurações globais...');
    await db
      .insert(settings)
      .values({
        key: 'platform.config',
        value: {
          platformName: 'APROVA',
          privateAccess: true,
          invitationExpirationDays: 7,
          allowPublicRegistration: false,
        },
        description: 'Configurações de governança e segurança da plataforma.',
      })
      .onConflictDoNothing();

    // 12. Fontes de Notícias
    console.log('📰 Registrando fontes oficiais de notícias...');
    const officialSources = [
      {
        name: 'Diário Oficial da União (DOU)',
        websiteUrl: 'https://www.in.gov.br',
        url: 'https://www.in.gov.br',
        description: 'Publicações de atos normativos, editais e nomeações do Governo Federal.',
        sourceType: 'OFFICIAL' as const,
        trustLevel: 'HIGH' as const,
        isOfficial: true,
        isActive: true,
      },
      {
        name: 'Portal Oficial da PRF',
        websiteUrl: 'https://www.gov.br/prf',
        url: 'https://www.gov.br/prf',
        description: 'Canal oficial institucional da Polícia Rodoviária Federal.',
        sourceType: 'OFFICIAL' as const,
        trustLevel: 'HIGH' as const,
        isOfficial: true,
        isActive: true,
      },
      {
        name: 'Portal Oficial da PF',
        websiteUrl: 'https://www.gov.br/pf',
        url: 'https://www.gov.br/pf',
        description: 'Canal oficial institucional da Polícia Federal.',
        sourceType: 'OFFICIAL' as const,
        trustLevel: 'HIGH' as const,
        isOfficial: true,
        isActive: true,
      },
      {
        name: 'Página Oficial Cebraspe',
        websiteUrl: 'https://www.cebraspe.org.br',
        url: 'https://www.cebraspe.org.br',
        description: 'Banca examinadora organizadora de certames federais.',
        sourceType: 'OFFICIAL' as const,
        trustLevel: 'HIGH' as const,
        isOfficial: true,
        isActive: true,
      },
      {
        name: 'Folha Dirigida News',
        websiteUrl: 'https://folhadirigida.uol.com.br',
        url: 'https://folhadirigida.uol.com.br',
        description: 'Portal de notícias especializado em concursos públicos.',
        sourceType: 'NEWS' as const,
        trustLevel: 'MEDIUM' as const,
        isOfficial: false,
        isActive: true,
      },
    ];
    for (const src of officialSources) {
      await db.insert(newsSources).values(src).onConflictDoNothing();
    }
    // 16. Plano de Estudos Demonstrativo (Fase 7)
    console.log('📅 Criando plano de estudos demonstrativo para o aluno demo...');
    if (actualStudentUser && actualPrfContest) {
      const existingPlan = await db
        .select()
        .from(studyPlans)
        .where(eq(studyPlans.userId, actualStudentUser.id))
        .limit(1);

      if (existingPlan.length === 0) {
        const today = new Date();
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 90);

        const prfSubjectsList = [
          { slug: 'legislacao-de-transito', priority: 'CRITICAL' as const, weight: 3.0 },
          { slug: 'lingua-portuguesa', priority: 'HIGH' as const, weight: 2.0 },
          { slug: 'direito-constitucional', priority: 'HIGH' as const, weight: 1.5 },
          { slug: 'direito-administrativo', priority: 'MEDIUM' as const, weight: 1.5 },
          { slug: 'direito-penal', priority: 'MEDIUM' as const, weight: 1.5 },
          { slug: 'raciocinio-logico', priority: 'MEDIUM' as const, weight: 1.0 },
          { slug: 'informatica', priority: 'LOW' as const, weight: 1.0 },
        ];

        const planSubjectsToCreate = prfSubjectsList
          .map((item) => {
            const sub = insertedSubjects[item.slug];
            if (!sub) return null;
            return {
              subjectId: sub.id,
              priority: item.priority,
              weight: item.weight,
              targetPercentage: 100,
            };
          })
          .filter(Boolean) as any[];

        const demoAvailabilities = [
          { dayOfWeek: 0, startTime: '08:00', endTime: '10:00', availableMinutes: 120, enabled: true },
          { dayOfWeek: 1, startTime: '19:00', endTime: '21:30', availableMinutes: 150, enabled: true },
          { dayOfWeek: 2, startTime: '19:00', endTime: '21:30', availableMinutes: 150, enabled: true },
          { dayOfWeek: 3, startTime: '19:00', endTime: '21:30', availableMinutes: 150, enabled: true },
          { dayOfWeek: 4, startTime: '19:00', endTime: '21:30', availableMinutes: 150, enabled: true },
          { dayOfWeek: 5, startTime: '19:00', endTime: '21:30', availableMinutes: 150, enabled: true },
          { dayOfWeek: 6, startTime: '08:00', endTime: '12:00', availableMinutes: 240, enabled: true },
        ];

        const createdPlan = await StudyPlanService.createPlan(actualStudentUser.id, {
          contestId: actualPrfContest.id,
          name: 'Plano Tático PRF 2026 — Reta Final',
          description: 'Planejamento adaptativo com equilíbrio entre teoria, legislação, questões e simulados aos sábados.',
          startDate: today.toISOString().split('T')[0],
          targetDate: targetDate.toISOString().split('T')[0],
          weeklyHours: 16,
          dailyMinutes: 150,
          strategy: 'BALANCED',
          availabilities: demoAvailabilities,
          preferences: {
            minSessionMinutes: 30,
            maxSessionMinutes: 75,
            breakMinutes: 10,
            defaultQuestionsPerSession: 20,
            revisionFrequency: 'INTERLEAVED',
            prioritizeWeakSubjects: true,
            prioritizeBehindSchedule: true,
            balancedDistribution: true,
          },
          subjects: planSubjectsToCreate,
        });

        // Ativa o plano e gera as sessões no horizonte configurado
        await StudyPlanService.activatePlan(createdPlan.id, actualStudentUser.id);
        console.log('✅ Plano de estudos demonstrativo gerado com sucesso!');
      } else {
        const [plan] = existingPlan;
        const sessions = await db
          .select()
          .from(studyPlanSessions)
          .where(eq(studyPlanSessions.studyPlanId, plan.id))
          .limit(1);
        if (sessions.length === 0) {
          await StudyPlanService.activatePlan(plan.id, actualStudentUser.id);
          console.log('✅ Sessões geradas para o plano existente!');
        }
      }
    }

    // 17. Redação Discursiva, Critérios, Temas e Histórico (Fase 8)
    console.log('✍️ Cadastrando critérios, temas e redações demonstrativas (Fase 8)...');

    // Critérios para PRF
    const prfCriteriaData = [
      {
        name: 'Apresentação e Estrutura Textual',
        description: 'Legibilidade, respeito às margens, paragrafação e estrutura dissertativo-argumentativa clássica.',
        maxScore: '20.00',
        weight: '1.00',
        ordering: 1,
      },
      {
        name: 'Desenvolvimento do Tema e Fundamentação',
        description: 'Capacidade argumentativa, profundidade, pertinência legal e resposta completa aos tópicos da banca.',
        maxScore: '50.00',
        weight: '1.00',
        ordering: 2,
      },
      {
        name: 'Domínio da Modalidade Escrita / Gramática',
        description: 'Concordância, regência, crase, pontuação, propriedade vocabular e ortografia oficial.',
        maxScore: '30.00',
        weight: '1.00',
        ordering: 3,
      },
    ];

    const insertedCriteria = [];
    for (const c of prfCriteriaData) {
      const [crit] = await db
        .insert(essayCriteria)
        .values({
          contestId: actualPrfContest?.id || null,
          name: c.name,
          description: c.description,
          maxScore: c.maxScore,
          weight: c.weight,
          ordering: c.ordering,
          active: true,
        })
        .returning();
      if (crit) insertedCriteria.push(crit);
    }

    // Critérios para PF
    if (actualPfContest) {
      for (const c of prfCriteriaData) {
        await db
          .insert(essayCriteria)
          .values({
            contestId: actualPfContest.id,
            name: c.name,
            description: c.description,
            maxScore: c.maxScore,
            weight: c.weight,
            ordering: c.ordering,
            active: true,
          })
          .returning();
      }
    }

    // Temas de Redação
    const [prompt1] = await db
      .insert(essayPrompts)
      .values({
        contestId: actualPrfContest?.id || null,
        title: 'O combate ao crime organizado e a integração das forças federais de segurança',
        category: 'Segurança Pública',
        themeArea: 'Segurança Pública',
        statement:
          'Considerando que a segurança pública é dever do Estado, direito e responsabilidade de todos (CF/88, art. 144), redija um texto dissertativo-argumentativo abordando, necessariamente, os seguintes aspectos:\n\n1. O papel da integração entre a PRF e a PF na repressão ao narcotráfico e ao contrabando em rotas logísticas federais;\n2. A importância da inteligência e do compartilhamento de dados no enfrentamento de facções criminosas;\n3. Os desafios da fiscalização de fronteiras e rodovias como garantia da soberania e dos direitos fundamentais da sociedade.',
        instructions: [
          'Redija texto dissertativo-argumentativo em norma-padrão da língua portuguesa.',
          'Aborde necessariamente os três aspectos propostos.',
          'Mínimo de 20 e máximo de 30 linhas (150 a 350 palavras).',
          'Não assine nem faça qualquer sinal que possa identificar sua prova.',
        ],
        context:
          '### TEXTO I\n\nA integração entre órgãos de segurança pública tem se consolidado como a estratégia mais eficaz para sufocar a logística e o financiamento do crime organizado no território nacional. Relatórios do Ministério da Justiça apontam apreensões recordes nas rodovias federais operadas pela Polícia Rodoviária Federal em cooperação tática com a Polícia Federal.\n\n### TEXTO II\n\n*Art. 144 da Constituição Federal de 1988:*\n"A segurança pública, dever do Estado, direito e responsabilidade de todos, é exercida para a preservação da ordem pública e da incolumidade das pessoas e do patrimônio..."\n\n### TEXTO III\n\nA tecnologia de ponta, como leitura óptica de placas (OCR), monitoramento por drones e sistemas integrados de inteligência biométrica, transformou a fiscalização rodoviária em um cinturão de segurança multifronteiriço.',
        source: 'Banca APROVA / Adaptado de concursos federais Cespe/Cebraspe',
        difficulty: 'MEDIUM',
        estimatedMinutes: 60,
        minWords: 150,
        maxWords: 350,
        minLines: 20,
        maxLines: 30,
        status: 'PUBLISHED',
      })
      .returning();

    const [prompt2] = await db
      .insert(essayPrompts)
      .values({
        contestId: actualPrfContest?.id || null,
        title: 'A proteção aos direitos humanos nas operações policiais e o uso diferenciado da força',
        category: 'Direitos Humanos',
        themeArea: 'Direitos Humanos',
        statement:
          'Redija um texto dissertativo-argumentativo analisando a harmonização entre a eficácia operacional das forças policiais e o respeito incondicional aos direitos humanos, contemplando:\n\n1. O princípio da legalidade, necessidade e proporcionalidade no uso diferenciado da força;\n2. O papel do treinamento contínuo e das tecnologias não letais na preservação de vidas;\n3. O impacto da transparência institucional na confiança da sociedade nas instituições policiais.',
        instructions: [
          'Texto dissertativo-argumentativo fundamentado na CF/88 e tratados internacionais.',
          'Extensão entre 20 e 30 linhas (150 a 350 palavras).',
        ],
        context:
          '### TEXTO I\n\nOs Princípios Básicos sobre a Utilização da Força e de Armas de Fogo pelos Funcionários Responsáveis pela Aplicação da Lei (ONU) estabelecem que os agentes da lei devem aplicar métodos não violentos antes de recorrer ao emprego da força e de armas de fogo.\n\n### TEXTO II\n\nA legitimidade da autoridade policial reside no estrito cumprimento da lei e na salvaguarda dos direitos fundamentais de todos os cidadãos, independentemente da circunstância.',
        source: 'Banca APROVA / Simulado Nacional',
        difficulty: 'HARD',
        estimatedMinutes: 60,
        minWords: 150,
        maxWords: 350,
        minLines: 20,
        maxLines: 30,
        status: 'PUBLISHED',
      })
      .returning();

    await db
      .insert(essayPrompts)
      .values({
        contestId: actualPfContest?.id || null,
        title: 'Inteligência artificial, cibersegurança e o combate aos crimes cibernéticos no Brasil',
        category: 'Tecnologia',
        themeArea: 'Tecnologia',
        statement:
          'Discorra sobre o avanço exponencial dos crimes no ambiente digital e a atuação das polícias judiciárias federais no enfrentamento desse fenômeno, abordando:\n\n1. As principais modalidades de crimes cibernéticos (fraudes financeiras, invasões de dados e extorsão);\n2. O papel da inteligência artificial defensiva na perícia computacional forense;\n3. A cooperação jurídica e policial internacional diante da transnacionalidade da cibercriminalidade.',
        instructions: [
          'Redija texto dissertativo em norma culta.',
          'Aborde todos os pontos de forma clara e objetiva.',
          'Extensão recomendada: 25 a 30 linhas.',
        ],
        context:
          '### TEXTO I\n\nO Brasil figura entre os países mais atacados por ransomwares e fraudes bancárias eletrônicas no mundo. A sofisticação dos ataques demanda investimentos contínuos em perícia computacional e agentes especializados em cibersegurança pela Polícia Federal.',
        source: 'Banca APROVA / Adaptado PF 2026',
        difficulty: 'MEDIUM',
        estimatedMinutes: 60,
        minWords: 150,
        maxWords: 350,
        minLines: 20,
        maxLines: 30,
        status: 'PUBLISHED',
      });

    await db
      .insert(essayPrompts)
      .values({
        contestId: actualPfContest?.id || null,
        title: 'Preservação da Amazônia Legal e a repressão aos crimes ambientais federais',
        category: 'Meio Ambiente',
        themeArea: 'Meio Ambiente',
        statement:
          'Redija uma dissertação sobre a repressão aos ilícitos ambientais e o papel das forças federais na garantia do desenvolvimento sustentável, abordando:\n\n1. O impacto do desmatamento ilegal e do garimpo clandestino na sociobiodiversidade;\n2. A atuação coordenada entre PF, Ibama, ICMBio e forças armadas na Amazônia;\n3. Medidas de asfixia financeira e rastreabilidade patrimonial dos mandantes de crimes ambientais.',
        instructions: [
          'Estruture o texto em introdução, desenvolvimento fundamentado e conclusão.',
          'Mínimo de 20 e máximo de 30 linhas.',
        ],
        context:
          '### TEXTO I\n\nA Constituição de 1988 confere à Amazônia Brasileira o status de Patrimônio Nacional (art. 225, § 4º). A investigação financeira contra organizações criminosas que exploram recursos naturais é hoje a frente mais relevante de atuação da Polícia Federal.',
        source: 'Banca APROVA',
        difficulty: 'EASY',
        estimatedMinutes: 60,
        minWords: 150,
        maxWords: 350,
        minLines: 20,
        maxLines: 30,
        status: 'PUBLISHED',
      })
      .returning();

    // Redação submetida e corrigida para o aluno demo no prompt 1
    if (actualStudentUser && prompt1) {
      const demoEssayContent = `A segurança pública constitui um dos pilares mais sensíveis do Estado Democrático de Direito brasileiro, sendo categorizada pelo artigo 144 da Carta Magna como dever do Estado, direito e responsabilidade de todos. Nesse contexto, a complexidade contemporânea das organizações criminosas exige que as forças federais de segurança pública, precipuamente a Polícia Federal (PF) e a Polícia Rodoviária Federal (PRF), atuem de forma estritamente integrada e sinérgica para neutralizar as rotas do ilícito e descapitalizar facções.

Em primeiro plano, a cooperação operacional entre a PRF e a PF tem demonstrado eficácia ímpar na interdição dos corredores logísticos rodoviários. Enquanto a Polícia Federal aprofunda investigações estruturadas e investigações de inteligência cibernética e financeira, a PRF aplica presença ostensiva de alta densidade técnica em rodovias estratégicas. Essa conjugação garante que flagrantes de entorpecentes e armamentos pesados não sejam meros eventos isolados, mas sim desdobramentos de investigações ministeriais de alcance nacional.

Ademais, o compartilhamento célere de dados e tecnologias de monitoramento — como leituras ópticas de placas e bancos biométricos unificados — é indispensável para antecipar ações de grupos que operam além dos limites estaduais. A inteligência preditiva impede a pulverização de recursos humanos e focaliza a repressão nos líderes e operadores financeiros do tráfico transnacional.

Infere-se, portanto, que a integração das forças federais não apenas otimiza o gasto público, mas fortalece a soberania nacional e a salvaguarda dos direitos fundamentais dos cidadãos que transitam pelas malhas viárias do país.`;

      const [demoEssay] = await db
        .insert(essays)
        .values({
          userId: actualStudentUser.id,
          promptId: prompt1.id,
          contestId: actualPrfContest?.id || prompt1.contestId,
          title: 'A Integração das Forças Federais como Vetor Estratégico de Segurança',
          content: demoEssayContent,
          wordCount: 238,
          characterCount: 1684,
          lineCount: 25,
          linesCount: 25,
          status: 'CORRECTED',
          startedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
          lastSavedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000 + 45 * 60 * 1000),
          submittedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000 + 50 * 60 * 1000),
        })
        .returning();

      if (demoEssay) {
        await db.insert(essayVersions).values({
          essayId: demoEssay.id,
          content: demoEssayContent,
          wordCount: 238,
          characterCount: 1684,
        });

        // Correção formal
        const [demoCorrection] = await db
          .insert(essayCorrections)
          .values({
            essayId: demoEssay.id,
            correctionType: 'MANUAL',
            totalScore: '88.00',
            maxScore: '100.00',
            percentage: '88.00',
            overallScore: '88.00',
            maxPossibleScore: '100.00',
            generalFeedback:
              'Excelente texto dissertativo-argumentativo! A redação demonstra profundo domínio do tema e articulação impecável com o texto constitucional (Art. 144). Os parágrafos de desenvolvimento foram muito bem fundamentados, diferenciando com precisão o papel ostensivo da PRF e investigativo da PF. Pontuação e concordância em altíssimo nível.',
            strengths:
              '1. Fundamentação legal precisa (CF/88, art. 144).\n2. Estrutura textual com introdução, dois desenvolvimentos articulados e conclusão sintética.\n3. Vocabulário formal e adequado à carreira policial federal.',
            weaknesses:
              '1. No terceiro parágrafo, poderia ter detalhado um exemplo concreto de tecnologia (ex: sistema SINAL da PRF).\n2. Uso ligeiramente repetitivo do conectivo "portanto" na conclusão.',
            suggestions:
              'Para alcançar a nota máxima (100%), procure enriquecer a conclusão propondo medidas institucionais complementares, como a capacitação conjunta continuada em academias de polícia (ANP e UniPRF).',
            correctedBy: actualAdminUser?.id || null,
          })
          .returning();

        if (demoCorrection && insertedCriteria.length >= 3) {
          await db.insert(essayCorrectionCriteria).values([
            {
              correctionId: demoCorrection.id,
              criterionId: insertedCriteria[0].id,
              score: '18.00',
              feedback: 'Excelente organização de parágrafos, caligrafia simulada e respeito às margens.',
            },
            {
              correctionId: demoCorrection.id,
              criterionId: insertedCriteria[1].id,
              score: '44.00',
              feedback: 'Argumentação consistente, com clara diferenciação entre as atribuições da PF e da PRF.',
            },
            {
              correctionId: demoCorrection.id,
              criterionId: insertedCriteria[2].id,
              score: '26.00',
              feedback: 'Excelente domínio da norma padrão, com apenas um pequeno desvio pontual de regência.',
            },
          ]);
        }
      }

      // Rascunho ativo no prompt 2 para demonstrar recuperação de rascunho
      if (prompt2) {
        const draftContent = `O uso diferenciado da força nas ações policiais modernas exige estrita observância aos tratados internacionais de direitos humanos dos quais o Brasil é signatário. A autoridade do policial rodoviário ou federal emana da lei, sendo a proporcionalidade o norte indispensável de qualquer intervenção tática.`;

        await db.insert(essays).values({
          userId: actualStudentUser.id,
          promptId: prompt2.id,
          contestId: actualPrfContest?.id || prompt2.contestId,
          title: 'Direitos Humanos e Legalidade na Atividade Policial',
          content: draftContent,
          wordCount: 46,
          characterCount: 334,
          lineCount: 5,
          linesCount: 5,
          status: 'DRAFT',
          startedAt: new Date(Date.now() - 2 * 3600 * 1000),
          lastSavedAt: new Date(Date.now() - 30 * 60 * 1000),
        });
      }
    }

    // ========================================================================
    // 18. CENTRAL DE NOTÍCIAS, EDITAIS E DOCUMENTOS DEMONSTRATIVOS (FASE 9)
    // ========================================================================
    console.log('📢 Cadastrando notícias, editais e tags demonstrativas (Fase 9)...');

    // Busca fontes cadastradas
    const allDbSources = await db.select().from(newsSources);
    const sourceMap = new Map<string, any>(allDbSources.map((s: any) => [s.name, s]));
    const cebraspeSource = sourceMap.get('Página Oficial Cebraspe') || allDbSources[0];
    const prfSource = sourceMap.get('Portal Oficial da PRF') || allDbSources[0];
    const pfSource = sourceMap.get('Portal Oficial da PF') || allDbSources[0];
    const douSource = sourceMap.get('Diário Oficial da União (DOU)') || allDbSources[0];
    const folhaSource = sourceMap.get('Folha Dirigida News') || allDbSources[0];

    // Tags
    const demoTags = [
      { name: 'Edital', slug: 'edital' },
      { name: 'Cronograma', slug: 'cronograma' },
      { name: 'Cebraspe', slug: 'cebraspe' },
      { name: 'Retificação', slug: 'retificacao' },
      { name: 'Prova', slug: 'prova' },
      { name: 'Resultado', slug: 'resultado' },
      { name: 'Inscrição', slug: 'inscricao' },
      { name: 'PRF', slug: 'prf' },
      { name: 'PF', slug: 'pf' },
    ];
    for (const tag of demoTags) {
      await db.insert(newsTags).values(tag).onConflictDoNothing();
    }
    const allTags = await db.select().from(newsTags);
    const tagMap = new Map<string, string>(allTags.map((t: any) => [t.slug, t.id]));

    // Notícias Demonstrativas
    const existingNewsCount = await db.select({ count: count() }).from(news);
    if (Number(existingNewsCount[0]?.count || 0) === 0 && cebraspeSource && prfSource && pfSource && douSource && folhaSource) {
      const demoNewsItems = [
        {
          contestId: actualPrfContest?.id || null,
          sourceId: cebraspeSource.id,
          title: '[DEMO] Publicação do Cronograma Atualizado das Etapas do Concurso PRF',
          slug: 'demo-cronograma-atualizado-etapas-concurso-prf',
          summary: 'A banca organizadora Cebraspe divulgou o cronograma consolidado das próximas fases para o cargo de Policial Rodoviário Federal.',
          content: `<p>A comissão organizadora do concurso público para provimento de vagas no cargo de <strong>Policial Rodoviário Federal</strong>, em conjunto com o Cebraspe, tornou público o cronograma oficial atualizado com os prazos de homologação e convocação para o Curso de Formação Profissional (CFP).</p><p>Recomenda-se aos candidatos atenção aos prazos recursais e à documentação exigida na fase de investigação social.</p>`,
          contentMarkdown: 'A comissão organizadora do concurso público para provimento de vagas no cargo de Policial Rodoviário Federal...',
          externalUrl: 'https://www.cebraspe.org.br/concursos/prf-2026',
          originalUrl: 'https://www.cebraspe.org.br/concursos/prf-2026',
          category: 'EXAM',
          publishedAt: new Date(Date.now() - 3 * 3600 * 1000), // 3 horas atrás
          status: 'PUBLISHED' as const,
          isFeatured: true,
          isImportant: true,
          canonicalUrl: 'https://www.cebraspe.org.br/concursos/prf-2026',
          contentHash: 'hash-demo-news-1',
          tagSlugs: ['edital', 'cronograma', 'cebraspe', 'prf'],
        },
        {
          contestId: actualPrfContest?.id || null,
          sourceId: prfSource.id,
          title: '[DEMO] Comunicado Oficial sobre o Conteúdo Programático de Legislação de Trânsito',
          slug: 'demo-comunicado-conteudo-legislacao-transito-prf',
          summary: 'Coordenação de Ensino da PRF emite nota técnica detalhando as resoluções do CONTRAN válidas para as provas objetivas.',
          content: `<p>A Coordenação de Ensino da Polícia Rodoviária Federal esclarece aos candidatos que somente serão cobradas as Resoluções do CONTRAN expressamente vigentes até a data de publicação do edital regulador.</p><p>Acesse o edital retificado para verificar a listagem completa de itens atualizados.</p>`,
          contentMarkdown: 'A Coordenação de Ensino da Polícia Rodoviária Federal esclarece aos candidatos...',
          externalUrl: 'https://www.gov.br/prf/noticias-concurso',
          originalUrl: 'https://www.gov.br/prf/noticias-concurso',
          category: 'RETIFICATION',
          publishedAt: new Date(Date.now() - 24 * 3600 * 1000), // ontem
          status: 'PUBLISHED' as const,
          isFeatured: false,
          isImportant: true,
          canonicalUrl: 'https://www.gov.br/prf/noticias-concurso',
          contentHash: 'hash-demo-news-2',
          tagSlugs: ['retificacao', 'edital', 'prf'],
        },
        {
          contestId: actualPfContest?.id || null,
          sourceId: pfSource.id,
          title: '[DEMO] Orientações Gerais para Procedimento de Isenção da Taxa de Inscrição da PF',
          slug: 'demo-orientacoes-isencao-taxa-inscricao-pf',
          summary: 'Candidatos inscritos no CadÚnico ou doadores de medula óssea podem solicitar a isenção de taxa conforme orientações.',
          content: `<p>O Departamento de Polícia Federal informa que o prazo para requerimento de isenção do pagamento da taxa de inscrição encerra-se nesta semana. O procedimento deve ser realizado exclusivamente no portal da banca examinadora.</p>`,
          contentMarkdown: 'O Departamento de Polícia Federal informa que o prazo para requerimento de isenção...',
          externalUrl: 'https://www.gov.br/pf/concursos-inscricao',
          originalUrl: 'https://www.gov.br/pf/concursos-inscricao',
          category: 'REGISTRATION',
          publishedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000), // 2 dias atrás
          status: 'PUBLISHED' as const,
          isFeatured: true,
          isImportant: false,
          canonicalUrl: 'https://www.gov.br/pf/concursos-inscricao',
          contentHash: 'hash-demo-news-3',
          tagSlugs: ['inscricao', 'pf'],
        },
        {
          contestId: null, // Notícia geral
          sourceId: douSource.id,
          title: '[DEMO] Panorama das Vagas e Remunerações das Carreiras Típicas de Estado',
          slug: 'demo-panorama-vagas-remuneracoes-carreiras-estado',
          summary: 'Levantamento no Diário Oficial detalha as projeções orçamentárias e estruturação das carreiras federais de segurança.',
          content: `<p>A Lei Orçamentária Anual contempla recursos para a continuidade do provimento de cargos efetivos no âmbito do Ministério da Justiça e Segurança Pública, garantindo reposição de quadros na PRF e na PF.</p>`,
          contentMarkdown: 'A Lei Orçamentária Anual contempla recursos para a continuidade do provimento de cargos...',
          externalUrl: 'https://www.in.gov.br/dou/carreiras-federais',
          originalUrl: 'https://www.in.gov.br/dou/carreiras-federais',
          category: 'CAREER',
          publishedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000),
          status: 'PUBLISHED' as const,
          isFeatured: false,
          isImportant: false,
          canonicalUrl: 'https://www.in.gov.br/dou/carreiras-federais',
          contentHash: 'hash-demo-news-4',
          tagSlugs: ['carreira', 'concurso'],
        },
        {
          contestId: null, // Notícia geral
          sourceId: folhaSource.id,
          title: '[DEMO] Dicas de Preparação: Como Otimizar a Resolução de Questões Certo/Errado Cebraspe',
          slug: 'demo-dicas-preparacao-questoes-cebraspe',
          summary: 'Especialistas analisam estratégias para lidar com a penalização por erro característico do método Cespe/Cebraspe.',
          content: `<p>Em provas organizadas pelo modelo Cespe/Cebraspe, uma questão errada anula uma certa. Compreender o limiar estatístico para deixar itens em branco é fundamental para a maximização do escore líquido.</p>`,
          contentMarkdown: 'Em provas organizadas pelo modelo Cespe/Cebraspe, uma questão errada anula uma certa...',
          externalUrl: 'https://folhadirigida.uol.com.br/dicas-cebraspe',
          originalUrl: 'https://folhadirigida.uol.com.br/dicas-cebraspe',
          category: 'STUDY',
          publishedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
          status: 'PUBLISHED' as const,
          isFeatured: false,
          isImportant: false,
          canonicalUrl: 'https://folhadirigida.uol.com.br/dicas-cebraspe',
          contentHash: 'hash-demo-news-5',
          tagSlugs: ['prova', 'cebraspe'],
        },
        {
          contestId: actualPrfContest?.id || null,
          sourceId: prfSource.id,
          title: '[DEMO] Rascunho Interno - Planejamento de Convocação TAF',
          slug: 'demo-rascunho-interno-planejamento-taf',
          summary: 'Documento em elaboração pela comissão setorial de concurso da PRF.',
          content: `<p>Conteúdo de rascunho visível apenas pelo corpo administrativo.</p>`,
          contentMarkdown: 'Conteúdo de rascunho visível apenas pelo corpo administrativo.',
          category: 'EXAM',
          publishedAt: new Date(),
          status: 'DRAFT' as const,
          isFeatured: false,
          isImportant: false,
          externalUrl: 'https://www.gov.br/prf/rascunho',
          originalUrl: 'https://www.gov.br/prf/rascunho',
          canonicalUrl: 'https://www.gov.br/prf/rascunho',
          contentHash: 'hash-demo-news-draft',
          tagSlugs: ['prova', 'prf'],
        },
      ];

      const insertedNewsList = [];
      for (const item of demoNewsItems) {
        const { tagSlugs, ...newsData } = item;
        const [inserted] = await db.insert(news).values(newsData).returning();
        insertedNewsList.push(inserted);

        for (const slug of tagSlugs) {
          const tagId = tagMap.get(slug);
          if (tagId) {
            await db.insert(newsToTags).values({ newsId: inserted.id, tagId }).onConflictDoNothing();
          }
        }
      }

      // Se existir aluno demo, marca a primeira como lida e favorita a segunda
      if (actualStudentUser && insertedNewsList.length >= 2) {
        await db.insert(newsReads).values({
          userId: actualStudentUser.id,
          newsId: insertedNewsList[0].id,
          readAt: new Date(),
        }).onConflictDoNothing();

        await db.insert(newsFavorites).values({
          userId: actualStudentUser.id,
          newsId: insertedNewsList[1].id,
          createdAt: new Date(),
        }).onConflictDoNothing();
      }
    }

    // Documentos Demonstrativos (Editais)
    const existingDocsCount = await db.select({ count: count() }).from(documents);
    if (Number(existingDocsCount[0]?.count || 0) === 0 && actualPrfContest && actualPfContest && cebraspeSource && douSource) {
      const demoDocs = [
        {
          contestId: actualPrfContest.id,
          sourceId: cebraspeSource.id,
          title: '[DEMO] Edital de Abertura Nº 01/2026 - Concurso PRF',
          description: 'Edital regulamentador do concurso público para provimento de vagas no cargo de Policial Rodoviário Federal.',
          documentType: 'EDITAL',
          fileUrl: 'https://www.cebraspe.org.br/arquivos/editais/prf_edital_01_2026.pdf',
          externalUrl: 'https://www.cebraspe.org.br/concursos/prf-2026',
          fileSizeBytes: 2450000,
          publicationDate: new Date(Date.now() - 30 * 24 * 3600 * 1000),
          status: 'PUBLISHED' as const,
          isFeatured: true,
        },
        {
          contestId: actualPrfContest.id,
          sourceId: cebraspeSource.id,
          title: '[DEMO] Retificação Nº 01 - Conteúdo de Trânsito e Cronograma PRF',
          description: 'Alteração dos subitens 14.2 e do cronograma previsto no Anexo I.',
          documentType: 'RETIFICATION',
          fileUrl: 'https://www.cebraspe.org.br/arquivos/editais/prf_retificacao_01.pdf',
          externalUrl: 'https://www.cebraspe.org.br/concursos/prf-2026',
          fileSizeBytes: 420000,
          publicationDate: new Date(Date.now() - 15 * 24 * 3600 * 1000),
          status: 'PUBLISHED' as const,
          isFeatured: false,
        },
        {
          contestId: actualPfContest.id,
          sourceId: cebraspeSource.id,
          title: '[DEMO] Edital de Abertura Nº 01/2026 - Concurso PF',
          description: 'Edital de abertura de inscrições para os cargos de Agente, Escrivão e Papiloscopista.',
          documentType: 'EDITAL',
          fileUrl: 'https://www.cebraspe.org.br/arquivos/editais/pf_edital_01_2026.pdf',
          externalUrl: 'https://www.cebraspe.org.br/concursos/pf-2026',
          fileSizeBytes: 3100000,
          publicationDate: new Date(Date.now() - 45 * 24 * 3600 * 1000),
          status: 'PUBLISHED' as const,
          isFeatured: true,
        },
        {
          contestId: actualPfContest.id,
          sourceId: cebraspeSource.id,
          title: '[DEMO] Cronograma Oficial e Datas de Aplicação das Provas Objetivas PF',
          description: 'Divulgação dos locais de prova e horários de fechamento dos portões.',
          documentType: 'CRONOGRAMA',
          fileUrl: 'https://www.cebraspe.org.br/arquivos/editais/pf_cronograma_provas.pdf',
          externalUrl: 'https://www.cebraspe.org.br/concursos/pf-2026',
          fileSizeBytes: 180000,
          publicationDate: new Date(Date.now() - 7 * 24 * 3600 * 1000),
          status: 'PUBLISHED' as const,
          isFeatured: false,
        },
        {
          contestId: actualPrfContest.id,
          sourceId: douSource.id,
          title: '[DEMO] Minuta Preliminar de Instrução Normativa',
          description: 'Documento interno em fase de avaliação jurídica.',
          documentType: 'NOTICE',
          fileUrl: '',
          externalUrl: 'https://www.in.gov.br',
          fileSizeBytes: 0,
          publicationDate: new Date(),
          status: 'DRAFT' as const,
          isFeatured: false,
        },
      ];

      for (const doc of demoDocs) {
        await db.insert(documents).values(doc).onConflictDoNothing();
      }
    }

    console.log('===========================================================');
    console.log('🎉 SEED CONCLUÍDO COM SUCESSO!');
    console.log('===========================================================');
    console.log('Credenciais de Desenvolvimento:');
    console.log('  👑 ADMIN: admin@aprova.app | Senha: Admin@123456');
    console.log('  🎓 ALUNO: aluno@aprova.app | Senha: Aluno@123456');
    console.log('===========================================================');
  } catch (error) {
    console.error('❌ Erro durante a execução do seed:', error);
    throw error;
  }
}

// Se executado diretamente via CLI
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.includes('seed')) {
  seed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
