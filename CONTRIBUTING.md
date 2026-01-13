# Contributing to deptox

Thanks for your interest in contributing! This guide covers everything you need to know about submitting issues, pull requests, and code changes.

## Code of Conduct

Be respectful and constructive. We're here to build great software together.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/alexwhin/deptox/issues)
2. If not, create a new issue with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - macOS version and app version
   - Screenshots if applicable

### Suggesting Features

1. Check [existing issues](https://github.com/alexwhin/deptox/issues) for similar suggestions
2. Create a new issue describing:
   - The problem your feature would solve
   - Your proposed solution
   - Alternative solutions you've considered
   - Why this would be useful to other users

### Pull Requests

1. **Fork and Clone**

   ```bash
   git clone https://github.com/alexwhin/deptox.git
   cd deptox
   pnpm install
   ```

2. **Create a Branch**

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

3. **Make Your Changes**

   - Follow the coding standards in [CLAUDE.md](CLAUDE.md)
   - Write tests for new features
   - Ensure all tests pass: `pnpm test`
   - Run linters: `npx tsc --noEmit` and `cd src-tauri && cargo clippy`

4. **Commit Your Changes**

   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   # or
   git commit -m "fix: resolve issue with scanning"
   ```

   Use [Conventional Commits](https://www.conventionalcommits.org/) format:

   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `style:` Code formatting (no logic changes)
   - `refactor:` Code restructuring
   - `test:` Adding or updating tests
   - `chore:` Maintenance tasks
   - `perf:` Performance improvements
   - `build:` Build system changes
   - `ci:` CI/CD changes

   Commitlint enforces this format automatically via git hooks.

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a Pull Request on GitHub with:
   - Clear description of changes
   - Reference to related issues
   - Screenshots for UI changes

## Development Setup

### Prerequisites

- macOS 11.0 or later
- Node.js 18+ and pnpm
- Rust 1.70+
- Xcode Command Line Tools

### Running Locally

```bash
# Start development server
pnpm tauri dev

# Run tests
pnpm test:ts        # TypeScript tests
pnpm test:rust      # Rust tests
pnpm test           # All tests

# Type checking and linting
npx tsc --noEmit
cd src-tauri && cargo clippy -- -D warnings
```

## Coding Standards

Please read [CLAUDE.md](CLAUDE.md) for detailed coding standards, including:

- TypeScript/React best practices
- Rust conventions
- Naming patterns
- Code organization
- Testing requirements

### Key Points

- **No abbreviations**: `buttonElement` not `btnEl`
- **Explicit types**: All functions must have return types
- **Modern patterns**: Use `for...of`, `.map()`, `.filter()` - no classic `for` loops
- **Strict mode**: No `any` or `unknown` types
- **Test coverage**: Write tests for all new features

## Project Structure

```
deptox/
├── src/                    # Frontend TypeScript/React
│   ├── components/         # React components
│   ├── hooks/              # Custom hooks
│   ├── stores/             # Zustand state management
│   └── utilities/          # Pure utility functions
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── commands/       # Tauri command handlers
│   │   ├── scanner/        # Filesystem scanning
│   │   └── tray/           # System tray management
└── locales/                # i18n translations (12 languages)
```

## Testing

- All features must have tests
- TypeScript: Use Vitest
- Rust: Use built-in `cargo test`
- Aim for high coverage on business logic

## Questions?

Open an issue with the "question" label. We're happy to help!
