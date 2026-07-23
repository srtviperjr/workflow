# Jansen Workflows — Recreation Prompt (v0.8.1)

Copy everything below the line into a coding agent (or use as a product brief) to recreate this application.

---

## Prompt

Build **Jansen Workflows** — a frontend-only React + TypeScript (Vite) approval-workflow demo app. There is **no backend, database, or external API**. Persist all state in browser `localStorage` under the key `jansen-workflows-data`. No env vars or secrets. Admins can store **production integration settings** (Azure AD, Azure SQL, email) in the UI for a future back-end; they are not live connections in this build.

### Product summary

Admins design forms and exclusive 1:1 workflows on a visual canvas. Notification **message templates** are administered separately (per form, rich text). Workflow Notify nodes pick a template and choose recipients. Users submit requests from a **Requests** catalog, advance approvals by role, view registers with field-aware filters and sticky Request # / Submitter columns, receive in-app notifications, and optionally attach small files. Delegations can hand off in-progress work at start/end (summary notification when more than four open items; no overlapping grants for the same user coverage). Demo users switch identity via an AppBar picker. Display version **v0.8.1** in the AppBar and sidebar. Dashboard hero tagline: **Project workflow management system.** Admin **Integrations** configures Azure AD, Azure SQL, and email.

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
- **Workflows**: nodes `start|step|decision|notification|end`; edges with manual outcomes or AND-combined field conditions. Steps/decisions have role assignment; steps may allow editing form fields; **notification nodes** store `notificationTemplateId` plus `notifyRoleIds` and `notifySubmitter` (recipients on the node; content from the template). No cross-form templates
- **Submissions**: form data + baselineData, status `draft|in_progress|completed|rejected`, current node, history
- **Notifications** (inbox): in-app only (recipients, subject, rendered body/HTML, read state) — including workflow notifies and delegation handoffs
- **Delegations**: from/to user, date range, scope all-workflows or per-workflow; additive permissions; `notifyDelegateOnStart`, `startHandoffNotifiedAt`, `endHandoffNotifiedAt`
- **formRegisterViews**: per-user per-form column visibility/order/`sticky` (default sticky: `requestId`, `submitter`)
- **integrations**: Azure AD (SSO/identity), Azure SQL (back-end), and email (SMTP or Microsoft Graph) settings configured by admins; survive demo data resets

Enforce **strict 1:1 form↔workflow**. Migrate older data on load (Change Request attachment field; inline notify → templates; template recipients → notify nodes; delegation handoff fields).

### Default seed catalog

Four sample forms each with a dedicated manager-approval workflow and three notification templates (submit / approve / reject):

`Start → Submit (Requestor) → Notify managers/admin → Manager Review (Approve/Reject) → Notify submitter → Approved/Rejected end`

Forms: Overtime (company), Vehicle Registration (project), Change Request (own, optional Attachment file), Leave Request (company).

Boot as **System Admin** `admin@jansen.local` (Admin + Requestor, BHP / JS1). No login screen.

### Navigation & pages

**Everyone:** Dashboard (tagline + pending the identity can see **and** act on), Requests, Request Register, Delegations, **Help** (in-app user guide from `docs/USER_GUIDE.md`)  

**Administration (admin only, this order):** Forms, **Notifications** (templates), Workflows, Users, Roles, **Integrations**, **Data Tools** (last). `/admin` → `/data-tools`.

**AppBar:** bell → inbox `/notifications`; identity switcher; version `v0.8.1` (click opens `/release-notes` in a new window from `docs/RELEASE_NOTES.md`, newest first).

Also: form builder; notification template editor; form submit; request detail (act only when allowed, branded PDF); overall + per-form registers; workflow canvas; users/roles CRUD; Integrations (Azure AD / Azure SQL / email); Data Tools.

### Register filters

Field-aware column filters:

- **Dates** — single-line trigger opens popover: Between (from/to) or Relative (last 7/30/90/365 or custom days)
- **Select-like** (status, form name, current step from workflow labels, form select fields) — **multi-select** checkboxes
- **Text** — partial contains search; height aligned with selects
- Clear × per filter and **Clear filters (N)** for all
- **Sticky columns** — `RegisterColumnConfig.sticky`; default pin Request # + Submitter; customize dialog pin control; sticky cols compacted to the left

### Delegations & in-progress handoff

- Additive grant of delegator roles to delegate for covered workflows while dates are active
- No overlapping outbound grants for the same user when dates and workflow coverage both overlap
- On create: show count of in-progress actionable requests in scope; checkbox to notify the delegate of those items when the window becomes active
- On end (natural expiry or early remove): notify the **delegator** of covered requests still `in_progress`
- Handoff messages: one per request when ≤4 open; one summary with per-request links when more than 4 (start and end)
- Process handoffs on app load / focus / periodic tick (no backend scheduler)

### Data Tools

Independent **Include users** / **Include requests** with create-additional or clear-recreate modes; optional notifications with requests; randomized recent open samples; reset one form / reset all.

### Integrations (production readiness)

Admin page with three independently saved sections (stored in `AppData.integrations`, survive demo resets):

1. **Azure AD / Entra ID** — tenant/client/secret, redirect URI, authority, scopes, domain, SSO + directory sync, group claim  
2. **Azure SQL** — server/port/database, auth method, credentials, encrypt/trust, timeout, optional connection-string override + preview  
3. **Email** — SMTP or Microsoft Graph, plus from/reply-to defaults  

UI documents that these are configuration for a future back-end (not live in the browser-only build).

### Visibility & history

- Viewable if: admin, submitter, can act, previously acted, notified, or form company/project visibility  
- Registers / dashboard / notification deep-links use the same view check  
- Approve/Reject only when `canAct`  
- Workflow History + PDF: only `step` and `decision` rows; history columns Step / User / Action / Timestamp / Status (no Type)

### UX / engine rules

- Delegation expands who can act without removing anyone’s roles  
- Notify nodes resolve template + node recipients, create inbox messages, continue (omit from history UI)  
- PDF: orange branded banner, meta chips, form-like field cards  
- File clear/replace; reject oversized files  

### Deliverables

- Working Vite app matching the above  
- `docs/REQUIREMENTS.md`, `docs/USER_GUIDE.md` with screenshots, and this recreate prompt  
- `AGENTS.md` noting frontend-only / localStorage / ports; **on every version bump update REQUIREMENTS, USER_GUIDE, RECREATE_PROMPT, README version, and screenshots when UI changed**  
- Screenshot script using puppeteer-core against the running dev server  

### Out of scope

Live Azure AD SSO / SQL / email delivery (Integrations is configuration-only), multi-user server sync, multi-file or >512 KB attachments, native mobile apps.

### Acceptance smoke checks

1. Create two forms → two distinct workflows  
2. Notification template for Form A cannot be picked on Form B’s workflow  
3. Register date filter supports between + last 90 days; status multi-select works; Clear filters works  
4. Delegation with in-progress items can notify the delegate; ending it notifies the delegator of leftovers; >4 open items → one summary with links; overlapping same-user grants blocked  
5. Integrations page saves Azure AD / SQL / email settings; Data Tools reset keeps them  
6. Version badge is `v0.8.1`; dashboard tagline is “Project workflow management system.”  
7. Registers omit Last change; Current step is immediately after Status; Request # / Submitter sticky by default  

---

*Generated for Jansen Workflows v0.8.1.*
