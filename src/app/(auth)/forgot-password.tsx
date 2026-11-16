import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { AuthHero } from '@/components/AuthHero';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { toHebrewError } from '@/lib/errors';
import { validatePasswordReset } from '@/lib/validation';
import { colors, space } from '@/theme/tokens';

const RESEND_SECONDS = 60;

/** Two steps: ask for the email → enter the emailed code and a new password. */
export default function ForgotPassword() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { requestPasswordReset, resetPasswordWithCode } = useAuth();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function sendCode() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErrors({ email: 'כתובת האימייל לא תקינה' });
      return;
    }
    setErrors({});
    setServerError(null);
    setBusy(true);
    try {
      await requestPasswordReset(email);
      setStep('code');
      setResendIn(RESEND_SECONDS);
    } catch (e) {
      setServerError(toHebrewError(e));
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    const r = validatePasswordReset({ code, password, confirm });
    if (!r.ok) {
      setErrors(r.errors);
      return;
    }
    setErrors({});
    setServerError(null);
    setBusy(true);
    try {
      // On success the session appears and the route guard takes the user into the app.
      await resetPasswordWithCode(email, r.value.code, r.value.password);
    } catch (e) {
      setServerError(toHebrewError(e));
      setBusy(false);
    }
  }

  return (
    <Screen scroll onBack={() => (step === 'code' ? setStep('email') : router.back())}>
      <AuthHero subtitle={step === 'email' ? 'איפוס סיסמה' : 'בדוק את המייל שלך'} />

      {step === 'email' ? (
        <>
          <AppText color={colors.textMuted} align="center">
            נשלח אליך קוד במייל, ואיתו תוכל לבחור סיסמה חדשה.
          </AppText>
          <TextField
            label="אימייל"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            error={errors.email}
            onSubmitEditing={sendCode}
          />
          {serverError ? (
            <AppText color={colors.negative} align="center">
              {serverError}
            </AppText>
          ) : null}
          <Button title="שליחת קוד" onPress={sendCode} loading={busy} />
        </>
      ) : (
        <>
          <AppText color={colors.textMuted} align="center">
            {`אם ‎${email.trim()}‎ רשום אצלנו, נשלח אליו קוד. כדאי לבדוק גם בספאם.`}
          </AppText>
          <TextField
            label="הקוד מהמייל"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={10}
            large
            placeholder="000000"
            error={errors.code}
          />
          <TextField
            label="סיסמה חדשה"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            placeholder="לפחות 6 תווים"
            error={errors.password}
          />
          <TextField
            label="אימות סיסמה"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            error={errors.confirm}
            onSubmitEditing={resetPassword}
          />
          {serverError ? (
            <AppText color={colors.negative} align="center">
              {serverError}
            </AppText>
          ) : null}
          <Button title="שמירת סיסמה וכניסה" onPress={resetPassword} loading={busy} />
          <View style={styles.resend}>
            <Button
              title={resendIn > 0 ? `שליחת קוד חדש (${resendIn})` : 'שליחת קוד חדש'}
              variant="ghost"
              compact
              disabled={resendIn > 0 || busy}
              onPress={sendCode}
            />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  resend: { alignItems: 'center', marginTop: space(1) },
});
