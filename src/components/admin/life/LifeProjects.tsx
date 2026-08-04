import { useState } from 'react';
import { ExternalLink, Github, Pencil, Plus, Trash2 } from 'lucide-react';
import AdminCard from '../AdminCard';
import AdminButton from '../AdminButton';
import { AdminInput, AdminLabel, AdminTextarea } from '../AdminField';
import type { LifeProject, LifeProjectStatus } from '../../../lib/lifeDashboard/types';
import { formatShortDate } from '../../../lib/lifeDashboard/format';

type LifeProjectsProps = {
  projects: LifeProject[];
  onChange: (projects: LifeProject[]) => void;
  expanded?: boolean;
};

const statusStyles: Record<LifeProjectStatus, string> = {
  active: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  paused: 'border-amber-400/30 bg-amber-500/10 text-amber-300',
  planning: 'border-purple-400/30 bg-purple-500/10 text-purple-300',
  shipped: 'border-sky-400/30 bg-sky-500/10 text-sky-300',
};

const STATUSES: LifeProjectStatus[] = ['active', 'paused', 'planning', 'shipped'];

export default function LifeProjects({ projects, onChange, expanded }: LifeProjectsProps) {
  const [editing, setEditing] = useState(false);

  const update = (id: string, patch: Partial<LifeProject>) => {
    onChange(
      projects.map((p) =>
        p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p
      )
    );
  };

  const remove = (id: string) => onChange(projects.filter((p) => p.id !== id));

  const add = () => {
    onChange([
      ...projects,
      {
        id: `project-${Date.now()}`,
        name: 'New project',
        description: '',
        status: 'planning',
        stack: [],
        updatedAt: new Date().toISOString(),
      },
    ]);
    setEditing(true);
  };

  return (
    <AdminCard
      id="widget-projects"
      title="Projects"
      className="h-full"
      actions={
        <div className="mr-14">
          <AdminButton size="sm" variant="ghost" onClick={() => setEditing((v) => !v)}>
            <Pencil size={12} />
            {editing ? 'Done' : 'Edit'}
          </AdminButton>
        </div>
      }
    >
      <div className={`space-y-3 ${expanded ? 'max-w-3xl' : ''}`}>
        {projects.map((project) =>
          editing ? (
            <div
              key={project.id}
              className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3"
            >
              <div className="flex gap-2">
                <AdminInput
                  value={project.name}
                  onChange={(e) => update(project.id, { name: e.target.value })}
                  className="flex-1"
                />
                <select
                  className="rounded-lg border border-white/10 bg-black/40 px-2 text-xs text-gray-200"
                  value={project.status}
                  onChange={(e) =>
                    update(project.id, { status: e.target.value as LifeProjectStatus })
                  }
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <AdminButton size="sm" variant="ghost" onClick={() => remove(project.id)}>
                  <Trash2 size={12} />
                </AdminButton>
              </div>
              <AdminTextarea
                rows={2}
                value={project.description}
                onChange={(e) => update(project.id, { description: e.target.value })}
              />
              <div>
                <AdminLabel>Stack (comma-separated)</AdminLabel>
                <AdminInput
                  value={project.stack.join(', ')}
                  onChange={(e) =>
                    update(project.id, {
                      stack: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
            </div>
          ) : (
            <div
              key={project.id}
              className="rounded-xl border border-white/10 bg-black/20 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{project.name}</p>
                  <p className="mt-1 text-xs text-gray-400 leading-relaxed">
                    {project.description}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${statusStyles[project.status]}`}
                >
                  {project.status}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {project.stack.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-400"
                  >
                    {tech}
                  </span>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                <span>Updated {formatShortDate(project.updatedAt)}</span>
                <div className="flex gap-3">
                  {project.githubUrl && (
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-purple-300 hover:text-purple-200"
                    >
                      <Github size={12} />
                      GitHub
                    </a>
                  )}
                  {project.url && (
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-200"
                    >
                      <ExternalLink size={12} />
                      Open
                    </a>
                  )}
                </div>
              </div>
            </div>
          )
        )}
        {editing && (
          <AdminButton size="sm" variant="secondary" onClick={add}>
            <Plus size={12} />
            Add project
          </AdminButton>
        )}
      </div>
    </AdminCard>
  );
}
