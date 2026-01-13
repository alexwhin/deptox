# Release Process

Automated release workflow for deptox using GitHub Actions and Tauri auto-updater.

## Prerequisites

### 1. Generate Update Signing Keys

First-time setup requires generating cryptographic keys for signing updates:

```bash
pnpm tauri signer generate -w ~/.tauri/deptox.key
```

Generates two keys:

- **Private key**: `~/.tauri/deptox.key` (keep secret, add to GitHub secrets)
- **Public key**: Terminal output (add to `tauri.conf.json`)

**Never commit the private key**. Store securely and add as GitHub secret only.

### 2. Update tauri.conf.json

Replace `PLACEHOLDER_PUBLIC_KEY` in `src-tauri/tauri.conf.json` with the public key from step 1:

```json
{
  "plugins": {
    "updater": {
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    }
  }
}
```

### 3. Configure GitHub Secrets

Add the following secrets to your GitHub repository (Settings → Secrets and variables → Actions → New repository secret):

- **TAURI_SIGNING_PRIVATE_KEY**: Contents of `~/.tauri/deptox.key`
- **TAURI_SIGNING_PRIVATE_KEY_PASSWORD**: Password you set when generating the key

## Creating a Release

### 1. Run release-it

```bash
pnpm release        # Interactive (recommended)
pnpm release:patch  # Bug fixes: 0.1.0 → 0.1.1
pnpm release:minor  # New features: 0.1.0 → 0.2.0
pnpm release:major  # Breaking changes: 0.1.0 → 1.0.0
```

This handles version bumping, changelog updates, git commit/tag, and push. See [VERSION_MANAGEMENT.md](VERSION_MANAGEMENT.md) for details.

### 2. GitHub Actions (automatic)

- Triggers when release-it pushes the `v*` tag
- Builds for macOS (Apple Silicon + Intel)
- Creates .dmg and .app bundles
- Generates `latest.json` update manifest with cryptographic signature
- Creates draft GitHub release with all artifacts

### 3. Publish Release

- Go to GitHub → Releases
- Edit the draft release
- Review generated changelog
- Click "Publish release"

### Manual Release (Not Recommended)

If you need to build locally:

```bash
# Build production version
pnpm build

# Build Tauri app
cd src-tauri
cargo tauri build
```

Built artifacts will be in `src-tauri/target/release/bundle/`.

## Auto-Updater Behavior

Once users install a released version:

1. **Check for Updates**: App checks GitHub on startup
2. **Download Update**: Downloads in background if newer version found
3. **Install Prompt**: User sees notification to restart and install
4. **Signature Verification**: Verifies update signature with public key before installation

Manual update checks available via app menu (if implemented).

## Release Checklist

Before running `pnpm release`:

- [ ] All tests passing (`pnpm test`)
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] Rust lints pass (`cd src-tauri && cargo clippy`)
- [ ] Production build successful (`pnpm build`)
- [ ] Working directory clean (no uncommitted changes)
- [ ] On main branch
- [ ] GitHub secrets configured (first release only)
- [ ] Public key in `tauri.conf.json` (first release only)

After release:

- [ ] Git tag created and pushed (automatic)
- [ ] CHANGELOG.md updated (automatic)
- [ ] CI pipeline passes (check GitHub Actions)
- [ ] Draft release created automatically
- [ ] Publish release on GitHub
- [ ] Test auto-updater works

## Troubleshooting

### Update Not Detected

1. Check `latest.json` exists at: `https://github.com/alexwhin/deptox/releases/latest/download/latest.json`
2. Verify public key in `tauri.conf.json` matches your private key
3. Check app is using correct version number (not "0.0.0" or "dev")

## Distribution Channels

### Primary: GitHub Releases

Users download the latest `.dmg` from the [GitHub Releases page](https://github.com/alexwhin/deptox/releases).

Auto-updater keeps them updated automatically.

### Optional: Homebrew Cask

After first stable release, you can submit to Homebrew Cask:

```bash
brew install --cask deptox
```

See the [Homebrew Cask contributing guide](https://github.com/Homebrew/homebrew-cask/blob/master/CONTRIBUTING.md).

### Why Not Mac App Store?

deptox is **not available on the Mac App Store** because App Store sandboxing restricts filesystem access to user-selected files only. Since deptox needs to scan your entire filesystem for dependency directories, a sandboxed version would defeat the app's core purpose.
