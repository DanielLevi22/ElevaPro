import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-background border-t border-overlay-10 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link href="/" className="text-xl font-bold text-primary mb-4 block tracking-tight">
              Eleva Pro
            </Link>
            <p className="text-sm text-muted-foreground">
              A plataforma profissional para personal trainers e nutricionistas que querem crescer.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-4">Produto</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="#features">Funcionalidades</Link>
              </li>
              <li>
                <Link href="#pricing">Preços</Link>
              </li>
              <li>
                <Link href="/auth/register">Criar Conta</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/privacy">Privacidade</Link>
              </li>
              <li>
                <Link href="/terms">Termos de Uso</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Contato</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>suporte@elevapro/.com.br</li>
              <li>Instagram</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-overlay-10 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Eleva Pro. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
