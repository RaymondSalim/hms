'use client';

import { useState, useEffect } from 'react';

const CHANGELOG_STORAGE_KEY = 'hms_last_seen_version';
const CHANGELOG_DISMISSED_KEY = 'hms_changelog_dismissed_versions';

export interface ChangelogMetadata {
  version: string;
  date: string;
  importance: 'major' | 'minor' | 'patch';
}

export function useChangelog() {
  const [shouldShowChangelog, setShouldShowChangelog] = useState(false);
  const [changelogContent, setChangelogContent] = useState<string>('');
  const [metadata, setMetadata] = useState<ChangelogMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const currentVersion = process.env.NEXT_PUBLIC_VERSION || 'development';

  useEffect(() => {
    const checkAndLoadChangelog = async () => {
      try {
        // Skip in development
        if (currentVersion === 'development' || currentVersion === 'preview') {
          setIsLoading(false);
          return;
        }

        // Check if user has seen this version
        const lastSeenVersion = localStorage.getItem(CHANGELOG_STORAGE_KEY);
        const dismissedVersions = JSON.parse(
          localStorage.getItem(CHANGELOG_DISMISSED_KEY) || '[]'
        ) as string[];

        if (lastSeenVersion === currentVersion || dismissedVersions.includes(currentVersion)) {
          setIsLoading(false);
          return;
        }

        // Try to load changelog for current version
        try {
          const response = await fetch(`/changelogs/${currentVersion}.md`);
          if (!response.ok) {
            throw new Error('Changelog not found');
          }

          const text = await response.text();
          
          // Parse frontmatter
          const frontmatterMatch = text.match(/^---\n([\s\S]*?)\n---/);
          if (frontmatterMatch) {
            const frontmatter = frontmatterMatch[1];
            const content = text.replace(/^---\n[\s\S]*?\n---\n/, '');
            
            // Parse metadata
            const versionMatch = frontmatter.match(/version:\s*"(.*)"/);
            const dateMatch = frontmatter.match(/date:\s*"(.*)"/);
            const importanceMatch = frontmatter.match(/importance:\s*"(.*)"/);

            const metadata: ChangelogMetadata = {
              version: versionMatch?.[1] || currentVersion,
              date: dateMatch?.[1] || new Date().toISOString().split('T')[0],
              importance: (importanceMatch?.[1] as any) || 'minor',
            };

            setMetadata(metadata);
            setChangelogContent(content);
            setShouldShowChangelog(true);
          }
        } catch (error) {
          console.log('No changelog found for version:', currentVersion);
        }
      } catch (error) {
        console.error('Error checking changelog:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAndLoadChangelog();
  }, [currentVersion]);

  const markAsRead = () => {
    localStorage.setItem(CHANGELOG_STORAGE_KEY, currentVersion);
    setShouldShowChangelog(false);
  };

  const dismissChangelog = () => {
    const dismissedVersions = JSON.parse(
      localStorage.getItem(CHANGELOG_DISMISSED_KEY) || '[]'
    ) as string[];
    dismissedVersions.push(currentVersion);
    localStorage.setItem(CHANGELOG_DISMISSED_KEY, JSON.stringify(dismissedVersions));
    setShouldShowChangelog(false);
  };

  const showChangelogManually = async (version?: string) => {
    const targetVersion = version || currentVersion;
    try {
      const response = await fetch(`/changelogs/${targetVersion}.md`);
      if (!response.ok) {
        throw new Error('Changelog not found');
      }

      const text = await response.text();
      const frontmatterMatch = text.match(/^---\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        const content = text.replace(/^---\n[\s\S]*?\n---\n/, '');
        setChangelogContent(content);
        setShouldShowChangelog(true);
      }
    } catch (error) {
      console.error('Error loading changelog:', error);
    }
  };

  return {
    shouldShowChangelog,
    changelogContent,
    metadata,
    isLoading,
    currentVersion,
    markAsRead,
    dismissChangelog,
    showChangelogManually,
  };
}