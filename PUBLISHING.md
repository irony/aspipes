# Publishing to npm

This repository uses GitHub Actions to automatically publish the package to npm.

## Setup

Before the workflow can publish to npm, you need to:

1. Create an npm account at https://www.npmjs.com/signup
2. Generate an npm access token:
   - Go to https://www.npmjs.com/settings/[your-username]/tokens
   - Click "Generate New Token" → "Classic Token"
   - Select "Automation" type
   - Copy the generated token
3. Add the token to GitHub Secrets:
   - Go to https://github.com/irony/aspipes/settings/secrets/actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: paste your npm token
   - Click "Add secret"

## Publishing a new version

To publish a new version:

1. Update the version in `package.json`:
   ```bash
   npm version patch  # or minor, or major
   ```

2. Push the changes and tag:
   ```bash
   git push && git push --tags
   ```

3. Create a GitHub Release:
   - Go to https://github.com/irony/aspipes/releases/new
   - Choose the tag you just created
   - Fill in the release notes
   - Click "Publish release"

The GitHub Action will automatically:
- Run the test suite
- Publish the package to npm with provenance
- Make it publicly accessible

## Manual publish (if needed)

You can also trigger the workflow manually:
1. Go to https://github.com/irony/aspipes/actions/workflows/publish.yml
2. Click "Run workflow"
3. Select the branch
4. Click "Run workflow"

Note: This still requires the `NPM_TOKEN` secret to be configured.
