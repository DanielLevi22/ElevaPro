/**
 * @startingPoint section="Data" subtitle="Goal progress bar with fraction label" viewport="700x140"
 */
export interface ProgressCardProps {
  title: string;
  current: number;
  target: number;
  unit?: string;
  color?: "success" | "warning" | "primary";
}

export function ProgressCard(props: ProgressCardProps): JSX.Element;
