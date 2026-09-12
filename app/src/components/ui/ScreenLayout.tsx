import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cn } from '@/lib/utils';

interface ScreenLayoutProps extends ViewProps {
  className?: string;
  children: React.ReactNode;
  useSafeArea?: boolean;
}

export function ScreenLayout({
  className,
  children,
  useSafeArea = true,
  ...props
}: ScreenLayoutProps) {
  const Wrapper = useSafeArea ? SafeAreaView : View;
  const { colorScheme } = useColorScheme();

  return (
    <View className="flex-1 bg-background">
      {/*
        A barra segue o tema do app, e não o do sistema: com `style="auto"` ela
        leria a preferência do aparelho e mostraria ícone branco sobre o fundo
        claro de quem escolheu claro dentro do app. Estava fixa em `light`, o
        que funcionava enquanto o claro não existia.
      */}
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Wrapper className={cn('flex-1', className)} {...props}>
        {children}
      </Wrapper>
    </View>
  );
}
