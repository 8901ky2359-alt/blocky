'use client';

import { useCallback, useEffect, useState } from 'react';
import AuthGate from '@/components/fw/AuthGate';
import Screen from '@/components/fw/Screen';
import { Avatar, Card, Section } from '@/components/fw/ui';
import { ApiError, createMember, deleteMember, listUsers, updateMember } from '@/lib/fw/api';
import { User } from '@/lib/fw/types';

export default function MembersPage() {
  return <AuthGate role="admin">{(user) => <MembersInner me={user} />}</AuthGate>;
}

const ERRORS: Record<string, string> = {
  'name-required': '名前を入力してください',
  'invalid-email': 'メールアドレスの形式が正しくありません',
  'weak-password': 'パスワードは6文字以上にしてください',
  'email-taken': 'そのメールアドレスはもう使われています',
};

function errText(e: unknown, fallback: string): string {
  return (e instanceof ApiError && ERRORS[e.code]) || fallback;
}

function MembersInner({ me }: { me: User }) {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => listUsers().then((r) => setUsers(r.users)).catch(() => {}), []);
  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await createMember(name.trim(), email.trim(), password);
      setMsg({ ok: true, text: `${name.trim()}さんを追加しました。メールアドレスとパスワードを本人に伝えてください` });
      setName('');
      setEmail('');
      setPassword('');
      await load();
    } catch (e) {
      setMsg({ ok: false, text: errText(e, '追加できませんでした') });
    } finally {
      setBusy(false);
    }
  }

  async function edit(u: User, field: 'email' | 'password') {
    const label = field === 'email' ? '新しいメールアドレス' : '新しいパスワード（6文字以上）';
    const value = prompt(`${u.name}さんの${label}`, field === 'email' ? u.email : '');
    if (!value) return;
    try {
      await updateMember(u.id, { [field]: value.trim() });
      alert(field === 'email' ? 'メールアドレスを変更しました' : 'パスワードを変更しました。本人に伝えてください');
      await load();
    } catch (e) {
      alert(errText(e, '変更できませんでした'));
    }
  }

  async function remove(u: User) {
    if (!confirm(`${u.name}さんのアカウントを削除しますか？（入力済みの売上は残ります）`)) return;
    try {
      await deleteMember(u.id);
      await load();
    } catch {
      alert('削除できませんでした');
    }
  }

  return (
    <Screen title="仲間" back={{ href: '/', label: '総合管理画面' }}>
      <Section title="仲間を追加">
        <Card className="p-4">
          <form onSubmit={add} className="grid gap-3">
            <input id="m-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="名前" className="input" />
            <input id="m-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="メールアドレス" className="input" />
            <input id="m-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="パスワード（6文字以上）" className="input" />
            <button disabled={busy || !name || !email || !password} className="rounded-xl bg-fw-green py-3 font-bold text-white disabled:opacity-40">
              {busy ? '追加中…' : '追加する'}
            </button>
            {msg && <p className={`text-sm ${msg.ok ? 'text-fw-green' : 'text-fw-red'}`}>{msg.text}</p>}
          </form>
        </Card>
      </Section>

      <Section title="アカウント一覧">
        <Card>
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 border-b border-fw-line px-4 py-3 last:border-b-0">
              <Avatar name={u.name} id={u.id} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">
                  {u.name}
                  {u.role === 'admin' && <span className="ml-1 text-xs font-normal text-fw-muted">（総合管理画面）</span>}
                </span>
                <span className="block truncate text-xs text-fw-muted">{u.email}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1 text-xs">
                <button onClick={() => edit(u, 'email')} className="text-fw-green">
                  メール変更
                </button>
                <button onClick={() => edit(u, 'password')} className="text-fw-green">
                  パスワード変更
                </button>
                {u.id !== me.id && (
                  <button onClick={() => remove(u)} className="text-fw-red">
                    削除
                  </button>
                )}
              </span>
            </div>
          ))}
        </Card>
      </Section>
    </Screen>
  );
}
