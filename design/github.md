repo: DanielLevi22/ElevaPro
branch: development

## Last sync
date: 2026-08-09T00:00:00Z

### Updated in this project
- Read the mobile app (Expo/React Native), web dashboard (Next.js), and shared docs directly from the attached local codebase (mirrors this repo)
- Unified color tokens on the approved `design-system-unification` PRD target palette (neon lime primary), not the currently-shipped mobile screens
- Built 12 cross-platform components, 19 foundation cards, and 2 UI kits (mobile app, web dashboard) from real source files

## Screen map
| Design system screen | Repo files |
|---|---|
| ui_kits/web-dashboard | web/src/app/dashboard/layout.tsx, web/src/app/page.tsx, web/src/modules/students/components/StudentCard.tsx |
| ui_kits/mobile-app | app/src/app/(tabs)/index.tsx, app/src/components/ui/PremiumCard.tsx, app/src/components/gamification/StatCard.tsx |
| components/core | web/src/components/ui/Button.tsx, web/src/components/ui/card.tsx, app/src/components/ui/Button.tsx, app/src/components/ui/StatusBadge.tsx |
| components/forms | web/src/components/ui/Input.tsx, web/src/components/ui/FormField.tsx |
| components/feedback | web/src/components/ui/Dialog.tsx, web/src/app/layout.tsx (sonner Toaster) |
| tokens/colors.css | app/src/global.css, web/src/app/globals.css, docs/PRDs/design-system-unification.md |
