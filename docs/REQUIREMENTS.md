# Jansen Workflows — Product Requirements (v0.4)

## 1. Purpose

Jansen Workflows is a browser-based approval workflow application for designing forms, defining multi-step approval flows, submitting requests, and tracking decisions. All data persists in the browser (`localStorage`); there is no backend.

## 2. Goals

| ID | Goal |
|----|------|
| G1 | Let admins design forms and exclusive approval workflows visually |
| G2 | Let users submit requests and advance them through role-based steps |
| G3 | Provide a clear register and audit history for every request |
| G4 | Support temporary approval delegation without removing existing permissions |
| G5 | Demonstrate multi-company / multi-role scenarios via an identity switcher |
| G6 | Support optional file attachments on forms (stored locally) |

## 3. Users & access

### 3.1 Roles (system)

| Role | Capabilities |
|------|----------------|
| **Requestor** | Submit forms; act on steps assigned to Requestor |
| **Manager** | Act on Manager decision/step nodes |
| **Project Director** | Act on Project Director nodes |
| **Admin** | Full access: users, roles, forms, workflows, Data Tools, all approvals |

Custom roles may be app-scoped or form-scoped. Roles can map to Azure AD / AD group names for future SSO.

### 3.2 Identity

- App boots as **System Admin** (`admin@jansen.local`).
- Top-right **Acting as** switcher selects any local user (demo / testing).
- No real authentication in this version.

### 3.3 Companies & projects

- Companies: BHP, Hatch, Bantrel, Fluor.
- Projects: JS1, JS2, Operations.

### 3.4 Navigation

| Audience | Items |
|----------|--------|
| Everyone | Dashboard, Requests, Request Register, Delegations |
| Admin only | Forms, Workflows, Users, Roles, Data Tools (under Administration) |
| App bar | Notification bell, identity switcher, version badge (`v0.4`) |

## 4. Functional requirements

### 4.1 Forms & workflows (1:1)

| ID | Requirement |
|----|-------------|
| FW-1 | **Each form must have exactly one dedicated workflow.** |
| FW-2 | Two forms must never share the same workflow. |
| FW-3 | Creating a form auto-creates a dedicated workflow when none is supplied. |
| FW-4 | Form builder only lists the form’s current workflow plus unassigned workflows. |
| FW-5 | Saving a form without a workflow is rejected (or a new dedicated workflow is created). |
| FW-6 | Deleting a form cascade-deletes its dedicated workflow and its submissions. |
| FW-7 | Deleting a workflow that is linked to a form replaces it with a new dedicated workflow for that form. |
| FW-8 | On load, shared or missing links are repaired to restore 1:1 pairing. |
| FW-9 | Workflow editor may link/unlink a form; linking moves the form from any previous workflow. |

### 4.2 Form builder

| ID | Requirement |
|----|-------------|
| FB-1 | Admins can create forms with fields: text, textarea, number, select, date, **file**. |
| FB-2 | Fields support label, required, placeholder/help text, and select options. |
| FB-3 | Live preview mirrors the submit experience. |
| FB-4 | Field order can be changed. |
| FB-5 | File fields store a single attachment as a data URL in localStorage (max **512 KB**). |
| FB-6 | Registers, PDF, notifications, and detail views show the **filename** (not raw base64). |
| FB-7 | The Change Request sample form includes an optional **Attachment** file field by default. |

### 4.3 Workflow editor

| ID | Requirement |
|----|-------------|
| WE-1 | Admins edit workflows on a visual canvas (React Flow). |
| WE-2 | Node types: start, step, decision, notification, end. |
| WE-3 | Steps/decisions assign a role; optional field-edit permission on the step. |
| WE-4 | Decision routing: manual outcomes and/or form-field conditions. |
| WE-5 | Related form enables field-based conditions and form-scoped roles. |
| WE-6 | Notification nodes support role recipients and/or notify submitter, with templated subject/body. |

### 4.4 Requests & register

| ID | Requirement |
|----|-------------|
| RQ-1 | Users open **Requests** to pick a form and submit; submission starts on the linked workflow. |
| RQ-2 | Request detail shows form data (including downloadable attachments), current step, and history. |
| RQ-3 | Eligible actors can approve / reject / complete steps with comments. |
| RQ-4 | History records actor, action, outcome, timestamp; delegate actions are labeled. |
| RQ-5 | Overall request register lists submissions with: request #, form name, submitter, submission date, last change date, status, current step. |
| RQ-6 | Each form has its own register showing form fields; users can customize column visibility and order (saved per identity). |
| RQ-7 | Registers support filtering from column headers. |
| RQ-8 | Dashboard shows pending items for the current identity. |
| RQ-9 | Form design (`/forms`) is admin-only; non-admins are redirected to Requests. |

### 4.5 Delegations

| ID | Requirement |
|----|-------------|
| DG-1 | A user may delegate approval authority for a date range (duration in days). |
| DG-2 | Coverage: **all workflows** (one delegate) or **per workflow** (possibly different people). |
| DG-3 | Delegate receives the **union** of their roles and the delegator’s roles for covered workflows (additive only). |
| DG-4 | Non-admins may only create/edit/delete **their own** outbound delegations. |
| DG-5 | Admins may create/manage delegations for any user. |
| DG-6 | Per-workflow UI lists workflows the delegator can act on, each with a user dropdown. |

### 4.6 Data Tools

| ID | Requirement |
|----|-------------|
| AD-1 | Data Tools can seed sample users and/or requests independently via checkboxes, each with **Create additional** or **Clear & recreate** modes and counts. |
| AD-2 | Optional checkbox to seed matching in-app notifications with requests. |
| AD-3 | Reset requests for a single form. |
| AD-4 | Reset all application data to defaults. |
| AD-5 | Data Tools is the last item under Administration; `/admin` redirects to `/data-tools`. |

### 4.7 In-app notifications

| ID | Requirement |
|----|-------------|
| EN-1 | Workflows support a **notification** step type. |
| EN-2 | Subject/body are templates with static text and `{{Field Label}}` / builtin tokens. |
| EN-3 | Recipients are selected by role(s) and/or the request submitter; form-scoped roles only apply on linked forms. |
| EN-4 | Notifications are created automatically when the workflow reaches the step. |
| EN-5 | Messages are **in-app only** (not emailed); open from the AppBar bell or Notifications page. |
| EN-6 | Sample manager-approval workflows notify managers/admin on submission and the submitter on approval or rejection. |

### 4.8 PDF export

| ID | Requirement |
|----|-------------|
| PD-1 | Request detail provides a Print icon that downloads a PDF of the current form values and history. |
| PD-2 | File field values appear as filenames in the PDF. |

### 4.9 Submission visibility

| ID | Requirement |
|----|-------------|
| SV-1 | Each form has a visibility boundary: own submissions, within company, or within project. |
| SV-2 | Admins always see all submissions. |
| SV-3 | Users who can act on a request always see it regardless of visibility. |

## 5. Non-functional requirements

| ID | Requirement |
|----|-------------|
| NF-1 | Frontend-only; persistence via `localStorage` key `jansen-workflows-data`. |
| NF-2 | Runs with Vite on port **5173** (dev) / **4173** (preview). |
| NF-3 | Responsive enough for desktop and tablet admin use. |
| NF-4 | No secrets or external API keys required. |
| NF-5 | Display version `APP_VERSION` (`0.4`) in AppBar and sidebar. |

## 6. Out of scope (current version)

- Real authentication / Azure AD sign-in (AD group names are metadata only)
- Multi-user realtime sync or server database
- Email / push notifications
- Multiple files per field or attachments larger than 512 KB
- Mobile-first native apps

## 7. Sample screenshots

Captured from the running app (also under `docs/screenshots/`). See **[USER_GUIDE.md](./USER_GUIDE.md)** for a full walkthrough.

### Dashboard
![Dashboard](./screenshots/01-dashboard.png)

### Requests
![Requests](./screenshots/02-requests.png)

### Forms
![Forms](./screenshots/03-forms.png)

### Form builder (includes file field type)
![Form builder](./screenshots/04-form-builder.png)

### Workflows
![Workflows](./screenshots/05-workflows.png)

### Workflow editor
![Workflow editor](./screenshots/06-workflow-editor.png)

### Request register
![Request register](./screenshots/07-request-register.png)

### Request detail
![Request detail](./screenshots/09-request-detail.png)

### Delegations
![Delegations](./screenshots/11-delegations.png)

### Data Tools
![Data Tools](./screenshots/12-data-tools.png)

Regenerate with:

```bash
npm run dev   # in one terminal
npm run screenshots
```

## 8. Related documents

| Doc | Purpose |
|-----|---------|
| [USER_GUIDE.md](./USER_GUIDE.md) | End-user / admin how-to with screenshots |
| [RECREATE_PROMPT.md](./RECREATE_PROMPT.md) | Prompt to recreate this application from scratch |
| [AGENTS.md](../AGENTS.md) | Cursor Cloud agent notes |

## 9. Acceptance criteria (1:1 form–workflow)

1. Create Form twice → two forms and two distinct workflows.
2. Form builder cannot select another form’s workflow.
3. After reload, no two forms share `workflowId`.
4. Delete form removes its workflow; other forms unchanged.
5. Delete a linked workflow leaves the form with a newly created dedicated workflow.

## 10. Acceptance criteria (file attachments — v0.4)

1. Form builder offers a **file** field type.
2. Change Request includes optional Attachment by default (and after Data Tools reset).
3. Submitting with a small file stores it; detail page offers download by filename.
4. Oversized files (>512 KB) are rejected with a clear message.
5. Register / PDF / notification tokens show the filename only.
