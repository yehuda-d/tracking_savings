import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { row } from '@/theme/rtl';
import { colors, radius, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Button } from './Button';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmText: string;
  cancelText?: string;
  destructive?: boolean;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmText,
  cancelText = 'ביטול',
  destructive,
  loading,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={loading ? undefined : onCancel} accessibilityLabel="סגירה">
        <Pressable style={styles.box} onPress={() => {}}>
          <AppText size="lg" weight="bold">
            {title}
          </AppText>
          {message ? <AppText color={colors.textMuted}>{message}</AppText> : null}
          {error ? <AppText color={colors.negative}>{error}</AppText> : null}
          <View style={styles.actions}>
            <View style={styles.flex}>
              <Button
                title={confirmText}
                variant={destructive ? 'danger' : 'primary'}
                loading={loading}
                onPress={onConfirm}
              />
            </View>
            <View style={styles.flex}>
              <Button title={cancelText} variant="ghost" disabled={loading} onPress={onCancel} />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: space(6) },
  box: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space(5), gap: space(3) },
  actions: { flexDirection: row, gap: space(2), marginTop: space(2) },
  flex: { flex: 1 },
});
