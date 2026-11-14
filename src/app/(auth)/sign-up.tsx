import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { AuthHero } from '@/components/AuthHero';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { toHebrewError } from '@/lib/errors';
import { colors, space } from '@/theme/tokens';

export default function SignUp() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim() || !email.trim() || !password) {
      setError('נא למלא את כל השדות');
      return;
    }
    if (password.length < 6) {
      setError('הסיסמה צריכה להיות לפחות 6 תווים');
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const signedIn = await signUp(email, password, name);
      if (!signedIn) setInfo('נשלח אליך מייל לאימות החשבון. אחרי האימות אפשר להתחבר.');
    } catch (e) {
      setError(toHebrewError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen scroll>
        <AuthHero subtitle="יוצרים חשבון ומתחילים לעקוב" />
        <TextField label="שם" value={name} onChangeText={setName} autoComplete="name" placeholder="איך לקרוא לך?" />
        <TextField
          label="אימייל"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <TextField
          label="סיסמה"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          placeholder="לפחות 6 תווים"
          onSubmitEditing={submit}
        />
        {error ? (
          <AppText color={colors.negative} align="center">
            {error}
          </AppText>
        ) : null}
        {info ? (
          <AppText color={colors.primaryDark} align="center">
            {info}
          </AppText>
        ) : null}
        <Button title="הרשמה" onPress={submit} loading={busy} />
        <Link href="/sign-in" replace style={styles.link}>
          <AppText color={colors.primary} weight="medium" align="center">
            כבר יש לך חשבון? להתחברות
          </AppText>
        </Link>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  link: { alignSelf: 'center', padding: space(2) },
});
