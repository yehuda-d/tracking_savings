import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { searchFunds, type FundSearchResult } from '@/data/gemelnet';
import { toHebrewError } from '@/lib/errors';
import { formatPeriodHe } from '@/lib/fundYield';
import { backIcon, row } from '@/theme/rtl';
import { colors, radius, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { TextField } from './TextField';

export interface PickedFund {
  fundId: number;
  name: string;
  /** Latest published month at the time of linking. */
  period: number;
}

export interface FundPickerProps {
  visible: boolean;
  initialQuery?: string;
  onPick: (fund: PickedFund) => void;
  onClose: () => void;
}

/** Full-screen search over official Gemel-Net funds (by name or fund number). */
export function FundPicker({ visible, initialQuery = '', onPick, onClose }: FundPickerProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {visible ? <PickerBody initialQuery={initialQuery} onPick={onPick} onClose={onClose} /> : null}
    </Modal>
  );
}

function PickerBody({ initialQuery, onPick, onClose }: Omit<FundPickerProps, 'visible'>) {
  const [query, setQuery] = useState(initialQuery ?? '');
  const [results, setResults] = useState<FundSearchResult[]>([]);
  const [period, setPeriod] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Debounced search; ignores stale responses.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let cancelled = false;
    const t = setTimeout(() => {
      setStatus('loading');
      searchFunds(q)
        .then((r) => {
          if (cancelled) return;
          setResults(r.results);
          setPeriod(r.period);
          setStatus('idle');
        })
        .catch((e) => {
          if (cancelled) return;
          setError(toHebrewError(e));
          setStatus('error');
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const tooShort = query.trim().length < 2;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="חזרה" hitSlop={12}>
          <MaterialCommunityIcons name={backIcon} size={28} color={colors.text} />
        </Pressable>
        <AppText size="lg" weight="bold">
          קישור לקרן
        </AppText>
      </View>
      <View style={styles.search}>
        <TextField
          label="שם הקרן או מספר קופה"
          value={query}
          onChangeText={setQuery}
          autoFocus
          placeholder="למשל: מיטב השתלמות כללי"
        />
        <AppText size="xs" color={colors.textMuted}>
          לפי נתוני גמל-נט הרשמיים של רשות שוק ההון
          {period ? ` · מעודכן עד ${formatPeriodHe(period)}` : ''}
        </AppText>
      </View>
      {status === 'loading' ? <ActivityIndicator style={styles.spinner} color={colors.primary} /> : null}
      {status === 'error' ? (
        <AppText color={colors.negative} align="center" style={styles.message}>
          {error}
        </AppText>
      ) : null}
      <FlatList
        data={tooShort ? [] : results}
        keyExtractor={(f) => String(f.fundId)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          status === 'idle' ? (
            <AppText color={colors.textMuted} align="center" style={styles.message}>
              {tooShort ? 'הקלידו לפחות 2 תווים' : 'לא נמצאו קרנות. נסו מילה אחרת או את מספר הקופה מהדוח.'}
            </AppText>
          ) : undefined
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => period && onPick({ fundId: item.fundId, name: item.name, period })}
            accessibilityRole="button"
            accessibilityLabel={item.name}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <AppText weight="medium">{item.name}</AppText>
            <AppText size="xs" color={colors.textMuted}>
              {item.classification} · {item.manager} · מס׳ {item.fundId}
            </AppText>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: row, alignItems: 'center', gap: space(2), padding: space(5), paddingBottom: space(2) },
  search: { paddingHorizontal: space(5), gap: space(1.5) },
  spinner: { marginTop: space(4) },
  message: { padding: space(6) },
  list: { padding: space(5), gap: space(2) },
  item: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space(4),
    gap: space(1),
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.7 },
});
