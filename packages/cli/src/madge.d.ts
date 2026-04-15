declare module "madge" {
  interface MadgeResult {
    obj(): Record<string, string[]>;
    circular(): string[][];
    depends(id: string): string[];
    orphans(): string[];
    leaves(): string[];
  }

  interface MadgeConfig {
    fileExtensions?: string[];
    tsConfig?: string | undefined;
    detectiveOptions?: Record<string, unknown>;
    excludeRegExp?: RegExp[];
    baseDir?: string;
  }

  function madge(
    path: string | string[],
    config?: MadgeConfig
  ): Promise<MadgeResult>;

  export = madge;
}
