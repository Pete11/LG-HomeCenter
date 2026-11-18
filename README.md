# LG Home Center — Complete webOS Project (v0.9.1)

A customizable launcher for rooted LG webOS TVs. This archive contains the complete source, local wallpaper assets, GitHub Actions workflow, and Windows Git publishing script.

## v0.9.1 — My Wallpaper Library

- One dedicated local wallpaper library in **Settings → General**.
- Import multiple image files in one selection using the TV file picker.
- Accepts JPG/JPEG, PNG, WebP, GIF, BMP and AVIF when the TV browser can decode the format.
- Each image is validated and stored as a Blob in IndexedDB on the TV.
- Personal gallery with previews, select/apply, current-wallpaper indicator, and per-image Remove.
- Refresh Library and Clear All Images controls.
- Slideshow interval: 1, 5, 10, 15, 30 or 60 minutes.
- Slideshow source: My library only, My library + bundled wallpapers, or bundled wallpapers only.
- When the personal-only library first reaches two images, the slideshow is enabled automatically. You can turn it off at any time.
- Requests persistent browser storage where supported by webOS.
- Direct image URL remains available as an optional one-off wallpaper source.

## Local library notes

- Files remain in the app's IndexedDB storage on the TV across normal app launches and app updates, as long as the webOS app data is retained.
- Uninstalling the app, clearing its data, or a firmware storage reset may remove the local images. Settings JSON export does not include the binary image files.
- USB file selection depends on whether the TV's webOS file picker exposes USB files to this app. If it does not, use another supported local-file source or a browser on the TV that exposes files to web apps.
- Slideshow runs while Home Center is active. It is not a background system service.
- No Digi Storage, cloud login, or external feed is required for the local library.

## Publish the complete project to GitHub

1. Extract this archive.
2. Open PowerShell in the extracted `LG-HomeCenter-v0.9.1-Full` folder.
3. Run:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\PUBLISH_TO_GITHUB.ps1
   ```

4. The script syncs `Pete11/LG-HomeCenter`, replaces the working tree while preserving `.git`, commits, and pushes the full project.
5. Open GitHub → Actions → **Build and publish Homebrew IPK** → **Run workflow**.
6. Confirm Release `v0.9.1` contains the IPK and Homebrew manifest.

The script uses `Desktop\LG-HomeCenter-git` as its local working copy by default. It reuses that clone, fast-forwards it from `origin/main`, then replaces the tracked project files. It does not force-push or delete Git history.

## Build locally

Requirements: Windows, Git for Windows, Node.js, npm, and LG webOS TV CLI 3.2.6.

```powershell
npm install -g @webos-tools/cli@3.2.6
powershell -ExecutionPolicy Bypass -File .\build-ipk.ps1
```

## Important limitations

- The TV file picker/USB exposure is firmware-dependent and must be tested on the actual TV.
- App category `home` and Home Chooser permission do not by themselves guarantee that the physical HOME key will be redirected. HOME interception remains a separate Home Chooser/Hearth/root integration task.
- Standby and native system screensaver controls remain separate root-level integrations.
