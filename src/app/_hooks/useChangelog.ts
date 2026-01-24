'use client';

import {useEffect, useState} from 'react';
import {useLogger} from "@/app/_lib/axiom/client";

class CHANGELOG404 extends Error {}

const CHANGELOG_DISMISSED_KEY = 'hms_changelog_dismissed_versions';

export interface ChangelogMetadata {
    version: string;
    date: string;
    importance: 'major' | 'minor' | 'patch';
    prevVersion?: string; // The version that came before this one
}

export interface ChangelogItem {
    version: string;
    metadata: ChangelogMetadata;
    content: string;
}

export function useChangelog() {
    const logger = useLogger();
    const [shouldShowChangelog, setShouldShowChangelog] = useState(false);
    const [changelogItems, setChangelogItems] = useState<ChangelogItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentVersion, setCurrentVersion] = useState<string>('development');

    // Helper function to find all available versions using prevVersion chain
    const findAllAvailableVersions = async (currentVersion: string): Promise<string[]> => {
        const versionChain: string[] = [];

        // Build version chain by reading prevVersion from each changelog
        let current = currentVersion;

        while (true) {
            try {
                const response = await fetch(`/changelogs/${current}.md`);
                if (!response.ok) break;

                versionChain.push(current);

                const text = await response.text();
                const frontmatterMatch = text.match(/^---\n([\s\S]*?)\n---/);

                if (frontmatterMatch) {
                    const frontmatter = frontmatterMatch[1];
                    const prevVersionMatch = frontmatter.match(/prevVersion:\s*"(.*)"/);

                    if (prevVersionMatch && prevVersionMatch[1]) {
                        current = prevVersionMatch[1];
                    } else {
                        // No prevVersion found, this is the end of the chain
                        break;
                    }
                } else {
                    break;
                }
            } catch (error) {
                // Changelog doesn't exist, end of chain
                break;
            }
        }

        // Return in reverse chronological order (newest first)
        return versionChain;
    };

    // Helper function to load changelog for a specific version
    const loadChangelogForVersion = async (version: string): Promise<ChangelogItem | null> => {
        try {
            const response = await fetch(`/changelogs/${version}.md`);
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
                const prevVersionMatch = frontmatter.match(/prevVersion:\s*"(.*)"/);

                const metadata: ChangelogMetadata = {
                    version: versionMatch?.[1] || version,
                    date: dateMatch?.[1] || new Date().toISOString().split('T')[0],
                    importance: (importanceMatch?.[1] as any) || 'minor',
                    prevVersion: prevVersionMatch?.[1],
                };

                return {
                    version,
                    metadata,
                    content,
                };
            }
            return null;
        } catch (error) {
            logger.warn(`No changelog found for version: ${version}`);
            return null;
        }
    };

    // Helper function to get the version range to show
    const getVersionRangeToShow = (allVersions: string[], dismissedVersions: string[]): string[] => {
        if (dismissedVersions.length === 0) {
            return allVersions;
        }

        // Only consider dismissed versions that exist in allVersions
        const validDismissed = dismissedVersions.filter(v => allVersions.includes(v));
        if (validDismissed.length === 0) return allVersions;

        // Find the lowest index (newest) dismissed version
        const mostRecentDismissedIndex = Math.min(...validDismissed.map(v => allVersions.indexOf(v)));
        return allVersions.slice(0, mostRecentDismissedIndex);
    };

    useEffect(() => {
        const run = async () => {
            try {
                // 1) Fetch current version from public/version.json (client-side)
                const vres = await fetch('/version.json', { cache: 'no-store' });
                if (!vres.ok) throw new CHANGELOG404('version.json not found');
                const vdata = await vres.json();
                const effectiveVersion = typeof vdata?.version === 'string' ? vdata.version : 'development';
                setCurrentVersion(effectiveVersion);

                // 2) Skip in development/preview
                if (effectiveVersion === 'development' || effectiveVersion === 'preview') {
                    setIsLoading(false);
                    return;
                }

                // 3) Get dismissed versions
                const dismissedVersions = JSON.parse(
                    localStorage.getItem(CHANGELOG_DISMISSED_KEY) || '[]'
                ) as string[];

                // 4) Find all available versions
                const allVersions = await findAllAvailableVersions(effectiveVersion);
                if (allVersions.length === 0) {
                    setIsLoading(false);
                    return;
                }

                // 5) Get the version range to show
                const versionsToShow = getVersionRangeToShow(allVersions, dismissedVersions);
                if (versionsToShow.length === 0) {
                    setIsLoading(false);
                    return;
                }

                // 6) Load all changelogs for the versions to show
                const changelogPromises = versionsToShow.map(async (version) => {
                    try {
                        return await loadChangelogForVersion(version);
                    } catch (error) {
                        logger.error(`Failed to load changelog for version ${version}`, {error});
                        return null;
                    }
                });
                const changelogResults = await Promise.all(changelogPromises);

                // Filter out null results (failed loads)
                const validChangelogs = changelogResults.filter((item): item is ChangelogItem => item !== null);

                if (validChangelogs.length > 0) {
                    setChangelogItems(validChangelogs);
                    setShouldShowChangelog(true);
                }
            } catch (error) {
                if (error instanceof CHANGELOG404) {
                    logger.info(`version.json file not found`);
                } else {
                    logger.error('Error checking changelog:', {error});
                }
            } finally {
                setIsLoading(false);
            }
        };

        run();
    }, []);

    const handleChangelogClose = () => {
        // Mark all shown versions as dismissed
        const dismissedVersions = JSON.parse(
            localStorage.getItem(CHANGELOG_DISMISSED_KEY) || '[]'
        ) as string[];

        const versionsToDismiss = changelogItems.map(item => item.version);
        const newDismissedVersions = Array.from(new Set([...dismissedVersions, ...versionsToDismiss]));

        localStorage.setItem(CHANGELOG_DISMISSED_KEY, JSON.stringify(newDismissedVersions));

        setShouldShowChangelog(false);
        setChangelogItems([]);
    };

    const showChangelogManually = async () => {
        try {
            // Find all available versions (ignore dismissed versions for manual opening)
            const allVersions = await findAllAvailableVersions(currentVersion);

            if (allVersions.length === 0) {
                return;
            }

            // Limit to maximum 4 changelogs for manual opening
            const versionsToShow = allVersions.slice(0, 4);

            // Load all changelogs for the versions to show with error handling
            const changelogPromises = versionsToShow.map(async (version) => {
                try {
                    return await loadChangelogForVersion(version);
                } catch (error) {
                    logger.error(`Failed to load changelog for version ${version}:`, {error});
                    return null;
                }
            });

            const changelogResults = await Promise.all(changelogPromises);

            // Filter out null results (failed loads)
            const validChangelogs = changelogResults.filter((item): item is ChangelogItem => item !== null);

            if (validChangelogs.length > 0) {
                setChangelogItems(validChangelogs);
                setShouldShowChangelog(true);
            }
        } catch (error) {
            logger.error('Error showing changelog manually:', {error});
        }
    };

    return {
        shouldShowChangelog,
        changelogItems,
        isLoading,
        currentVersion,
        markAsRead: handleChangelogClose,
        dismissChangelog: handleChangelogClose,
        showChangelogManually,
    };
}
