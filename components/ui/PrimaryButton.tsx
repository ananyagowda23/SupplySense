import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  icon?: keyof typeof MaterialIcons.glyphMap;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

export function PrimaryButton({
  title,
  onPress,
  icon,
  variant = 'primary',
  size = 'md',
  style,
  textStyle,
  disabled = false,
}: PrimaryButtonProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  let bg = theme.primary;
  let text = '#FFFFFF';
  let border = 'transparent';

  if (variant === 'secondary') {
    bg = theme.surface;
    text = theme.text;
    border = theme.border;
  } else if (variant === 'outline') {
    bg = 'transparent';
    text = theme.primary;
    border = theme.border;
  } else if (variant === 'ghost') {
    bg = 'transparent';
    text = theme.accent;
  }

  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        {
          backgroundColor: disabled ? theme.surfaceSubtle : bg,
          borderColor: disabled ? theme.border : border,
          paddingVertical: isSmall ? Spacing.xs : isLarge ? Spacing.md : Spacing.sm + 2,
          paddingHorizontal: isSmall ? Spacing.sm : isLarge ? Spacing.xl : Spacing.lg,
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}>
      {icon && (
        <MaterialIcons
          name={icon}
          size={isSmall ? 14 : isLarge ? 20 : 16}
          color={disabled ? theme.textMuted : text}
        />
      )}
      <Text
        style={[
          styles.text,
          {
            color: disabled ? theme.textMuted : text,
            fontSize: isSmall
              ? Typography.fontSizes.xs
              : isLarge
              ? Typography.fontSizes.md
              : Typography.fontSizes.sm,
          },
          textStyle,
        ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  text: {
    fontWeight: Typography.fontWeights.bold,
  },
});
