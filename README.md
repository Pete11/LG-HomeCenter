# LG Home Center — Homebrew repository starter

This repository is the GitHub/Homebrew packaging wrapper for **LG Home Center**. The source copied into `app/` is prototype **v0.5.0** for LG webOS TV 25.

## Current scope

The app currently includes the cinematic home interface, six configurable shortcuts, clock/date, Open-Meteo weather and 10-day forecast, dock glass settings, OLED-oriented UI brightness controls, app-level screensaver, and local settings/export-import.

The following are **not implemented as system-level TV features yet**: replacing LG HOME, a system-wide screensaver, and actual TV power-off/standby scheduling. The current standby settings are preferences only. Do not enable or rely on them as real power controls.

## Create the GitHub repository

1. Create a **public** GitHub repository named `LG-HomeCenter` (or choose another name).
2. Upload the contents of this folder to the repository root. Keep `.github/workflows/release.yml` in place.
3. In `repo.json`, replace both instances of `YOUR_GITHUB_USERNAME` with your GitHub username. If you chose a different repository name, also replace `LG-HomeCenter` in those two URLs.
4. Commit the change to the default branch (normally `main`).

The repository must be public because Homebrew Channel has to download `repo.json`, the release manifest, and the IPK over public HTTPS without GitHub authentication.

## Build and publish the first IPK

The GitHub Actions workflow builds the app with `@webos-tools/cli` and publishes two release assets: the `.ipk` package and `com.homecenter.launcher.manifest.json`. The manifest contains the exact IPK download URL, version, byte size and SHA-256 hash.

After the files are committed, create and push a version tag from a local clone:

```powershell
git tag v0.5.0
git push origin v0.5.0
```

Alternatively, use **Actions → Build and publish Homebrew IPK → Run workflow**. For a later release, update `app/appinfo.json` if desired, then push a new tag such as `v0.5.1` or `v0.6.0`.

Check the GitHub Actions run. Do not add the repository to the TV until a successful release exists and both release assets are visible.

## Add to Homebrew Channel

Once the first release has succeeded, open Homebrew Channel on the rooted TV:

1. Open **Settings → Add Repository**.
2. Enter this URL (replace the username/repository if needed):

   `https://raw.githubusercontent.com/YOUR_GITHUB_USERNAME/LG-HomeCenter/main/repo.json`

3. Return to the app browser and refresh/reopen the repository list.
4. Select **LG Home Center** and inspect the details before installing.

This only installs the app as an ordinary webOS application. It does **not** replace the LG HOME launcher or install system-level power/screensaver hooks.

## Local build on Windows

Requirements: Node.js 20 or later and `@webos-tools/cli`.

```powershell
npm install -g @webos-tools/cli@3.2.6
.\build-ipk.ps1
```

The resulting `.ipk` is written to `dist/`. The GitHub Actions workflow is the recommended method for publishing a release manifest with the correct SHA-256 hash.

## Safety and recovery

- Keep the LG HOME app/system configuration unchanged during the first install.
- Test the Home Center app as a normal app first.
- Do not add startup hooks, alter HOME mappings, or install root scripts as part of this first release.
- Keep the original v0.5 prototype ZIP as a local backup.

## Technical references

- [webOS TV CLI Developer Guide](https://webostv.developer.lge.com/develop/tools/cli-dev-guide)
- [webOS Homebrew Channel repository and manifest format](https://github.com/webosbrew/webos-homebrew-channel)
