/**
 * Tiptap Rich Text Editor
 * A minimal, extensible rich text editor with Markdown and HTML support.
 */

"use client";

import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Heading from "@tiptap/extension-heading";
import { ReactNode } from "react";

interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string, json: any) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
}

/**
 * Main Rich Text Editor Component
 * Supports markdown, HTML, images, links, and formatting
 */
export function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Write something...",
  readOnly = false,
  className = "",
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Image.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: "max-w-full h-auto rounded",
        },
      }),
    ],
    content: value,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML(), editor.getJSON());
      }
    },
  });

  return (
    <div className={`border rounded-lg ${className}`}>
      {!readOnly && editor && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} className="prose prose-sm max-w-none p-4" />
    </div>
  );
}

/**
 * Editor toolbar with formatting buttons
 */
function EditorToolbar({ editor }: { editor: Editor }) {
  const Button = ({
    onClick,
    active,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    children: ReactNode;
  }) => (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
        active
          ? "bg-blue-500 text-white"
          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="border-b p-2 flex gap-2 flex-wrap">
      <Button
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
      >
        Bold
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
      >
        Italic
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
      >
        Strike
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive("code")}
      >
        Code
      </Button>

      <div className="border-l mx-1" />

      <Button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
      >
        H1
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
      >
        H2
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
      >
        H3
      </Button>

      <div className="border-l mx-1" />

      <Button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
      >
        Bullet
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
      >
        List
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        active={editor.isActive("codeBlock")}
      >
        Code Block
      </Button>

      <div className="border-l mx-1" />

      <Button onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        Divider
      </Button>
      <Button onClick={() => editor.chain().focus().undo().run()}>Undo</Button>
      <Button onClick={() => editor.chain().focus().redo().run()}>Redo</Button>
    </div>
  );
}

/**
 * Display HTML rendered content (read-only)
 */
export function RichTextDisplay({ html }: { html: string }) {
  return (
    <div className="prose prose-sm max-w-none">
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

/**
 * Convert HTML to Markdown
 * Useful for storing content in markdown format
 */
export function htmlToMarkdown(html: string): string {
  // Simple HTML to Markdown converter
  // For production, use a library like turndown
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/g, "# $1\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/g, "## $1\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/g, "### $1\n")
    .replace(/<strong[^>]*>(.*?)<\/strong>/g, "**$1**")
    .replace(/<em[^>]*>(.*?)<\/em>/g, "*$1*")
    .replace(/<code[^>]*>(.*?)<\/code>/g, "`$1`")
    .replace(/<p[^>]*>/g, "")
    .replace(/<\/p>/g, "\n")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<[^>]*>/g, "");
}

/**
 * Convert Markdown to HTML
 * For production, use a library like marked or remark
 */
export function markdownToHtml(markdown: string): string {
  return markdown
    .replace(/^# (.*?)$/gm, "<h1>$1</h1>")
    .replace(/^## (.*?)$/gm, "<h2>$1</h2>")
    .replace(/^### (.*?)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");
}
