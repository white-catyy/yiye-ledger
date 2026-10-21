import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';

export type AppIconName =
  | 'plus'
  | 'edit'
  | 'back'
  | 'trash'
  | 'clock'
  | 'wallet'
  | 'trend'
  | 'check'
  | 'close'
  | 'chevron-right'
  | 'document';

const SF_NAMES = {
  plus: 'plus',
  edit: 'pencil',
  back: 'chevron.left',
  trash: 'trash',
  clock: 'clock',
  wallet: 'wallet.bifold',
  trend: 'chart.line.uptrend.xyaxis',
  check: 'checkmark',
  close: 'xmark',
  'chevron-right': 'chevron.right',
  document: 'doc.text',
} as const;

const MATERIAL_NAMES: Record<
  AppIconName,
  ComponentProps<typeof MaterialIcons>['name']
> = {
  plus: 'add',
  edit: 'edit',
  back: 'arrow-back',
  trash: 'delete-outline',
  clock: 'schedule',
  wallet: 'account-balance-wallet',
  trend: 'timeline',
  check: 'check',
  close: 'close',
  'chevron-right': 'chevron-right',
  document: 'receipt-long',
};

type AppIconProps = {
  name: AppIconName;
  size?: number;
  color: string;
};

export function AppIcon({ name, size = 20, color }: AppIconProps) {
  if (process.env.EXPO_OS === 'ios') {
    return (
      <SymbolView
        name={SF_NAMES[name]}
        size={size}
        weight="medium"
        tintColor={color}
        resizeMode="scaleAspectFit"
      />
    );
  }

  return <MaterialIcons name={MATERIAL_NAMES[name]} size={size} color={color} />;
}
