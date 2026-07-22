# Jansen Workflows — Recreation Prompt (v0.6)

Copy everything below the line into a coding agent (or use as a product brief) to recreate this application.

---

## Prompt

Build **Jansen Workflows** — a frontend-only React + TypeScript (Vite) approval-workflow demo app. There is **no backend, database, or external API**. Persist all state in browser `localStorage` under the key `jansen-workflows-data`. No env vars or secrets.

### Product summary

Admins design forms and exclusive 1:1 workflows on a visual canvas. Notification **message templates** are administered separately (per form, rich text). Workflow Notify nodes pick a template and choose recipients. Users submit requests from a **Requests** catalog, advance approvals by role, view registers, receive in-app notifications, and optionally attach small files. Demo users switch identity via an AppBar picker. Display version **v0.6** in the AppBar and sidebar.

Keep **view** and **approve** access consistent: never show a request (or a notification deep-link) that the user cannot open, and never show Approve/Reject unless they can act on the current step.

### Tech stack

- React 19 + TypeScript + Vite (dev on `0.0.0.0:5173`, preview on `4173`)
- Material UI (`@mui/material` + icons)
- React Router
- React Flow (`@xyflow/react`) for the workflow canvas
- TipTap (`@tiptap/react` + starter-kit + placeholder) for notification template bodies
- `jspdf` for PDF export
- `uuid` for ids
- oxlint for lint

### Domain model (persist as one JSON blob)

- **Users**: first/last name, email, company (`BHP|Hatch|Bantrel|Fluor`), project (`JS1|JS2|Operations`), roleIds
- **Roles**: name, description, AD group name metadata, scope `app|form`, formIds when form-scoped, system flags. Defaults: Requestor, Manager, Project Director, Admin
- **Forms**: name, description, fields, exclusive `workflowId`, visibility `own|company|project`
- **Form fields**: types `text|textarea|number|select|date|file`; label, required, placeholder/help, select options. File values are `{ name, mimeType, size, dataUrl }` with max **512 KB**; UI/registers/PDF/notifications show **filename only**
- **Notification templates**: `id`, `name`, `formId` (exclusive), `description`, `subject`, `bodyHtml`, timestamps. Subject/body support `{{formName}}`, `{{requestId}}`, `{{status}}`, `{{submitter}}`, and `{{Field Label}}`
- **Workflows**: nodes `start|step|decision|notification|end`; edges with manual outcomes or AND-combined field conditions (`eq|neq|gt|gte|lt|lte|contains|empty|not_empty|changed|unchanged`). Steps/decisions have role assignment; steps may allow editing form fields; **notification nodes** store `notificationTemplateId` plus `notifyRoleIds` and `notifySubmitter` (recipients on the node; content from the template). No cross-form templates
- **Submissions**: form data + baselineData, status `draft|in_progress|completed|rejected`, current node, history (actor, action, outcome, comment, timestamp; label when acting as delegate)
- **Notifications** (inbox messages): in-app only (recipients, subject, rendered body/HTML, read state)
- **Delegations**: from/to user, date range, scope all-workflows or per-workflow; permissions are **additive**
- **formRegisterViews**: per-user per-form column visibility/order

Enforce **strict 1:1 form↔workflow** (create/repair/cascade rules as needed). On load, migrate older data (e.g. ensure Change Request has optional Attachment; lift inline notify subject/body into templates; copy legacy template recipients onto Notify nodes).

### Default seed catalog

Four sample forms each with a dedicated manager-approval workflow and three notification templates (submit / approve / reject):

`Start → Submit (Requestor) → Notify managers/admin → Manager Review (Approve/Reject) → Notify submitter → Approved/Rejected end`

Forms:

1. **Overtime Request** (company) — date, hours, shift, reason  
2. **Vehicle Registration** (project) — make, model, plate, expiry, purpose  
3. **Change Request** (own) — title, description, priority, impact, **optional Attachment (file)**  
4. **Leave Request** (company) — type, start, end, notes  

Boot as **System Admin** `admin@jansen.local` with Admin + Requestor roles (company BHP, project JS1). No login screen.

### Navigation & pages

**Everyone:** Dashboard (pending the identity can see **and** act on), Requests (submit catalog), Request Register (overall), Delegations  

**Administration (admin only, nested, this order):** Forms, **Notifications** (templates), Workflows, Users, Roles, **Data Tools** (last). Non-admins hitting `/forms` redirect to `/requests`. `/admin` → `/data-tools`.

**AppBar:** notification bell → inbox Notifications page (`/notifications`); identity switcher; version `v0.6`.

Also implement: form builder with live preview; notification template list/editor; form submit; request detail (act/approve/reject only when allowed, edit fields when allowed, branded PDF print, attachment download); overall register with header filters; per-form register with customizable columns; workflow list + canvas editor; users/roles CRUD; Data Tools.

### Data Tools

Admin page to seed demo data with independent sections:

- Checkbox **Include users** + mode **Create additional** | **Clear & recreate** + count 0–50  
- Checkbox **Include requests (workflows)** + same modes + requests-per-form 0–50 (default 2) + optional notifications  
- User-only runs must not replace forms/workflows; request runs apply the sample catalog (including notification templates)  
- Sample generator: **random submitters/managers**, weighted open/approved/rejected; **open items within last ~7 days**; completed/rejected can be older; field dates coherent with submission age  
- Reset requests for one form; reset everything to defaults  

### Visibility & history rules

- A request is viewable if: admin, submitter, can act on current step, previously acted (history), received a notification for it, or matches form company/project visibility  
- Registers / dashboard awaiting-action / notification deep-links use the same view check  
- Approve/Reject UI only when `canAct`  
- **Workflow History** (and PDF): only `step` and `decision` rows (user actions — not Notify/End)  

### UX / engine rules

- Delegation expands who can act without removing anyone’s existing roles  
- When workflow hits a notification node, resolve the template + node recipients, create in-app messages, and continue (but do not list those steps in history UI)  
- PDF export: orange branded banner, meta chips, form-like field cards, user-action history  
- File clear/replace on submit and editable steps; reject oversized files with a clear error  

### Deliverables

- Working Vite app matching the above  
- `docs/REQUIREMENTS.md`, `docs/USER_GUIDE.md` with screenshots, and this recreate prompt  
- `AGENTS.md` noting frontend-only / localStorage / ports; on version bumps update REQUIREMENTS, USER_GUIDE, and this prompt  
- Screenshot script using puppeteer-core against the running dev server  

### Out of scope

Real auth/SSO, server sync, email delivery, multi-file or >512 KB attachments, native mobile apps.

### Acceptance smoke checks

1. Create two forms → two distinct workflows  
2. Create a notification template for Form A; Form B’s workflow cannot select it  
3. Notify node chooses template + roles; advancing the workflow creates inbox messages  
4. Manager approve/reject produces submitter notifications when configured; history shows only step/decision actions  
5. PDF shows branded banner and field cards; version badge is `v0.6`  

---

*Generated for Jansen Workflows v0.6.*
