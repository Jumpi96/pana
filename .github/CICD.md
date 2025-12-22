# CI/CD Documentation

This document describes the automated testing and deployment pipeline for Pana.

## Overview

The CI/CD pipeline consists of two main workflows:

1. **Test Workflow** (`test.yml`) - Runs on every push and pull request
2. **Deploy Workflow** (`deploy.yml`) - Runs on published releases

## Test Workflow

Runs automatically on:
- Every push to any branch
- Every pull request

### What it does:
1. Checks out code
2. Installs dependencies
3. Runs linter (`npm run lint`)
4. Runs tests (`npm test`)
5. Generates coverage report
6. Uploads coverage to Codecov (optional, on main branch)

### Local Testing

Run the same checks locally before pushing:

```bash
# Run linter
npm run lint

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Deploy Workflow

Runs automatically on:
- Published GitHub releases
- Manual trigger (workflow_dispatch)

### What it does:

1. **Build Application**
   - Runs tests
   - Builds the Vite app
   - Uploads artifact for GitHub Pages

2. **Deploy to GitHub Pages**
   - Deploys the built app to GitHub Pages
   - Available at: `https://[username].github.io/pana`

3. **Deploy Supabase**
   - Links to Supabase project
   - Runs database migrations
   - Deploys Edge Functions
   - Sets Edge Function secrets

4. **Deploy Infrastructure (Terraform)**
   - Initializes Terraform
   - Plans infrastructure changes
   - Applies changes to AWS (Lambda, S3, CloudWatch, SNS)
   - Updates backup Lambda function if changed

5. **Notify**
   - Creates deployment summary in GitHub Actions

## Required GitHub Secrets

Configure these secrets in GitHub: **Settings → Secrets and variables → Actions**

### Frontend Secrets (for build):
- `VITE_SUPABASE_URL` - Your Supabase project URL
  - Get from: Supabase Dashboard → Settings → API
  - Format: `https://xxxxx.supabase.co`

- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
  - Get from: Supabase Dashboard → Settings → API
  - This is the public `anon` key

### Supabase Deployment Secrets:
- `SUPABASE_ACCESS_TOKEN` - Your Supabase access token
  - Generate: https://supabase.com/dashboard/account/tokens
  - Click "Generate new token"
  - Give it a name like "GitHub Actions"
  - Copy the token (only shown once!)

- `SUPABASE_PROJECT_ID` - Your Supabase project ID
  - Get from: Supabase Dashboard → Settings → General
  - Format: `xxxxxxxxxxxxxxxxxxxxx`

- `SUPABASE_DB_PASSWORD` - Your database password
  - Get from: Supabase Dashboard → Settings → Database
  - This is the password you set when creating the project

- `OPENAI_API_KEY` - Your OpenAI API key
  - Get from: https://platform.openai.com/api-keys
  - Format: `sk-...`

### AWS/Terraform Secrets (for infrastructure):
- `AWS_ACCESS_KEY_ID` - AWS access key for Terraform
  - Create in AWS IAM: https://console.aws.amazon.com/iam/
  - Create a user with programmatic access
  - Attach policy: `PowerUserAccess` or custom policy

- `AWS_SECRET_ACCESS_KEY` - AWS secret key for Terraform
  - Shown only once when creating IAM user
  - Store securely!

- `AWS_REGION` - AWS region (optional, defaults to us-east-1)
  - Example: `us-east-1`

- `SUPABASE_DB_URL` - Database URL for Lambda backups
  - Session pooler URL (port 6543)
  - Format: `postgres://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres`

- `ALERT_EMAIL` - Email for backup failure alerts
  - Your email address for SNS notifications

### Optional (for coverage):
- `CODECOV_TOKEN` - Codecov upload token (if using Codecov)

## GitHub Pages Setup

Enable GitHub Pages:

1. Go to **Settings → Pages**
2. Source: **GitHub Actions**
3. The deploy workflow will handle the rest

## Deployment Process

### Creating a Release

1. **Commit your changes**:
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

2. **Create a tag**:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. **Create a GitHub Release**:
   - Go to GitHub → Releases → **Draft a new release**
   - Choose the tag you just created
   - Write release notes
   - Click **Publish release**

4. **Automatic Deployment**:
   - The deploy workflow triggers automatically
   - Monitor progress in **Actions** tab
   - Check deployment summary when complete

### Manual Deployment

You can also manually trigger deployment:

1. Go to **Actions** tab
2. Select **Deploy** workflow
3. Click **Run workflow**
4. Choose the branch
5. Click **Run workflow**

## Deployment Checklist

Before creating a release:

- [ ] All tests pass locally (`npm test`)
- [ ] Linter passes (`npm run lint`)
- [ ] Build works (`npm run build`)
- [ ] Tested locally (`npm run preview`)
- [ ] Database migrations are ready in `supabase/migrations/`
- [ ] Edge Functions are tested
- [ ] Updated `CHANGELOG.md` (if you have one)
- [ ] GitHub secrets are configured
- [ ] Version number incremented

## Troubleshooting

### Build Fails

**Problem**: Build fails with environment variable errors

**Solution**: Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` secrets are set correctly

### Supabase Deployment Fails

**Problem**: "Failed to link project"

**Solution**:
- Verify `SUPABASE_ACCESS_TOKEN` is valid (not expired)
- Verify `SUPABASE_PROJECT_ID` is correct

**Problem**: "Database migration failed"

**Solution**:
- Check migration files in `supabase/migrations/`
- Test migrations locally: `supabase db push`
- Check migration syntax

**Problem**: "Edge Function deployment failed"

**Solution**:
- Check Edge Function code for errors
- Test locally: `supabase functions serve`
- Verify `OPENAI_API_KEY` secret is set

### GitHub Pages Not Working

**Problem**: Page shows 404

**Solution**:
- Check GitHub Pages is enabled (Settings → Pages)
- Verify source is set to "GitHub Actions"
- Check deployment logs in Actions tab
- Ensure `base: '/pana'` is set in `vite.config.ts`

**Problem**: Blank page

**Solution**:
- Check browser console for errors
- Verify Supabase URL and keys are correct
- Check network tab for failed API calls

## Monitoring

After deployment:

1. **Check GitHub Actions**
   - Green checkmark = success
   - Red X = failure (click for logs)

2. **Test the deployed app**
   - Visit `https://[username].github.io/pana`
   - Try logging in
   - Add a test meal
   - Check that Edge Functions work

3. **Check Supabase Dashboard**
   - Verify Edge Functions are deployed
   - Check recent requests in Logs
   - Verify database migrations applied

4. **Monitor for errors**
   - Check Edge Function logs
   - Monitor GitHub Issues
   - Check user reports

## Rollback

If a deployment has issues:

1. **Revert to previous release**:
   - Create a new release from the previous tag
   - This triggers a new deployment

2. **Or manually deploy previous version**:
   ```bash
   git checkout v1.0.0  # Previous working version
   git tag v1.0.1
   git push origin v1.0.1
   # Create release from GitHub UI
   ```

3. **For Supabase only**:
   - You can manually run migrations/functions from local
   - Or use Supabase Dashboard to revert changes

## Best Practices

1. **Always test locally first**
   ```bash
   npm run lint
   npm test
   npm run build
   npm run preview
   ```

2. **Use semantic versioning**:
   - `v1.0.0` - Major release (breaking changes)
   - `v1.1.0` - Minor release (new features)
   - `v1.0.1` - Patch release (bug fixes)

3. **Write clear release notes**:
   - What changed
   - What's new
   - What's fixed
   - Breaking changes (if any)

4. **Deploy during low-traffic times** (if possible)

5. **Monitor after deployment** for at least 30 minutes

6. **Keep secrets up to date**:
   - Rotate tokens periodically
   - Update if you regenerate keys
   - Remove old/unused secrets

## Continuous Improvement

The CI/CD pipeline will evolve. Consider adding:

- [ ] E2E tests with Playwright
- [ ] Performance budgets
- [ ] Lighthouse CI
- [ ] Bundle size checks
- [ ] Automated changelog generation
- [ ] Slack/Discord notifications
- [ ] Staging environment
- [ ] Database backup before deployment
- [ ] Automated rollback on failure
