import fs from "fs-extra";
import path from "node:path";

export interface TransactionSnapshot {
  targetDir: string;
}

export class ProjectTransaction {
  private targetDir: string;
  private fileBackups = new Map<string, string | null>(); // path -> content (null if did not exist)
  private createdFiles = new Set<string>();
  private createdDirs = new Set<string>();
  private active = false;

  constructor(targetDir: string) {
    this.targetDir = path.resolve(targetDir);
  }

  public begin(): void {
    this.fileBackups.clear();
    this.createdFiles.clear();
    this.createdDirs.clear();
    this.active = true;
  }

  /**
   * Pre-records file state before modifying or writing to it.
   */
  public async snapshotFile(filePath: string): Promise<void> {
    const abs = path.isAbsolute(filePath) ? filePath : path.join(this.targetDir, filePath);
    if (this.fileBackups.has(abs)) return;

    if (await fs.pathExists(abs)) {
      const content = await fs.readFile(abs, "utf8");
      this.fileBackups.set(abs, content);
    } else {
      this.fileBackups.set(abs, null);
      this.createdFiles.add(abs);
    }
  }

  /**
   * Records that a directory was newly created.
   */
  public recordCreatedDir(dirPath: string): void {
    const abs = path.isAbsolute(dirPath) ? dirPath : path.join(this.targetDir, dirPath);
    this.createdDirs.add(abs);
  }

  /**
   * Records that a file was newly created.
   */
  public recordCreatedFile(filePath: string): void {
    const abs = path.isAbsolute(filePath) ? filePath : path.join(this.targetDir, filePath);
    if (!this.fileBackups.has(abs)) {
      this.fileBackups.set(abs, null);
    }
    this.createdFiles.add(abs);
  }

  /**
   * Commits the transaction, clearing recorded snapshots.
   */
  public commit(): void {
    this.fileBackups.clear();
    this.createdFiles.clear();
    this.createdDirs.clear();
    this.active = false;
  }

  /**
   * Rolls back all recorded mutations to their original state.
   */
  public async rollback(): Promise<void> {
    if (!this.active && this.fileBackups.size === 0 && this.createdFiles.size === 0) {
      return;
    }

    // 1. Remove all created files
    for (const file of this.createdFiles) {
      if (await fs.pathExists(file)) {
        await fs.remove(file).catch(() => {});
      }
    }

    // 2. Restore modified files to their original snapshot
    for (const [file, originalContent] of this.fileBackups.entries()) {
      if (originalContent === null) {
        if (await fs.pathExists(file)) {
          await fs.remove(file).catch(() => {});
        }
      } else {
        await fs.ensureDir(path.dirname(file));
        await fs.writeFile(file, originalContent, "utf8").catch(() => {});
      }
    }

    // 3. Remove created empty directories in reverse order (deepest first)
    const sortedDirs = [...this.createdDirs].sort((a, b) => b.length - a.length);
    for (const dir of sortedDirs) {
      if (await fs.pathExists(dir)) {
        const files = await fs.readdir(dir).catch(() => ["non-empty"]);
        if (files.length === 0) {
          await fs.remove(dir).catch(() => {});
        }
      }
    }

    this.commit();
  }
}
