# LG Home Center — Full webOS project (v0.7.0)

A customizable, cinematic Home launcher for rooted LG webOS TVs. This is a complete repository package, not a partial patch.

## Included

- Full webOS app source (`app/`), application metadata, icons and official webOSTV.js loader path.
- Six-slot shortcut dock, installed-app picker, app icons read from webOS launch points, keyboard/Magic Remote directional navigation, and app launch via webOS Application Manager/Homebrew bridge.
- Clock, date, weather and 10-day forecast.
- Smoked-black / frosted-white glass controls, left gradient, glass transparency, blur and OLED UI intensity controls.
- Screensaver overlay, local settings, import/export and Custom CSS.
- 4K wallpaper layer fix: the wallpaper is now a real `<img>` layer above the base gradient and below the shade/UI. This fixes the previous negative-z-index pseudo-element issue.
- Bundled offline wallpapers: `assets/wallpapers/alpine-lake-4k.jpg` (3840×2160 enhanced image) and `assets/wallpapers/neo-noir-city.svg` (scalable vector) and `assets/wallpapers/poster-wall.svg` (original fictional poster-wall collage). Additional online nature/cinematic images are offered as optional presets; failed remote sources are reported without replacing the current wallpaper.
- Complete GitHub Actions release workflow, Homebrew repository catalog and local IPK build script.

## Requirements

- Rooted LG webOS TV with Homebrew Channel for installed-app discovery and the Homebrew root bridge.
- Internet connection for weather, online wallpaper presets, and Homebrew/GitHub updates. Bundled wallpapers work offline.
- Git for Windows is recommended for replacing the repository because GitHub's browser uploader often omits hidden `.github` folders.

## Replace the GitHub repository contents

1. Extract this ZIP to a normal folder.
2. Install Git for Windows if `git --version` is not available.
3. Open PowerShell in the extracted folder.
4. Run:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\PUBLISH_TO_GITHUB.ps1
   ```

5. Sign in to GitHub if Git Credential Manager asks. The script clones `Pete11/LG-HomeCenter`, replaces the repository files, copies hidden `.github/workflows/release.yml`, commits and pushes to `main`.
6. Open GitHub → Actions → **Build and publish Homebrew IPK** → **Run workflow**.
7. The workflow builds the IPK and publishes a GitHub Release using the version in `app/appinfo.json` (`0.7.0`).

The script does not rewrite repository history and does not force-push. Existing commits and prior releases remain available.

## Manual upload alternative

Upload the visible root files/folders through GitHub's web UI, then create `.github/workflows/release.yml` manually using the exact contents from this archive. Do not forget the hidden `.github` folder: without it GitHub Actions will not see the workflow.

## Local IPK build

Install the LG webOS CLI, then run:

```powershell
npm install -g @webos-tools/cli@3.2.6
.\build-ipk.ps1
```

The script downloads the official LG webOSTV.js 1.2.13 archive if it is not already present, validates the app and packages the IPK into `dist/`.

## Wallpaper behavior

- Bundled wallpapers are app-relative local assets and do not need external hosts or CORS.
- Selecting an online image preloads it before committing the setting. If the image fails, the previous wallpaper remains active and the UI shows an error.
- Custom image uploads are stored in IndexedDB on the TV. Clearing the selected image restores the bundled Alpine Lake wallpaper.
- The gallery uses external links for additional movie/cinematic art. Resolution and availability depend on the original host. These online images are not redistributed in this repository.

## Important limitations

- This package does **not** intercept or remap the physical HOME button. Home Chooser / root-level system integration must be validated separately on the exact webOS 25 firmware before changing the TV's default HOME behavior.
- The custom screensaver currently runs as an overlay while Home Center is active; it is not yet registered as the native system screensaver.
- Power/standby controls remain preferences only until the correct root power service is tested on this firmware.
- App discovery and reading original app icons require the Homebrew root service. Direct app launch also attempts the webOS Application Manager API.
- This source archive has been syntax-checked; it has not been validated on the physical TV. Keep the LG stock HOME path available during testing.

## Repository

`https://github.com/Pete11/LG-HomeCenter`
