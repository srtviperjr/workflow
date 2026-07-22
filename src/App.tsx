import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
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
import { DelegationsPage } from './pages/DelegationsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { NotificationTemplatesPage } from './pages/NotificationTemplatesPage';
import { NotificationTemplateEditorPage } from './pages/NotificationTemplateEditorPage';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="requests" element={<RequestsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="roles" element={<RolesPage />} />
              <Route path="delegations" element={<DelegationsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route
                path="notification-templates"
                element={<NotificationTemplatesPage />}
              />
              <Route
                path="notification-templates/:id/edit"
                element={<NotificationTemplateEditorPage />}
              />
              <Route path="workflows" element={<WorkflowsPage />} />
              <Route path="workflows/:id" element={<WorkflowEditorPage />} />
              <Route path="forms" element={<FormsPage />} />
              <Route path="forms/:id/edit" element={<FormBuilderPage />} />
              <Route path="forms/:id/submit" element={<FormSubmitPage />} />
              <Route path="register" element={<RequestRegisterPage />} />
              <Route
                path="register/form/:formId"
                element={<FormRegisterPage />}
              />
              <Route path="register/:id" element={<RequestDetailPage />} />
              <Route path="data-tools" element={<DataToolsPage />} />
              <Route path="admin" element={<Navigate to="/data-tools" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  );
}
