import type { MDXComponents } from "mdx/types";
import { slugify } from "@/lib/writing";

// headings carry an anchor so the rail can point at them
const components: MDXComponents = {
  h2: ({ children }) => <h2 id={typeof children === "string" ? slugify(children) : undefined}>{children}</h2>,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
