# Changelog

All notable changes to deptox will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## <small>0.1.12 (2026-01-14)</small>

* chore: remove version_management.md documentation file ([36f82ba](https://github.com/alexwhin/deptox/commit/36f82ba))

## <small>0.1.11 (2026-01-14)</small>

* feat: initial release ([8555e59](https://github.com/alexwhin/deptox/commit/8555e59))

## <small>0.1.10 (2026-01-13)</small>

* feat: initial release ([621f79c](https://github.com/alexwhin/deptox/commit/621f79c))

## <small>0.1.9 (2026-01-13)</small>

* ci: skip audit and pipeline workflows for release commits ([38e7dd0](https://github.com/alexwhin/deptox/commit/38e7dd0))

## <small>0.1.8 (2026-01-13)</small>

* ci: simplify release workflow artifact handling and remove debug echo statements ([40eac79](https://github.com/alexwhin/deptox/commit/40eac79))

## <small>0.1.7 (2026-01-13)</small>

* ci: update macos release artifacts to use app.tar.gz bundles instead of dmg for updater ([278a62d](https://github.com/alexwhin/deptox/commit/278a62d))

## <small>0.1.6 (2026-01-13)</small>

* ci: add rust formatting check, update typecheck command, and enhance codecov config ([e4a9db1](https://github.com/alexwhin/deptox/commit/e4a9db1))
* ci: add workflow check to verify both pipeline and audit pass before version bump ([4732853](https://github.com/alexwhin/deptox/commit/4732853))
* ci: refactor release workflow to use workflow_call with tag input parameter ([df8d270](https://github.com/alexwhin/deptox/commit/df8d270))
* chore: update cargo dependencies and lock file ([07c4450](https://github.com/alexwhin/deptox/commit/07c4450))

## <small>0.1.5 (2026-01-13)</small>

* ci: standardize step names, add cargo cache, and set version-bump workflow run-name ([9435a2d](https://github.com/alexwhin/deptox/commit/9435a2d))

## <small>0.1.4 (2026-01-13)</small>

* chore: bump version to 0.1.2 ([4cec575](https://github.com/alexwhin/deptox/commit/4cec575))
* chore: bump version to 0.1.3 and downgrade release-it conventional-changelog to 10.0.1 ([b9fee5c](https://github.com/alexwhin/deptox/commit/b9fee5c))
* ci: add audit workflow for security, dead code, circular deps, and version checks ([c5800c9](https://github.com/alexwhin/deptox/commit/c5800c9))
* ci: optimize audit workflow, remove build rust check, simplify frontend build job ([d16cccd](https://github.com/alexwhin/deptox/commit/d16cccd))
* ci: run audit on main push, optimize rust cache, replace build with check on ubuntu ([e6b3bf4](https://github.com/alexwhin/deptox/commit/e6b3bf4))
* ci: split pipeline into separate lint, typescript test, and rust test jobs ([a36513a](https://github.com/alexwhin/deptox/commit/a36513a))
* test: add macos cfg guards to filesystem tests and remove redundant comments ([da8c04e](https://github.com/alexwhin/deptox/commit/da8c04e))
* initial commit ([8b75d0f](https://github.com/alexwhin/deptox/commit/8b75d0f))
* initial commit ([949961e](https://github.com/alexwhin/deptox/commit/949961e))

## [Unreleased]

## [0.1.1] - 2026-01-12

### Added

- Initial release of deptox
- macOS menubar application for managing dependency directories
- Filesystem scanning for node_modules, vendor, Pods, .venv, deps, .dart_tool, and pkg/mod directories
- One-click deletion to Trash with safe recovery option
- Real-time progress indicator during scanning
- Configurable alert threshold for total dependency size
- Configurable root directory for scanning
- Toggle individual dependency types on/off
- Context menu with Open in Finder, Rescan, and Delete actions
- Dark mode support
- Welcome screen for first-time users
- Accessible UI with keyboard navigation and ARIA labels
- Background scanning every 15 minutes with tray icon alerts
