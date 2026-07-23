import { forwardRef, useEffect, useImperativeHandle } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Box,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatClearIcon from '@mui/icons-material/FormatClear';

export interface RichTextEditorHandle {
  insertText: (text: string) => void;
  /** Latest HTML from the editor (preferred over React state when saving). */
  getHTML: () => string;
}

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: number;
}

export const RichTextEditor = forwardRef<RichTextEditorHandle, Props>(
  function RichTextEditor(
    {
      value,
      onChange,
      placeholder = 'Write the notification message…',
      disabled = false,
      minHeight = 160,
    },
    ref,
  ) {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: false,
          codeBlock: false,
          code: false,
          blockquote: false,
          horizontalRule: false,
        }),
        Placeholder.configure({ placeholder }),
      ],
      content: value || '',
      editable: !disabled,
      onUpdate: ({ editor: ed }) => {
        onChange(ed.getHTML());
      },
    });

    useImperativeHandle(
      ref,
      () => ({
        insertText: (text: string) => {
          if (!editor || disabled) return;
          editor.chain().focus().insertContent(text).run();
        },
        getHTML: () => editor?.getHTML() ?? value ?? '',
      }),
      [editor, disabled, value],
    );

    useEffect(() => {
      if (!editor) return;
      const current = editor.getHTML();
      const next = value || '';
      if (current !== next) {
        editor.commands.setContent(next, { emitUpdate: false });
      }
    }, [value, editor]);

    useEffect(() => {
      if (!editor) return;
      editor.setEditable(!disabled);
    }, [disabled, editor]);

    if (!editor) return null;

    return (
      <Box
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: disabled ? 'action.disabledBackground' : 'background.paper',
          overflow: 'hidden',
        }}
      >
        <Stack
          direction="row"
          spacing={0.25}
          alignItems="center"
          sx={{ px: 0.5, py: 0.25, bgcolor: 'grey.50' }}
        >
          <Tooltip title="Bold">
            <span>
              <IconButton
                size="small"
                disabled={disabled}
                color={editor.isActive('bold') ? 'primary' : 'default'}
                onClick={() => editor.chain().focus().toggleBold().run()}
              >
                <FormatBoldIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Italic">
            <span>
              <IconButton
                size="small"
                disabled={disabled}
                color={editor.isActive('italic') ? 'primary' : 'default'}
                onClick={() => editor.chain().focus().toggleItalic().run()}
              >
                <FormatItalicIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Bullet list">
            <span>
              <IconButton
                size="small"
                disabled={disabled}
                color={editor.isActive('bulletList') ? 'primary' : 'default'}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
              >
                <FormatListBulletedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Numbered list">
            <span>
              <IconButton
                size="small"
                disabled={disabled}
                color={editor.isActive('orderedList') ? 'primary' : 'default'}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
              >
                <FormatListNumberedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Clear formatting">
            <span>
              <IconButton
                size="small"
                disabled={disabled}
                onClick={() =>
                  editor.chain().focus().clearNodes().unsetAllMarks().run()
                }
              >
                <FormatClearIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            Rich text
          </Typography>
        </Stack>
        <Divider />
        <Box
          sx={{
            minHeight,
            px: 1.5,
            py: 1,
            '& .tiptap': {
              outline: 'none',
              minHeight: minHeight - 16,
              fontSize: '0.95rem',
              lineHeight: 1.6,
              '& p': { m: 0, mb: 1 },
              '& ul, & ol': { pl: 2.5, m: 0, mb: 1 },
              '& p.is-editor-empty:first-of-type::before': {
                color: 'text.disabled',
                content: 'attr(data-placeholder)',
                float: 'left',
                height: 0,
                pointerEvents: 'none',
              },
            },
          }}
        >
          <EditorContent editor={editor} className="tiptap" />
        </Box>
      </Box>
    );
  },
);
