import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Screen } from '@/components/Screen';
import { ErrorState, LoadingState } from '@/components/States';
import { TextField } from '@/components/TextField';
import {
  useLeaveHousehold,
  useMembers,
  useMyHousehold,
  useRegenerateInviteCode,
  useRemoveMember,
  useRenameHousehold,
} from '@/data/household';
import { toHebrewError } from '@/lib/errors';
import type { Member } from '@/lib/types';
import { row } from '@/theme/rtl';
import { colors, radius, space } from '@/theme/tokens';

type Dialog = { type: 'regenerate' } | { type: 'remove'; member: Member } | { type: 'leave' } | { type: 'leaveLast' } | null;

export default function Settings() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const household = useMyHousehold();
  const members = useMembers();
  const rename = useRenameHousehold();
  const regenerate = useRegenerateInviteCode();
  const remove = useRemoveMember();
  const leave = useLeaveHousehold();

  const [name, setName] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  const myId = session?.user.id;
  const list = members.data ?? [];
  const isOwner = list.some((m) => m.user_id === myId && m.role === 'owner');
  const h = household.data;

  if (household.isPending || members.isPending) {
    return (
      <Screen title="הגדרות" onBack={() => router.back()}>
        <LoadingState />
      </Screen>
    );
  }
  if (household.isError || members.isError || !h) {
    const err = household.error ?? members.error;
    return (
      <Screen title="הגדרות" onBack={() => router.back()}>
        <ErrorState
          message={toHebrewError(err)}
          onRetry={() => {
            void household.refetch();
            void members.refetch();
          }}
        />
      </Screen>
    );
  }

  const nameValue = name ?? h.name;
  const nameChanged = nameValue.trim() !== h.name && nameValue.trim().length > 0;

  async function share() {
    setShareError(null);
    try {
      await Share.share({
        message: `הצטרפו אליי למעקב החסכונות שלנו! באפליקציה "מעקב חסכונות" בוחרים "הצטרפות עם קוד הזמנה" ומקלידים: ${h!.invite_code}`,
      });
    } catch {
      setShareError('לא הצלחנו לפתוח שיתוף. אפשר להעתיק את הקוד ידנית.');
    }
  }

  const closeDialog = () => {
    setDialog(null);
    regenerate.reset();
    remove.reset();
    leave.reset();
  };

  const dialogProps = (() => {
    switch (dialog?.type) {
      case 'regenerate':
        return {
          title: 'ליצור קוד הזמנה חדש?',
          message: 'הקוד הנוכחי יפסיק לעבוד. מי שכבר הצטרף יישאר במשק הבית.',
          confirmText: 'יצירת קוד חדש',
          destructive: false,
          loading: regenerate.isPending,
          error: regenerate.error ? toHebrewError(regenerate.error) : null,
          onConfirm: () => regenerate.mutate(undefined, { onSuccess: closeDialog }),
        };
      case 'remove':
        return {
          title: `להסיר את ${dialog.member.display_name || 'החבר'}?`,
          message: 'הוא לא יוכל לראות יותר את החסכונות של משק הבית.',
          confirmText: 'הסרה',
          destructive: true,
          loading: remove.isPending,
          error: remove.error ? toHebrewError(remove.error) : null,
          onConfirm: () => remove.mutate(dialog.member.user_id, { onSuccess: closeDialog }),
        };
      case 'leave':
        return {
          title: 'לעזוב את משק הבית?',
          message: 'החסכונות יישארו אצל שאר החברים. כדי לחזור תצטרך קוד הזמנה.',
          confirmText: 'עזיבה',
          destructive: true,
          loading: leave.isPending,
          error: leave.error && !String(leave.error.message).includes('LAST_MEMBER') ? toHebrewError(leave.error) : null,
          // The server decides whether we're the last member (the cached list may be stale).
          onConfirm: () =>
            leave.mutate(false, {
              onError: (e) => {
                if (String(e.message).includes('LAST_MEMBER')) {
                  leave.reset();
                  setDialog({ type: 'leaveLast' });
                }
              },
            }),
        };
      case 'leaveLast':
        return {
          title: 'אתה החבר האחרון',
          message: 'אם תעזוב, משק הבית וכל החסכונות וההיסטוריה שלו יימחקו לצמיתות. להמשיך?',
          confirmText: 'כן, למחוק הכול',
          destructive: true,
          loading: leave.isPending,
          error: leave.error ? toHebrewError(leave.error) : null,
          onConfirm: () => leave.mutate(true),
        };
      default:
        return null;
    }
  })();

  return (
    <Screen title="הגדרות" onBack={() => router.back()} scroll>
      <Section title="משק הבית" icon="home-outline">
        {isOwner ? (
          <>
            <TextField label="שם" value={nameValue} onChangeText={setName} maxLength={60} />
            {rename.error ? <AppText color={colors.negative}>{toHebrewError(rename.error)}</AppText> : null}
            {nameChanged ? (
              <Button
                title="שמירת השם"
                compact
                loading={rename.isPending}
                onPress={() => rename.mutate(nameValue, { onSuccess: () => setName(null) })}
              />
            ) : null}
          </>
        ) : (
          <AppText size="lg" weight="bold">
            {h.name}
          </AppText>
        )}
      </Section>

      <Section title="הזמנת בן/בת זוג" icon="account-heart-outline">
        <AppText color={colors.textMuted} size="sm">
          שולחים את הקוד, והם בוחרים &quot;הצטרפות עם קוד הזמנה&quot; אחרי ההרשמה.
        </AppText>
        <View style={styles.codeBox}>
          <AppText size="xl" weight="bold" align="center" selectable style={styles.code}>
            {h.invite_code}
          </AppText>
        </View>
        {shareError ? (
          <AppText size="sm" color={colors.negative}>
            {shareError}
          </AppText>
        ) : null}
        <Button title="שיתוף הקוד" icon="share-variant" onPress={share} />
        {isOwner ? (
          <Button title="יצירת קוד חדש" variant="ghost" compact onPress={() => setDialog({ type: 'regenerate' })} />
        ) : null}
      </Section>

      <Section title="חברים" icon="account-group-outline">
        {list.map((m, i) => (
          <View key={m.user_id} style={[styles.memberRow, i > 0 && styles.divider]}>
            <View style={styles.avatar}>
              <AppText weight="bold" color={colors.primary} align="center">
                {(m.display_name || '?').slice(0, 1)}
              </AppText>
            </View>
            <View style={styles.flex}>
              <AppText weight="medium">
                {m.display_name || 'ללא שם'}
                {m.user_id === myId ? ' (את/ה)' : ''}
              </AppText>
              {m.role === 'owner' ? (
                <AppText size="xs" color={colors.primary}>
                  מנהל/ת
                </AppText>
              ) : null}
            </View>
            {isOwner && m.user_id !== myId ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`הסרת ${m.display_name}`}
                hitSlop={10}
                onPress={() => setDialog({ type: 'remove', member: m })}
              >
                <MaterialCommunityIcons name="account-remove-outline" size={22} color={colors.negative} />
              </Pressable>
            ) : null}
          </View>
        ))}
      </Section>

      <View style={styles.bottom}>
        <Button title="התנתקות" variant="secondary" icon="logout" onPress={() => signOut()} />
        <Button title="עזיבת משק הבית" variant="danger" onPress={() => setDialog({ type: 'leave' })} />
      </View>

      {dialogProps ? <ConfirmDialog visible onCancel={closeDialog} {...dialogProps} /> : null}
    </Screen>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: 'home-outline' | 'account-heart-outline' | 'account-group-outline';
  children: React.ReactNode;
}) {
  return (
    <Card style={styles.section}>
      <View style={styles.sectionTitle}>
        <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
        <AppText weight="bold" color={colors.textMuted}>
          {title}
        </AppText>
      </View>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: space(3) },
  sectionTitle: { flexDirection: row, alignItems: 'center', gap: space(2) },
  codeBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingVertical: space(4),
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
  },
  code: { letterSpacing: 6, color: colors.primaryDark },
  memberRow: { flexDirection: row, alignItems: 'center', gap: space(3), paddingVertical: space(2.5) },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: { gap: space(3), marginTop: space(2) },
});
