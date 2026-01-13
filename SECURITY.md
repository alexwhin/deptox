# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | ✅        |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in deptox, please report it responsibly.

### How to Report

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please use one of these methods:

1. **GitHub Private Vulnerability Reporting** (Preferred)
   - Go to the [Security tab](https://github.com/alexwhin/deptox/security)
   - Click "Report a vulnerability"
   - Fill out the form with details

2. **Email**
   - Send details to the repository owner via GitHub

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 7 days
- **Resolution Target**: Within 90 days (following industry best practice)

### What to Expect

1. We'll acknowledge your report promptly
2. We'll investigate and keep you informed of progress
3. We'll credit you in the release notes (unless you prefer anonymity)
4. We'll coordinate disclosure timing with you

## Security Measures

deptox implements several security practices:

- **Code Signing**: Releases are signed with Apple Developer ID (when configured)
- **Notarization**: Apps are notarized by Apple for Gatekeeper verification
- **Update Signing**: Auto-updates are cryptographically signed
- **Dependency Auditing**: Regular security audits via `pnpm audit`
- **CodeQL Analysis**: Automated security scanning on every PR
- **No Network Access**: deptox operates entirely locally with no data transmission

## Scope

This security policy covers:

- The deptox macOS application
- The official GitHub repository
- Official release artifacts (.dmg files)

Out of scope:

- Third-party forks or modifications
- Self-compiled builds
- Issues in dependencies (report those to the respective projects)
