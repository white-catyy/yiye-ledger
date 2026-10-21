import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  TabList,
  Tabs,
  TabSlot,
  TabTrigger,
  type TabListProps,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLedger } from '@/features/ledger/ledger-provider';

export default function AppTabs() {
  const { colors } = useLedger();
  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <CustomTabList colors={colors}>
          <TabTrigger asChild href="/" name="home">
            <TabButton colors={colors} icon="home" label="首页" />
          </TabTrigger>
          <TabTrigger asChild href="/explore" name="explore">
            <TabButton colors={colors} icon="receipt-long" label="明细" />
          </TabTrigger>
          <TabTrigger asChild href="/profile" name="profile">
            <TabButton colors={colors} icon="person-outline" label="我的" />
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

type TabButtonProps = TabTriggerSlotProps & {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  colors: ReturnType<typeof useLedger>['colors'];
};

function TabButton({
  icon,
  label,
  isFocused,
  ref: _ref,
  colors,
  ...props
}: TabButtonProps) {
  return (
    <Pressable
      {...props}
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <View
        style={[
          styles.tabIcon,
          isFocused && { backgroundColor: colors.frost },
        ]}>
        <MaterialIcons
          color={isFocused ? colors.ink : colors.muted}
          name={icon}
          size={20}
        />
      </View>
      <Text
        style={[
          styles.tabLabel,
          { color: isFocused ? colors.ink : colors.muted },
          isFocused && styles.tabLabelActive,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

function CustomTabList({
  colors,
  ...props
}: TabListProps & { colors: ReturnType<typeof useLedger>['colors'] }) {
  return (
    <View {...props} style={[styles.tabList, { backgroundColor: colors.card }]}>
      <View style={styles.tabItems}>{props.children}</View>
      <View pointerEvents="none" style={[styles.gesturePill, { backgroundColor: colors.ink }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    height: '100%',
  },
  tabList: {
    position: 'absolute',
    zIndex: 10,
    right: 0,
    bottom: 0,
    left: 0,
    height: 86,
    borderTopWidth: 1,
    borderTopColor: 'rgba(29, 73, 98, 0.07)',
  },
  tabItems: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 36,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
  },
  tabIcon: {
    width: 58,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  tabLabelActive: {
    fontWeight: '800',
  },
  gesturePill: {
    position: 'absolute',
    bottom: 4,
    left: '50%',
    width: 108,
    height: 4,
    marginLeft: -54,
    borderRadius: 2,
    opacity: 0.8,
  },
  pressed: {
    opacity: 0.7,
  },
});
