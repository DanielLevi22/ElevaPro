import { createNutritionService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Campo } from '@/components/ui/Campo';
import { ChipMulti } from '@/components/ui/ChipMulti';
import { registrarAviso } from '@/lib/registro';

const MIN_QUERY = 2;
const RESULTS = 6;
const DEBOUNCE_MS = 300;

interface FoodExclusionSearchProps {
  /** Os alimentos já escolhidos, pelo nome do banco. */
  chosen: string[];
  onChange: (chosen: string[]) => void;
}

/**
 * O "Outro alimento" do "Não como": busca no banco de alimentos, e não texto
 * livre. O app garante que o que a pessoa não come não aparece no plano, e só
 * garante o que casa com o banco; um campo livre também abriria espaço para
 * diagnóstico ir à IA, contra a regra de "não existe campo livre" das
 * restrições (LGPD_COMPLIANCE.md §2.2).
 *
 * @example <FoodExclusionSearch chosen={outros} onChange={setOutros} />
 */
export function FoodExclusionSearch({ chosen, onChange }: FoodExclusionSearchProps) {
  const [query, setQuery] = useState('');
  const results = useFoodSearch(query);

  function choose(name: string) {
    if (!chosen.includes(name)) onChange([...chosen, name]);
    setQuery('');
  }

  return (
    <View className="mt-3 gap-2.5">
      {chosen.length > 0 ? (
        <View className="flex-row flex-wrap gap-[0.4375rem]">
          {chosen.map((name) => (
            <ChipMulti
              key={name}
              rotulo={name}
              marcado
              onPress={() => onChange(chosen.filter((item) => item !== name))}
            />
          ))}
        </View>
      ) : null}
      <Campo
        rotulo="Buscar alimento"
        valor={query}
        onChange={setQuery}
        placeholder="Ex.: camarão"
      />
      {results.map((name) => (
        <TouchableOpacity
          key={name}
          onPress={() => choose(name)}
          accessibilityRole="button"
          accessibilityLabel={`Não como ${name}`}
          className="rounded-xl border border-glass-border bg-glass px-3.5 py-2.5"
        >
          <Text className="text-[0.84375rem] font-semibold text-hero">{name}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/** Os nomes do banco que casam com a busca, depois de a pessoa parar de digitar. */
function useFoodSearch(query: string): string[] {
  const [results, setResults] = useState<string[]>([]);
  useEffect(() => {
    const term = query.trim();
    if (term.length < MIN_QUERY) {
      setResults([]);
      return;
    }
    let active = true;
    const timer = setTimeout(() => {
      createNutritionService(supabase)
        .searchFoods(term, 0, RESULTS)
        .then((foods) => {
          if (active) setResults(foods.map((food) => food.name));
        })
        .catch(() => registrarAviso('onboarding.buscar_alimento', { semResultado: true }));
    }, DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);
  return results;
}
