import { Box, Typography } from '@mui/material';
import userGuide from '../../docs/USER_GUIDE.md?raw';
import { MarkdownDoc } from '../components/MarkdownDoc';

export function HelpPage() {
  return (
    <Box sx={{ maxWidth: 900 }}>
      <Typography
        variant="overline"
        sx={{ color: 'text.secondary', letterSpacing: '0.08em', fontWeight: 700 }}
      >
        Help
      </Typography>
      <Typography
        variant="h4"
        sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, mb: 0.5 }}
      >
        User guide
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Walkthrough of day-to-day use. Click the version badge in the header or
        sidebar to open release notes in a new window.
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
        <MarkdownDoc markdown={userGuide} />
      </Box>
    </Box>
  );
}
