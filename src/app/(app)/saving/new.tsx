import { useRouter } from 'expo-router';

import { SavingForm } from '@/components/SavingForm';
import { Screen } from '@/components/Screen';
import { useCreateSaving } from '@/data/savings';
import { toHebrewError } from '@/lib/errors';

export default function NewSaving() {
  const router = useRouter();
  const create = useCreateSaving();

  return (
    <Screen title="חיסכון חדש" onBack={() => router.back()} scroll>
      <SavingForm
        mode="create"
        submitting={create.isPending}
        serverError={create.error ? toHebrewError(create.error) : null}
        onSubmit={(value) =>
          create.mutate(
            { ...value, openingAgorot: value.openingAgorot ?? 0 },
            { onSuccess: (id) => router.replace({ pathname: '/saving/[id]', params: { id } }) },
          )
        }
      />
    </Screen>
  );
}

