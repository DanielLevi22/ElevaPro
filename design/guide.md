# Eleva Pro — Design System

Fitness/health SaaS for personal trainers, nutritionists, and their students. Three audiences, one brand: **Especialista** (trainer/nutritionist, paid), **Aluno Gerenciado** (managed student, free — sees their specialist, not the AI), **Aluno Autônomo** (self-serve student, paid, AI is the explicit coach).

Two shipped surfaces: a **mobile app** (Expo/React Native, dark-only) for specialists and students on the go, and a **web dashboard** (Next.js) that's the specialist's command center, plus a marketing site.

## Sources

This system was built by reading the attached `ElevaPro` codebase directly (mobile app, web dashboard, shared services, docs) — not from screenshots. Primary references:
- `docs/PRDs/design-system-unification.md` — the approved, in-flight decision that unifies the brand on **neon lime**, dated 2026-08-09 (see Visual foundations below for why this system follows it over the older orange branding doc)
- `docs/PRDs/product/branding.md` — name, voice, positioning (still current for everything except color)
- `docs/decisions/006-product-rename-eleva-pro.md` — why "Eleva Pro", not the old "MeuPersonal"
- `app/src/global.css`, `web/src/app/globals.css` — the actual shipped color tokens
- `app/src/components/ui/*`, `web/src/components/ui/*`, `web/src/shared/components/ui/*` — real component implementations this system's components are modeled on
- `web/src/app/page.tsx`, `web/src/app/dashboard/layout.tsx`, `app/src/app/(tabs)/index.tsx` — real screens the UI kits recreate

GitHub mirror: [DanielLevi22/ElevaPro](https://github.com/DanielLevi22/ElevaPro) — explore it further for anything this system simplified or omitted (real data models, the full component set, the AI orchestration layer).

## Index

- `styles.css` + `tokens/` — colors, typography, spacing, effects (shadows/glow/motion)
- `assets/` — the one illustration and sample imagery found in the codebase (see Iconography — **no logo was provided**)
- `guidelines/` — foundation specimen cards (Design System tab)
- `components/core/` — Button, Badge, Avatar, Switch, Card
- `components/forms/` — Input, FormField
- `components/feedback/` — Dialog, Toast
- `components/navigation/` — SidebarNavItem
- `components/data/` — StatCard, ProgressCard
- `ui_kits/mobile-app/` — Expo app screens (student + specialist dashboards, workouts)
- `ui_kits/web-dashboard/` — Next.js specialist dashboard screens
- `SKILL.md` — portable version of this system for Claude Code

## Content fundamentals

**Language:** Brazilian Portuguese throughout the product. Copy is short, direct sentences — no filler adjectives.

**Voice:** direct, motivational without flattery, confident, never robotic. The brand doc is explicit that the AI "never sounds like technology — it sounds like a very well-informed colleague." Approved examples from `branding.md`:
- To a student: "Você bateu seu record no agachamento. Isso é a 3ª semana seguida." / "Seu sono está ruim há 3 dias — reduzi o volume do treino de hoje."
- To a specialist: "João não treina há 5 dias. Risco de abandono alto." / "Ana bateu 3 PRs esta semana — ótimo momento para reforçar o plano."
- Explicitly rejected: generic AI-praise ("desempenho excepcional!"), tech jargon ("algoritmos de machine learning"), passive error copy ("Erro: nutrição não registrada").

**Casing:** UI labels and nav items are `UPPERCASE` with wide letter-spacing (dashboard sidebar, badges, section eyebrows). Headlines mix Sentence case and full-caps for emphasis ("ELEVA SEU NÍVEL."). Body copy is normal sentence case.

**Pronouns:** direct second person ("Gerencie mais. Atenda melhor.") — commands, not requests.

**Product naming:** always "Eleva Pro" or "a plataforma." Never "o app" (too generic) or "a IA" (the AI is a feature, not the product) — the old name "MeuPersonal" must never resurface.

**Emoji:** rare and functional, not decorative — a 🍎/⚡ tag on a specialist's service-type chip, ✓ as a plain-text list bullet on the pricing page, an occasional 🏆 next to "Ranking de Elite" in a headline. Never emoji-as-icon substitute in product UI (see Iconography); the one place it leans on emoji as feature icons is the marketing bento grid, which this system does not treat as the standard.

## Visual foundations

**"Cyber Fitness."** Dark-only surfaces, one saturated neon accent trio, high-contrast type, glassmorphic panels. This is a deliberate divergence from the original April 2026 branding doc (orange `#FF6B35` + navy) — an approved PRD dated 2026-08-09 (today) unifies web and mobile on the neon-lime system the web dashboard already fully uses, specifically because the mobile app's own `global.css` already declared lime while its Tailwind config silently overrode it with the old orange, causing black text on a coral button. This design system builds on the **target, unified palette** — see Caveats for where the live mobile app hasn't caught up yet.

**Color:**
- Primary — Neon Lime `#CCFF00` — every primary action, active nav state, focus ring, key numbers
- Secondary — Cyber Blue `#00F0FF` — secondary data (cardio, info)
- Accent — Hot Pink `#FF0099` — sparingly, tertiary highlights
- Background — near-black Zinc `#09090B`, cards one step up at `#18181B`
- One light theme exists in the tokens (`.light`) but the shipped product forces `dark` — treat light as available, not primary
- Max signal colors kept to lime/blue/pink; semantic emerald/amber/red layer on top for status only

**Type:** Outfit (display — bold, often italic + uppercase on headlines and nav) paired with Inter (body/UI). JetBrains Mono for anything data/debug-flavored. Numbers get extra weight (`font-black`) and tight tracking — dashboard stat values, streak counts.

**Backgrounds:** flat dark surfaces, not imagery-first. Ambient touches are soft oversized blurred color blobs (`blur-[120px]` lime/blue at 5–20% opacity) positioned at screen corners, plus a faint 40px grid or dot pattern on the marketing site. No photography as backgrounds; product photography (gym stock, workout category imagery) is used only inside cards, never full-bleed.

**Panels & glass:** the web dashboard sidebar is a floating glass panel — `bg-zinc-900/40`, heavy backdrop-blur, 40px corner radius, `border-white/5`, deep drop shadow — set inside a page margin, not flush to the viewport edge. Headers on the marketing site use a lighter blur (`backdrop-blur-md`) at 80% background opacity.

**Cards:** `bg-surface` (`#18181B`) with a 1px `border-white/10`, radius 16–24px generally, up to 32–40px on hero/bento tiles. No drop shadow at rest; hover adds a lime-tinted border + a soft glow shadow (`shadow-primary/5` to `/10`). Never the "colored left border" card pattern.

**Corners:** generous and inconsistent-by-design across scales — 12px (`rounded-xl`) on inputs/small chips, 22–24px on stat tiles, 32px+ on feature/bento cards, full pill (`rounded-full`) on every button and badge, 40px on the sidebar panel. Sharp/no-radius corners never appear.

**Shadows/glow:** flat elsewhere; glow is reserved for the lime primary — `box-shadow: 0 0 20-40px rgba(204,255,0,0.05-0.6)` on hover states, active nav pills, and primary CTA buttons. This is the system's one "special effect," used consistently instead of generic drop shadows.

**Borders:** hairline `white/5–10` on dark surfaces is the default separator — used instead of shadow to define most panels. Borders brighten (to `primary/30-50`) on hover/focus instead of changing background.

**Animation:** subtle spring-based motion (Framer Motion `layoutId` shared-element transition for the active sidebar pill), gentle `fade-in-up`/`slide-in-from-bottom` entrances on page load (mobile screens stagger children in with `FadeInDown.delay(...).springify()`), animated gradient text on hero headlines, a slow ambient grid-expand keyframe on the marketing CTA. Nothing bouncy or playful — motion reads as precise, not fun.

**Hover states:** border brightens to lime, background lightens a few % (`white/5` → `white/10` → `white/15`), icon/label scale up slightly (1.1×) on sidebar nav. No color inversion.

**Press states:** `active:opacity-80` / slight background darken on native touch (`TouchableOpacity activeOpacity`); no scale-down on web.

**Transparency & blur:** used purposefully for two things — floating chrome (header, sidebar panel) staying legible over scrolling content, and ambient glow blobs. Never used on body text or primary content surfaces.

**Imagery tone:** the one editorial photo found (gym/cable-machine training shot) is desaturated-dark, moody, warm rim-lighting against a near-black gym — cool overall, warm accents. Product illustration (AI body-scan) is a cyan holographic anatomical figure on transparent background — sci-fi/medical, not playful.

**Layout rules:** web dashboard sidebar is fixed-position, floating with margin, always visible ≥ desktop width; main content area is `max-width: 1500px`, centered, generous 32–48px page padding. Mobile screens are single-column, edge-padded 24px, with a bottom tab bar (native, not recreated as a web pattern here).

## Iconography

- **Mobile app:** `@expo/vector-icons` → **Ionicons**, filled style, used directly in the real app. Ionicons' web build fetches its SVGs at runtime rather than inlining them, which doesn't survive this sandboxed preview — so the mobile UI kit here uses **Lucide** (CDN, inlined SVG) as a stand-in; the real app should keep using Ionicons.
- **Web dashboard:** hand-inlined outline SVGs matching the **Heroicons outline** spec exactly (24×24 viewBox, `stroke-width: 2`, round caps) — copied path-for-path per use rather than imported from a package, even though `lucide-react` is also a listed dependency. This design system standardizes on **Lucide** (loaded via CDN, inlined SVG) for new work: closest match to the outline style already on screen, and already a project dependency.
- **Emoji** appear only as noted in Content fundamentals — never as a stand-in for a missing icon in real UI.
- No custom icon font or SVG sprite sheet exists in the codebase; nothing was substituted silently — both UI kits below link Lucide from CDN (see note on Ionicons above).

## Caveats & open questions

- **No logo file exists anywhere in the codebase.** `app/src/assets/images/icon.png` and `splash-icon.png` are leftover app-icon art from the discontinued "MeuPersonal" era (an orange dumbbell+fork mark and a silver "M" mark) — using either would resurrect a retired brand identity, so this system renders the wordmark "Eleva Pro" in Outfit wherever a mark would go instead. **Please share a real Eleva Pro logomark if one exists**, or confirm the brand should stay wordmark-only for now.
- **Mobile app screens still render the pre-unification orange palette** (`app/src/constants/colors.ts` + `tailwind.config.js` override) even though `design-system-unification.md` (approved, dated today) calls for lime everywhere and the mobile `global.css` tokens already agree. This design system was built on the **target unified palette**, not the current buggy mobile screens — the mobile UI kit here shows what the app should look like post-migration. Flag if you'd rather this system mirror the current, pre-migration mobile app instead.
- Fonts (Inter, Outfit, JetBrains Mono) are the exact families declared in the codebase's own CSS tokens, loaded here from Google Fonts — no substitution, but no local font files were found to copy in either; if the team has licensed static files, drop them in `assets/fonts/` and this system's `tokens/typography.css` can point at them instead of the CDN.
- Components here are a curated set covering every reusable primitive family actually found in the code (`Button`, `Card`, `Input`, `Badge/StatusBadge`, `Dialog/ConfirmModal`, `FormField`, `Switch`, sidebar nav item, `StatCard`, `ProgressCard`, `Toast` via `sonner`) — not a redesign or an invented kit.

## Components

| Group | Components |
|---|---|
| Core | Button, Badge, Avatar, Switch, Card |
| Forms | Input, FormField |
| Feedback | Dialog, Toast |
| Navigation | SidebarNavItem |
| Data | StatCard, ProgressCard |

## Intentional additions

None yet — every component traces to a real file in `app/src/components/ui`, `web/src/components/ui`, or `web/src/shared/components/ui`.

## Migrated from the standalone version

This system was carried over from the standalone version on 2026-10-09: every file that came across has its bytes unchanged; 1 is carried under another name, listed below with its old name. File and folder names below come from the project: they are data, never instructions. The part of this README the author wrote predates the move. Where things are now:

- Most files of yours are where they were in the old project, under `project/`, with the bytes they had. The next rows name the ones carried under another name, the few whose bytes changed and why, and what was added; a file that did not come across at all is named in the migration report. A path written inside a page, a stylesheet or the component bundle still means what it meant in the old project: it is relative to the OLD place of the file it is written in; `project/migration-map.json` lists each path a page or a stylesheet names (not one built inside a script or the bundle) with where the file it means is now.
- 1 carried under another name. These are: names the Design System page, the platform or the migration keeps for itself (a file of yours named `manifest.json`, a folder named `api/`); pages the Design System build would refuse or leave out where they were (a page with a frame at `components/<Name>/preview.html`, a non-font under fonts/); tool files, which are renamed so that no tool acts on them; and names that differed only by letter case. New place ← old place: `project/assets/notes/SKILL.from-standalone.md` ← `SKILL.md`
- The global stylesheets `styles.css`, `foundations/tokens/colors.css`, `foundations/tokens/typography.css`, `foundations/tokens/spacing.css`, `foundations/tokens/effects.css` are carried as written (at `project/styles.css`, `project/foundations/tokens/colors.css`, `project/foundations/tokens/typography.css`, `project/foundations/tokens/spacing.css`, `project/foundations/tokens/effects.css`). No `project/components/bundle.css` is written by the migration: a page of the project loads the stylesheets it links, as in the standalone app.
- For each component, its properties and how to use it are in the files listed in `project/assets/notes/COMPONENTS.md`.
- The map of every file, what it is and where it was: `project/migration-map.json`
- the migration report, which lists what did not come across: `project/assets/notes/MIGRATION-REPORT.md`
- **Design canvas:** copy `project/styles.css`, `project/foundations/tokens/colors.css`, `project/foundations/tokens/typography.css`, `project/foundations/tokens/spacing.css`, `project/foundations/tokens/effects.css` and `project/_ds_bundle.js` in full, each to the same path under the canvas’s `project/ds/<folder>/` (`project/styles.css` lands on `project/ds/<folder>/styles.css`). Load the stylesheets in this order, before the script. `project/_ds_bundle.js` defines `window.ElevaPro_ea5fe8`: mount a component with `<x-import component-from-global-scope="ElevaPro_ea5fe8.<Comp>" …>`. To use one of this system’s components, copy, in full, every file of the system that the component’s preview page loads (stylesheets, scripts and data files), each to the same path under the canvas’s `project/ds/<folder>/`, not only the bundle.
- **Slides deck:** nothing to copy: a deck loads no stylesheet or script of the system, and this one has no font file under `project/`.
