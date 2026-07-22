import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import HubIcon from '@mui/icons-material/Hub';
import BadgeIcon from '@mui/icons-material/Badge';
import StorageIcon from '@mui/icons-material/Storage';
import EmailIcon from '@mui/icons-material/Email';
import { useApp } from '../context/AppContext';
import type {
  AzureAdIntegrationSettings,
  AzureSqlIntegrationSettings,
  EmailIntegrationSettings,
} from '../types';
import { createDefaultIntegrations } from '../data/defaults';

function statusChip(
  enabled: boolean,
  configured: boolean,
): { label: string; color: 'default' | 'success' | 'warning' } {
  if (enabled && configured) return { label: 'Enabled', color: 'success' };
  if (enabled && !configured) return { label: 'Incomplete', color: 'warning' };
  if (configured) return { label: 'Configured', color: 'default' };
  return { label: 'Not configured', color: 'default' };
}

function azureAdConfigured(s: AzureAdIntegrationSettings): boolean {
  return Boolean(s.tenantId.trim() && s.clientId.trim() && s.redirectUri.trim());
}

function azureSqlConfigured(s: AzureSqlIntegrationSettings): boolean {
  if (!s.server.trim() || !s.database.trim()) return false;
  if (s.authMethod === 'managedIdentity') return true;
  if (s.connectionStringOverride.trim()) return true;
  return Boolean(s.username.trim());
}

function emailConfigured(s: EmailIntegrationSettings): boolean {
  if (!s.fromAddress.trim()) return false;
  if (s.provider === 'smtp') {
    return Boolean(s.smtpHost.trim() && s.smtpPort > 0);
  }
  return Boolean(
    s.graphTenantId.trim() &&
      s.graphClientId.trim() &&
      s.graphSenderUserId.trim(),
  );
}

/** Build a display connection string from discrete Azure SQL fields. */
function buildAzureSqlConnectionString(
  s: AzureSqlIntegrationSettings,
): string {
  if (s.connectionStringOverride.trim()) return s.connectionStringOverride.trim();
  if (!s.server.trim() || !s.database.trim()) return '';

  const parts = [
    `Server=tcp:${s.server.trim()},${s.port || 1433}`,
    `Initial Catalog=${s.database.trim()}`,
    `Encrypt=${s.encrypt ? 'True' : 'False'}`,
    `TrustServerCertificate=${s.trustServerCertificate ? 'True' : 'False'}`,
    `Connection Timeout=${s.connectionTimeoutSeconds || 30}`,
  ];

  if (s.authMethod === 'managedIdentity') {
    parts.push('Authentication=Active Directory Managed Identity');
  } else if (s.authMethod === 'azureAd') {
    parts.push('Authentication=Active Directory Password');
    if (s.username.trim()) parts.push(`User ID=${s.username.trim()}`);
    if (s.password) parts.push('Password=********');
  } else {
    if (s.username.trim()) parts.push(`User ID=${s.username.trim()}`);
    if (s.password) parts.push('Password=********');
  }

  return parts.join(';') + ';';
}

/** Admin page for production Azure AD, Azure SQL, and email integration settings. */
export function IntegrationsPage() {
  const { data, isAdmin, updateIntegrations } = useApp();
  const defaults = useMemo(() => createDefaultIntegrations(), []);

  const [azureAd, setAzureAd] = useState<AzureAdIntegrationSettings>(
    data.integrations?.azureAd ?? defaults.azureAd,
  );
  const [azureSql, setAzureSql] = useState<AzureSqlIntegrationSettings>(
    data.integrations?.azureSql ?? defaults.azureSql,
  );
  const [email, setEmail] = useState<EmailIntegrationSettings>(
    data.integrations?.email ?? defaults.email,
  );
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!data.integrations) return;
    setAzureAd(data.integrations.azureAd);
    setAzureSql(data.integrations.azureSql);
    setEmail(data.integrations.email);
  }, [data.integrations]);

  if (!isAdmin) {
    return <Typography>Admin access required.</Typography>;
  }

  const flash = (msg: string) => {
    setSavedMsg(msg);
    window.setTimeout(() => setSavedMsg(null), 3500);
  };

  const saveAzureAd = () => {
    updateIntegrations({ azureAd });
    flash('Azure Active Directory settings saved.');
  };

  const saveAzureSql = () => {
    updateIntegrations({ azureSql });
    flash('Azure SQL Database settings saved.');
  };

  const saveEmail = () => {
    updateIntegrations({ email });
    flash('Email server settings saved.');
  };

  const adStatus = statusChip(azureAd.enabled, azureAdConfigured(azureAd));
  const sqlStatus = statusChip(azureSql.enabled, azureSqlConfigured(azureSql));
  const emailStatus = statusChip(email.enabled, emailConfigured(email));
  const sqlPreview = buildAzureSqlConnectionString(azureSql);

  return (
    <Box maxWidth={900}>
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        mb={1}
      >
        <HubIcon color="primary" />
        <Typography variant="h4" fontWeight={700}>
          Integrations
        </Typography>
      </Stack>
      <Typography color="text.secondary" mb={2}>
        Configure production connections for identity (Azure AD / Entra ID),
        data storage (Azure SQL), and outbound email. Settings are saved with
        the application and are ready for a production back-end; they are not
        live connections in this browser-only build.
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Secrets entered here are stored in browser local storage with the rest
        of the app data. Move them to a secure secret store when the production
        API is deployed. Data Tools resets do not clear these settings.
      </Alert>

      {savedMsg && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSavedMsg(null)}>
          {savedMsg}
        </Alert>
      )}

      {data.integrations?.updatedAt && (
        <Typography variant="caption" color="text.secondary" display="block" mb={2}>
          Last updated {new Date(data.integrations.updatedAt).toLocaleString()}
        </Typography>
      )}

      {/* —— Azure AD —— */}
      <Card elevation={1} sx={{ mb: 3 }}>
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ sm: 'center' }}
            spacing={1}
            mb={2}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <BadgeIcon color="primary" />
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Azure Active Directory
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Identity management and single sign-on (SSO)
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip size="small" label={adStatus.label} color={adStatus.color} />
              <FormControlLabel
                control={
                  <Switch
                    checked={azureAd.enabled}
                    onChange={(e) =>
                      setAzureAd((s) => ({ ...s, enabled: e.target.checked }))
                    }
                  />
                }
                label="Enable"
              />
            </Stack>
          </Stack>

          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Tenant ID"
                fullWidth
                required
                value={azureAd.tenantId}
                onChange={(e) =>
                  setAzureAd((s) => ({ ...s, tenantId: e.target.value }))
                }
                helperText="Directory (tenant) ID from Microsoft Entra"
              />
              <TextField
                label="Application (client) ID"
                fullWidth
                required
                value={azureAd.clientId}
                onChange={(e) =>
                  setAzureAd((s) => ({ ...s, clientId: e.target.value }))
                }
              />
            </Stack>
            <TextField
              label="Client secret"
              fullWidth
              type="password"
              autoComplete="new-password"
              value={azureAd.clientSecret}
              onChange={(e) =>
                setAzureAd((s) => ({ ...s, clientSecret: e.target.value }))
              }
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Redirect URI"
                fullWidth
                required
                value={azureAd.redirectUri}
                onChange={(e) =>
                  setAzureAd((s) => ({ ...s, redirectUri: e.target.value }))
                }
                helperText="Must match the app registration redirect URI"
                placeholder="https://workflows.example.com/auth/callback"
              />
              <TextField
                label="Authority host"
                fullWidth
                value={azureAd.authorityHost}
                onChange={(e) =>
                  setAzureAd((s) => ({ ...s, authorityHost: e.target.value }))
                }
                helperText="Usually login.microsoftonline.com"
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="OAuth scopes"
                fullWidth
                value={azureAd.scopes}
                onChange={(e) =>
                  setAzureAd((s) => ({ ...s, scopes: e.target.value }))
                }
                helperText="Space-separated, e.g. openid profile email User.Read"
              />
              <TextField
                label="Allowed email domain"
                fullWidth
                value={azureAd.allowedDomain}
                onChange={(e) =>
                  setAzureAd((s) => ({ ...s, allowedDomain: e.target.value }))
                }
                helperText="Optional — restrict sign-in to this domain"
                placeholder="contoso.com"
              />
            </Stack>
            <TextField
              label="Group claim"
              fullWidth
              value={azureAd.groupClaim}
              onChange={(e) =>
                setAzureAd((s) => ({ ...s, groupClaim: e.target.value }))
              }
              helperText="Claim mapped to role AD group names (Roles → AD groups)"
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <FormControlLabel
                control={
                  <Switch
                    checked={azureAd.ssoEnabled}
                    onChange={(e) =>
                      setAzureAd((s) => ({
                        ...s,
                        ssoEnabled: e.target.checked,
                      }))
                    }
                  />
                }
                label="Use for SSO sign-in"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={azureAd.syncUsersEnabled}
                    onChange={(e) =>
                      setAzureAd((s) => ({
                        ...s,
                        syncUsersEnabled: e.target.checked,
                      }))
                    }
                  />
                }
                label="Sync directory users & groups"
              />
            </Stack>
            <Box>
              <Button variant="contained" onClick={saveAzureAd}>
                Save Azure AD
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* —— Azure SQL —— */}
      <Card elevation={1} sx={{ mb: 3 }}>
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ sm: 'center' }}
            spacing={1}
            mb={2}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <StorageIcon color="primary" />
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Azure SQL Database
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Production back-end data store
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip size="small" label={sqlStatus.label} color={sqlStatus.color} />
              <FormControlLabel
                control={
                  <Switch
                    checked={azureSql.enabled}
                    onChange={(e) =>
                      setAzureSql((s) => ({ ...s, enabled: e.target.checked }))
                    }
                  />
                }
                label="Enable"
              />
            </Stack>
          </Stack>

          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Server"
                fullWidth
                required
                value={azureSql.server}
                onChange={(e) =>
                  setAzureSql((s) => ({ ...s, server: e.target.value }))
                }
                placeholder="myserver.database.windows.net"
              />
              <TextField
                label="Port"
                type="number"
                sx={{ width: { xs: '100%', sm: 140 } }}
                inputProps={{ min: 1 }}
                value={azureSql.port}
                onChange={(e) =>
                  setAzureSql((s) => ({
                    ...s,
                    port: Math.max(1, Number(e.target.value) || 1433),
                  }))
                }
              />
            </Stack>
            <TextField
              label="Database"
              fullWidth
              required
              value={azureSql.database}
              onChange={(e) =>
                setAzureSql((s) => ({ ...s, database: e.target.value }))
              }
            />
            <FormControl fullWidth>
              <InputLabel>Authentication</InputLabel>
              <Select
                label="Authentication"
                value={azureSql.authMethod}
                onChange={(e) =>
                  setAzureSql((s) => ({
                    ...s,
                    authMethod: e.target.value as AzureSqlIntegrationSettings['authMethod'],
                  }))
                }
              >
                <MenuItem value="sql">SQL authentication</MenuItem>
                <MenuItem value="azureAd">Microsoft Entra (Azure AD) password</MenuItem>
                <MenuItem value="managedIdentity">
                  Managed identity
                </MenuItem>
              </Select>
            </FormControl>
            {azureSql.authMethod !== 'managedIdentity' && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Username"
                  fullWidth
                  value={azureSql.username}
                  onChange={(e) =>
                    setAzureSql((s) => ({ ...s, username: e.target.value }))
                  }
                />
                <TextField
                  label="Password"
                  fullWidth
                  type="password"
                  autoComplete="new-password"
                  value={azureSql.password}
                  onChange={(e) =>
                    setAzureSql((s) => ({ ...s, password: e.target.value }))
                  }
                />
              </Stack>
            )}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Connection timeout (seconds)"
                type="number"
                fullWidth
                inputProps={{ min: 1 }}
                value={azureSql.connectionTimeoutSeconds}
                onChange={(e) =>
                  setAzureSql((s) => ({
                    ...s,
                    connectionTimeoutSeconds: Math.max(
                      1,
                      Number(e.target.value) || 30,
                    ),
                  }))
                }
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={azureSql.encrypt}
                    onChange={(e) =>
                      setAzureSql((s) => ({ ...s, encrypt: e.target.checked }))
                    }
                  />
                }
                label="Encrypt"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={azureSql.trustServerCertificate}
                    onChange={(e) =>
                      setAzureSql((s) => ({
                        ...s,
                        trustServerCertificate: e.target.checked,
                      }))
                    }
                  />
                }
                label="Trust server certificate"
              />
            </Stack>
            <TextField
              label="Connection string override (optional)"
              fullWidth
              multiline
              minRows={2}
              value={azureSql.connectionStringOverride}
              onChange={(e) =>
                setAzureSql((s) => ({
                  ...s,
                  connectionStringOverride: e.target.value,
                }))
              }
              helperText="When set, used instead of the fields above"
            />
            {sqlPreview && (
              <>
                <Divider />
                <TextField
                  label="Connection string preview"
                  fullWidth
                  multiline
                  minRows={2}
                  value={sqlPreview}
                  InputProps={{ readOnly: true }}
                  helperText="Password values are masked in the preview"
                />
              </>
            )}
            <Box>
              <Button variant="contained" onClick={saveAzureSql}>
                Save Azure SQL
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* —— Email —— */}
      <Card elevation={1} sx={{ mb: 3 }}>
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ sm: 'center' }}
            spacing={1}
            mb={2}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <EmailIcon color="primary" />
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Email server
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Outbound mail for workflow and system notifications
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                size="small"
                label={emailStatus.label}
                color={emailStatus.color}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={email.enabled}
                    onChange={(e) =>
                      setEmail((s) => ({ ...s, enabled: e.target.checked }))
                    }
                  />
                }
                label="Enable"
              />
            </Stack>
          </Stack>

          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Provider</InputLabel>
              <Select
                label="Provider"
                value={email.provider}
                onChange={(e) =>
                  setEmail((s) => ({
                    ...s,
                    provider: e.target.value as EmailIntegrationSettings['provider'],
                  }))
                }
              >
                <MenuItem value="smtp">SMTP</MenuItem>
                <MenuItem value="microsoftGraph">Microsoft Graph</MenuItem>
              </Select>
            </FormControl>

            {email.provider === 'smtp' ? (
              <>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="SMTP host"
                    fullWidth
                    required
                    value={email.smtpHost}
                    onChange={(e) =>
                      setEmail((s) => ({ ...s, smtpHost: e.target.value }))
                    }
                    placeholder="smtp.office365.com"
                  />
                  <TextField
                    label="Port"
                    type="number"
                    sx={{ width: { xs: '100%', sm: 140 } }}
                    inputProps={{ min: 1 }}
                    value={email.smtpPort}
                    onChange={(e) =>
                      setEmail((s) => ({
                        ...s,
                        smtpPort: Math.max(1, Number(e.target.value) || 587),
                      }))
                    }
                  />
                </Stack>
                <FormControl fullWidth>
                  <InputLabel>Encryption</InputLabel>
                  <Select
                    label="Encryption"
                    value={email.smtpEncryption}
                    onChange={(e) =>
                      setEmail((s) => ({
                        ...s,
                        smtpEncryption: e.target
                          .value as EmailIntegrationSettings['smtpEncryption'],
                      }))
                    }
                  >
                    <MenuItem value="none">None</MenuItem>
                    <MenuItem value="starttls">STARTTLS</MenuItem>
                    <MenuItem value="ssl">SSL / TLS</MenuItem>
                  </Select>
                </FormControl>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="SMTP username"
                    fullWidth
                    value={email.smtpUsername}
                    onChange={(e) =>
                      setEmail((s) => ({ ...s, smtpUsername: e.target.value }))
                    }
                  />
                  <TextField
                    label="SMTP password"
                    fullWidth
                    type="password"
                    autoComplete="new-password"
                    value={email.smtpPassword}
                    onChange={(e) =>
                      setEmail((s) => ({ ...s, smtpPassword: e.target.value }))
                    }
                  />
                </Stack>
              </>
            ) : (
              <>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Graph tenant ID"
                    fullWidth
                    required
                    value={email.graphTenantId}
                    onChange={(e) =>
                      setEmail((s) => ({ ...s, graphTenantId: e.target.value }))
                    }
                  />
                  <TextField
                    label="Graph client ID"
                    fullWidth
                    required
                    value={email.graphClientId}
                    onChange={(e) =>
                      setEmail((s) => ({ ...s, graphClientId: e.target.value }))
                    }
                  />
                </Stack>
                <TextField
                  label="Graph client secret"
                  fullWidth
                  type="password"
                  autoComplete="new-password"
                  value={email.graphClientSecret}
                  onChange={(e) =>
                    setEmail((s) => ({
                      ...s,
                      graphClientSecret: e.target.value,
                    }))
                  }
                />
                <TextField
                  label="Send as (mailbox / user ID)"
                  fullWidth
                  required
                  value={email.graphSenderUserId}
                  onChange={(e) =>
                    setEmail((s) => ({
                      ...s,
                      graphSenderUserId: e.target.value,
                    }))
                  }
                  helperText="User principal name or object ID used with sendMail"
                />
              </>
            )}

            <Divider />
            <Typography variant="subtitle2" fontWeight={700}>
              Message defaults
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="From address"
                fullWidth
                required
                value={email.fromAddress}
                onChange={(e) =>
                  setEmail((s) => ({ ...s, fromAddress: e.target.value }))
                }
                placeholder="noreply@example.com"
              />
              <TextField
                label="From display name"
                fullWidth
                value={email.fromDisplayName}
                onChange={(e) =>
                  setEmail((s) => ({ ...s, fromDisplayName: e.target.value }))
                }
              />
            </Stack>
            <TextField
              label="Reply-to address"
              fullWidth
              value={email.replyToAddress}
              onChange={(e) =>
                setEmail((s) => ({ ...s, replyToAddress: e.target.value }))
              }
            />
            <Box>
              <Button variant="contained" onClick={saveEmail}>
                Save email
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
