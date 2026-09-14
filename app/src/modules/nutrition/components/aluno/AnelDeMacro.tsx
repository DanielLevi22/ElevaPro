import { Text, View } from 'react-native';
import { Anel } from '@/components/ui/Anel';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { useCores } from '@/shared/design';
import { type Macros, percentualDaMeta } from '../../services/consumoDoDia';

/**
 * Um macro em anel dentro do vidro: gramas no meio, nome e percentual embaixo.
 *
 * É o `MacroDonut` do kit, que se repete no plano do dia, na refeição e no
 * scan, sempre em trio. O anel é a cor de métrica nos dois temas; o percentual
 * é texto, e escurece no claro para passar contraste.
 *
 * @example
 * <TresMacros valores={consumo} metas={meta} />
 */
type Macro = 'proteina' | 'carboidrato' | 'gordura';

const ROTULO: Record<Macro, string> = {
  proteina: 'Proteína',
  carboidrato: 'Carbos',
  gordura: 'Gordura',
};

/** Classe literal por macro: o Tailwind só gera a classe que aparece escrita. */
const TEXTO: Record<Macro, string> = {
  proteina: 'text-texto-macro-proteina',
  carboidrato: 'text-texto-macro-carboidrato',
  gordura: 'text-texto-macro-gordura',
};

const COR_DO_ANEL = {
  proteina: 'metricaProteina',
  carboidrato: 'metricaCarboidrato',
  gordura: 'metricaGordura',
} as const;

/** O `Ring` do kit no donut: 62 de lado, traço de 6 e `drop-shadow(0 0 12px)`. */
const LADO = 62;
const ESPESSURA = 6;
const BRILHO = 12;

interface AnelDeMacroProps {
  macro: Macro;
  gramas: number;
  /** A referência do percentual: meta do dia, ou a meta diária de novo na refeição. */
  meta: number;
}

export function AnelDeMacro({ macro, gramas, meta }: AnelDeMacroProps) {
  const cores = useCores();
  const percentual = percentualDaMeta(gramas, meta);
  const valor = Math.round(gramas);

  return (
    <Vidro classeExterna="flex-1" className="items-center gap-[0.4375rem] px-1.5 py-3">
      <Anel
        valor={gramas}
        meta={meta}
        rotulo={`${valor} g`}
        sub={ROTULO[macro]}
        tamanho={LADO}
        espessura={ESPESSURA}
        brilho={BRILHO}
        cor={cores[COR_DO_ANEL[macro]]}
      >
        {/* Dois textos na mesma linha de base: aninhado, o "g" herdava a
            família de display e descia como subscrito. */}
        <View className="flex-row items-baseline">
          <Text className="font-display-black text-[0.875rem] tracking-tight text-foreground">
            {valor}
          </Text>
          <Text className="text-[0.5625rem] font-bold text-foreground">g</Text>
        </View>
      </Anel>
      <View className="items-center">
        <Text className="text-[0.71875rem] font-bold text-foreground">{ROTULO[macro]}</Text>
        <Text className={cn('text-[0.65625rem] font-bold', TEXTO[macro])}>{percentual}%</Text>
      </View>
    </Vidro>
  );
}

interface TresMacrosProps {
  valores: Macros;
  metas: Macros;
  /** O scan do kit põe gordura antes de carbos; o resto, carbos antes. */
  ordem?: readonly Macro[];
}

const ORDEM_PADRAO = ['proteina', 'carboidrato', 'gordura'] as const;

export function TresMacros({ valores, metas, ordem = ORDEM_PADRAO }: TresMacrosProps) {
  return (
    <View className="mt-2.5 flex-row gap-[0.5625rem]">
      {ordem.map((macro) => (
        <AnelDeMacro key={macro} macro={macro} gramas={valores[macro]} meta={metas[macro]} />
      ))}
    </View>
  );
}

export type { Macro };
