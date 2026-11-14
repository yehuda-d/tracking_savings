import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useCreateHousehold, useJoinHousehold } from '@/data/household';
import { toHebrewError } from '@/lib/errors';
import { row } from '@/theme/rtl';
import { colors, space } from '@/theme/tokens';

export default function Onboarding() {
  const { signOut } = useAuth();
  const create = useCreateHousehold();
  const join = useJoinHousehold();
  const [name, setName] = useState('הבית שלנו');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | undefined>();
  const busy = create.isPending || join.isPending;

  function submitJoin() {
    const clean = code.trim().toUpperCase();
    if (clean.length !== 8) {
      setCodeError('קוד ההזמנה הוא 8 תווים');
      return;
    }
    setCodeError(undefined);
    join.mutate(clean);
  }

  return (
    <Screen
      scroll
      right={<Button title="התנתקות" variant="ghost" compact onPress={() => signOut()} disabled={busy} />}
    >
      <View style={styles.hero}>
        <AppText size="xl" weight="bold">
          ברוכים הבאים!
        </AppText>
        <AppText color={colors.textMuted}>
          החסכונות שייכים למשק בית משותף. אפשר לפתוח משק בית חדש, או להצטרף לבן/בת הזוג עם קוד הזמנה.
        </AppText>
      </View>

      <Card style={styles.card}>
        <CardTitle icon="home-heart" title="פתיחת משק בית חדש" />
        <TextField label="שם משק הבית" value={name} onChangeText={setName} maxLength={60} />
        {create.error ? <AppText color={colors.negative}>{toHebrewError(create.error)}</AppText> : null}
        <Button title="פתיחה" onPress={() => create.mutate(name)} loading={create.isPending} disabled={join.isPending} />
      </Card>

      <Card style={styles.card}>
        <CardTitle icon="account-multiple-plus" title="הצטרפות עם קוד הזמנה" />
        <TextField
          label="קוד הזמנה"
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={8}
          placeholder="למשל: K7QM2XPA"
          error={codeError}
          onSubmitEditing={submitJoin}
        />
        {join.error ? <AppText color={colors.negative}>{toHebrewError(join.error)}</AppText> : null}
        <Button
          title="הצטרפות"
          variant="secondary"
          onPress={submitJoin}
          loading={join.isPending}
          disabled={create.isPending}
        />
      </Card>
    </Screen>
  );
}

function CardTitle({ icon, title }: { icon: 'home-heart' | 'account-multiple-plus'; title: string }) {
  return (
    <View style={styles.cardTitle}>
      <View style={styles.iconBubble}>
        <MaterialCommunityIcons name={icon} size={22} color={colors.primary} />
      </View>
      <AppText size="lg" weight="bold">
        {title}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space(2), marginTop: space(2) },
  card: { gap: space(4) },
  cardTitle: { flexDirection: row, alignItems: 'center', gap: space(3) },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
