# Changelog System Documentation

## Overview

This changelog system automatically displays version updates to users when they access the app after a new release. It's integrated with your Vercel deployment and GitHub Actions workflow for version management.

## How It Works

1. **Version Detection**: GitHub Actions creates `.env.production` with the VERSION on merge to `prod` branch
2. **Storage**: Uses localStorage to track which versions users have seen
3. **Display Logic**: Shows the changelog modal only once per version per user
4. **Markdown Support**: Changelogs are written in markdown with frontmatter metadata

## Workflow Integration

Your workflow is perfectly supported:
- Feature branches → `main` branch (preview deployments)
- `main` → `prod` branch (production deployments)
- **GitHub Action**: On merge to `prod`, automatically creates `.env.production` with latest git tag

The changelog will only be shown in production (when VERSION environment variable is set).

## Version Management with GitHub Actions

The system now uses a GitHub Action (`.github/workflows/version-env.yml`) that:

1. **Triggers** on push/PR merge to `prod` branch
2. **Gets** the latest git tag using `git describe --tags --abbrev=0`
3. **Creates** `.env.production` with `VERSION=v0.0.36` (or whatever the latest tag is)
4. **Commits** the .env.production file back to the repository

## Creating a New Release

1. **Tag your release** (as you currently do):
   ```bash
   git tag v0.0.37
   git push origin v0.0.37
   ```

2. **Create the changelog file**:
   ```bash
   cat > public/changelogs/v0.0.37.md << 'EOF'
   ---
   version: "v0.0.37"
   date: "2024-01-20"
   importance: "minor"
   ---
   
   # What's New in v0.0.37
   
   ## 🚀 New Features
   - Your features here
   EOF
   ```

3. **Merge to prod** - The GitHub Action will automatically:
   - Detect the latest tag (`v0.0.37`)
   - Create `.env.production` with `VERSION=v0.0.37`
   - Commit it to the repository

4. **Deploy** - Vercel will read the VERSION from `.env.production` and users will see the changelog

## Environment Variables

The system now uses:
- `VERSION` (from `.env.production` created by GitHub Action)
- `NEXT_PUBLIC_VERSION` (exposed to the client)
- `NEXT_PUBLIC_BUILD_TIME` (build timestamp)

Vercel environment variables (still used for context):
- `VERCEL_GIT_COMMIT_SHA`: Current commit hash
- `VERCEL_GIT_COMMIT_REF`: Current branch name
- `VERCEL_ENV`: Deployment environment

## Features

- **Automatic Version Detection**: From `.env.production` created by GitHub Action
- **Dismiss Options**: Users can mark as read or dismiss permanently
- **Markdown Support**: Full markdown rendering with images
- **Responsive Design**: Beautiful modal that works on all devices
- **Keyboard Support**: ESC key to close
- **Version API**: Access version info at `/api/version`

## Testing

1. **Check current version**: Visit `/api/version` endpoint
2. **Test locally**: 
   - Create `.env.production` with `VERSION=test-version`
   - Create corresponding changelog file
   - Clear localStorage and refresh

## GitHub Action Details

The action (`.github/workflows/version-env.yml`) runs when:
- Code is pushed to `prod` branch
- PR is merged to `prod` branch

It will:
- Get the latest git tag
- Create `.env.production` with the version
- Commit it back to the repository
- Trigger Vercel deployment with the new version

## Maintenance

- Keep changelog files small and focused
- Use semantic versioning for clear communication
- Archive old changelogs after several versions
- The GitHub Action handles version management automatically

## Future Enhancements

- RSS feed for changelogs
- Email notifications for major updates
- In-app changelog browser for viewing history
- Version rollback capabilities