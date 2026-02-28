import { useEffect } from 'react';
import { getDatabase } from '../db/database';
import { useUIStore } from '../stores/uiStore';

export function useDatabase() {
  const { dbReady, setDbReady, setError } = useUIStore();

  useEffect(() => {
    if (dbReady) return;

    getDatabase()
      .then(() => setDbReady(true))
      .catch((err) => {
        console.error('Failed to initialize database:', err);
        setError('Falha ao inicializar banco de dados');
      });
  }, [dbReady, setDbReady, setError]);

  return { dbReady };
}
