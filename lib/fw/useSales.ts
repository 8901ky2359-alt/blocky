'use client';

import { useCallback, useEffect, useState } from 'react';
import { listSales } from './api';
import { Sale } from './types';

// サーバーから売上一覧を読む（管理者は全員分、仲間は自分の分）
export function useSales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try {
      setSales((await listSales()).sales);
      setError('');
    } catch {
      setError('売上を読み込めませんでした。電波の良いところで開き直してください。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { sales, loading, error, reload };
}
