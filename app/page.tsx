'use client';

import { useEffect } from 'react';
import AuthGate from '@/components/fw/AuthGate';
import Screen from '@/components/fw/Screen';
import NextPaymentCard from '@/components/fw/NextPaymentCard';
import LegacyImportCard from '@/components/fw/LegacyImportCard';
import { AppIcon, Avatar, Card, SaleRow, Section } from '@/components/fw/ui';
import { useSales } from '@/lib/fw/useSales';
import { User } from '@/lib/fw/types';

// ログイン → 総合管理画面（管理者）か管理画面（仲間）
export default function Home() {
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  return <AuthGate>{(user) => (user.role === 'admin' ? <AdminHome user={user} /> : <MemberHome user={user} />)}</AuthGate>;
}

function Who({ user }: { user: User }) {
  return (
    <span className="flex items-center gap-2 py-2 text-sm text-fw-muted">
      <Avatar name={user.name} id={user.id} />
      {user.name}
    </span>
  );
}

function AdminHome({ user }: { user: User }) {
  const { sales, loading, error, reload } = useSales();
  const pending = sales.filter((s) => s.status === 'pending').length;
  return (
    <Screen title="総合管理画面" top={<Who user={user} />}>
      <NextPaymentCard sales={sales} label="次回入金予定 ・ 全員分" tone="green" />
      <LegacyImportCard onImported={reload} />
      <div className="mb-6 grid grid-cols-4 gap-y-4 px-4">
        <AppIcon href="/sales" label="売上入力" letter="売" color="bg-fw-green" />
        <AppIcon href="/invoice" label="請求書作成" letter="請" color="bg-fw-violet" />
        <AppIcon href="/review" label="仲間の入力" letter="入" color="bg-fw-teal" badge={pending} />
        <AppIcon href="/members" label="仲間" letter="人" color="bg-fw-blue" />
        <AppIcon href="/calendar" label="カレンダー" letter="暦" color="bg-fw-orange" />
      </div>
      <Recent sales={sales} loading={loading} error={error} showUser title="最近の入力" />
    </Screen>
  );
}

function MemberHome({ user }: { user: User }) {
  const { sales, loading, error } = useSales();
  return (
    <Screen title="管理画面" top={<Who user={user} />}>
      <NextPaymentCard sales={sales} label={`${user.name}さんの次回入金予定`} tone="blue" />
      <div className="mb-6 grid grid-cols-4 gap-y-4 px-4">
        <AppIcon href="/sales" label="売上入力" letter="売" color="bg-fw-green" />
        <AppIcon href="/invoice" label="請求書作成" letter="請" color="bg-fw-violet" />
      </div>
      <Recent sales={sales} loading={loading} error={error} title="自分の最近の入力" />
    </Screen>
  );
}

function Recent({ sales, loading, error, showUser, title }: { sales: ReturnType<typeof useSales>['sales']; loading: boolean; error: string; showUser?: boolean; title: string }) {
  const recent = [...sales].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);
  return (
    <Section title={`${title}（押すと直せます）`}>
      <Card>
        {loading ? (
          <p className="p-6 text-center text-sm text-fw-muted">読み込み中…</p>
        ) : error ? (
          <p className="p-6 text-center text-sm text-fw-red">{error}</p>
        ) : recent.length === 0 ? (
          <p className="p-6 text-center text-sm text-fw-muted">まだ入力がありません</p>
        ) : (
          recent.map((s) => (
            <SaleRow key={s.id} sale={s} showUser={showUser} onClick={() => (location.href = `/sales?edit=${s.id}&back=/`)} />
          ))
        )}
      </Card>
    </Section>
  );
}
