import { Heebo_400Regular, Heebo_500Medium, Heebo_700Bold, useFonts } from '@expo-google-fonts/heebo';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { useMyHousehold } from '@/data/household';
import { queryKeys } from '@/data/queryKeys';
import { shouldResyncHousehold, toHebrewError } from '@/lib/errors';
import { householdStateOf, resolveRoute, type RouteGroup } from '@/lib/routing';
import { supabaseConfigured } from '@/lib/supabase';
import { colors } from '@/theme/tokens';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.documentElement.dir = 'rtl';
  document.documentElement.lang = 'he';
}

SplashScreen.preventAutoHideAsync().catch(() => {});

function groupOf(first: string | undefined): RouteGroup {
  if (first === '(auth)') return 'auth';
  if (first === 'onboarding') return 'onboarding';
  return 'app';
}

function Guard() {
  const { session, loading, signOut } = useAuth();
  const household = useMyHousehold();
  const segments = useSegments();
  const router = useRouter();
  const currentGroup = groupOf(segments[0]);

  const householdState = householdStateOf(household);

  const target = resolveRoute({ authLoading: loading, hasSession: Boolean(session), household: householdState, currentGroup });

  useEffect(() => {
    // Typed routes omit '/' for a group index, so cast; RouteTarget is a closed union of real paths.
    if (target) router.replace(target as Href);
  }, [target, router]);

  const waiting = loading || (Boolean(session) && householdState === 'loading');

  useEffect(() => {
    if (!waiting) SplashScreen.hideAsync().catch(() => {});
  }, [waiting]);

  if (waiting) return <LoadingState />;
  if (session && householdState === 'error') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <ErrorState message={toHebrewError(household.error)} onRetry={() => household.refetch()} />
        <View style={{ padding: 24 }}>
          <Button title="התנתקות" variant="ghost" onPress={() => signOut()} />
        </View>
      </SafeAreaView>
    );
  }
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Heebo_400Regular, Heebo_500Medium, Heebo_700Bold });
  const [queryClient] = useState(() => {
    // Errors that mean "you're not in this household anymore" (removed while offline,
    // missed realtime event) trigger a household refetch so the guard can reroute.
    const onError = (err: unknown) => {
      if (shouldResyncHousehold(err)) void client.invalidateQueries({ queryKey: queryKeys.household });
    };
    const client: QueryClient = new QueryClient({
      defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
      queryCache: new QueryCache({ onError }),
      mutationCache: new MutationCache({ onError }),
    });
    return client;
  });

  if (!fontsLoaded && !fontError) return null;

  if (!supabaseConfigured) {
    SplashScreen.hideAsync().catch(() => {});
    return (
      <EmptyState
        icon="cog-outline"
        title="האפליקציה עוד לא מחוברת לשרת"
        subtitle="חסר קובץ ‎.env עם פרטי Supabase. ראה docs/supabase-setup.md"
      />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="dark" />
        <Guard />
      </AuthProvider>
    </QueryClientProvider>
  );
}
