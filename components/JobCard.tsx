import type { Job } from '@/lib/jobs';
import { siteConfig } from '@/lib/jobs';

const statusStyle: Record<Job['status'], string> = {
  募集中: 'bg-brand-primary text-white',
  継続中: 'bg-brand-soft text-brand-primary',
};

export default function JobCard({ job }: { job: Job }) {
  return (
    <article className="card space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-bold leading-snug">{job.title}</h3>
        <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${statusStyle[job.status]}`}>
          {job.status}
        </span>
      </div>

      <dl className="grid grid-cols-[4rem_1fr] gap-y-1 text-sm">
        <dt className="text-black/50">種別</dt>
        <dd>{job.category}</dd>
        <dt className="text-black/50">場所</dt>
        <dd>{job.location}</dd>
        <dt className="text-black/50">条件</dt>
        <dd>{job.pay}</dd>
      </dl>

      <p className="text-sm leading-relaxed text-black/80">{job.description}</p>

      {job.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {job.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-brand-bg px-2 py-0.5 text-xs text-black/60">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <a
        href={siteConfig.lineUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-xl bg-brand-primary py-2.5 text-center text-sm font-semibold text-white"
      >
        この案件をLINEで相談する
      </a>
    </article>
  );
}
