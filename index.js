#!/usr/bin/env node

import { Command } from 'commander';
import glob from 'fast-glob';
import fs from 'fs-extra';
import path from 'path';
import prettyBytes from 'pretty-bytes';

// Default patterns to search for junk files/folders
const DEFAULT_PATTERNS = [
  'node_modules',
  'dist',
  'build',
  '.DS_Store',
  '__pycache__',
  '*.log',
  'coverage',
  '.nyc_output',
  '*.tmp',
  '*.temp',
  '.cache',
  'tmp'
];

// Messages for consistent output
const MESSAGES = {
  CONFIG_LOADED: '✅ Loaded custom patterns from .gitcleaner.json',
  CONFIG_ERROR: '⚠️  Warning: Could not parse .gitcleaner.json, using default patterns',
  SCAN_START: '🔍 Scanning for junk files...\n',
  NO_JUNK: '✨ No junk files found! Your project is clean.',
  CLEAN_START: '🧹 Cleaning junk files...\n',
  DRY_RUN_START: '🔍 Would delete junk files...\n',
  CLEAN_SUCCESS: (count, size, dryRun) => `${dryRun ? '📋' : '✅'} ${dryRun ? 'Would clean' : 'Cleaned'} ${count} items (${prettyBytes(size)} ${dryRun ? 'would free' : 'freed'})`,
  SCAN_ERROR: (error) => `Error scanning for junk files: ${error.message}`,
  ACCESS_ERROR: (path, error) => `⚠️  Failed to access ${path}: ${error.message}`,
  DELETE_ERROR: (path, error) => `- Failed to delete ${path}: ${error.message}`
};

/**
 * A class to clean junk files and folders from projects.
 */
class GitCleaner {
  /**
   * Initializes the GitCleaner with default or custom patterns.
   */
  constructor() {
    this.patterns = DEFAULT_PATTERNS;
    this.loadConfig();
  }

  /**
   * Loads custom patterns from .gitcleaner.json if it exists.
   */
  loadConfig() {
    const configPath = path.join(process.cwd(), '.gitcleaner.json');
    if (fs.existsSync(configPath)) {
      try {
        const config = fs.readJsonSync(configPath);
        if (config.patterns && Array.isArray(config.patterns)) {
          this.patterns = config.patterns;
          console.log(MESSAGES.CONFIG_LOADED);
        }
      } catch {
        console.warn(MESSAGES.CONFIG_ERROR);
      }
    }
  }

  /**
   * Calculates the size of a file or directory.
   * @param {string} filePath - The path to the file or directory.
   * @returns {Promise<number>} The size in bytes.
   */
  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.isDirectory() ? await this.getDirectorySize(filePath) : stats.size;
    } catch (error) {
      console.warn(MESSAGES.ACCESS_ERROR(filePath, error));
      return 0;
    }
  }

  /**
   * Calculates the total size of a directory by summing the sizes of its contents.
   * @param {string} dirPath - The path to the directory.
   * @returns {Promise<number>} The total size in bytes.
   */
  async getDirectorySize(dirPath) {
    try {
      const items = await fs.readdir(dirPath);
      const sizes = await Promise.all(
        items.map(async (item) => {
          const itemPath = path.join(dirPath, item);
          try {
            const stats = await fs.stat(itemPath);
            return stats.isDirectory() ? await this.getDirectorySize(itemPath) : stats.size;
          } catch (error) {
            console.warn(MESSAGES.ACCESS_ERROR(itemPath, error));
            return 0;
          }
        })
      );
      return sizes.reduce((total, size) => total + size, 0);
    } catch (error) {
      console.warn(MESSAGES.ACCESS_ERROR(dirPath, error));
      return 0;
    }
  }

  /**
   * Retrieves glob results based on configured patterns.
   * @returns {Promise<string[]>} Array of file and directory paths.
   */
  async getGlobResults() {
    const globPatterns = this.patterns.map(pattern => pattern.includes('*') ? pattern : `**/${pattern}`);
    return await glob(globPatterns, {
      dot: true,
      ignore: ['node_modules/**/*', '.git/**/*'],
      onlyFiles: false,
      markDirectories: true
    });
  }

  /**
   * Processes a single file or directory path into a junk item.
   * @param {string} filePath - The path to process.
   * @returns {Promise<{path: string, size: number, isDirectory: boolean} | null>} The junk item or null if invalid.
   */
  async processJunkItem(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const size = stats.isDirectory() ? await this.getDirectorySize(filePath) : stats.size;
      return {
        path: filePath,
        size,
        isDirectory: stats.isDirectory()
      };
    } catch {
      return null;
    }
  }

  /**
   * Finds junk files and directories based on configured patterns.
   * @returns {Promise<Array<{path: string, size: number, isDirectory: boolean}>>} List of junk items sorted by size.
   */
  async findJunkFiles() {
    try {
      const foundPaths = await this.getGlobResults();
      const junkItems = await Promise.all(
        foundPaths.map(path => this.processJunkItem(path))
      );
      return junkItems
        .filter(item => item !== null)
        .sort((a, b) => b.size - a.size);
    } catch (error) {
      console.error(MESSAGES.SCAN_ERROR(error));
      return [];
    }
  }

  /**
   * Scans for junk files and displays their details.
   * @returns {Promise<void>}
   */
  async scan() {
    console.log(MESSAGES.SCAN_START);
    const junkItems = await this.findJunkFiles();
    if (junkItems.length === 0) {
      console.log(MESSAGES.NO_JUNK);
      return;
    }

    console.log('Found junk:');
    let totalSize = 0;
    for (const item of junkItems) {
      const formattedPath = item.path + (item.isDirectory ? '/' : '');
      const sizeStr = prettyBytes(item.size);
      console.log(`- ${formattedPath} (${sizeStr})`);
      totalSize += item.size;
    }
    console.log(`\nTotal: ${prettyBytes(totalSize)}`);
    console.log(`\n💡 Run 'gitcleaner clean' to delete these files`);
  }

  /**
   * Deletes or previews deletion of junk files.
   * @param {boolean} [dryRun=false] - If true, only preview deletions without performing them.
   * @returns {Promise<void>}
   */
  async clean(dryRun = false) {
    console.log(dryRun ? MESSAGES.DRY_RUN_START : MESSAGES.CLEAN_START);
    const junkItems = await this.findJunkFiles();
    if (junkItems.length === 0) {
      console.log(MESSAGES.NO_JUNK);
      return;
    }

    let totalSize = 0;
    let deletedCount = 0;

    await Promise.all(
      junkItems.map(async (item) => {
        const formattedPath = item.path + (item.isDirectory ? '/' : '');
        const sizeStr = prettyBytes(item.size);
        if (dryRun) {
          console.log(`- Would delete: ${formattedPath} (${sizeStr})`);
          return { size: item.size, deleted: true };
        }
        try {
          await fs.remove(item.path);
          console.log(`- Deleted: ${formattedPath} (${sizeStr})`);
          return { size: item.size, deleted: true };
        } catch (error) {
          console.error(MESSAGES.DELETE_ERROR(formattedPath, error));
          return { size: 0, deleted: false };
        }
      })
    ).then(results => {
      deletedCount = results.filter(r => r.deleted).length;
      totalSize = results.reduce((sum, r) => sum + r.size, 0);
    });

    console.log(MESSAGES.CLEAN_SUCCESS(deletedCount, totalSize, dryRun));
  }
}

/**
 * Sets up and runs the CLI program.
 */
function main() {
  const program = new Command();

  program
    .name('gitcleaner')
    .description('Clean junk files and folders from your projects')
    .version('1.0.0');

  program
    .command('scan')
    .description('Scan for junk files and folders')
    .action(async () => {
      const cleaner = new GitCleaner();
      await cleaner.scan();
    });

  program
    .command('clean')
    .description('Delete junk files and folders')
    .option('-d, --dry-run', 'Preview what would be deleted without actually deleting')
    .action(async (options) => {
      const cleaner = new GitCleaner();
      await cleaner.clean(options.dryRun);
    });

  program.action(() => {
    console.log('Please specify a command. Use --help for available commands.');
    program.help();
  });

  program.parse(process.argv);

  if (process.argv.length <= 2) {
    program.help();
  }
}

main();