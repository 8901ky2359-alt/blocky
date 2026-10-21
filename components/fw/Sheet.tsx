// 下から出るシート

export default function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="mx-auto flex max-h-[90dvh] w-full max-w-[560px] flex-col rounded-t-3xl bg-fw-bg pb-[max(16px,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-[15px] text-fw-green">
            閉じる
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
