import madge from "madge";
import toposort from "toposort";

export type OrderingMode = "bottom-up" | "top-down";

export async function getFileOrder(
  changedFiles: string[],
  repoRoot: string,
  mode: OrderingMode = "bottom-up"
): Promise<string[]> {
  const jstsFiles = changedFiles.filter((f) =>
    /\.(js|jsx|ts|tsx|mjs|cjs)$/.test(f)
  );
  const otherFiles = changedFiles.filter(
    (f) => !/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(f)
  );

  if (jstsFiles.length === 0) {
    return changedFiles;
  }

  let sortedJsTs: string[];
  try {
    const result = await madge(repoRoot, {
      fileExtensions: ["js", "jsx", "ts", "tsx", "mjs", "cjs"],
      tsConfig: undefined,
      detectiveOptions: {
        ts: { skipTypeImports: true },
        es6: { mixedImports: true },
      },
    });

    const fullGraph = result.obj();
    const changedSet = new Set(jstsFiles);

    // Build edges only between changed files
    const edges: [string, string][] = [];
    for (const [file, deps] of Object.entries(fullGraph)) {
      if (!changedSet.has(file)) continue;
      for (const dep of deps) {
        if (changedSet.has(dep)) {
          // edge: file depends on dep -> dep should come before file
          edges.push([dep, file]);
        }
      }
    }

    // Find files with no edges among changed files
    const filesInEdges = new Set(edges.flat());
    const isolatedFiles = jstsFiles.filter((f) => !filesInEdges.has(f));

    try {
      sortedJsTs = toposort.array(jstsFiles, edges);
    } catch {
      // Circular dependency — toposort throws, fall back to original order
      sortedJsTs = jstsFiles;
    }

    // Append isolated files at the end
    const sortedSet = new Set(sortedJsTs);
    for (const f of isolatedFiles) {
      if (!sortedSet.has(f)) {
        sortedJsTs.push(f);
      }
    }
  } catch {
    // madge failed (e.g., no valid source tree) — fall back to original order
    sortedJsTs = jstsFiles;
  }

  if (mode === "top-down") {
    sortedJsTs.reverse();
  }

  return [...sortedJsTs, ...otherFiles];
}
