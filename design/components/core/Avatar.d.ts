/**
 * @startingPoint section="Core" subtitle="Initials or photo avatar, optional online dot" viewport="700x120"
 */
export interface AvatarProps {
  name?: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  online?: boolean;
  style?: React.CSSProperties;
}

export function Avatar(props: AvatarProps): JSX.Element;
