import type { MDXComponents } from "mdx/types";

// content pages render plain semantic HTML; styling lives in globals.css under .prose
const components: MDXComponents = {};

export function useMDXComponents(): MDXComponents {
  return components;
}
