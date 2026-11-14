import { useState } from 'react';
import { View } from 'react-native';

import { AmountText } from '@/components/AmountText';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { LOCATION_TYPES, locationIcon, locationLabel } from '@/lib/locationTypes';
import type { LocationType } from '@/lib/types';
import { row } from '@/theme/rtl';
import { colors } from '@/theme/tokens';

/** Temporary design preview; replaced by the real home screen in Task 7. */
export default function Index() {
  const [type, setType] = useState<LocationType>('bank_account');
  return (
    <Screen title="תצוגת עיצוב" scroll>
      <Card style={{ backgroundColor: colors.primary, gap: 4 }}>
        <AppText color={colors.primarySoft}>סה״כ חסכונות</AppText>
        <AmountText agorot={18425000} size="xl" color={colors.primaryText} />
      </Card>
      <Card>
        <AppText weight="bold" size="lg">
          דירה
        </AppText>
        <AppText color={colors.textMuted}>קרן השתלמות · מיטב</AppText>
        <AmountText agorot={12000000} size="lg" />
        <AmountText agorot={50000} kind="deposit" />
        <AmountText agorot={50000} kind="withdrawal" />
      </Card>
      <View style={{ flexDirection: row, flexWrap: 'wrap', gap: 8 }}>
        {LOCATION_TYPES.map((t) => (
          <Chip key={t} label={locationLabel(t)} icon={locationIcon(t)} selected={t === type} onPress={() => setType(t)} />
        ))}
      </View>
      <TextField label="למה החיסכון?" placeholder="למשל: דירה" />
      <TextField label="סכום" large keyboardType="decimal-pad" placeholder="0" />
      <Button title="הוסף כסף" icon="plus" onPress={() => {}} />
      <Button title="משוך" variant="secondary" icon="minus" onPress={() => {}} />
      <Button title="מחק" variant="danger" onPress={() => {}} />
    </Screen>
  );
}
