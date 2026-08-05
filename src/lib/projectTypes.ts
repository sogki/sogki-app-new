export type ProjectStatus =
  | 'live'
  | 'closed_beta'
  | 'in_development'
  | 'offline'
  | 'ceased';

export type ProjectTier = 'main' | 'featured' | 'supporting';

export type ProjectMetric = {
  label: string;
  value: string;
};

export type Project = {
  id: string;
  title: string;
  title_jp: string | null;
  description: string;
  technologies: string[];
  github: string | null;
  demo: string | null;
  featured: boolean;
  color: string | null;
  sort_order: number;
  slug: string | null;
  status: ProjectStatus;
  tier: ProjectTier;
  tagline: string | null;
  status_note: string | null;
  long_description: string | null;
  hero_image_url: string | null;
  screenshots: string[];
  metrics: ProjectMetric[];
  accent_color: string | null;
  show_demo_link: boolean;
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  live: 'Live',
  closed_beta: 'Closed Beta',
  in_development: 'In Development',
  offline: 'Offline',
  ceased: 'Ceased',
};

export function projectAccent(project: Pick<Project, 'accent_color' | 'color'>): string {
  return project.accent_color ?? project.color ?? 'from-purple-500 to-indigo-500';
}

export function projectHref(project: Pick<Project, 'slug'>): string | null {
  return project.slug ? `/projects/${project.slug}` : null;
}

export function parseProjectMetrics(raw: unknown): ProjectMetric[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m): m is ProjectMetric => {
      if (!m || typeof m !== 'object') return false;
      const o = m as Record<string, unknown>;
      return typeof o.label === 'string' && typeof o.value === 'string';
    })
    .map((m) => ({ label: m.label, value: m.value }));
}
