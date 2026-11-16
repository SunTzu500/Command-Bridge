# The Command Bridge

A portable React + TypeScript personal operations headquarters. Version 1.0 runs entirely in the browser and requires no account, backend, API key, or paid service.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Production build:

```bash
npm run build
npm run preview
```

The build output is `dist/`.

## What works

- Six navigation areas: The Bridge, Domains, The Nexus, The Codex, Directives, and Quick Access.
- Create, edit, move, archive, and remove domains and nested projects. Moving a project to another domain also moves its descendants and linked tasks/resources.
- Create and edit tasks with priority, status, due date, assignee, notes, and filters.
- Create and search resources, tag them, and associate them with a domain/project.
- Edit or add AI profiles; save, copy, and edit manual assignments.
- Configure external shortcuts. Unknown private URLs are blank until set.
- Export all records to JSON and import a validated Version 1 backup after a review step.
- Browser-local persistence across reloads on the same browser/device.

The included domain, project, agent, and shortcut records are starter configuration marked `origin: "starter"`. User-created records have `origin: "user"`. No activity logs, business metrics, or task records are fabricated.

## Storage and security

`src/data.ts` defines the `Data` model, validation, and the storage functions `load`, `save`, and `exportData`. The UI calls these through one boundary, ready for a later authenticated repository. Current data uses `localStorage` under `command-bridge-v1`; it does not sync across devices or protect information with server-side access control. Do not enter passwords, API keys, or sensitive student records.

Import validates types, IDs, URLs, task fields, and project relationships before presenting a replacement review. The app never silently overwrites the current dataset. Export your data regularly.

## Cloudflare Pages

1. Create a **private** GitHub repository and commit this folder.
2. In Cloudflare Pages, connect that repository.
3. Use build command `npm run build`, output directory `dist`, and a supported Node.js 22 runtime.
4. Keep access restricted while this remains a personal browser-local dashboard. Cloudflare Pages does not automatically add application authentication.

No deployment has been performed. The static build can also be served by any standards-compliant static host. A future cloud version requires real authentication and server-enforced authorization before broader access.

## Architecture

- `src/data.ts`: record types, starter configuration, local persistence, export, import validation.
- `src/main.tsx`: navigation, views, reusable UI elements, editors, and state updates.
- `src/style.css`: responsive visual system and reduced-motion support.
- `index.html`: single-page entry.

Version 1.1 should add a small activity log for local changes, improve import with a safe merge preview, and provide a fuller project-level resource view. API integrations, analytics, autonomous agents, Obsidian vault sync, and secure multi-user roles are later stages.
