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
        onSubmit={({ purpose, location_type, institution, notes }) =>
          update.mutate({ id, purpose, location_type, institution, notes }, { onSuccess: () => router.back() })
        }
      />
    );

  return (
    <Screen title="עריכת חיסכון" onBack={() => router.back()} scroll={Boolean(saving.data)}>
      {body}
    </Screen>
  );
}

