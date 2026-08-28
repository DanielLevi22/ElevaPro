import { useState } from 'react';
import { Text, TextInput, type TextInputProps, View } from 'react-native';
import colors from '@/constants/colors';
import { cn } from '@/lib/utils';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  className?: string;
}

export function Input({ label, error, className, style, ...props }: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className={className}>
      {label && <Text className="text-white font-semibold text-sm mb-2 font-sans">{label}</Text>}
      <TextInput
        placeholderTextColor={colors.text.disabled}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        className={cn(
          'bg-zinc-900/80 border-2 rounded-2xl px-4 py-4 text-base h-14',
          isFocused && !error && 'border-secondary',
          !isFocused && !error && 'border-zinc-700',
          error && 'border-red-400',
          !props.editable && props.editable !== undefined && 'opacity-60'
        )}
        style={[
          {
            color: colors.text.primary,
            fontSize: 16,
          },
          style,
        ]}
        {...props}
      />
      {error && <Text className="text-red-400 text-sm mt-1 font-sans">{error}</Text>}
    </View>
  );
}
