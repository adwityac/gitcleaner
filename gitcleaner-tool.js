#!/usr/bin/env node

const { Command } = require('commander');
const glob = require('fast-glob');
const fs = require('fs-extra');
const path = require('path');
const prettyBytes = require('pretty-bytes');

const program = new Command();

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

class GitCleaner {
  constructor() {
    this.patterns = DEFAULT_PATTERNS;
    this.loadConfig();
  }

  loadConfig() {
    const configPath = path.join(process.cwd(), '.gitcleaner.json');
    
    if (fs.existsSync(configPath)) {
      try {
        const config = fs.readJsonSync(configPath);
        if (config.patterns && Array.isArray(config.patterns)) {
          this.patterns = config.patterns;
          console.log('✅ Loaded custom patterns from .gitcleaner.json');
        }
      } catch (error) {
        console.warn('⚠️  Warning: Could not parse .gitcleaner.json, using default patterns');
      }
    }
  }

  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      if (stats.isDirectory()) {
        return await this.getDirectorySize(filePath);
      }
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  async getDirectorySize(dirPath) {
    let totalSize = 0;
    
    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          totalSize += await this.getDirectorySize(itemPath);
        } else {
          totalSize += stats.size;
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
    
    return totalSize;
  }

  async findJunkFiles() {
    const junkItems = [];
    
    // Create glob patterns for searching
    const globPatterns = this.patterns.map(pattern => {
      // Handle different pattern types
      if (pattern.includes('*')) {
        return `**/${pattern}`;
      }
      return `**/${pattern}`;
    });

    try {
      const foundPaths = await glob(globPatterns, {
        dot: true,
        ignore: ['node_modules/**/*', '.git/**/*'],
        onlyFiles: false,
        markDirectories: true
      });

      // Remove duplicates and get sizes
      const uniquePaths = [...new Set(foundPaths)];
      
      for (const itemPath of uniquePaths) {
        const size = await this.getFileSize(itemPath);
        const isDirectory = itemPath.endsWith('/') || (await fs.stat(itemPath).catch(() => null))?.isDirectory();
        
        junkItems.push({
          path: itemPath,
          size: size,
          isDirectory: isDirectory
        });
      }
    } catch (error) {
      console.error('Error scanning for junk files:', error.message);
    }

    // Sort by size (largest first)
    return junkItems.sort((a, b) => b.size - a.size);
  }

  async scan() {
    console.log('🔍 Scanning for junk files...\n');
    
    const junkItems = await this.findJunkFiles();
    
    if (junkItems.length === 0) {
      console.log('✨ No junk files found! Your project is clean.');
      return;
    }

    console.log('Found junk:');
    let totalSize = 0;

    for (const item of junkItems) {
      const displayPath = item.path + (item.isDirectory ? '/' : '');
      const sizeStr = prettyBytes(item.size);
      console.log(`- ${displayPath} (${sizeStr})`);
      totalSize += item.size;
    }

    console.log(`\nTotal: ${prettyBytes(totalSize)}`);
    console.log(`\n💡 Run 'gitcleaner clean' to delete these files`);
  }

  async clean(dryRun = false) {
    const action = dryRun ? 'Would delete' : 'Cleaning';
    console.log(`${dryRun ? '🔍' : '🧹'} ${action} junk files...\n`);
    
    const junkItems = await this.findJunkFiles();
    
    if (junkItems.length === 0) {
      console.log('✨ No junk files found! Your project is clean.');
      return;
    }

    let totalSize = 0;
    let deletedCount = 0;

    for (const item of junkItems) {
      const displayPath = item.path + (item.isDirectory ? '/' : '');
      const sizeStr = prettyBytes(item.size);
      
      if (dryRun) {
        console.log(`- Would delete: ${displayPath} (${sizeStr})`);
        totalSize += item.size;
        deletedCount++;
      } else {
        try {
          await fs.remove(item.path);
          console.log(`- Deleted: ${displayPath} (${sizeStr})`);
          totalSize += item.size;
          deletedCount++;
        } catch (error) {
          console.error(`- Failed to delete ${displayPath}: ${error.message}`);
        }
      }
    }

    const verb = dryRun ? 'would free' : 'freed';
    const emoji = dryRun ? '📋' : '✅';
    console.log(`\n${emoji} ${dryRun ? 'Would clean' : 'Cleaned'} ${deletedCount} items (${prettyBytes(totalSize)} ${verb})`);
  }
}

// Set up CLI commands
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

// Handle case where no command is provided
program.action(() => {
  console.log('Please specify a command. Use --help for available commands.');
  program.help();
});

program.parse(process.argv);

// Show help if no arguments provided
if (process.argv.length <= 2) {
  program.help();
}