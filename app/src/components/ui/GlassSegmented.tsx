import { Text, TouchableOpacity } from 'react-native';
import { cn } from '@/lib/utils';
import { Vidro } from './Vidro';

/**
 * O controle segmentado de vidro do kit (`Segmented`): uma faixa de vidro com
 * as opções dentro, e a ativa pintada na primária.
 *
 *     glass, padding 4, radius 16, gap 4
 *     opção: height 34, radius 12, 11,5 / 700; ativa em primary
 *
 * @example
 * <GlassSegmented options={SEGMENTS} value={segment} onChange={setSegment} />
 */
interface GlassSegmentedProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function GlassSegmented<T extends string>({
  options,
  value,
  onChange,
}: GlassSegmentedProps<T>) {
  return (
    <Vidro
      className="flex-row gap-1 rounded-lg p-1"
      classeExterna="rounded-lg"
      accessibilityRole="tablist"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            activeOpacity={0.8}
            className={cn(
              'h-[2.125rem] flex-1 items-center justify-center rounded-md',
              active ? 'bg-primary' : null
            )}
          >
            <Text
              className={cn(
                'text-[0.71875rem] font-bold',
                active ? 'text-primary-foreground' : 'text-muted-foreground'
              )}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </Vidro>
  );
}

export type { GlassSegmentedProps };
