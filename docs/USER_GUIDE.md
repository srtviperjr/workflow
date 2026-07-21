# Jansen Workflows — User Guide (v0.4)

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
| **Sidebar** | Dashboard, Requests, Request Register, Delegations; admins also see Administration |
| **Bell** | In-app notifications |
| **Acting as** | Switch identity (no password) |
| **v0.4** | App version |

The dashboard lists work waiting for the current identity.

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

**Request Register** shows every submission you are allowed to see:

![Overall register](./screenshots/07-request-register.png)

Use column header filters to narrow results. Open a row for detail.

Each form also has a **per-form register** (from Forms → Register or `/register/form/...`) with that form’s fields. Customize visible columns and order; the layout is saved for your identity.

![Form register](./screenshots/08-form-register.png)

---

## 4. Review and approve

On **Request detail** you see field values (download attachments by filename), history, and — if you can act — Approve / Reject / Complete with an optional comment.

![Request detail](./screenshots/09-request-detail.png)

Use the **print** icon to download a PDF snapshot of the form and history.

---

## 5. Notifications

When a workflow reaches a Notify step, messages appear for the configured roles and/or the submitter. Open the bell or **Notifications**.

![Notifications](./screenshots/13-notifications.png)

Sample flows notify managers/admins on submit and the submitter on approve or reject.

---

## 6. Delegations

Grant someone else your approval authority for a date range — for all workflows or specific ones. Permissions are **additive** (they keep their own roles too). Non-admins manage only their own outbound delegations; admins can manage any.

![Delegations](./screenshots/11-delegations.png)

---

## 7. Administration (admins)

### Forms

Design field lists, visibility (own / company / project), and the linked workflow. Field types: text, textarea, number, select, date, **file**.

![Forms](./screenshots/03-forms.png)

![Form builder](./screenshots/04-form-builder.png)

### Workflows

Edit the canvas: Start, Step, Decision, Notification, End. Assign roles, outcomes, and field conditions. Keep **one workflow per form**.

![Workflows](./screenshots/05-workflows.png)

![Workflow editor](./screenshots/06-workflow-editor.png)

### Users & roles

Create users (company + project) and assign roles. Roles may be app-wide or limited to selected forms.

![Users](./screenshots/14-users.png)

![Roles](./screenshots/15-roles.png)

### Data Tools

Seed demo users and requests:

- **Create additional** or **Clear & recreate**
- Counts for users and requests-per-form
- Optional notifications with the requests
- Reset one form’s requests, or reset everything

![Data Tools](./screenshots/12-data-tools.png)

---

## 8. Tips

- Switch to a **Manager** identity after seeding to practice approvals.
- Attachments over 512 KB are blocked (browser storage limits).
- Clearing site data for this origin wipes the demo; use Data Tools → reset to restore defaults.
- Form design is admin-only; everyone uses **Requests** to submit.

---

## 9. More detail

- Product requirements: [REQUIREMENTS.md](./REQUIREMENTS.md)
- Recreate-from-scratch prompt: [RECREATE_PROMPT.md](./RECREATE_PROMPT.md)
