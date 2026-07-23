# Jansen Workflows — Release notes

Most recent release first. In the app, click the version badge (for example **v0.8.2**) to open this page in a new window.

## v0.8.2

- In-app **Help** — full user guide with screenshots from the sidebar
- Click the **version badge** (AppBar or sidebar) to open these release notes in a new window (newest first)
- Forms own ordered **request statuses** (first = on submit; rest = decision outcomes); taking an action sets status and routes by `statusOptionId`
- Reorder statuses with up/down; **Layout** canvas for drag-placing form fields
- Decision nodes: **user** (amber) vs **system/conditional** (teal); no mixing modes on one node
- **Copy** for forms (deep-copy form + workflow + templates), workflows, and notification templates
- Single **Save** on catalog editors; discard unsaved create/copy drafts when leaving
- Clear create-time placeholder names on focus (“New Form”, “New field”, “New notification”, …)
- Notifications list: filter by form; cards show name + form; Create Notification on the left; Notify step picks that form’s templates
- Inbox: plain-text previews; admins may **Show all (admin)**; recipients still only see their own by default
- Register text filters: multi-term combination search (pick values and/or type terms)
- Workflow editor: **Delete**/Backspace removes selection; new workflows default to “{Form name} Workflow”

## v0.8.1

- Sticky register columns (Request # and Submitter pinned by default; pin others in Customize columns)
- Removed **Last change** column; **Current step** always sits immediately after **Status**
- **New Delegation** button aligned under the page title on the left (like New Request)

## v0.8

- **Administration → Integrations** — configure Azure AD (SSO/identity), Azure SQL, and email (SMTP or Microsoft Graph) for production readiness
- Workflow History: remove Type column; rename Actor → **User**
- Delegation handoffs: when more than four covered requests are open, one summary notification with per-request links (start and end)
- Block overlapping outbound delegations for the same user when dates and workflow coverage both conflict

## v0.7

- Dashboard tagline: **Project workflow management system.**
- Register filters: date popover (between / relative last N days), multi-select dropdowns (status, form, current step, select fields), aligned text search, clear-all / clear-one
- Delegation handoff: optional notify delegate of in-progress items at start; notify delegator of unfinished items when the delegation ends

## v0.6

- **Administration → Notifications** — form-dedicated rich-text templates (subject/body + field tokens)
- Workflow Notify nodes pick a template **and** configure recipients (roles / submitter)
- Admin nav order: Forms → Notifications → Workflows → …
- Request PDF: branded orange banner and form-like field cards
- TipTap rich-text editor for template bodies

## v0.5

- Data Tools **Include users** / **Include requests** checkboxes
- Randomized sample submitters, timestamps (open ≤ 1 week; completed older)
- Workflow History hides Notify steps; reject branch only when used
- Tightened view vs approve access across dashboard, registers, notifications

## v0.4

- End-user **User Guide** with screenshots
- File attachments on forms (stored locally, max 512 KB)
- Expanded screenshot capture and product docs (requirements, recreate prompt)

## v0.3

- Data Tools sample seed modes: **clear & recreate** or **create additional** (append)
- Display version shown in the AppBar and sidebar

## v0.2

- App version badge in the AppBar and sidebar
- Request registers and notification workflow improvements
