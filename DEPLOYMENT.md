# GitHub Pages Deployment Guide

This document outlines the steps to deploy "No es tan fácil" to GitHub Pages.

## Overview

The application is configured for automatic deployment to GitHub Pages via GitHub Actions. When you push to the `main` branch, the following happens automatically:

1. GitHub Actions runs the build process
2. TypeScript is compiled
3. React application is built with Vite
4. Built files are saved to the `/docs` folder in the main branch
5. GitHub Pages automatically serves the content from `/docs`

## Current Deployment Configuration

- **Repository**: https://github.com/franciscombp/tanfacil
- **GitHub Pages URL**: https://franciscombp.github.io/tanfacil/
- **Branch**: `main` (all content in one branch)
- **Serve from**: `/docs` folder
- **Workflow**: `.github/workflows/deploy.yml`

## Prerequisites

Before the deployment workflow can function, you need to set up repository secrets in GitHub.

### Step 1: Get Your Supabase Credentials

1. Go to your Supabase project: https://supabase.com/dashboard
2. Find these values:
   - **VITE_SUPABASE_URL**: Settings → API → Project URL
   - **VITE_SUPABASE_ANON_KEY**: Settings → API → anon public key

3. Define your admin token:
   - **VITE_ADMIN_TOKEN**: Any secret string you choose for admin authentication

### Step 2: Add Repository Secrets to GitHub

1. Go to your repository: https://github.com/franciscombp/tanfacil
2. Click **Settings** (top navigation)
3. Click **Secrets and variables** → **Actions** (left sidebar)
4. Click **New repository secret** and add each of the following:

#### Secret 1: VITE_SUPABASE_URL
- **Name**: `VITE_SUPABASE_URL`
- **Value**: `https://tlbovmiebqvukgvrcqyu.supabase.co` (or your project URL)
- Click **Add secret**

#### Secret 2: VITE_SUPABASE_ANON_KEY
- **Name**: `VITE_SUPABASE_ANON_KEY`
- **Value**: Your Supabase anon key
- Click **Add secret**

#### Secret 3: TAN_FACIL
- **Name**: `TAN_FACIL`
- **Value**: (Your admin authentication token)
- Click **Add secret**

Note: This secret is used as VITE_ADMIN_TOKEN in the build process.

### Step 3: Enable GitHub Pages

1. Go to your repository settings: https://github.com/franciscombp/tanfacil/settings/pages
2. Click **Pages** (left sidebar)
3. Under "Build and deployment":
   - **Source**: Select "Deploy from a branch"
   - **Branch**: Select `main`
   - **Folder**: Select `/docs`
4. Click **Save**

## Triggering Deployment

### Automatic Deployment

Simply push to the `main` branch:

```bash
git add .
git commit -m "Your message"
git push origin main
```

The GitHub Actions workflow will automatically:
1. Build the project with environment variables
2. Generate production assets in `docs/` folder
3. Commit built files to `main` branch
4. GitHub Pages automatically serves from `/docs`

### Local Build (Optional)

To build locally without deployment:

```bash
npm run build
```

This creates production files in the `docs/` folder ready for GitHub Pages.

## Monitoring Deployment

### View Workflow Status

1. Go to your repository: https://github.com/franciscombp/tanfacil
2. Click **Actions** (top navigation)
3. View the latest "Deploy to GitHub Pages" workflow
4. Check the logs if deployment fails

### Check Live Application

After deployment completes (5-10 minutes):
- **URL**: https://franciscombp.github.io/tanfacil/
- Clear cache if needed: `Ctrl+Shift+Delete` (then reload)

## Common Deployment Issues

### Issue: "Secrets are not available"
**Solution**: Ensure all three secrets are set in repository settings.

### Issue: "Build failed"
**Solution**: 
- Check the workflow logs for build errors
- Verify `.env.local` is in `.gitignore` (it should not be committed)
- Ensure all dependencies are properly installed

### Issue: "Page not loading after deployment"
**Solution**:
- Wait 2-3 minutes for GitHub Pages to process
- Clear browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)
- Check that Supabase credentials in secrets are correct
- Verify the `base` in `vite.config.ts` is `/tanfacil/`
- Ensure GitHub Pages is configured to serve from `/docs` folder in `main` branch

### Issue: "GitHub Actions workflow failed"
**Solution**:
- Check the workflow logs for the specific error
- Ensure all 3 secrets are set in repository
- Verify branch is `main`
- Check if `.nojekyll` file exists in docs folder

## Application Access

After successful deployment, access the application at:

**https://franciscombp.github.io/tanfacil/**

### First Time Setup

1. Open the deployed URL
2. Click "Panel administrativo" to create a new game
3. Use the generated session code to join the game as a player

## Rollback

If you need to revert to a previous version:

1. Go to **Actions** in your repository
2. Click on the deployment you want to restore
3. Look for the commit hash
4. Reset to that commit locally:
   ```bash
   git reset --hard <commit-hash>
   git push -f origin main
   ```

## Updating Application

To update the deployed application:

1. Make changes in your local branch
2. Commit and push to `main`:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin main
   ```
3. Wait for GitHub Actions to complete
4. The updated version will be live within minutes

## Environment Variables Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Anonymous access key | `eyJh...` |
| `VITE_ADMIN_TOKEN` | Admin authentication token | `ADMIN-SECRET-12345` |

## Deployment Structure

```
main branch/
├── src/                    # Source code
├── package.json           # Dependencies
├── vite.config.ts         # Vite config with base path
├── docs/                  # Production build (served by GitHub Pages)
│   ├── index.html
│   ├── assets/
│   └── .nojekyll         # Prevents Jekyll processing
├── DEPLOYMENT.md          # This file
└── README.md             # Project info
```

## Success Indicators

Deployment is successful when:

✅ GitHub Actions workflow shows green checkmark
✅ Application loads at https://franciscombp.github.io/tanfacil/
✅ Home page displays with "Unirse a un juego" button
✅ Admin login page is accessible
✅ Real-time features work (voting, clue discovery)
✅ Supabase connection is established

## Support

For deployment issues:
1. Check GitHub Actions workflow logs
2. Verify all repository secrets are set
3. Ensure Supabase project is active and accessible
4. Check browser console for error messages
5. Verify GitHub Pages settings point to `/docs` on `main` branch
