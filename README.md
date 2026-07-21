# Jansen Workflows

A local-storage React application for designing approval workflows, building forms, and tracking requests end-to-end.

See **[docs/REQUIREMENTS.md](./docs/REQUIREMENTS.md)** for the full product requirements and sample screenshots.

## Features

- **Users & roles** — Create users (first/last name, email, company) and assign roles. Default roles: Requestor, Manager, Project Director, Admin. Companies: BHP, Hatch, Bantrel, Fluor.
- **Identity switcher** — Top-right control to act as any user in the system.
- **Visual workflow editor** — Flowchart canvas with steps, decision diamonds, and outcome-based routing (Approve / Reject).
- **1:1 forms & workflows** — Each form owns exactly one dedicated workflow; forms never share a workflow.
- **Dynamic workflow history** — Every request tracks who acted and when; history columns follow the live workflow definition.
- **Forms** — Start with Simple Request; admins can build forms visually with a paired workflow.
- **Delegations** — Temporarily grant your approval permissions to another user (additive; non-admins only for themselves).
- **Request register** — Matrix-style table of submissions with filters.
- **Admin tools** — Seed sample data, clear requests by form, or reset everything.

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

## Default login

The app boots as **System Admin** (`admin@jansen.local`) with Admin + Requestor roles. Use **Admin Tools → Generate Sample Data** to add demo users and requests, then switch identity via the top-right selector.
