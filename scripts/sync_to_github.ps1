# Script to help sync local project to GitHub
# USAGE (recommended):
# 1) Install and authenticate GitHub CLI: `gh auth login` or run `gh auth login --with-token` and paste your token.
# 2) Run this script from the repository root in PowerShell: `.	ools\sync_to_github.ps1`
# NOTE: Do NOT hardcode your personal access token in scripts. Revoke the token after use.

param()

# Configure remote URL (replace if needed)
$remote = 'origin'
$repoUrl = 'https://github.com/ttatugpt-design/ANIME-LAST-2026.git'

# Ensure we're in a git repo
if (-not (Test-Path .git)) {
    Write-Output "No .git found — initializing repository..."
    git init
}

# Add remote if missing
$remotes = git remote
if (-not ($remotes -match $remote)) {
    git remote add $remote $repoUrl
    Write-Output "Added remote $remote -> $repoUrl"
} else {
    Write-Output "Remote $remote already exists"
}

# Fetch remote and create sync branch
git fetch $remote || Write-Output "Fetch failed or remote empty"
$syncBranch = 'sync-with-remote'
if (-not (git show-ref --verify --quiet refs/heads/$syncBranch)) {
    git checkout -b $syncBranch
} else {
    git checkout $syncBranch
}

# Optional: enable Git LFS if you have large files
# git lfs install
# git lfs track "backend/uploads/**"
# git add .gitattributes

# Add uploads folder and other changes
Write-Output "Staging changes (including backend/uploads)..."
git add backend/uploads || Write-Output "backend/uploads not found or nothing to add"
# If you want to add all local changes uncomment next line:
# git add -A

# Commit
if (git diff --cached --quiet) {
    Write-Output "No staged changes to commit."
} else {
    git commit -m "Sync: add missing uploads and update project files"
}

# Push to remote (creates branch on remote)
Write-Output "Pushing branch $syncBranch to $remote..."
# If using gh CLI and authenticated, this will use your credentials
git push --set-upstream $remote $syncBranch

Write-Output "Done. Visit https://github.com/ttatugpt-design/ANIME-LAST-2026 to review changes."

Write-Output "Security reminder: revoke any temporary tokens after use: https://github.com/settings/tokens"
