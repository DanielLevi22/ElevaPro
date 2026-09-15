import { type ConsistencyDay, MESES_CURTOS } from '@elevapro/shared';
import { Text, View } from 'react-native';
import { type Cores, comOpacidade, useCores, useEscala } from '@/shared/design';

/**
 * O heatmap de consistência do kit (`Heatmap`): 13 semanas em colunas, de segunda
 * a domingo, com os meses embaixo e a legenda de intensidade.
 *
 *     rótulos dos dias 8,5 / 700, coluna de 16; células quadradas, gap 3,5, raio 3
 *     tons: trilho, primária a 26%, a 55% e cheia com brilho de 8px
 *     legenda "Menos ■■■■ Mais", 10
 *
 * Dia que ainda não chegou fica apagado, e não com o tom de "nada": um quadrado
 * de nada no sábado que vem leria como sábado perdido.
 *
 * @example <ConsistencyGrid weeks={consistencyWeeks(days, today)} />
 */
interface ConsistencyGridProps {
  weeks: ConsistencyDay[][];
}

/** Segunda a domingo; só segunda, quarta, sexta e domingo levam a inicial, como no kit. */
const WEEKDAYS = [
  { key: 'seg', label: 'S' },
  { key: 'ter', label: '' },
  { key: 'qua', label: 'Q' },
  { key: 'qui', label: '' },
  { key: 'sex', label: 'S' },
  { key: 'sab', label: '' },
  { key: 'dom', label: 'D' },
] as const;
const FUTURE_OPACITY = 0.35;
const GLOW_BLUR = 8;
const GLOW_SPREAD = -2;

export function ConsistencyGrid({ weeks }: ConsistencyGridProps) {
  const cores = useCores();
  const escalar = useEscala();
  const shades = levelShades(cores);

  return (
    <View accessible accessibilityLabel={describe(weeks)}>
      <View className="flex-row gap-1.5">
        <View className="w-4 justify-between py-0.5">
          {WEEKDAYS.map((day) => (
            <Text key={day.key} className="text-[0.53125rem] font-bold text-placeholder">
              {day.label}
            </Text>
          ))}
        </View>
        <View className="flex-1 gap-[0.21875rem]">
          {WEEKDAYS.map((day, weekday) => (
            <View key={day.key} className="flex-row gap-[0.21875rem]">
              {weeks.map((week) => {
                const cell = week[weekday];
                return (
                  <View
                    key={cell.date}
                    className="aspect-square flex-1 rounded-[0.1875rem]"
                    style={{
                      backgroundColor: shades[cell.level],
                      opacity: cell.future ? FUTURE_OPACITY : 1,
                      boxShadow:
                        cell.level === 3
                          ? [
                              {
                                offsetX: 0,
                                offsetY: 0,
                                blurRadius: escalar(GLOW_BLUR),
                                spreadDistance: escalar(GLOW_SPREAD),
                                color: cores.primary,
                              },
                            ]
                          : undefined,
                    }}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>
      <View className="ml-[1.375rem] mt-[0.4375rem] flex-row">
        {weeks.map((week, index) => (
          <Text
            key={week[0].date}
            numberOfLines={1}
            className="flex-1 overflow-visible text-[0.59375rem] font-bold text-placeholder"
          >
            {startsMonth(weeks, index) ? MESES_CURTOS[Number(week[0].date.slice(5, 7)) - 1] : ''}
          </Text>
        ))}
      </View>
      <Legend shades={shades} />
    </View>
  );
}

function Legend({ shades }: { shades: string[] }) {
  return (
    <View className="mt-2 flex-row items-center justify-end gap-1.5">
      <Text className="text-[0.625rem] text-placeholder">Menos</Text>
      {shades.map((shade) => (
        <View
          key={shade}
          className="h-2.5 w-2.5 rounded-[0.1875rem]"
          style={{ backgroundColor: shade }}
        />
      ))}
      <Text className="text-[0.625rem] text-placeholder">Mais</Text>
    </View>
  );
}

/** Nada, refeição registrada, treino ou plano cumprido, os dois. */
function levelShades(cores: Cores): string[] {
  return [
    cores.glassStrong,
    comOpacidade(cores.primary, 0.26),
    comOpacidade(cores.primary, 0.55),
    cores.primary,
  ];
}

/** A primeira semana do heatmap e a semana em que um mês começa levam o rótulo. */
function startsMonth(weeks: ConsistencyDay[][], index: number): boolean {
  if (index === 0) return true;
  return weeks[index][0].date.slice(5, 7) !== weeks[index - 1][0].date.slice(5, 7);
}

/** O leitor de tela não lê 91 quadrados: lê quantos dias tiveram atividade. */
function describe(weeks: ConsistencyDay[][]): string {
  const days = weeks.flat().filter((cell) => !cell.future);
  const active = days.filter((cell) => cell.level > 0).length;
  const top = days.filter((cell) => cell.level === 3).length;
  return `Consistência das últimas 13 semanas: ${active} de ${days.length} dias com atividade, ${top} dias top.`;
}
