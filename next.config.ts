import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // scenarios.json is read with fs at runtime (never bundled, so answerKey can't
  // leak into client chunks); make sure deployments still ship it.
  outputFileTracingIncludes: {
    "/**": ["./data/scenarios.json"],
  },
};

export default nextConfig;
