# Release instructions (push as Rasahad3132)

Use these steps to push the project and create a GitHub release **as Rasahad3132** (not as Cursor/agent).

## 1. Configure Git user for this repo (one-time)

From the project root:

```bash
git config user.name "Rasahad3132"
git config user.email "YOUR_EMAIL@example.com"
```

Use the email linked to your GitHub account **Rasahad3132** (or ahmadrashad1 if that is the same account).

## 2. Add remote (if not already set)

```bash
git remote -v
# If origin is not the repo:
git remote add origin https://github.com/ahmadrashad1/Factory-Dashboard.git
# If origin exists but wrong URL:
git remote set-url origin https://github.com/ahmadrashad1/Factory-Dashboard.git
```

## 3. Commit and push the release workflow

```bash
git add .github/workflows/release.yml
git add .github/RELEASE_INSTRUCTIONS.md
git status
git commit -m "ci: add GitHub Actions release workflow"
git push -u origin main
```

If your default branch is `master`, use `git push -u origin master` instead.

## 4. Create a GitHub release

**Option A – From GitHub website**

1. Open https://github.com/ahmadrashad1/Factory-Dashboard
2. Click **Releases** → **Create a new release**
3. Click **Choose a tag** → type e.g. `v1.0.0` → **Create new tag**
4. Set **Release title** (e.g. `v1.0.0`) and add description
5. Click **Publish release**

The `.github/workflows/release.yml` workflow will run on **Release published** and validate the Docker build.

**Option B – From command line (tag then push)**

```bash
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

Then on GitHub: **Releases** → **Draft a new release** → select tag `v1.0.0` → Publish.

---

**Repo URL:** https://github.com/ahmadrashad1/Factory-Dashboard
