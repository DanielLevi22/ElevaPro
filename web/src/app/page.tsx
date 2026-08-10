"use client";

import Image from "next/image";
import { Footer } from "@/shared/components/layout/Footer";
import { Header } from "@/shared/components/layout/Header";
import { Pricing } from "@/shared/components/sections/Pricing";
import { BackgroundGrid } from "@/shared/components/ui/BackgroundGrid";
import { Marquee } from "@/shared/components/ui/Marquee";
import { cn } from "@/shared/utils";

const reviews = [
  {
    name: "Jack",
    username: "@jack",
    body: "Nunca vi nada igual. O design é incrível e meus alunos adoram.",
    img: "https://avatar.vercel.sh/jack",
  },
  {
    name: "Jill",
    username: "@jill",
    body: "Aumentei minha retenção de alunos em 40% desde que comecei a usar o Eleva Pro.",
    img: "https://avatar.vercel.sh/jill",
  },
  {
    name: "John",
    username: "@john",
    body: "A gamificação me faz querer treinar todo dia. Viciante!",
    img: "https://avatar.vercel.sh/john",
  },
  {
    name: "Jane",
    username: "@jane",
    body: "Simplesmente o melhor app fitness do mercado. Sem comparação.",
    img: "https://avatar.vercel.sh/jane",
  },
  {
    name: "Jenny",
    username: "@jenny",
    body: "A dieta flexível mudou minha vida. Consigo seguir sem sofrer.",
    img: "https://avatar.vercel.sh/jenny",
  },
  {
    name: "James",
    username: "@james",
    body: "Como personal, economizo horas montando treinos. Fantástico.",
    img: "https://avatar.vercel.sh/james",
  },
];

const ReviewCard = ({
  img,
  name,
  username,
  body,
}: {
  img: string;
  name: string;
  username: string;
  body: string;
}) => {
  return (
    <figure
      className={cn(
        "relative w-64 cursor-pointer overflow-hidden rounded-xl border p-4",
        // light styles
        "border-gray-950/[.1] bg-gray-950/[.01] hover:bg-gray-950/[.05]",
        // dark styles
        "dark:border-gray-50/[.1] dark:bg-gray-50/[.10] dark:hover:bg-gray-50/[.15]",
      )}
    >
      <div className="flex flex-row items-center gap-2">
        <Image className="rounded-full" width={32} height={32} alt="" src={img} />
        <div className="flex flex-col">
          <figcaption className="text-sm font-medium dark:text-white">{name}</figcaption>
          <p className="text-xs font-medium dark:text-white/40">{username}</p>
        </div>
      </div>
      <blockquote className="mt-2 text-sm">{body}</blockquote>
    </figure>
  );
};

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground relative">
      <BackgroundGrid />
      <Header />

      {/* Hero Section with Spotlight Effect */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-4 overflow-hidden">
        {/* Spotlight Gradient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none opacity-50" />

        <div className="container mx-auto text-center max-w-5xl relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface/50 border border-overlay-10 backdrop-blur-md mb-8 animate-fade-in-up">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-muted-foreground">
              Para personal trainers e nutricionistas sérios
            </span>
          </div>

          <h1 className="text-5xl md:text-8xl font-display font-bold mb-8 leading-tight tracking-tight">
            ELEVA <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-white to-secondary animate-gradient-x">
              SEU NÍVEL.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
            Gerencie alunos, crie planos de treino e nutrição e acompanhe resultados reais — com
            inteligência artificial que trabalha para você, não no lugar de você.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <button
              type="button"
              className="w-full md:w-auto px-8 py-4 bg-primary text-primary-foreground font-bold rounded-full hover:bg-primary-hover transition-all transform hover:scale-105 hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.6)]"
            >
              Começar Gratuitamente
            </button>
            <button
              type="button"
              className="w-full md:w-auto px-8 py-4 bg-surface border border-overlay-10 text-foreground font-bold rounded-full hover:bg-overlay-05 transition-all"
            >
              Ver Demonstração
            </button>
          </div>
        </div>
      </section>

      {/* Bento Grid Features Section */}
      <section id="features" className="pt-24 pb-48 bg-surface/30 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
              ECOSSISTEMA <span className="text-primary">COMPLETO</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Tudo o que você precisa para gerenciar sua carreira ou transformar seu corpo, em um
              único lugar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Card 1: Treino (Large) */}
            <div className="md:col-span-2 bg-surface/50 backdrop-blur-sm border border-border p-8 md:p-12 rounded-[2rem] hover:border-primary/30 transition-all group relative overflow-hidden">
              <div className="relative z-10">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <span className="text-3xl">⚡</span>
                </div>
                <h3 className="text-2xl font-display font-bold mb-4 text-foreground">
                  Treinos Inteligentes
                </h3>
                <p className="text-muted-foreground text-lg leading-relaxed max-w-md">
                  Fichas interativas com vídeos, timer automático e progressão de carga. O app
                  aprende com você e sugere evoluções.
                </p>
              </div>
              {/* Abstract UI Mockup */}
              <div className="absolute right-0 bottom-0 w-1/2 h-full opacity-20 group-hover:opacity-30 transition-opacity">
                <div className="w-full h-full bg-gradient-to-tl from-primary/40 to-transparent rounded-tl-[3rem]" />
              </div>
            </div>

            {/* Card 2: Nutrição */}
            <div className="bg-surface/50 backdrop-blur-sm border border-border p-8 md:p-10 rounded-[2rem] hover:border-secondary/30 transition-all group relative overflow-hidden">
              <div className="relative z-10">
                <div className="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-secondary/20 transition-colors">
                  <span className="text-3xl">🧬</span>
                </div>
                <h3 className="text-2xl font-display font-bold mb-4 text-foreground">Nutrição</h3>
                <p className="text-muted-foreground text-lg">
                  Dietas flexíveis calculadas para o seu metabolismo.
                </p>
              </div>
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-secondary/20 blur-3xl rounded-full group-hover:bg-secondary/30 transition-colors" />
            </div>

            {/* Card 3: Gamification */}
            <div className="bg-surface/50 backdrop-blur-sm border border-border p-8 md:p-10 rounded-[2rem] hover:border-accent/30 transition-all group relative overflow-hidden">
              <div className="relative z-10">
                <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
                  <span className="text-3xl">🏆</span>
                </div>
                <h3 className="text-2xl font-display font-bold mb-4 text-foreground">
                  Gamificação
                </h3>
                <p className="text-muted-foreground text-lg">
                  Conquiste badges e suba de nível com desafios diários.
                </p>
              </div>
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-accent/20 blur-3xl rounded-full group-hover:bg-accent/30 transition-colors" />
            </div>

            {/* Card 4: Analytics (Large) */}
            <div className="md:col-span-2 bg-surface/50 backdrop-blur-sm border border-border p-8 md:p-12 rounded-[2rem] hover:border-primary/30 transition-all group relative overflow-hidden">
              <div className="relative z-10">
                <div className="w-14 h-14 bg-surface-highlight rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors">
                  <span className="text-3xl">📊</span>
                </div>
                <h3 className="text-2xl font-display font-bold mb-4 text-foreground">
                  Analytics Avançado
                </h3>
                <p className="text-muted-foreground text-lg leading-relaxed max-w-md">
                  Acompanhe cada detalhe da sua evolução: carga, medidas, fotos e consistência.
                  Dados reais para resultados reais.
                </p>
              </div>
              {/* Abstract Graph Mockup */}
              <div className="absolute right-10 bottom-10 w-1/3 h-1/2 flex items-end gap-2 opacity-30">
                <div className="w-full bg-primary h-[40%] rounded-t-lg" />
                <div className="w-full bg-primary h-[60%] rounded-t-lg" />
                <div className="w-full bg-primary h-[80%] rounded-t-lg" />
                <div className="w-full bg-primary h-[50%] rounded-t-lg" />
                <div className="w-full bg-primary h-[90%] rounded-t-lg" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 bg-background relative overflow-hidden">
        <div className="container mx-auto px-4 mb-16 text-center">
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
            QUEM USA <span className="text-primary">APROVA</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Junte-se a milhares de personals e alunos que transformaram seus resultados.
          </p>
        </div>

        <div className="relative flex h-[500px] w-full flex-col items-center justify-center overflow-hidden rounded-lg bg-background md:shadow-xl">
          <Marquee pauseOnHover className="[--duration:20s]">
            {reviews.map((review) => (
              <ReviewCard key={review.username} {...review} />
            ))}
          </Marquee>
          <Marquee reverse pauseOnHover className="[--duration:20s]">
            {reviews.map((review) => (
              <ReviewCard key={review.username} {...review} />
            ))}
          </Marquee>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-background"></div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-background"></div>
        </div>
      </section>

      {/* Pricing Section */}
      <Pricing />

      {/* CTA Section */}
      <section className="pt-48 pb-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-surface-highlight to-background z-0" />

        {/* Animated Grid Background */}
        <div className="absolute inset-0 opacity-20 dark:opacity-10 bg-[linear-gradient(to_right,rgb(var(--overlay-15))_1px,transparent_1px),linear-gradient(to_bottom,rgb(var(--overlay-15))_1px,transparent_1px)] bg-size-[24px_24px] animate-grid-expand" />

        {/* Glow Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-overlay-05 border border-overlay-10 backdrop-blur-md mb-8">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-foreground">Vagas limitadas para o beta</span>
          </div>

          <h2 className="text-5xl md:text-7xl font-display font-bold text-foreground mb-8 tracking-tight">
            PRONTO PARA <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-text to-primary-text/60">
              ELEVAR SEU NÍVEL?
            </span>
          </h2>

          <p className="text-muted-foreground text-xl md:text-2xl mb-12 max-w-2xl mx-auto leading-relaxed">
            Acompanhamento que não para. Resultado que não mente. <br className="hidden md:block" />
            Experimente 14 dias grátis, sem cartão.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <button
              type="button"
              className="group relative px-8 py-4 bg-primary text-primary-foreground rounded-full font-bold text-lg transition-all hover:scale-105 hover:shadow-[0_0_40px_-10px_hsl(var(--primary)/0.5)]"
            >
              <span className="relative z-10 flex items-center gap-2">
                Começar Agora
                <svg
                  className="w-5 h-5 transition-transform group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </span>
            </button>

            <button
              type="button"
              className="px-8 py-4 bg-overlay-05 text-foreground border border-overlay-10 rounded-full font-bold text-lg transition-all hover:bg-overlay-10 backdrop-blur-sm"
            >
              Falar com Consultor
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
