# Changelog System Documentation

## Overview

This changelog system automatically displays version updates to users when they access the app after a new release. It's integrated with your Vercel deployment and git tagging workflow.

## How It Works

1. **Version Detection**: The system automatically detects the current version from git tags during the build process on Vercel
2. **Storage**: Uses localStorage to track which versions users have seen
3. **Display Logic**: Shows the changelog modal only once per version per user
4. **Markdown Support**: Changelogs are written in markdown with frontmatter metadata

## Workflow Integration

Your current workflow is perfectly supported:
- Feature branches → `main` branch (preview deployments)
- `main` → `prod` branch (production deployments with tags)

The changelog will only be shown in production (when deployed from the `prod` branch).

## Creating a New Changelog

1. When you're ready to release a new version and create a tag (e.g., `v0.0.36`), create a corresponding changelog file:

```bash
touch public/changelogs/v0.0.36.md
```

2. Write the changelog in markdown format with frontmatter:

```markdown
---
version: "v0.0.36"
date: "2024-01-15"
importance: "minor"  # Options: major, minor, patch
---

# What's New in v0.0.36

## 🚀 New Features

- Feature description here
- Another feature

## 🐛 Bug Fixes

- Bug fix description

## 📸 Screenshots

![Feature Screenshot](/changelog-images/v0.0.36-feature.png)
```

3. Add any screenshots to `public/changelog-images/`

## Features

- **Automatic Display**: Shows changelog on first visit after version update
- **Dismiss Options**: Users can mark as read or dismiss permanently
- **Markdown Support**: Full markdown rendering with images
- **Responsive Design**: Beautiful modal that works on all devices
- **Keyboard Support**: ESC key to close
- **Version API**: Access version info at `/api/version`

## Testing Locally

During local development, the version will show as "development" and changelogs won't automatically display. To test:

1. Create a changelog file for a test version
2. Temporarily modify the version detection in the browser console
3. Clear localStorage to reset seen versions

## Vercel Environment Variables

The system automatically uses these Vercel environment variables:
- `VERCEL_GIT_COMMIT_SHA`: Current commit hash
- `VERCEL_GIT_COMMIT_REF`: Current branch name
- `VERCEL_ENV`: Deployment environment

## Maintenance

- Keep changelog files small and focused
- Use semantic versioning for clear communication
- Archive old changelogs after several versions
- Optimize images for web before adding to changelog-images

## Future Enhancements

Consider these potential improvements:
- RSS feed for changelogs
- Email notifications for major updates
- In-app changelog browser for viewing history
- A/B testing for changelog display timing