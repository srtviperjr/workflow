# Jansen Workflows

A local-storage React application for designing approval workflows, building forms, and tracking requests end-to-end.

**Version:** 0.6

| Doc | Description |
|-----|-------------|
| [docs/REQUIREMENTS.md](./docs/REQUIREMENTS.md) | Product requirements + sample screenshots |
| [docs/USER_GUIDE.md](./docs/USER_GUIDE.md) | How to use the app (with screenshots) |
| [docs/RECREATE_PROMPT.md](./docs/RECREATE_PROMPT.md) | Prompt to recreate this app from scratch |

## Features

- **Users & roles** — Create users (first/last name, email, company, project) and assign roles. Default roles: Requestor, Manager, Project Director, Admin. Companies: BHP, Hatch, Bantrel, Fluor.
- **Identity switcher** — Top-right control to act as any user in the system.
- **Visual workflow editor** — Flowchart canvas with steps, decisions, notifications, and outcome/condition routing.
- **1:1 forms & workflows** — Each form owns exactly one dedicated workflow; forms never share a workflow.
- **Sample forms** — Overtime, Vehicle Registration, Change Request (with optional file attachment), and Leave Request.
- **File attachments** — Optional form field type; files stored locally (max 512 KB); shown by filename in registers/PDF.
- **Submission visibility** — Per-form boundary plus consistent rules for actors, history, and notification recipients.
- **In-app notifications** — Admin-designed templates (Administration → Notifications); workflow Notify steps pick a template and recipients. Open from the AppBar bell (deep-links only when accessible).
- **Workflow History** — Shows only user actions (submission steps and decisions).
- **Form-scoped roles** — Roles can be limited to specific forms.
- **PDF export** — Branded printout on request detail (banner + form-like field cards).
- **Requests** — Everyone submits from **Requests**; admins design forms under Administration → Forms.
- **Delegations** — Temporarily grant approval permissions (additive).
- **Registers** — Overall register plus per-form registers with customizable columns and header filters.
- **Data Tools** — Independently include users and/or requests; create additional or clear & recreate; randomized recent open samples.

## Quick start

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

## Tech stack

- React + TypeScript (Vite)
- Material UI
- React Flow (`@xyflow/react`) for the workflow canvas
- Browser `localStorage` for persistence

## Default identity

The app boots as **System Admin** (`admin@jansen.local`) with Admin + Requestor roles. Use **Administration → Data Tools** to seed users and requests, then switch identity via the top-right selector.

## Screenshots

```bash
npm run dev          # terminal 1
npm run screenshots  # terminal 2
```
