# 21st.dev Sidebar — Setup & Conventions

## Project compatibility

Your project already has:

- **Tailwind CSS** — `tailwind.config.js`, `tailwind.css`
- **TypeScript** — `tsconfig.json`, `jsx: "react-jsx"`, `@/*` path alias
- **`src/components/ui`** — used as the default UI components folder

## Default path: `src/components/ui`

The sidebar lives in `src/components/ui/sidebar.tsx`. Using a dedicated `components/ui` folder:

- Keeps shadcn/Radix-style primitives (Button, Card, Sidebar, etc.) in one place
- Matches the `@/components/ui` import pattern
- Makes it clear which components are shared design-system pieces vs. feature-specific components

If you didn’t have `src/components/ui`, you’d want to create it and point `@/components/ui` there so imports like `@/components/ui/sidebar` work.

## Dependencies

- **framer-motion** — already in `package.json` (^12.23.26)
- **lucide-react** — already installed
- **react-router-dom** — already installed (`Link` is used instead of Next.js `Link`)

No extra installs were required.

## Adaptations from the original (Next.js → Vite + React Router)

| Original            | This codebase                          |
|---------------------|----------------------------------------|
| `next/link` (`href`) | `react-router-dom` `Link` (`to`)       |
| `next/image`        | `<img>` with an Unsplash URL           |
| `"use client"`      | Removed (Vite + React, no RSC)         |
| `LinkProps` (Next)  | `LinkProps` from `react-router-dom`    |

## Where it's used

- **MainLayout** (`!isOwnerPortal`): 21st.dev sidebar; org logo, nav sections, user block; mobile hamburger opens overlay.
- Link from `/demo`: **“Sidebar demo (21st.dev) →”**.

## Usage

```jsx
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";

<Sidebar open={open} setOpen={setOpen}>
  <SidebarBody className="justify-between gap-10">
    <div className="flex flex-col flex-1 overflow-y-auto">
      <Logo />
      <div className="mt-8 flex flex-col gap-2">
        {links.map((link, i) => (
          <SidebarLink key={i} link={link} />
        ))}
      </div>
    </div>
    <div>
      <SidebarLink link={{ label: "User", href: "#", icon: <Avatar /> }} />
    </div>
  </SidebarBody>
</Sidebar>
```

## If you add shadcn via CLI

To align with shadcn’s defaults:

1. Run `npx shadcn@latest init` and choose:
   - Style: Default
   - Base color: Neutral (or Slate)
   - CSS variables: Yes
   - `components.json` will be created; set `"components": "src/components"` (or keep `src/components` and use `src/components/ui` for the `ui` dir).
2. Ensure `src/components/ui` exists. `npx shadcn@latest add button` (etc.) will add components under the configured path (e.g. `src/components/ui/button.tsx`).

Your existing `src/components/ui` and Tailwind setup are already compatible with this.
