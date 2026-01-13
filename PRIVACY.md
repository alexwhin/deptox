# Privacy Policy

**Last Updated:** January 2026

## Overview

deptox is a macOS menubar application for reclaiming disk space from dependency directories (such as `node_modules`, `vendor`, `Pods`, `.venv`, `deps`, `.dart_tool`, and `pkg/mod`) across their filesystem.

## Data Collection

deptox does **not** collect, transmit, or store any personal data. All operations are performed entirely on your local machine.

### What deptox Accesses

- **Filesystem Scanning:** deptox scans directories on your computer to find dependency folders. This scanning is performed locally and no file or directory information is sent off your device.
- **Settings:** Your preferences (alert threshold, root directory, enabled dependency types) are stored locally in your user data directory and are never transmitted.

### What deptox Does NOT Do

- Does not collect analytics or telemetry
- Does not track usage patterns
- Does not transmit any personal data to external servers
- Does not access files other than dependency directories during scanning

### Auto-Updates

deptox checks for updates via GitHub Releases on startup. This is the only network request the app makes, and no personal data is transmitted during this check.

## File Deletion

When you delete directories through deptox, they are moved to your system Trash. You can restore them from Trash if needed.

## Third-Party Services

deptox connects to GitHub only for checking and downloading updates. No other third-party services are used.

## Changes to This Policy

If we make changes to this privacy policy, we will update the "Last Updated" date above.

## Contact

If you have questions about this privacy policy, please open an issue on our GitHub repository.
