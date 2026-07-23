import { Box, Typography } from '@mui/material';
import releaseNotes from '../../docs/RELEASE_NOTES.md?raw';
import { MarkdownDoc } from '../components/MarkdownDoc';
import { APP_VERSION } from '../version';

export function ReleaseNotesPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(ellipse at top left, rgba(226,82,0,0.10), transparent 50%), radial-gradient(ellipse at bottom right, rgba(43,43,43,0.06), transparent 45%), #F4F2F0',
        py: { xs: 2, md: 4 },
        px: { xs: 2, md: 3 },
      }}
    >
      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        <Typography
          variant="overline"
          sx={{ color: 'text.secondary', letterSpacing: '0.08em', fontWeight: 700 }}
        >
          Jansen Workflows · v{APP_VERSION}
        </Typography>
        <Typography
          variant="h4"
          sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, mb: 0.5 }}
        >
          Release notes
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Features added in each release, newest first.
        </Typography>
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            p: { xs: 2, md: 3 },
          }}
        >
          <MarkdownDoc markdown={releaseNotes} />
        </Box>
      </Box>
    </Box>
  );
}
