import { NativeTabs } from 'expo-router/native-tabs';

import { useLedger } from '@/features/ledger/ledger-provider';

export default function AppTabs() {
  const { colors } = useLedger();
  return (
    <NativeTabs
      backgroundColor={colors.card}
      disableTransparentOnScrollEdge
      iconColor={{ default: colors.muted, selected: colors.ink }}
      indicatorColor={colors.frost}
      labelStyle={{
        default: {
          color: colors.muted,
          fontSize: 11,
          fontWeight: '600',
        },
        selected: {
          color: colors.ink,
          fontSize: 11,
          fontWeight: '800',
        },
      }}
      labelVisibilityMode="labeled"
      rippleColor={colors.frost}
      shadowColor="rgba(29, 73, 98, 0.08)"
      tabBarRespectsIMEInsets>
      <NativeTabs.Trigger name="index" accessibilityLabel="首页">
        <NativeTabs.Trigger.Label>首页</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          md={{ default: 'home', selected: 'home' }}
          sf={{ default: 'house', selected: 'house.fill' }}
          selectedColor={colors.ink}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore" accessibilityLabel="明细">
        <NativeTabs.Trigger.Label>明细</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          md={{ default: 'receipt_long', selected: 'receipt_long' }}
          sf={{ default: 'list.bullet.rectangle', selected: 'list.bullet.rectangle.fill' }}
          selectedColor={colors.ink}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile" accessibilityLabel="我的">
        <NativeTabs.Trigger.Label>我的</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          md={{ default: 'person_outline', selected: 'person' }}
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          selectedColor={colors.ink}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
