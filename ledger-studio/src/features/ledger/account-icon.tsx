import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';

import { getAccountKindDefinition, type LedgerAccountKind } from './model';

type AccountIconProps = {
  kind: LedgerAccountKind;
  size?: number;
  color: string;
};

export function AccountIcon({
  kind,
  size = 20,
  color,
}: AccountIconProps) {
  const definition = getAccountKindDefinition(kind);

  if (process.env.EXPO_OS === 'ios') {
    return (
      <SymbolView
        name={definition.sf as ComponentProps<typeof SymbolView>['name']}
        size={size}
        weight="medium"
        tintColor={color}
        resizeMode="scaleAspectFit"
      />
    );
  }

  return (
    <MaterialIcons
      name={
        definition.material as ComponentProps<typeof MaterialIcons>['name']
      }
      size={size}
      color={color}
    />
  );
}
