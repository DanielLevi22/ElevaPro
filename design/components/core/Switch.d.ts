/**
 * @startingPoint section="Core" subtitle="Pill toggle switch" viewport="700x100"
 */
export interface SwitchProps {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  style?: React.CSSProperties;
}

export function Switch(props: SwitchProps): JSX.Element;
