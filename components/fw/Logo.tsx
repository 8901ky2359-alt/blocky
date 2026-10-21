// Field Watch のマーク（時計＋草のライン）

export default function Logo({ size = 56 }: { size?: number }) {
  return (
    <span
      className="grid place-items-center rounded-[22%] bg-gradient-to-b from-[#3fb36a] to-[#1f7d43]"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 30 30" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" style={{ width: size * 0.56 }}>
        <circle cx="15" cy="13.5" r="7.8" />
        <path d="M15 9v4.5l3 2" />
        <path d="M5 24.5c2.6-2.3 4.4-2.3 6.1-.8s3.6 1.5 6.1 0 4.4-1.5 6.6.8" />
      </svg>
    </span>
  );
}
