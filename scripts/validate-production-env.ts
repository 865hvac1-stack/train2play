import "dotenv/config";

import {
  getProductionWarnings,
  isProductionRuntime,
  validateProductionEnv,
} from "../lib/env";

try {
  if (isProductionRuntime()) {
    validateProductionEnv();
  }

  for (const warning of getProductionWarnings()) {
    console.warn(`[train2play] warning: ${warning}`);
  }

  console.log("[train2play] environment check passed");
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Environment validation failed",
  );
  process.exit(1);
}
