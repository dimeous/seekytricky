import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Button, ActivityIndicator, Snackbar } from 'react-native-paper';
import { useAppDispatch } from '@/lib/store/hooks';
import { setStarted } from '@/lib/store/gameSlice';

// API endpoint and headers
const START_URL =
  'https://dev-player.frozensun.ru/backend/player/start/65d049cf-8cab-4852-b0c7-5416b0d06b50';

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  Authorization: 'Basic dGVzdDp0ZXN0', // test:test
};

const StartComponent: React.FC = () => {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);

  const onStart = useCallback(async () => {
    setLoading(true);
    setSnack(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout

    try {
      const res = await fetch(START_URL, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({}),
        signal: controller.signal,
      });

      const contentType = res.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const payload = isJson ? await res.json() : await res.text();

      if (!res.ok) {
        const msg = typeof payload === 'string' ? payload : JSON.stringify(payload);
        throw new Error(`Request failed (${res.status}): ${msg}`);
      }

      // Expected structure:
      // {
      //   "data": {
      //     "id": "...",
      //     "questId": "...",
      //     "currentStageId": "...",
      //     "status": "STARTED",
      //     ...
      //   }
      // }
      const data = isJson ? payload : null;
      const status = data?.data?.status;
      const currentStageId = data?.data?.currentStageId;
      const questId = data?.data?.questId;

      if (String(status).toUpperCase() === 'STARTED' && currentStageId && questId) {
        dispatch(setStarted({ status, currentStageId, questId }));
        setSnack('Game started ✔️');
      } else {
        setSnack('Unexpected response');
      }
    } catch (e: any) {
      console.warn('Fetch error:', e); // add this
      setSnack(e?.name === 'AbortError' ? 'Request timed out' : e.message || 'Request failed');
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }, [dispatch]);

  return (
    <View style={{ padding: 16 }}>
      <Button
        mode="contained"
        onPress={onStart}
        disabled={loading}
        icon={loading ? undefined : 'play'}
      >
        {loading ? <ActivityIndicator animating size={16} /> : 'Start'}
      </Button>

      <Snackbar visible={!!snack} onDismiss={() => setSnack(null)} duration={2500}>
        {snack}
      </Snackbar>
    </View>
  );
};

export default StartComponent;
