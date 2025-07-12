const { execSync } = require('child_process');

function getVersion() {
  try {
    // If we're on Vercel and on prod branch
    if (process.env.VERCEL && process.env.VERCEL_GIT_COMMIT_REF === 'prod') {
      // Get the latest tag
      const latestTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
      return latestTag;
    }
    
    // For other environments (dev, preview)
    if (process.env.VERCEL_GIT_COMMIT_REF === 'main') {
      return 'preview';
    }
    
    // Local development
    return 'development';
  } catch (error) {
    console.warn('Could not determine version:', error.message);
    return 'unknown';
  }
}

// If run directly, output the version
if (require.main === module) {
  console.log('Current version:', getVersion());
}

module.exports = { getVersion };