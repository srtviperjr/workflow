import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Box, Link, Typography } from '@mui/material';

const screenshotModules = import.meta.glob('../../docs/screenshots/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

function resolveDocAsset(src?: string): string | undefined {
  if (!src) return src;
  const match = src.match(/^\.\/screenshots\/(.+)$/);
  if (!match) return src;
  const file = match[1];
  const hit = Object.entries(screenshotModules).find(([path]) =>
    path.endsWith(`/${file}`),
  );
  return hit?.[1] ?? src;
}

const components: Components = {
  h1: ({ children }) => (
    <Typography
      variant="h4"
      component="h1"
      sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, mb: 2, mt: 0 }}
    >
      {children}
    </Typography>
  ),
  h2: ({ children }) => (
    <Typography
      variant="h5"
      component="h2"
      sx={{
        fontFamily: '"Outfit", sans-serif',
        fontWeight: 650,
        mt: 4,
        mb: 1.5,
        pt: 1,
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      {children}
    </Typography>
  ),
  h3: ({ children }) => (
    <Typography
      variant="h6"
      component="h3"
      sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, mt: 3, mb: 1 }}
    >
      {children}
    </Typography>
  ),
  p: ({ children }) => (
    <Typography variant="body1" sx={{ mb: 1.5, lineHeight: 1.65 }}>
      {children}
    </Typography>
  ),
  ul: ({ children }) => (
    <Box component="ul" sx={{ pl: 3, mb: 2, mt: 0 }}>
      {children}
    </Box>
  ),
  ol: ({ children }) => (
    <Box component="ol" sx={{ pl: 3, mb: 2, mt: 0 }}>
      {children}
    </Box>
  ),
  li: ({ children }) => (
    <Typography component="li" variant="body1" sx={{ mb: 0.75, lineHeight: 1.6 }}>
      {children}
    </Typography>
  ),
  a: ({ href, children }) => {
    const isRepoDoc = Boolean(href?.endsWith('.md'));
    if (isRepoDoc) {
      return (
        <Typography component="span" sx={{ fontWeight: 600 }}>
          {children}
        </Typography>
      );
    }
    return (
      <Link href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </Link>
    );
  },
  img: ({ src, alt }) => (
    <Box
      component="img"
      src={resolveDocAsset(src)}
      alt={alt ?? ''}
      sx={{
        display: 'block',
        maxWidth: '100%',
        height: 'auto',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        my: 2,
      }}
    />
  ),
  table: ({ children }) => (
    <Box
      sx={{
        overflowX: 'auto',
        mb: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <Box
        component="table"
        sx={{
          width: '100%',
          borderCollapse: 'collapse',
          '& th, & td': {
            borderBottom: '1px solid',
            borderColor: 'divider',
            px: 1.5,
            py: 1,
            textAlign: 'left',
            verticalAlign: 'top',
          },
          '& th': {
            bgcolor: 'rgba(226,82,0,0.06)',
            fontWeight: 700,
            fontSize: '0.875rem',
          },
          '& tr:last-of-type td': { borderBottom: 'none' },
        }}
      >
        {children}
      </Box>
    </Box>
  ),
  thead: ({ children }) => <Box component="thead">{children}</Box>,
  tbody: ({ children }) => <Box component="tbody">{children}</Box>,
  tr: ({ children }) => <Box component="tr">{children}</Box>,
  th: ({ children }) => <Box component="th">{children}</Box>,
  td: ({ children }) => (
    <Box component="td">
      <Typography variant="body2" component="div">
        {children}
      </Typography>
    </Box>
  ),
  code: ({ className, children }) => {
    const isBlock = Boolean(className?.includes('language-'));
    if (isBlock) {
      return (
        <Box
          component="pre"
          sx={{
            p: 2,
            mb: 2,
            overflowX: 'auto',
            borderRadius: 1,
            bgcolor: 'secondary.dark',
            color: '#f5f5f5',
            fontSize: '0.85rem',
            lineHeight: 1.5,
          }}
        >
          <Box component="code" sx={{ fontFamily: 'ui-monospace, monospace' }}>
            {children}
          </Box>
        </Box>
      );
    }
    return (
      <Box
        component="code"
        sx={{
          px: 0.75,
          py: 0.15,
          borderRadius: 0.5,
          bgcolor: 'rgba(43,43,43,0.08)',
          fontFamily: 'ui-monospace, monospace',
          fontSize: '0.9em',
        }}
      >
        {children}
      </Box>
    );
  },
  pre: ({ children }) => <>{children}</>,
  hr: () => <Box component="hr" sx={{ border: 0, borderTop: '1px solid', borderColor: 'divider', my: 3 }} />,
  strong: ({ children }) => (
    <Box component="strong" sx={{ fontWeight: 700 }}>
      {children}
    </Box>
  ),
};

type MarkdownDocProps = {
  markdown: string;
};

export function MarkdownDoc({ markdown }: MarkdownDocProps) {
  return (
    <Box sx={{ '& > *:first-of-type': { mt: 0 } }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </Box>
  );
}
