import { Navigate, createBrowserRouter, RouterProvider } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { AppProvider } from './context/AppContext';
import { theme } from './theme/theme';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { UsersPage } from './pages/UsersPage';
import { RolesPage } from './pages/RolesPage';
import { WorkflowsPage } from './pages/WorkflowsPage';
import { WorkflowEditorPage } from './pages/WorkflowEditorPage';
import { FormsPage } from './pages/FormsPage';
import { FormBuilderPage } from './pages/FormBuilderPage';
import { FormSubmitPage } from './pages/FormSubmitPage';
import { RequestsPage } from './pages/RequestsPage';
import { RequestRegisterPage } from './pages/RequestRegisterPage';
import { FormRegisterPage } from './pages/FormRegisterPage';
import { RequestDetailPage } from './pages/RequestDetailPage';
import { DataToolsPage } from './pages/DataToolsPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { DelegationsPage } from './pages/DelegationsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { NotificationTemplatesPage } from './pages/NotificationTemplatesPage';
import { NotificationTemplateEditorPage } from './pages/NotificationTemplateEditorPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'requests', element: <RequestsPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'roles', element: <RolesPage /> },
      { path: 'delegations', element: <DelegationsPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      {
        path: 'notification-templates',
        element: <NotificationTemplatesPage />,
      },
      {
        path: 'notification-templates/:id/edit',
        element: <NotificationTemplateEditorPage />,
      },
      { path: 'workflows', element: <WorkflowsPage /> },
      { path: 'workflows/:id', element: <WorkflowEditorPage /> },
      { path: 'forms', element: <FormsPage /> },
      { path: 'forms/:id/edit', element: <FormBuilderPage /> },
      { path: 'forms/:id/submit', element: <FormSubmitPage /> },
      { path: 'register', element: <RequestRegisterPage /> },
      { path: 'register/form/:formId', element: <FormRegisterPage /> },
      { path: 'register/:id', element: <RequestDetailPage /> },
      { path: 'integrations', element: <IntegrationsPage /> },
      { path: 'data-tools', element: <DataToolsPage /> },
      { path: 'admin', element: <Navigate to="/data-tools" replace /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    </ThemeProvider>
  );
}
