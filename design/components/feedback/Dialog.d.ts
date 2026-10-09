import type { ReactNode } from "react";

/**
 * @startingPoint section="Feedback" subtitle="Blurred-scrim modal dialog" viewport="700x360"
 */
export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  maxWidth?: number;
}

export function Dialog(props: DialogProps): JSX.Element | null;
