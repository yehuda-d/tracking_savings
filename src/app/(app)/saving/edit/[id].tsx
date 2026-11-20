import { useLocalSearchParams, useRouter } from 'expo-router';

import { SavingForm } from '@/components/SavingForm';
import { Screen } from '@/components/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { useSaving, useUpdateSaving } from '@/data/savings';
import { toHebrewError } from '@/lib/errors';

export default function EditSaving() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const saving = useSaving(id);
  const update = useUpdateSaving();
  // Opened directly (web refresh / deep link) there is no screen to go back to.
  const leave = () =>
    router.canGoBack() ? router.back() : router.replace({ pathname: '/saving/[id]', params: { id } });

  let body;
  if (saving.isPending) body = <LoadingState />;
  else if (saving.isError && saving.data === undefined)
    body = <ErrorState message={toHebrewError(saving.error)} onRetry={() => saving.refetch()} />;
  else if (!saving.data)
    body = <EmptyState icon="file-question-outline" title="החיסכון לא נמצא" subtitle="ייתכן שנמחק" />;
  else
    body = (
      <SavingForm
        mode="edit"
        initial={saving.data}
        submitting={update.isPending}
        serverError={update.error ? toHebrewError(update.error) : null}
        onSubmit={(value) => update.mutate({ id, ...value }, { onSuccess: leave })}
      />
    );

  return (
    <Screen title="עריכת חיסכון" onBack={leave} scroll={Boolean(saving.data)}>
      {body}
    </Screen>
  );
}
