import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import type { SFSymbol } from 'sf-symbols-typescript';

import type { CategoryDefinition } from './model';

type CategoryIconProps = {
  category: CategoryDefinition;
  size?: number;
  color?: string;
};

export function CategoryIcon({ category, size = 21, color }: CategoryIconProps) {
  const iconColor = color ?? category.ink;

  if (process.env.EXPO_OS === 'ios') {
    return (
      <SymbolView
        name={category.sf as SFSymbol}
        size={size}
        weight="medium"
        tintColor={iconColor}
        resizeMode="scaleAspectFit"
      />
    );
  }

  return (
    <MaterialIcons
      name={category.material as ComponentProps<typeof MaterialIcons>['name']}
      size={size}
      color={iconColor}
    />
  );
}
