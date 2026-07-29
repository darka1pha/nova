# Tiptap Rich Text Editor

Professional, extensible rich text editor for content creation with Markdown and HTML support.

## Features

- **Full Formatting** — Bold, italic, strikethrough, code, headings, lists
- **Markdown Support** — Import/export Markdown content
- **HTML Support** — Work with HTML directly or through the editor UI
- **Links & Images** — Built-in support for links and images
- **Read-Only Mode** — Display content without editing
- **Undo/Redo** — Full undo/redo history
- **TypeScript** — Full type safety
- **Extensible** — Add custom extensions easily

## Files Added

- `src/components/ui/editor/rich-text-editor.tsx` — Main editor component
- `src/components/ui/editor/index.ts` — Barrel export
- `docs/tiptap.md` — Complete documentation

## Quick Start

### Basic Editor

```tsx
"use client";

import { RichTextEditor } from "@/components/ui/editor";
import { useState } from "react";

export function BlogPostForm() {
  const [content, setContent] = useState("");

  return (
    <div>
      <RichTextEditor
        value={content}
        onChange={(html, json) => setContent(html)}
        placeholder="Write your blog post..."
      />
      <button onClick={() => saveBlogPost(content)}>Publish</button>
    </div>
  );
}
```

### Display Content

```tsx
import { RichTextDisplay } from "@/components/ui/editor";

export function BlogPost({ content }) {
  return <RichTextDisplay html={content} />;
}
```

### Markdown Conversion

```tsx
import { htmlToMarkdown, markdownToHtml } from "@/components/ui/editor";

const markdown = htmlToMarkdown(htmlContent);
const html = markdownToHtml(markdownContent);
```

## API

### RichTextEditor

```tsx
interface RichTextEditorProps {
  value?: string;              // Initial HTML content
  onChange?: (html, json) => void;  // Callback when content changes
  placeholder?: string;        // Placeholder text
  readOnly?: boolean;          // Disable editing
  className?: string;          // Custom CSS class
}
```

### RichTextDisplay

Display read-only HTML content with proper styling:

```tsx
<RichTextDisplay html={htmlContent} />
```

## Supported Formats

- Headings (H1, H2, H3)
- Bold, Italic, Strikethrough
- Inline Code & Code Blocks
- Bullet lists & Numbered lists
- Links with auto-linking
- Images (Base64 or URLs)
- Horizontal dividers

## Customization

### Custom Styles

```tsx
<RichTextEditor
  className="border-blue-500 shadow-lg"
  value={content}
  onChange={setContent}
/>
```

### Toolbar Customization

Edit `EditorToolbar` in `rich-text-editor.tsx` to:
- Hide specific buttons
- Add new formatting options
- Customize button appearance
- Add color picker
- Add text alignment

### Custom Extensions

```tsx
import { useEditor } from "@tiptap/react";
import CustomExtension from "./custom-extension";

const editor = useEditor({
  extensions: [
    StarterKit,
    CustomExtension,
    // ... other extensions
  ],
});
```

## Advanced Usage

### Server-Side Validation

```tsx
const { error } = contentSchema.safeParse({
  html: content,
  plainText: content.replace(/<[^>]*>/g, ""),
});
```

### Database Storage

Store HTML directly in your database:

```tsx
await db.post.create({
  data: {
    title: "My Post",
    content: htmlContent,  // Store HTML
  },
});
```

Or convert to Markdown for version control:

```tsx
await git.commit({
  message: "Update post",
  content: htmlToMarkdown(htmlContent),
});
```

### Image Uploads

```tsx
<RichTextEditor
  value={content}
  onChange={(html, json) => {
    // Extract images from JSON and upload
    const images = json.content.filter((node) => node.type === "image");
    images.forEach((img) => uploadImage(img.attrs.src));
  }}
/>
```

## Performance

- Editor is lazy-loaded: `"use client"` directive
- Extensions are minimal by default
- Only required dependencies are bundled
- Debounce onChange callback for real-time sync

## Accessibility

- Keyboard navigation fully supported
- Semantic HTML output
- ARIA labels on toolbar buttons
- Screen reader friendly

## Dependencies

- `@tiptap/react` — React integration
- `@tiptap/starter-kit` — Core extensions
- `@tiptap/extension-placeholder` — Placeholder text
- `@tiptap/extension-link` — Link support
- `@tiptap/extension-image` — Image support

## Best Practices

1. **Content Validation** — Always validate HTML server-side
2. **Sanitize Output** — Use `DOMPurify` if rendering untrusted content
3. **Performance** — Debounce onChange for large forms
4. **Storage** — Choose HTML or Markdown based on use case
5. **Backup** — Keep versioning for important content

## Resources

- [Tiptap Docs](https://tiptap.dev/)
- [Extension API](https://tiptap.dev/api/extensions)
- [Examples](https://tiptap.dev/examples)
- [Community](https://github.com/ueberdosis/tiptap)

## Troubleshooting

### Editor not showing

Ensure `EditorContent` has a parent container with defined height.

### Formatting not working

Make sure the editor has focus. You can focus programmatically with `editor.commands.focus()`.

### Content not persisting

Verify `onChange` callback is properly wired to your state manager or form library.

### Styles not applied

Import Tailwind CSS in your layout or adjust the `className` prop in `EditorContent`.
