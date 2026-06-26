'use client';

import { useMemo, useState } from 'react';
import JobCard from '@/components/JobCard';
import { jobs, siteConfig, type JobCategory } from '@/lib/jobs';

type Filter = 'すべて' | JobCategory | '募集中';
const filters: Filter[] = ['すべて', '募集中', '草刈り', '副業'];

// '2026-07-12' → '7月12日更新分'
const toUpdateLabel = (iso: string) => {
  const [, month, day] = iso.split('-');
  return `${Number(month)}月${Number(day)}日更新分`;
};

export default function Home() {
  const [filter, setFilter] = useState<Filter>('すべて');

  const grouped = useMemo(() => {
    const matched = jobs
      .filter((job) => {
        if (filter === 'すべて') return true;
        if (filter === '募集中') return job.status === '募集中';
        return job.category === filter;
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    // 更新日ごとにまとめる（新しい順）
    const map = new Map<string, typeof matched>();
    for (const job of matched) {
      const key = job.updatedAt;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(job);
    }
    return [...map.entries()];
  }, [filter]);

  return (
    <div className="space-y-5 pb-10">
      <header className="card bg-brand-soft space-y-3">
        <h1 className="text-xl font-bold">{siteConfig.title}</h1>
        <p className="text-sm leading-relaxed">{siteConfig.tagline}</p>
        <a
          href={siteConfig.lineUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl bg-brand-primary py-3 text-center text-sm font-bold text-white"
        >
          {siteConfig.lineButtonLabel}
        </a>
      </header>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              filter === f
                ? 'border-brand-primary bg-brand-primary text-white'
                : 'border-black/15 bg-white text-black/70'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {grouped.length === 0 && (
        <p className="card text-center text-sm text-black/50">
          条件に合う案件がまだありません。
        </p>
      )}

      {grouped.map(([date, list]) => (
        <section key={date} className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-brand-primary">
            <span className="h-2 w-2 rounded-full bg-brand-primary" />
            {toUpdateLabel(date)}
          </h2>
          <div className="space-y-3">
            {list.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </section>
      ))}

      <footer className="pt-2 text-center text-xs text-black/40">
        © {siteConfig.title}
      </footer>
    </div>
  );
}
