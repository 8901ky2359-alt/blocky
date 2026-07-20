'use client';

export type Tab = 'calendar' | 'summary' | 'map' | 'report';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'calendar', label: 'カレンダー', icon: '📅' },
  { key: 'summary', label: '売上', icon: '💰' },
  { key: 'map', label: '地図', icon: '🗺' },
  { key: 'report', label: '報告', icon: '📄' },
];

export default function BottomNav({ tab, onChange }: { tab: string; onChange: (t: Tab) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-white/95 backdrop-blur">
      <div className="mx-auto grid max-w-[480px] grid-cols-4">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${
                active ? 'text-brand-primary' : 'text-black/50'
              }`}
            >
              <span
                className={`grid h-8 w-8 place-items-center rounded-full text-lg ${
                  active ? 'bg-brand-soft' : ''
                }`}
              >
                {t.icon}
              </span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
