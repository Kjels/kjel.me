import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
};

// MDX is the content layer: content/work/*.mdx and content/about.mdx
const withMDX = createMDX({});

export default withMDX(nextConfig);
