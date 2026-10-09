import type { ReactNode, CSSProperties } from "react";

/**
 * @startingPoint section="Core" subtitle="Dark surface container, glows lime border on hover" viewport="700x220"
 */
export interface CardProps {
  hoverable?: boolean;
  radius?: string;
  children?: ReactNode;
  style?: CSSProperties;
}

export function Card(props: CardProps): JSX.Element;
