# Version Management

Automated version management for deptox using **[release-it](https://github.com/release-it/release-it)** - the industry-standard release automation tool.

## TL;DR

```bash
# Interactive release (recommended)
pnpm release

# Non-interactive shortcuts
pnpm release:patch  # 0.1.0 → 0.1.1 (bug fixes)
pnpm release:minor  # 0.1.0 → 0.2.0 (new features)
pnpm release:major  # 0.1.0 → 1.0.0 (breaking changes)

# Dry run (test without making changes)
pnpm release:dry
```

## How It Works

**release-it** handles everything:

1. ✅ Bumps version in `package.json`
2. ✅ Updates `CHANGELOG.md` (using keep-a-changelog format)
3. ✅ Syncs version to `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json` (via hook)
4. ✅ Creates git commit with conventional message
5. ✅ Creates git tag
6. ✅ Pushes to GitHub

**Single command. Zero manual editing.**

## Usage

### Interactive Release (Recommended)

```bash
pnpm release
```

This starts an interactive prompt:
- Choose version bump type (patch/minor/major)
- Review changelog
- Confirm changes
- Automatic push to GitHub

### Non-Interactive Release

```bash
# Patch release (bug fixes)
pnpm release:patch

# Minor release (new features)
pnpm release:minor

# Major release (breaking changes)
pnpm release:major
```

### Dry Run

Test the release process without making any changes:

```bash
pnpm release:dry
```

## Configuration

Configuration is in [.release-it.json](.release-it.json):

- **Git settings**: Commit messages, tag format, branch requirements
- **Changelog plugin**: Automatic CHANGELOG.md updates
- **Hooks**: Custom scripts (sync Tauri files)
- **npm/GitHub**: Disabled (not publishing to npm, GitHub Actions handles releases)

## Semantic Versioning

release-it follows [Semantic Versioning](https://semver.org/):

| Type | When | Example |
|------|------|---------|
| **Patch** | Bug fixes, minor tweaks | 0.1.0 → 0.1.1 |
| **Minor** | New features (backwards compatible) | 0.1.0 → 0.2.0 |
| **Major** | Breaking changes | 0.1.0 → 1.0.0 |

## Troubleshooting

### Release Fails: "Working directory is not clean"

Commit or stash your changes first:

```bash
git add .
git commit -m "feat: add new feature"
pnpm release
```

### Release Fails: "Not on required branch 'main'"

```bash
git checkout main
pnpm release
```

### Need to Skip Git Push

Temporarily disable in `.release-it.json`:

```json
{
  "git": {
    "push": false
  }
}
```

## See Also

- [RELEASE.md](RELEASE.md) - Complete release process (builds, code signing)
- [CHANGELOG.md](CHANGELOG.md) - Version history (auto-updated by release-it)
- [release-it documentation](https://github.com/release-it/release-it#readme)
