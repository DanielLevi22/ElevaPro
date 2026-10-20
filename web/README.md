This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## O Turbopack lê o `paths` do tsconfig

O bundle do browser resolve imports pelo `paths` do `tsconfig.json`, não só o
`tsc`. Apontar um pacote para o seu `.d.ts` faz o Turbopack empacotar um
arquivo sem código. O `tsc`, o Vitest e o jsdom passam, e o defeito só aparece
no browser.

Foi o que aconteceu em 20/10/2026 (#422, corrigido na #428). Para o `tsc` achar
os tipos do CASL 7, o `@casl/ability` passou a apontar para
`dist/types/index.d.ts`. No browser, o `AbilityBuilder` chegava `undefined` e
todo login caía em `auth.profile_load_failed` com
`TypeError: (void 0) is not a constructor`, no local e no preview. A correção é
o `turbopack.resolveAlias` do `next.config.ts`, que manda o bundler para o
pacote. O app não tem o problema: o Metro empacota o código real.

- Mexeu no `paths`? Confira no browser, não só no `tsc`.
- O `logger` guarda só o `name` do erro, porque a mensagem pode trazer dado
  pessoal. Para ver a mensagem num diagnóstico local, ponha um `console.error`
  temporário no `catch`, recarregue e leia a saída do `next dev`. Esse log não
  vai para commit.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
