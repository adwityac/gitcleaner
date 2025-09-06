# GitCleaner

A powerful command-line tool to find and clean junk files and folders from your development projects. Keep your repositories clean and save disk space!

## Features

- 🔍 **Smart Scanning**: Automatically detects common junk files and folders
- 🧹 **Safe Cleaning**: Carefully removes unwanted files with confirmation
- 📊 **Size Reporting**: Shows file sizes and total space usage
- 🔧 **Configurable**: Customize patterns with `.gitcleaner.json`
- 🚀 **Dry Run**: Preview what will be deleted before actual deletion
- ⚡ **Fast**: Uses efficient glob patterns for quick scanning

## Installation

Install globally via npm:

```bash
npm install -g gitcleaner
```

Or run directly with npx:

```bash
npx gitcleaner scan
```

## Usage

### Scan for junk files

```bash
gitcleaner scan
```

This will show you all the junk files and folders found in your current directory and subdirectories.

### Clean junk files

```bash
gitcleaner clean
```

This will delete all detected junk files and folders.

### Dry run (preview only)

```bash
gitcleaner clean --dry-run
```

This will show you what would be deleted without actually deleting anything.

## Default Patterns

GitCleaner looks for these common junk patterns by default:

- `node_modules` - Node.js dependencies
- `dist` - Build output directories
- `build` - Build output directories
- `.DS_Store` - macOS system files
- `__pycache__` - Python cache directories
- `*.log` - Log files
- `coverage` - Test coverage reports
- `.nyc_output` - NYC coverage tool output
- `*.tmp` - Temporary files
- `*.temp` - Temporary files
- `.cache` - Cache directories
- `tmp` - Temporary directories

## Custom Configuration

Create a `.gitcleaner.json` file in your project root to customize the patterns:

```json
{
  "patterns": [
    "node_modules",
    "dist",
    "build",
    ".DS_Store",
    "*.log",
    "custom-folder",
    "*.custom"
  ]
}
```

## Example Output

### Scan Command

```bash
$ gitcleaner scan

🔍 Scanning for junk files...

Found junk:
- node_modules/ (550 MB)
- dist/ (12 MB)
- coverage/ (8.5 MB)
- .DS_Store (4 KB)
- app.log (2 KB)

Total: 570.5 MB

💡 Run 'gitcleaner clean' to delete these files
```

### Clean Command

```bash
$ gitcleaner clean

🧹 Cleaning junk files...

- Deleted: node_modules/ (550 MB)
- Deleted: dist/ (12 MB)
- Deleted: coverage/ (8.5 MB)
- Deleted: .DS_Store (4 KB)
- Deleted: app.log (2 KB)

✅ Cleaned 5 items (570.5 MB freed)
```

### Dry Run

```bash
$ gitcleaner clean --dry-run

🔍 Would delete junk files...

- Would delete: node_modules/ (550 MB)
- Would delete: dist/ (12 MB)
- Would delete: coverage/ (8.5 MB)
- Would delete: .DS_Store (4 KB)
- Would delete: app.log (2 KB)

📋 Would clean 5 items (570.5 MB would free)
```

## Commands

| Command | Description |
|---------|-------------|
| `gitcleaner scan` | Scan for junk files and show results |
| `gitcleaner clean` | Delete all detected junk files |
| `gitcleaner clean --dry-run` | Preview what would be deleted |
| `gitcleaner --help` | Show help information |
| `gitcleaner --version` | Show version information |

## Safety Features

- **Git Ignored**: Automatically ignores `.git` directories
- **Smart Exclusions**: Won't scan inside `node_modules` for performance
- **Error Handling**: Gracefully handles permission errors
- **Confirmation**: Clear output showing what will be/was deleted

## Development

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Link for local testing: `npm link`

### Project Structure

```
gitcleaner/
├── index.js          # Main CLI entry point
├── package.json      # Package configuration
├── README.md         # Documentation
└── .gitcleaner.json  # Optional config file
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see the LICENSE file for details.

## Changelog

### v1.0.0
- Initial release
- Basic scan and clean functionality
- Configurable patterns support
- Dry run option
- Pretty file size formatting