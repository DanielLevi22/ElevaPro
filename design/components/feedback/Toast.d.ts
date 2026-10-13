/**
 * @startingPoint section="Feedback" subtitle="Toast notification (sonner-style)" viewport="700x120"
 */
export interface ToastProps {
  tone?: "success" | "error" | "info";
  title: string;
  description?: string;
}

export function Toast(props: ToastProps): JSX.Element;
