import React, { useCallback, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { Button, Card, HelperText, Text, TextInput, useTheme, ActivityIndicator, Snackbar } from "react-native-paper";

/**
 * Simple component built with React Native Paper.
 * Renders a text field and a button. When pressed, it sends a GET request with the
 * field value as a query parameter.
 *
 * Usage example:
 *
 * <GetRequester
 *   endpoint="https://httpbin.org/get"
 *   queryParam="q"
 *   label="Search"
 *   placeholder="Type your query"
 *   buttonLabel="Go"
 *   onSuccess={(json) => console.log(json)}
 * />
 */
export type StartGameProps = {
  /** Base endpoint, e.g. "https://api.example.com/search" */
  endpoint: string;
  /** Name of the query parameter to send the field value in */
  queryParam?: string;
  /** Optional label shown above the input */
  label?: string;
  /** Optional placeholder text inside the input */
  placeholder?: string;
  /** Label for the action button */
  buttonLabel?: string;
  /** Optional headers to include with the GET request */
  headers?: Record<string, string>;
  /**
   * Called with the parsed JSON on success. If the response isn't JSON, you'll
   * get the raw text instead.
   */
  onSuccess?: (data: unknown) => void;
  /** Called when the request fails */
  onError?: (err: Error) => void;
  /**
   * Optional additional static query params to include in the URL
   * (in addition to the user-entered value under `queryParam`).
   */
  extraParams?: Record<string, string | number | boolean | null | undefined>;
  /**
   * If true, show the server response inside the card for quick inspection.
   * Default: true
   */
  showResponsePreview?: boolean;
  /**
   * Optional debounce (ms) for the button becoming enabled after typing.
   * Default: 0 (no debounce)
   */
  enableDebounceMs?: number;
};

export const StartGame: React.FC<StartGameProps> = ({
                                                            endpoint,
                                                            queryParam = "q",
                                                            label = "Query",
                                                            placeholder = "Enter value",
                                                            buttonLabel = "Send",
                                                            headers,
                                                            onSuccess,
                                                            onError,
                                                            extraParams,
                                                            showResponsePreview = true,
                                                            enableDebounceMs = 0,
                                                          }) => {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const theme = useTheme();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [canSend, setCanSend] = useState(false);

  const buildUrl = useCallback(() => {
    const url = new URL(endpoint);
    // Add static params first
    if (extraParams) {
      Object.entries(extraParams).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        url.searchParams.set(k, String(v));
      });
    }
    url.searchParams.set(queryParam, value);
    return url.toString();
  }, [endpoint, extraParams, queryParam, value]);

  const onChangeText = useCallback(
    (t: string) => {
      setValue(t);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!enableDebounceMs) {
        setCanSend(Boolean(t.trim()));
      } else {
        debounceRef.current = setTimeout(() => {
          setCanSend(Boolean(t.trim()));
        }, enableDebounceMs);
      }
    },
    [enableDebounceMs]
  );

  const handleSend = useCallback(async () => {
    setError(null);
    setPreview(null);
    setLoading(true);

    // Timeout with AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s

    try {
      const url = buildUrl();
      const res = await fetch(url, {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      const contentType = res.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const data = isJson ? await res.json() : await res.text();

      if (!res.ok) {
        const msg = typeof data === "string" ? data : JSON.stringify(data);
        throw new Error(`Request failed (${res.status}): ${msg}`);
      }

      setSnackbar("Request successful");
      if (showResponsePreview) {
        setPreview(
          typeof data === "string"
            ? data
            : JSON.stringify(data, null, 2)
        );
      }
      onSuccess?.(data);
    } catch (e: any) {
      const err = e?.name === "AbortError" ? new Error("Request timed out") : (e as Error);
      setError(err.message);
      onError?.(err);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [buildUrl, headers, onError, onSuccess, showResponsePreview]);

  const disabled = useMemo(() => loading || !canSend, [loading, canSend]);

  return (
    <Card style={{ margin: 12 }}>
      <Card.Content>
        <Text variant="titleMedium" style={{ marginBottom: 8 }}>
          {label}
        </Text>
        <TextInput
          mode="outlined"
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
          right={<TextInput.Icon icon="text" />}
          returnKeyType="send"
          onSubmitEditing={() => !disabled && handleSend()}
          style={{ marginBottom: 4 }}
        />
        <HelperText type={error ? "error" : "info"} visible>
          {error ? error : `Will GET ${queryParam}=${value || ""}`}
        </HelperText>
        <View style={{ height: 8 }} />
        <Button mode="contained" onPress={handleSend} disabled={disabled}>
          {loading ? <ActivityIndicator animating size={16} /> : buttonLabel}
        </Button>
        {showResponsePreview && (
          <View style={{ marginTop: 16 }}>
            <Text variant="titleSmall" style={{ marginBottom: 6 }}>
              Response preview
            </Text>
            <Card mode="outlined">
              <Card.Content>
                <Text selectable>{preview ?? "(no response yet)"}</Text>
              </Card.Content>
            </Card>
          </View>
        )}
      </Card.Content>
      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar(null)} duration={2000}>
        {snackbar}
      </Snackbar>
    </Card>
  );
};

export default StartGame;
