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
import { RequestRegisterPage } from './pages/RequestRegisterPage';
import { FormRegisterPage } from './pages/FormRegisterPage';
import { RequestDetailPage } from './pages/RequestDetailPage';
import { AdminToolsPage } from './pages/AdminToolsPage';
import { DelegationsPage } from './pages/DelegationsPage';
import { NotificationsPage } from './pages/NotificationsPage';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="roles" element={<RolesPage />} />
              <Route path="delegations" element={<DelegationsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="workflows" element={<WorkflowsPage />} />
              <Route path="workflows/:id" element={<WorkflowEditorPage />} />
              <Route path="forms" element={<FormsPage />} />
              <Route path="forms/:id/edit" element={<FormBuilderPage />} />
              <Route path="forms/:id/submit" element={<FormSubmitPage />} />
              <Route path="register" element={<RequestRegisterPage />} />
              <Route path="register/form/:formId" element={<FormRegisterPage />} />
              <Route path="register/:id" element={<RequestDetailPage />} />
              <Route path="admin" element={<AdminToolsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  );
}
