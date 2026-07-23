# Jansen Workflows — User Guide (v0.8.1)

This guide walks through day-to-day use of the local demo app. All data stays in your browser; use **Data Tools** to seed or reset sample content.

```bash
npm install
npm run dev
```

Open the URL shown (typically `http://localhost:5173`). You start as **System Admin**.

---

## 1. Orientation

![Dashboard](./screenshots/01-dashboard.png)

| Control | Purpose |
|---------|---------|
| **Sidebar** | Dashboard, Requests, Request Register, Delegations; admins also see Administration (Forms, Notifications, Workflows, …) |
| **Bell** | In-app notification inbox |
| **Acting as** | Switch identity (no password) |
| **v0.8.1** | App version |

The dashboard hero reads **Project workflow management system.** Below that, it lists work waiting for the current identity — only requests you can both **see** and **act on**.

---

## 2. Submit a request

1. Open **Requests**.
2. Choose a form (e.g. Change Request).
3. Fill required fields. On Change Request you may attach an optional file (max 512 KB).
4. Submit — the workflow starts and notifications may fire.

![Requests catalog](./screenshots/02-requests.png)

![Submit Change Request](./screenshots/10-submit-change-request.png)

---

## 3. Track requests in registers

**Request Register** shows every submission you are allowed to see (visibility + role/action rules):

![Overall register](./screenshots/07-request-register.png)

Use the filter row under each column header:

- **Dates** (submission date / form date fields) — click to open a popup for **Between** dates or **Relative** (last 7 / 30 / 90 / 365 days, or custom)
- **Dropdowns** (status, form name, current step, form select fields) — multi-select with checkboxes
- **Text** — partial search; use × to clear one filter
- **Clear filters (N)** clears everything at once

Open a row for detail.

Each form also has a **per-form register** (from Forms → Register or `/register/form/...`) with that form’s fields. Customize visible columns, order, and sticky pins; the layout is saved for your identity. **Request #** and **Submitter** stay locked on the left while you scroll horizontally (you can pin or unpin other columns too).

![Form register](./screenshots/08-form-register.png)

---

## 4. Review and approve

On **Request detail** you see field values (download attachments by filename), history, and — **only if you can act** — Approve / Reject / Complete with an optional comment.

![Request detail](./screenshots/09-request-detail.png)

**Workflow History** lists only what people did — submission steps and decisions (e.g. Submit Request, Manager Review). Columns: Step, User, Action / Outcome, Timestamp, Status. System Notify and End nodes are not shown.

Use the **print** icon to download a branded PDF snapshot (orange banner, form-like field cards; notification rows omitted from history).

### Who can see a request?

You can open a request if you are the submitter or an admin, you can act on the current step, you already acted on it, you received a notification about it, or you match the form’s company/project visibility.

---

## 5. Notifications (inbox)

When a workflow reaches a Notify step, messages appear for the roles and/or submitter configured on that step. Open the bell or the inbox **Notifications** page.

![Notifications](./screenshots/13-notifications.png)

Sample flows notify managers/admins on submit and the submitter on approve or reject. **Open related request** is shown only when you still have access to that submission.

Delegation handoffs also create inbox messages (see below).

---

## 6. Delegations

Grant someone else your approval authority for a date range — for all workflows or specific ones. Permissions are **additive** (they keep their own roles too). Non-admins manage only their own outbound delegations; admins can manage any.

When you create a delegation, if you have in-progress requests awaiting action under the covered scope, you can choose to **notify the delegate** of those items. When the delegation **ends** (expires or you remove it), you are notified of any covered requests that are still open so you can continue them. If more than four requests are open, you get one summary message with a link for each request; otherwise each request gets its own message. Overlapping date ranges for the same user’s covered workflows are not allowed.

![Delegations](./screenshots/11-delegations.png)

---

## 7. Administration (admins)

### Forms

Design field lists, visibility (own / company / project), and the linked workflow. Field types: text, textarea, number, select, date, **file**.

![Forms](./screenshots/03-forms.png)

![Form builder](./screenshots/04-form-builder.png)

### Notifications (templates)

Under **Administration → Notifications**, design message templates for each form: subject, rich-text body, and `{{tokens}}` for form fields / builtins. Templates are dedicated to one form.

![Notification templates](./screenshots/16-notification-templates.png)

![Notification template editor](./screenshots/17-notification-template-editor.png)

On the **workflow** canvas, each Notify step picks a template for that form and chooses who receives it (roles and/or the submitter).

### Workflows

Edit the canvas: Start, Step, Decision, Notification, End. Assign roles, outcomes, and field conditions. Keep **one workflow per form**. Notify nodes select a template + recipients. Select a step or connection and press **Delete** (or Backspace) to remove it — steps ask for confirmation; connections do not. New workflows default to **“{Form name} Workflow”**.

![Workflows](./screenshots/05-workflows.png)

![Workflow editor](./screenshots/06-workflow-editor.png)

### Users & roles

Create users (company + project) and assign roles. Roles may be app-wide or limited to selected forms.

![Users](./screenshots/14-users.png)

![Roles](./screenshots/15-roles.png)

### Integrations

Under **Administration → Integrations**, configure production connections:

1. **Azure Active Directory** — tenant/client IDs, secret, redirect URI, scopes, SSO and directory sync  
2. **Azure SQL Database** — server, database, authentication, connection options  
3. **Email server** — SMTP or Microsoft Graph, plus from / reply-to defaults  

Settings are saved in the app (and kept when you reset demo data). In this browser-only build they prepare production wiring; they do not open live network connections yet.

![Integrations](./screenshots/18-integrations.png)

### Data Tools

Seed demo data with independent checkboxes:

1. **Include users** — mode (Create additional / Clear & recreate) + count  
2. **Include requests (workflows)** — mode + requests per form + optional notifications  

You can run either alone or both. User-only runs leave forms/workflows unchanged. Sample open requests are dated within the last week; completed ones may be older; submitters are randomized.

Also available: reset one form’s requests, or reset everything.

![Data Tools](./screenshots/12-data-tools.png)

---

## 8. Tips

- Switch to a **Manager** identity after seeding to practice approvals.
- Attachments over 512 KB are blocked (browser storage limits).
- Clearing site data for this origin wipes the demo; use Data Tools → reset to restore defaults.
- Form design is admin-only; everyone uses **Requests** to submit.
- If you cannot see a request in the register, you also will not get approve/deny controls for it.

---

## 9. More detail

- Product requirements: [REQUIREMENTS.md](./REQUIREMENTS.md)
- Recreate-from-scratch prompt: [RECREATE_PROMPT.md](./RECREATE_PROMPT.md)
