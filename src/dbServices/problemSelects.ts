import { Prisma } from "@prisma/client";

/** Reusable nested selects — compose list/detail queries from these instead of duplicating JSON. */

export const topicTagPublicSelect = {
  id: true,
  name: true,
  slug_name: true
} satisfies Prisma.TopicTagsSelect;

export const companyPublicSelect = {
  id: true,
  name: true,
  slug_name: true,
  image: true
} satisfies Prisma.CompaniesSelect;

/** Learner editor only — `hidden_stub_code` must stay server-side for judge/run. */
export const learnerCodeTemplateSelect = {
  id: true,
  language: true,
  user_visible_code: true
} satisfies Prisma.ProblemCodeTemplatesSelect;

const problemTagLinksSelect = {
  select: {
    tag: { select: topicTagPublicSelect }
  }
};

const problemCompanyLinksSelect = {
  select: {
    frequency_score: true,
    time_period: true,
    company: { select: companyPublicSelect }
  }
};

const learnerCodeTemplatesSelect = {
  select: learnerCodeTemplateSelect,
  orderBy: { language: "asc" as const }
};

const problemListScalars = {
  id: true,
  problem_name: true,
  problem_slug_name: true,
  difficulty: true,
  total_submissions: true,
  total_accepted: true
} satisfies Prisma.ProblemsSelect;

const problemDetailScalars = {
  ...problemListScalars,
  problem_description: true,
  status: true,
  time_limit_ms: true,
  memory_limit_kb: true,
  evaluation_type: true
} satisfies Prisma.ProblemsSelect;

export const PROBLEM_LIST_SELECT = {
  ...problemListScalars,
  tag_links: problemTagLinksSelect
} satisfies Prisma.ProblemsSelect;

export type ProblemListRow = Prisma.ProblemsGetPayload<{ select: typeof PROBLEM_LIST_SELECT }>;

export const PROBLEM_DETAIL_SELECT = {
  ...problemDetailScalars,
  tag_links: problemTagLinksSelect,
  company_links: problemCompanyLinksSelect,
  code_templates: learnerCodeTemplatesSelect
} satisfies Prisma.ProblemsSelect;

export type ProblemDetailRow = Prisma.ProblemsGetPayload<{ select: typeof PROBLEM_DETAIL_SELECT }>;

export const PROBLEM_HARNESS_SELECT = {
  id: true,
  harness_payload_gridfs_id: true
} satisfies Prisma.ProblemsSelect;

/** Pass a key into getProblemBySlugName — add shapes here, not new service methods. */
export const PROBLEM_SELECTS = {
  list: PROBLEM_LIST_SELECT,
  detail: PROBLEM_DETAIL_SELECT,
  harness: PROBLEM_HARNESS_SELECT
} as const satisfies Record<string, Prisma.ProblemsSelect>;

export type ProblemSelectKey = keyof typeof PROBLEM_SELECTS;
