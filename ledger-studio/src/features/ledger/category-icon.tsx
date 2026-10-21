import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import type { SFSymbol } from 'sf-symbols-typescript';

import { CATEGORY_BY_ID, type CategoryId } from './model';

type CategoryIconProps = {
  categoryId: CategoryId;
  size?: number;
  color?: string;
};

export function CategoryIcon({ categoryId, size = 21, color }: CategoryIconProps) {
  const category = CATEGORY_BY_ID[categoryId] ?? CATEGORY_BY_ID.other;
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
