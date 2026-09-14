import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/pg-core';

// ============================================================================
// 1. USUÁRIOS, PAPÉIS (ROLES), PERMISSÕES E AUDITORIA
// ============================================================================

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }),
    googleId: varchar('google_id', { length: 255 }),
    avatarUrl: text('avatar_url'),
    status: varchar('status', { length: 50 }).notNull().default('active'), // 'active' | 'inactive' | 'blocked'
    allowedContestIds: jsonb('allowed_contest_ids').$type<string[]>().default([]).notNull(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_users_email').on(t.email),
    index('idx_users_status').on(t.status),
    index('idx_users_google_id').on(t.googleId),
  ]
);

export const roles = pgTable('roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(), // 'admin' | 'student'
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const permissions = pgTable('permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(), // ex: 'users.view', 'contests.manage'
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    roleId: uuid('role_id').references(() => roles.id, { onDelete: 'cascade' }).notNull(),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.roleId] }),
    index('idx_user_roles_user').on(t.userId),
  ]
);

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id').references(() => roles.id, { onDelete: 'cascade' }).notNull(),
    permissionId: uuid('permission_id').references(() => permissions.id, { onDelete: 'cascade' }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.roleId, t.permissionId] }),
    index('idx_role_permissions_role').on(t.roleId),
  ]
);

export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: varchar('code', { length: 128 }).notNull().unique(),
    email: varchar('email', { length: 255 }), // Opcional (quando convite é restrito a um email específico)
    role: varchar('role', { length: 50 }).notNull().default('student'),
    status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending' | 'used' | 'expired' | 'revoked'
    allowedContestIds: jsonb('allowed_contest_ids').$type<string[]>().default([]).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdBy: uuid('created_by').references(() => users.id).notNull(),
    usedBy: uuid('used_by').references(() => users.id),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_invitations_code').on(t.code),
    index('idx_invitations_status').on(t.status),
    index('idx_invitations_expires').on(t.expiresAt),
  ]
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id),
    actorEmail: varchar('actor_email', { length: 255 }),
    action: varchar('action', { length: 100 }).notNull(), // ex: 'user.blocked', 'invitation.created'
    resource: varchar('resource', { length: 100 }).notNull(), // ex: 'users', 'invitations', 'contests'
    resourceId: varchar('resource_id', { length: 100 }),
    details: jsonb('details'),
    ipAddress: varchar('ip_address', { length: 50 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_audit_logs_user').on(t.userId),
    index('idx_audit_logs_resource').on(t.resource),
    index('idx_audit_logs_created').on(t.createdAt),
  ]
);

export const settings = pgTable('settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: jsonb('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================================
// 2. CONCURSOS, ÓRGÃOS, BANCAS E CARGOS (GENÉRICO & EXTENSÍVEL)
// ============================================================================

export const agencies = pgTable('agencies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  acronym: varchar('acronym', { length: 50 }).notNull().unique(), // ex: "PRF", "PF"
  sphere: varchar('sphere', { length: 50 }).notNull().default('federal'),
  logoUrl: text('logo_url'),
  websiteUrl: text('website_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const examBoards = pgTable('exam_boards', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  acronym: varchar('acronym', { length: 50 }).notNull().unique(), // ex: "Cebraspe", "FGV"
  scoringStyle: varchar('scoring_style', { length: 50 }).notNull().default('cebraspe_negative_points'),
  websiteUrl: text('website_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const contests = pgTable(
  'contests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    agencyId: uuid('agency_id').references(() => agencies.id).notNull(),
    boardId: uuid('board_id').references(() => examBoards.id),
    title: varchar('title', { length: 255 }).notNull(), // ex: "Concurso PRF 2026"
    slug: varchar('slug', { length: 255 }).notNull().unique(), // ex: "prf-2026", "pf-2026"
    year: integer('year').notNull(),
    status: varchar('status', { length: 50 }).notNull().default('active'), // 'active' | 'inactive' | 'archived'
    vacanciesCount: integer('vacancies_count').default(0),
    salaryBase: numeric('salary_base', { precision: 10, scale: 2 }).default('0.00'),
    description: text('description'),
    officialPageUrl: text('official_page_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_contests_slug').on(t.slug),
    index('idx_contests_status').on(t.status),
    index('idx_contests_agency').on(t.agencyId),
  ]
);

export const positions = pgTable('positions', {
  id: uuid('id').defaultRandom().primaryKey(),
  contestId: uuid('contest_id').references(() => contests.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(), // ex: "Policial Rodoviário Federal"
  vacanciesCount: integer('vacancies_count').default(0),
  salaryBase: numeric('salary_base', { precision: 10, scale: 2 }).default('0.00'),
  requirements: jsonb('requirements').$type<string[]>().default([]).notNull(),
  duties: text('duties'),
});

export const contestStages = pgTable('contest_stages', {
  id: uuid('id').defaultRandom().primaryKey(),
  contestId: uuid('contest_id').references(() => contests.id).notNull(),
  orderIndex: integer('order_index').notNull().default(1),
  title: varchar('title', { length: 255 }).notNull(),
  date: timestamp('date', { withTimezone: true }),
  eliminatory: boolean('eliminatory').default(true).notNull(),
  classificatory: boolean('classificatory').default(true).notNull(),
});

// ============================================================================
// 3. DISCIPLINAS, ASSUNTOS E RELACIONAMENTO MULTI-CONCURSO
// ============================================================================

export const subjects = pgTable(
  'subjects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(), // ex: "Direito Constitucional"
    slug: varchar('slug', { length: 255 }).notNull().unique(), // ex: "direito-constitucional"
    shortName: varchar('short_name', { length: 50 }),
    description: text('description'),
    iconName: varchar('icon_name', { length: 50 }),
    colorToken: varchar('color_token', { length: 50 }).default('purple'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_subjects_slug').on(t.slug),
  ]
);

export const topics = pgTable(
  'topics',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'cascade' }).notNull(),
    parentId: uuid('parent_id'), // Auto-relacionado para subassuntos
    name: varchar('name', { length: 255 }).notNull(),
    orderIndex: integer('order_index').notNull().default(1),
  },
  (t) => [
    index('idx_topics_subject').on(t.subjectId),
  ]
);

export const contestSubjects = pgTable(
  'contest_subjects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contestId: uuid('contest_id').references(() => contests.id, { onDelete: 'cascade' }).notNull(),
    subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'cascade' }).notNull(),
    weight: numeric('weight', { precision: 4, scale: 2 }).default('1.00').notNull(),
    expectedQuestionsCount: integer('expected_questions_count').default(10).notNull(),
  },
  (t) => [
    index('idx_contest_subjects_contest').on(t.contestId),
    index('idx_contest_subjects_subject').on(t.subjectId),
  ]
);

// ============================================================================
// 4. PROGRESSO DO USUÁRIO (ESTUDOS, QUESTÕES E DESEMPENHO)
// ============================================================================

export const userProgress = pgTable(
  'user_progress',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    contestId: uuid('contest_id').references(() => contests.id, { onDelete: 'cascade' }).notNull(),
    completedLessonsCount: integer('completed_lessons_count').default(0).notNull(),
    totalStudyHours: numeric('total_study_hours', { precision: 6, scale: 2 }).default('0.00').notNull(),
    questionsAnswered: integer('questions_answered').default(0).notNull(),
    correctQuestionsCount: integer('correct_questions_count').default(0).notNull(),
    wrongQuestionsCount: integer('wrong_questions_count').default(0).notNull(),
    overallPercentage: numeric('overall_percentage', { precision: 5, scale: 2 }).default('0.00').notNull(),
    currentStreakDays: integer('current_streak_days').default(0).notNull(),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_user_progress_user').on(t.userId),
    index('idx_user_progress_user_contest').on(t.userId, t.contestId),
  ]
);

export const userSubjectProgress = pgTable(
  'user_subject_progress',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'cascade' }).notNull(),
    contestId: uuid('contest_id').references(() => contests.id, { onDelete: 'cascade' }),
    progressPercentage: numeric('progress_percentage', { precision: 5, scale: 2 }).default('0.00').notNull(),
    accuracyPercentage: numeric('accuracy_percentage', { precision: 5, scale: 2 }).default('0.00').notNull(),
    questionsAnswered: integer('questions_answered').default(0).notNull(),
    correctCount: integer('correct_count').default(0).notNull(),
    wrongCount: integer('wrong_count').default(0).notNull(),
    lastStudiedAt: timestamp('last_studied_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_user_subj_prog_user').on(t.userId),
    index('idx_user_subj_prog_user_subject').on(t.userId, t.subjectId),
  ]
);

// ============================================================================
// 5. CURSOS, AULAS, QUESTÕES, SIMULADOS, REDAÇÃO E NOTÍCIAS (PRESERVADOS DA FASE 1)
// ============================================================================

export const courses = pgTable(
  'courses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contestId: uuid('contest_id').references(() => contests.id),
    subjectId: uuid('subject_id').references(() => subjects.id),
    topicId: uuid('topic_id').references(() => topics.id),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    description: text('description'),
    thumbnailUrl: text('thumbnail_url'),
    status: varchar('status', { length: 50 }).notNull().default('published'), // 'draft' | 'published' | 'archived'
    orderIndex: integer('order_index').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_courses_contest').on(t.contestId),
    index('idx_courses_subject').on(t.subjectId),
    index('idx_courses_status').on(t.status),
    index('idx_courses_slug').on(t.slug),
  ]
);

export const modules = pgTable(
  'modules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
    subjectId: uuid('subject_id').references(() => subjects.id),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    orderIndex: integer('order_index').notNull().default(1),
    status: varchar('status', { length: 50 }).notNull().default('published'), // 'draft' | 'published' | 'archived'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_modules_course').on(t.courseId),
    index('idx_modules_order').on(t.orderIndex),
  ]
);

export const lessons = pgTable(
  'lessons',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    moduleId: uuid('module_id').references(() => modules.id, { onDelete: 'cascade' }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    description: text('description'),
    orderIndex: integer('order_index').notNull().default(1),
    estimatedDurationMin: integer('estimated_duration_min').default(30),
    type: varchar('type', { length: 50 }).notNull().default('text'), // 'text' | 'video' | 'pdf' | 'audio' | 'link' | 'mixed'
    videoUrl: text('video_url'),
    status: varchar('status', { length: 50 }).notNull().default('published'), // 'draft' | 'published' | 'archived'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_lessons_module').on(t.moduleId),
    index('idx_lessons_status').on(t.status),
    index('idx_lessons_order').on(t.orderIndex),
  ]
);

export const contents = pgTable(
  'contents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    lessonId: uuid('lesson_id').references(() => lessons.id, { onDelete: 'cascade' }).notNull(),
    type: varchar('type', { length: 50 }).notNull().default('text_markdown'),
    body: text('body'),
    fileUrl: text('file_url'),
    orderIndex: integer('order_index').notNull().default(1),
  },
  (t) => [
    index('idx_contents_lesson').on(t.lessonId),
  ]
);

export const lessonResources = pgTable(
  'lesson_resources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    lessonId: uuid('lesson_id').references(() => lessons.id, { onDelete: 'cascade' }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    type: varchar('type', { length: 50 }).notNull().default('pdf'), // 'pdf' | 'link' | 'file'
    url: text('url').notNull(),
    orderIndex: integer('order_index').notNull().default(1),
    status: varchar('status', { length: 50 }).notNull().default('published'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_lesson_resources_lesson').on(t.lessonId),
  ]
);

export const userLessonProgress = pgTable(
  'user_lesson_progress',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    lessonId: uuid('lesson_id').references(() => lessons.id, { onDelete: 'cascade' }).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('started'), // 'started' | 'completed'
    lastPositionSec: integer('last_position_sec').default(0),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_user_lesson_progress_user').on(t.userId),
    index('idx_user_lesson_progress_lesson').on(t.lessonId),
    uniqueIndex('idx_user_lesson_unique').on(t.userId, t.lessonId),
  ]
);

export const questions = pgTable(
  'questions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contestId: uuid('contest_id').references(() => contests.id),
    subjectId: uuid('subject_id').references(() => subjects.id),
    topicId: uuid('topic_id').references(() => topics.id).notNull(),
    boardId: uuid('board_id').references(() => examBoards.id).notNull(),
    originContestId: uuid('origin_contest_id').references(() => contests.id),
    year: integer('year').notNull(),
    difficulty: varchar('difficulty', { length: 20 }).notNull().default('medium'), // 'easy' | 'medium' | 'hard' | 'very_hard'
    format: varchar('format', { length: 30 }).notNull().default('multiple_choice'), // 'multiple_choice' | 'true_false'
    statement: text('statement').notNull(),
    officialExplanation: text('official_explanation').notNull(),
    source: varchar('source', { length: 50 }).notNull().default('BANCA_OFICIAL'), // 'BANCA_OFICIAL' | 'QUESTAO_AUTORAL' | 'IMPORTADA' | 'DEMO' | 'OUTRA'
    sourceReference: varchar('source_reference', { length: 255 }),
    tags: jsonb('tags').$type<string[]>().default([]).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('published'), // 'draft' | 'published' | 'archived'
    createdBy: uuid('created_by').references(() => users.id),
    updatedBy: uuid('updated_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (t) => [
    index('idx_questions_contest').on(t.contestId),
    index('idx_questions_subject').on(t.subjectId),
    index('idx_questions_topic').on(t.topicId),
    index('idx_questions_board').on(t.boardId),
    index('idx_questions_difficulty').on(t.difficulty),
    index('idx_questions_status').on(t.status),
  ]
);

export const questionOptions = pgTable('question_options', {
  id: uuid('id').defaultRandom().primaryKey(),
  questionId: uuid('question_id').references(() => questions.id, { onDelete: 'cascade' }).notNull(),
  letter: varchar('letter', { length: 10 }).notNull(), // 'A', 'B', 'C', 'D', 'E' ou 'C', 'E'
  text: text('text').notNull(),
  isCorrect: boolean('is_correct').notNull(),
  orderIndex: integer('order_index').notNull().default(1),
});

export const questionAttempts = pgTable(
  'question_attempts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    questionId: uuid('question_id').references(() => questions.id, { onDelete: 'cascade' }).notNull(),
    selectedOptionId: uuid('selected_option_id').references(() => questionOptions.id).notNull(),
    isCorrect: boolean('is_correct').notNull(),
    durationSeconds: integer('duration_seconds').notNull().default(0),
    source: varchar('source', { length: 50 }).notNull().default('direct_practice'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_attempts_user').on(t.userId),
    index('idx_attempts_question').on(t.questionId),
    index('idx_attempts_user_correct').on(t.userId, t.isCorrect),
  ]
);

export const questionFavorites = pgTable(
  'question_favorites',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    questionId: uuid('question_id').references(() => questions.id, { onDelete: 'cascade' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_favorites_user').on(t.userId),
    index('idx_favorites_question').on(t.questionId),
    uniqueIndex('idx_user_question_favorite_unique').on(t.userId, t.questionId),
  ]
);

export const questionReviewFlags = pgTable(
  'question_review_flags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    questionId: uuid('question_id').references(() => questions.id, { onDelete: 'cascade' }).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending' | 'reviewed'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_review_flags_user').on(t.userId),
    index('idx_review_flags_question').on(t.questionId),
    uniqueIndex('idx_user_question_review_unique').on(t.userId, t.questionId),
  ]
);

export const questionReports = pgTable(
  'question_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    questionId: uuid('question_id').references(() => questions.id, { onDelete: 'cascade' }).notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    type: varchar('type', { length: 100 }).notNull(), // 'statement_error' | 'wrong_answer_key' | 'suspicious_explanation' | 'classification_error' | 'other'
    description: text('description').notNull(),
    status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending' | 'resolved' | 'rejected'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedBy: uuid('resolved_by').references(() => users.id),
  },
  (t) => [
    index('idx_question_reports_question').on(t.questionId),
    index('idx_question_reports_user').on(t.userId),
    index('idx_question_reports_status').on(t.status),
  ]
);

export const simulations = pgTable(
  'simulations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contestId: uuid('contest_id').references(() => contests.id).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    type: varchar('type', { length: 50 }).notNull().default('FIXED'), // 'FIXED' | 'RANDOM' | 'CUSTOM'
    durationMinutes: integer('duration_minutes').notNull().default(60),
    penaltyRule: varchar('penalty_rule', { length: 50 }).notNull().default('none'), // 'none' | 'one_error_cancels_one_correct'
    penaltyFactor: numeric('penalty_factor', { precision: 3, scale: 2 }).default('1.00'),
    totalQuestions: integer('total_questions').notNull().default(30),
    difficulty: varchar('difficulty', { length: 50 }).default('MEDIO'), // 'FACIL' | 'MEDIO' | 'DIFICIL' | 'MISTO'
    status: varchar('status', { length: 50 }).notNull().default('published'), // 'draft' | 'published' | 'archived'
    isOfficial: boolean('is_official').default(false).notNull(),
    isPublic: boolean('is_public').default(true).notNull(),
    filterConfig: jsonb('filter_config'), // for RANDOM / CUSTOM (subjectIds, topicIds, boardId, difficulty, etc.)
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (t) => [
    index('idx_simulations_contest').on(t.contestId),
    index('idx_simulations_status').on(t.status),
    index('idx_simulations_type').on(t.type),
    index('idx_simulations_created_by').on(t.createdBy),
  ]
);

export const simulationQuestions = pgTable(
  'simulation_questions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    simulationId: uuid('simulation_id').references(() => simulations.id, { onDelete: 'cascade' }).notNull(),
    questionId: uuid('question_id').references(() => questions.id).notNull(),
    orderIndex: integer('order_index').notNull(),
    points: numeric('points', { precision: 4, scale: 2 }).default('1.00').notNull(),
  },
  (t) => [
    uniqueIndex('idx_sim_q_unique').on(t.simulationId, t.questionId),
    index('idx_sim_q_sim').on(t.simulationId),
    index('idx_sim_q_question').on(t.questionId),
  ]
);

export const simulationAttempts = pgTable(
  'simulation_attempts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    simulationId: uuid('simulation_id').references(() => simulations.id).notNull(),
    userId: uuid('user_id').references(() => users.id).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('IN_PROGRESS'), // 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED' | 'ABANDONED'
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    totalDurationSeconds: integer('total_duration_seconds').default(0),
    totalScore: numeric('total_score', { precision: 6, scale: 2 }).default('0.00'),
    correctCount: integer('correct_count').default(0),
    wrongCount: integer('wrong_count').default(0),
    blankCount: integer('blank_count').default(0),
    percentage: numeric('percentage', { precision: 5, scale: 2 }).default('0.00'),
    markedQuestions: jsonb('marked_questions').$type<string[]>().default([]).notNull(),
    subjectBreakdown: jsonb('subject_breakdown'),
    topicBreakdown: jsonb('topic_breakdown'),
    difficultyBreakdown: jsonb('difficulty_breakdown'),
  },
  (t) => [
    index('idx_sim_attempts_user').on(t.userId),
    index('idx_sim_attempts_sim').on(t.simulationId),
    index('idx_sim_attempts_status').on(t.status),
  ]
);

export const simulationAnswers = pgTable(
  'simulation_answers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    simulationAttemptId: uuid('simulation_attempt_id').references(() => simulationAttempts.id, { onDelete: 'cascade' }).notNull(),
    questionId: uuid('question_id').references(() => questions.id).notNull(),
    selectedOptionId: uuid('selected_option_id').references(() => questionOptions.id),
    isCorrect: boolean('is_correct'),
    answeredAt: timestamp('answered_at', { withTimezone: true }).defaultNow().notNull(),
    timeSpentSeconds: integer('time_spent_seconds').default(0),
  },
  (t) => [
    uniqueIndex('idx_sim_ans_attempt_q').on(t.simulationAttemptId, t.questionId),
    index('idx_sim_ans_attempt').on(t.simulationAttemptId),
    index('idx_sim_ans_question').on(t.questionId),
  ]
);

export const essayPrompts = pgTable(
  'essay_prompts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contestId: uuid('contest_id').references(() => contests.id, { onDelete: 'set null' }),
    boardId: uuid('board_id').references(() => examBoards.id),
    title: varchar('title', { length: 255 }).notNull(),
    category: varchar('category', { length: 100 }), // 'Segurança Pública', 'Direitos Humanos', etc.
    themeArea: varchar('theme_area', { length: 255 }), // compatibilidade
    statement: text('statement'),
    instructions: jsonb('instructions').$type<string[] | any>().default([]),
    instructionsText: text('instructions_text'),
    context: text('context'), // Textos motivadores formatados em markdown
    contextTexts: jsonb('context_texts'), // compatibilidade
    source: varchar('source', { length: 255 }),
    difficulty: varchar('difficulty', { length: 50 }).default('MEDIUM'), // 'EASY' | 'MEDIUM' | 'HARD'
    estimatedMinutes: integer('estimated_minutes').default(60),
    minWords: integer('min_words').default(150),
    maxWords: integer('max_words').default(350),
    minLines: integer('min_lines').default(20).notNull(),
    maxLines: integer('max_lines').default(30).notNull(),
    status: varchar('status', { length: 50 }).default('PUBLISHED'), // 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
    isAiGenerated: boolean('is_ai_generated').default(false).notNull(),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (t) => [
    index('idx_essay_prompts_contest').on(t.contestId),
    index('idx_essay_prompts_category').on(t.category),
    index('idx_essay_prompts_status').on(t.status),
  ]
);

export const essayCriteria = pgTable(
  'essay_criteria',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contestId: uuid('contest_id').references(() => contests.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    maxScore: numeric('max_score', { precision: 6, scale: 2 }).notNull(),
    weight: numeric('weight', { precision: 4, scale: 2 }).default('1.00').notNull(),
    ordering: integer('ordering').default(1).notNull(),
    active: boolean('active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_essay_criteria_contest').on(t.contestId),
    index('idx_essay_criteria_active').on(t.active),
  ]
);

export const essays = pgTable(
  'essays',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    contestId: uuid('contest_id').references(() => contests.id),
    promptId: uuid('prompt_id').references(() => essayPrompts.id, { onDelete: 'cascade' }).notNull(),
    title: varchar('title', { length: 255 }),
    content: text('content').default('').notNull(),
    wordCount: integer('word_count').default(0).notNull(),
    characterCount: integer('character_count').default(0).notNull(),
    linesCount: integer('lines_count').default(0),
    lineCount: integer('line_count').default(0),
    durationMinutes: integer('duration_minutes').default(0),
    status: varchar('status', { length: 50 }).notNull().default('DRAFT'), // 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'CORRECTED' | 'ARCHIVED'
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
    lastSavedAt: timestamp('last_saved_at', { withTimezone: true }).defaultNow(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_essays_user').on(t.userId),
    index('idx_essays_prompt').on(t.promptId),
    index('idx_essays_status').on(t.status),
    index('idx_essays_contest').on(t.contestId),
  ]
);

export const essayVersions = pgTable(
  'essay_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    essayId: uuid('essay_id').references(() => essays.id, { onDelete: 'cascade' }).notNull(),
    content: text('content').notNull(),
    wordCount: integer('word_count').default(0).notNull(),
    characterCount: integer('character_count').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_essay_versions_essay').on(t.essayId),
  ]
);

export const essayCorrections = pgTable(
  'essay_corrections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    essayId: uuid('essay_id').references(() => essays.id, { onDelete: 'cascade' }).notNull().unique(),
    correctionType: varchar('correction_type', { length: 50 }).notNull().default('MANUAL'), // 'MANUAL' | 'AI' | 'HYBRID'
    totalScore: numeric('total_score', { precision: 6, scale: 2 }),
    maxScore: numeric('max_score', { precision: 6, scale: 2 }),
    percentage: numeric('percentage', { precision: 5, scale: 2 }),
    generalFeedback: text('general_feedback'),
    strengths: text('strengths'),
    weaknesses: text('weaknesses'),
    suggestions: text('suggestions'),
    correctedBy: uuid('corrected_by').references(() => users.id),
    aiModel: varchar('ai_model', { length: 100 }).default('gemini-2.0-pro'),
    overallScore: numeric('overall_score', { precision: 5, scale: 2 }),
    maxPossibleScore: numeric('max_possible_score', { precision: 5, scale: 2 }).default('100.00'),
    themeAdherenceScore: numeric('theme_adherence_score', { precision: 5, scale: 2 }),
    structureScore: numeric('structure_score', { precision: 5, scale: 2 }),
    argumentationScore: numeric('argumentation_score', { precision: 5, scale: 2 }),
    cohesionScore: numeric('cohesion_score', { precision: 5, scale: 2 }),
    grammarScore: numeric('grammar_score', { precision: 5, scale: 2 }),
    detailedFeedback: jsonb('detailed_feedback'),
    highlightedIssues: jsonb('highlighted_issues'),
    pedagogicalDisclaimer: text('pedagogical_disclaimer'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('idx_essay_corrections_essay').on(t.essayId),
    index('idx_essay_corrections_evaluator').on(t.correctedBy),
  ]
);

export const essayCorrectionCriteria = pgTable(
  'essay_correction_criteria',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    correctionId: uuid('correction_id').references(() => essayCorrections.id, { onDelete: 'cascade' }).notNull(),
    criterionId: uuid('criterion_id').references(() => essayCriteria.id, { onDelete: 'cascade' }).notNull(),
    score: numeric('score', { precision: 6, scale: 2 }).notNull(),
    feedback: text('feedback'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_ecc_correction').on(t.correctionId),
    index('idx_ecc_criterion').on(t.criterionId),
  ]
);

// ============================================================================
// 9. CENTRAL DE NOTÍCIAS, FONTES CONFIÁVEIS E EDITAIS (FASE 9)
// ============================================================================

export const newsSources = pgTable(
  'news_sources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    websiteUrl: text('website_url'),
    url: text('url'), // retrocompatibilidade
    logoUrl: text('logo_url'),
    sourceType: varchar('source_type', { length: 50 }).default('OFFICIAL').notNull(), // 'OFFICIAL' | 'EDUCATIONAL' | 'NEWS' | 'OTHER'
    trustLevel: varchar('trust_level', { length: 50 }).default('HIGH').notNull(), // 'HIGH' | 'MEDIUM' | 'LOW'
    isOfficial: boolean('is_official').default(true).notNull(), // retrocompatibilidade
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_news_sources_type').on(t.sourceType),
    index('idx_news_sources_trust').on(t.trustLevel),
    index('idx_news_sources_active').on(t.isActive),
  ]
);

export const news = pgTable(
  'news',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceId: uuid('source_id').references(() => newsSources.id).notNull(),
    contestId: uuid('contest_id').references(() => contests.id),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    summary: text('summary').notNull(),
    content: text('content'),
    contentMarkdown: text('content_markdown'), // retrocompatibilidade
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
    externalUrl: text('external_url'),
    originalUrl: text('original_url'), // retrocompatibilidade
    category: varchar('category', { length: 50 }).notNull().default('CONTEST'), // 'CONTEST' | 'NOTICE' | 'EDITAL' | 'EXAM' | 'REGISTRATION' | 'RESULT' | 'APPOINTMENT' | 'CAREER' | 'STUDY' | 'GENERAL' | 'OTHER'
    status: varchar('status', { length: 50 }).notNull().default('PUBLISHED'), // 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
    importance: varchar('importance', { length: 50 }).notNull().default('normal'), // retrocompatibilidade
    isFeatured: boolean('is_featured').default(false).notNull(),
    isImportant: boolean('is_important').default(false).notNull(),
    coverImageUrl: text('cover_image_url'), // retrocompatibilidade
    imageUrl: text('image_url'),
    canonicalUrl: text('canonical_url'),
    contentHash: varchar('content_hash', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_news_contest').on(t.contestId),
    index('idx_news_source').on(t.sourceId),
    index('idx_news_status').on(t.status),
    index('idx_news_category').on(t.category),
    index('idx_news_published_at').on(t.publishedAt),
    index('idx_news_is_featured').on(t.isFeatured),
    index('idx_news_is_important').on(t.isImportant),
    index('idx_news_slug').on(t.slug),
    index('idx_news_canonical_url').on(t.canonicalUrl),
    index('idx_news_content_hash').on(t.contentHash),
  ]
);

export const newsReads = pgTable(
  'news_reads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    newsId: uuid('news_id').references(() => news.id, { onDelete: 'cascade' }).notNull(),
    readAt: timestamp('read_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('idx_news_reads_user_news').on(t.userId, t.newsId),
    index('idx_news_reads_user').on(t.userId),
    index('idx_news_reads_news').on(t.newsId),
  ]
);

export const newsFavorites = pgTable(
  'news_favorites',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    newsId: uuid('news_id').references(() => news.id, { onDelete: 'cascade' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('idx_news_favorites_user_news').on(t.userId, t.newsId),
    index('idx_news_favorites_user').on(t.userId),
    index('idx_news_favorites_news').on(t.newsId),
  ]
);

export const newsTags = pgTable(
  'news_tags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_news_tags_slug').on(t.slug),
  ]
);

export const newsToTags = pgTable(
  'news_to_tags',
  {
    newsId: uuid('news_id').references(() => news.id, { onDelete: 'cascade' }).notNull(),
    tagId: uuid('tag_id').references(() => newsTags.id, { onDelete: 'cascade' }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.newsId, t.tagId] }),
    index('idx_news_to_tags_news').on(t.newsId),
    index('idx_news_to_tags_tag').on(t.tagId),
  ]
);

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contestId: uuid('contest_id').references(() => contests.id).notNull(),
    sourceId: uuid('source_id').references(() => newsSources.id), // obrigatório para documentos oficiais
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 50 }).notNull().default('edital_abertura'), // retrocompatibilidade
    documentType: varchar('document_type', { length: 50 }).notNull().default('EDITAL'), // 'EDITAL' | 'RETIFICATION' | 'NOTICE' | 'RESULT' | 'CRONOGRAMA' | 'ANSWER_KEY' | 'CALL' | 'OTHER'
    fileUrl: text('file_url'),
    externalUrl: text('external_url'),
    fileSizeBytes: integer('file_size_bytes').default(0),
    publicationDate: timestamp('publication_date', { withTimezone: true }).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('PUBLISHED'), // 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
    hashSha256: varchar('hash_sha256', { length: 64 }),
    isFeatured: boolean('is_featured').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_documents_contest').on(t.contestId),
    index('idx_documents_source').on(t.sourceId),
    index('idx_documents_status').on(t.status),
    index('idx_documents_type').on(t.documentType),
    index('idx_documents_publication_date').on(t.publicationDate),
  ]
);

// ============================================================================
// 10. PLANO DE ESTUDOS INTELIGENTE, CALENDÁRIO, ROTINA E REVISÕES (FASE 7)
// ============================================================================

export const studyPlans = pgTable(
  'study_plans',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    contestId: uuid('contest_id').references(() => contests.id).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    startDate: timestamp('start_date', { withTimezone: true }).notNull(),
    targetDate: timestamp('target_date', { withTimezone: true }),
    weeklyHours: numeric('weekly_hours', { precision: 5, scale: 2 }).default('14.00').notNull(),
    dailyMinutes: integer('daily_minutes').default(120).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('DRAFT'), // 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED'
    strategy: varchar('strategy', { length: 50 }).notNull().default('balanced'), // 'balanced' | 'weak_areas_focus' | 'revision_heavy' | 'question_intensive'
    horizonWeeks: integer('horizon_weeks').default(4).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (t) => [
    index('idx_study_plans_user').on(t.userId),
    index('idx_study_plans_contest').on(t.contestId),
    index('idx_study_plans_status').on(t.status),
  ]
);

export const studyAvailabilities = pgTable(
  'study_availabilities',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    studyPlanId: uuid('study_plan_id').references(() => studyPlans.id, { onDelete: 'cascade' }).notNull(),
    dayOfWeek: integer('day_of_week').notNull(), // 0=Domingo, 1=Segunda, ..., 6=Sábado
    startTime: varchar('start_time', { length: 10 }).notNull().default('19:00'),
    endTime: varchar('end_time', { length: 10 }).notNull().default('21:00'),
    availableMinutes: integer('available_minutes').notNull().default(120),
    enabled: boolean('enabled').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_study_availabilities_plan').on(t.studyPlanId),
    index('idx_study_availabilities_plan_day').on(t.studyPlanId, t.dayOfWeek),
  ]
);

export const studyPlanPreferences = pgTable(
  'study_plan_preferences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    studyPlanId: uuid('study_plan_id').references(() => studyPlans.id, { onDelete: 'cascade' }).notNull().unique(),
    minSessionMinutes: integer('min_session_minutes').default(30).notNull(),
    maxSessionMinutes: integer('max_session_minutes').default(60).notNull(),
    breakMinutes: integer('break_minutes').default(10).notNull(),
    defaultQuestionsPerSession: integer('default_questions_per_session').default(20).notNull(),
    revisionFrequency: varchar('revision_frequency', { length: 50 }).default('spaced').notNull(), // 'daily' | 'weekly' | 'spaced'
    prioritizeWeakSubjects: boolean('prioritize_weak_subjects').default(true).notNull(),
    prioritizeBehindSchedule: boolean('prioritize_behind_schedule').default(true).notNull(),
    balancedDistribution: boolean('balanced_distribution').default(true).notNull(),
    minSubjectShare: numeric('min_subject_share', { precision: 4, scale: 2 }).default('0.05').notNull(),
    maxSubjectShare: numeric('max_subject_share', { precision: 4, scale: 2 }).default('0.40').notNull(),
    reviewIntervalsDays: jsonb('review_intervals_days').$type<number[]>().default([1, 7, 14, 30]).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

export const studyPlanSubjects = pgTable(
  'study_plan_subjects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    studyPlanId: uuid('study_plan_id').references(() => studyPlans.id, { onDelete: 'cascade' }).notNull(),
    subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'cascade' }).notNull(),
    priority: varchar('priority', { length: 20 }).default('MEDIUM').notNull(), // 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    weight: numeric('weight', { precision: 4, scale: 2 }).default('1.00').notNull(),
    targetPercentage: numeric('target_percentage', { precision: 5, scale: 2 }).default('0.00'),
    targetMinutes: integer('target_minutes').default(0).notNull(),
    enabled: boolean('enabled').default(true).notNull(),
  },
  (t) => [
    index('idx_study_plan_subjects_plan').on(t.studyPlanId),
    index('idx_study_plan_subjects_subject').on(t.subjectId),
  ]
);

export const studyPlanTopics = pgTable(
  'study_plan_topics',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    studyPlanId: uuid('study_plan_id').references(() => studyPlans.id, { onDelete: 'cascade' }).notNull(),
    topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'cascade' }).notNull(),
    priority: varchar('priority', { length: 20 }).default('MEDIUM').notNull(), // 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    targetMinutes: integer('target_minutes').default(0).notNull(),
    enabled: boolean('enabled').default(true).notNull(),
  },
  (t) => [
    index('idx_study_plan_topics_plan').on(t.studyPlanId),
    index('idx_study_plan_topics_topic').on(t.topicId),
  ]
);

export const studyPlanSessions = pgTable(
  'study_plan_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    studyPlanId: uuid('study_plan_id').references(() => studyPlans.id, { onDelete: 'cascade' }).notNull(),
    subjectId: uuid('subject_id').references(() => subjects.id).notNull(),
    topicId: uuid('topic_id').references(() => topics.id),
    lessonId: uuid('lesson_id').references(() => lessons.id),
    simulationId: uuid('simulation_id').references(() => simulations.id),
    sessionDate: varchar('session_date', { length: 10 }).notNull(), // "YYYY-MM-DD"
    startTime: varchar('start_time', { length: 10 }).notNull(), // "19:00"
    endTime: varchar('end_time', { length: 10 }).notNull(), // "19:50"
    plannedMinutes: integer('planned_minutes').notNull(),
    actualMinutes: integer('actual_duration_minutes').default(0).notNull(),
    type: varchar('type', { length: 50 }).notNull().default('LESSON'), // 'LESSON' | 'QUESTIONS' | 'REVIEW' | 'SIMULATION' | 'REVISION' | 'MIXED'
    targetQuestionsCount: integer('target_questions_count').default(0).notNull(),
    completedQuestionsCount: integer('completed_questions_count').default(0).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('PLANNED'), // 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'RESCHEDULED' | 'CANCELLED'
    ordering: integer('ordering').notNull().default(1),
    notes: text('notes'),
    explanation: text('explanation'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    rescheduledFromSessionId: uuid('rescheduled_from_session_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_study_sessions_plan_date').on(t.studyPlanId, t.sessionDate),
    index('idx_study_sessions_status').on(t.status),
    index('idx_study_sessions_subject').on(t.subjectId),
  ]
);

export const studyPlanReviews = pgTable(
  'study_plan_reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    studyPlanId: uuid('study_plan_id').references(() => studyPlans.id, { onDelete: 'cascade' }).notNull(),
    sourceSessionId: uuid('source_session_id').references(() => studyPlanSessions.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id').references(() => subjects.id).notNull(),
    topicId: uuid('topic_id').references(() => topics.id),
    lessonId: uuid('lesson_id').references(() => lessons.id),
    intervalDay: integer('interval_day').notNull(), // 1, 7, 14, 30
    scheduledDate: varchar('scheduled_date', { length: 10 }).notNull(), // "YYYY-MM-DD"
    status: varchar('status', { length: 50 }).notNull().default('PENDING'), // 'PENDING' | 'COMPLETED' | 'SKIPPED'
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_study_reviews_plan_date').on(t.studyPlanId, t.scheduledDate),
    index('idx_study_reviews_status').on(t.status),
  ]
);

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  type: varchar('type', { length: 50 }).notNull().default('system'),
  actionUrl: text('action_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userNotifications = pgTable('user_notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  notificationId: uuid('notification_id').references(() => notifications.id).notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
});



