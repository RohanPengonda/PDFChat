// GFM remark plugin: adds strikethrough (~~text~~) and task lists
// (- [ ] / - [x]) to react-markdown without extra dependencies.
//
// The plugin walks the mdast tree and converts GFM constructs into mdast
// element nodes (del, input). These flow through remark-rehype
// (allowDangerousHtml defaults to true in this react-markdown version) and
// are rendered as real HTML elements by react-markdown's toJsxRuntime.
//
// Pipe tables are already supported by remark-parse natively, so they are not
// handled here.
//
// The entire transform is wrapped in try/catch so a malformed mdast tree can
// never crash the renderer.

import type { Root, PhrasingContent } from 'mdast';

// Split text children on a delimiter, wrapping delimited segments in an
// element of the given tagName. Existing element nodes are left untouched.
function splitOn(
  children: PhrasingContent[],
  delimiter: string,
  tagName: string,
): PhrasingContent[] {
  const result: PhrasingContent[] = [];
  let buffer = '';

  const flush = () => {
    if (buffer.length > 0) {
      result.push({ type: 'text', value: buffer } as PhrasingContent);
      buffer = '';
    }
  };

  for (const child of children) {
    if (!child || typeof child !== 'object') continue;
    if (child.type === 'text') {
      const text = child.value ?? '';
      let searchFrom = 0;
      while (true) {
        const idx = text.indexOf(delimiter, searchFrom);
        if (idx === -1) {
          buffer += text.slice(searchFrom);
          break;
        }
        buffer += text.slice(searchFrom, idx);
        flush();
        result.push(
          {
            type: 'element',
            tagName,
            properties: {},
            children: [],
          } as unknown as PhrasingContent,
        );
        searchFrom = idx + delimiter.length;
      }
    } else {
      flush();
      result.push(child);
    }
  }
  flush();
  return result;
}

// Convert ~~strikethrough~~ inline text into del elements inside paragraphs.
function processInline(children: PhrasingContent[]): PhrasingContent[] {
  return splitOn(children, '~~', 'del');
}

function isTextNode(node: any): node is { type: 'text'; value: string } {
  return node.type === 'text';
}

// Check whether a paragraph begins with a task-list marker: "[x] " or "[ ] ".
function parseTaskListPrefix(children: PhrasingContent[]): { checked: boolean; rest: string } | null {
  if (children.length === 0 || !isTextNode(children[0])) return null;
  const value = children[0].value ?? '';
  const m = value.match(/^\[(x|\s)\]\s(.*)$/i);
  if (!m) return null;
  return { checked: m[1] === 'x', rest: m[2] };
}

// Safely recurse into a node's children array.
function safeChildren(node: any): any[] {
  return Array.isArray(node.children) ? node.children : [];
}

// Walk the tree and apply GFM transforms. Fully defensive against missing or
// non-array children so empty/malformed mdast trees cannot throw.
export function gfmRemarkPlugin() {
  return (tree: Root) => {
    try {
      const children: any[] = Array.isArray(tree.children) ? [...tree.children] : [];

      for (let i = 0; i < children.length; i++) {
        const node = children[i];
        if (!node || typeof node !== 'object') continue;

        // --- Task list: detect "[x] text" / "[ ] text" inside list items ---
        if (node.type === 'listItem') {
          const listChildren = safeChildren(node);
          for (let j = 0; j < listChildren.length; j++) {
            const child = listChildren[j];
            if (!child || typeof child !== 'object') continue;
            if (child.type === 'paragraph') {
              const paraChildren = safeChildren(child);
              const task = parseTaskListPrefix(paraChildren as PhrasingContent[]);
              if (task) {
                child.children = [
                  {
                    type: 'element',
                    tagName: 'input',
                    properties: {
                      type: 'checkbox',
                      disabled: true,
                      ...(task.checked ? { checked: true } : {}),
                    },
                    children: [],
                  },
                  { type: 'text', value: ' ' + task.rest },
                ] as PhrasingContent[];
              }
            }
          }
        }

        // Recurse into nested children (lists, blockquotes, etc.).
        const nodeChildren = safeChildren(node);
        if (nodeChildren.length > 0) {
          const nested = { type: 'root', children: nodeChildren } as Root;
          gfmRemarkPlugin()(nested);
          node.children = nested.children;
        }
      }

      // Inline strikethrough inside all paragraphs.
      for (const node of children) {
        if (!node || typeof node !== 'object') continue;
        if (node.type === 'paragraph') {
          const paraChildren = safeChildren(node);
          if (paraChildren.length > 0) {
            node.children = processInline(paraChildren as PhrasingContent[]);
          }
        }
      }
    } catch {
      // Never let GFM processing crash the renderer.
    }
  };
}
