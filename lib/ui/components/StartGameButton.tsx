// lib/ui/components/StartGameButton.tsx
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Text, ActivityIndicator, Snackbar } from 'react-native-paper';

const START_URL =
  'https://dev-player.frozensun.ru/backend/player/start/65d049cf-8cab-4852-b0c7-5416b0d06b50';

const HEADERS = {
  'Content-Type': 'application/json',
  Authorization: 'Basic dGVzdDp0ZXN0', // test:test
};

const StartGameButton: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string>('(no response yet)');
  const [snack, setSnack] = useState<string | null>(null);

  const onPress = useCallback(async () => {
    setLoading(true);
    setSnack(null);
    setOutput('(waiting…)');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000); // 20s

    try {
      const res = await fetch(START_URL, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({}), // empty JSON body
        signal: controller.signal,
      });

      const contentType = res.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const data = isJson ? await res.json() : await res.text();

      if (!res.ok) {
        const msg = typeof data === 'string' ? data : JSON.stringify(data);
        throw new Error(`HTTP ${res.status}: ${msg}`);
      }

      setOutput(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
      setSnack('Request successful');
    } catch (e: any) {
      setOutput(`Error: ${e?.message || 'Network request failed'}`);
      setSnack(e?.name === 'AbortError' ? 'Request timed out' : 'Request failed');
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, []);

  return (
    <View style={{ padding: 12 }}>
      <Button mode="contained" onPress={onPress} disabled={loading} icon={loading ? undefined : 'play'}>
        {loading ? <ActivityIndicator animating size={16} /> : 'Start Game'}
      </Button>

      <Card style={{ marginTop: 12 }} mode="outlined">
        <Card.Title title="Response" />
        <Card.Content>
          <Text selectable>{output}</Text>
        </Card.Content>
      </Card>

      <Snackbar visible={!!snack} onDismiss={() => setSnack(null)} duration={2500}>
        {snack}
      </Snackbar>
    </View>
  );
};

export default StartGameButton;
