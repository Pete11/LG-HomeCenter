# LG Home Center — Full webOS project (v0.8.0)

A customizable cinematic launcher for rooted LG webOS TVs. This archive includes the complete app source, GitHub Actions workflow and one-click PowerShell publishing script.

## 0.8.0 changes

- Fixed Settings vertical scrolling and directional focus for Magic Remote.
- BACK while a native select is focused advances to the next setting instead of closing Settings.
- Personal Wallpapers library: import multiple JPG, PNG, WEBP or GIF images/posters, apply later and remove them. Files remain local in TV IndexedDB.
- Bundled offline wallpapers: Alpine Lake 4K, Otherworld Desert 4K, Neo-Noir City and Original Poster Wall.
- Centered clock, date and weather near the top of the home screen.
- Smaller glass dock and shortcut tiles.
- Home Chooser integration status and setup instructions.

## Personal wallpapers

Open Settings → General → Upload your wallpapers / movie posters. Select one or several images. They appear in Personal Wallpapers and can be applied or removed later.

Use images you own or are licensed to use. The included cinematic artworks are original artwork, not copied commercial film posters.

Personal image files are stored locally on the TV in IndexedDB. Export Settings exports preferences only, not image bytes; keep the original images on your PC or USB drive as a backup.

## Assign the physical HOME button

Follow `docs/HOME_BUTTON_SETUP.md`. Install Home Chooser from Homebrew Channel and open it once before updating Home Center 0.8.0. Then open Home Chooser, select LG Home Center and confirm. To restore LG's interface, select LG Home (stock).

Home Center does not silently change the HOME assignment and does not overwrite LG system files.

## Publish to GitHub

1. Extract the complete archive.
2. Open PowerShell in the project root.
3. Run `powershell -ExecutionPolicy Bypass -File .\PUBLISH_TO_GITHUB.ps1`.
4. The script updates `Pete11/LG-HomeCenter`, replaces old files, preserves Git history and pushes a new commit.
5. In GitHub Actions, run **Build and publish Homebrew IPK**.
6. Verify Release `v0.8.0` has an IPK and manifest JSON.

The script reuses `Desktop\LG-HomeCenter-git` if that local working copy already exists. Do not delete it.

## Install / update on TV

- Install and open Home Chooser once before updating to 0.8.0, then update Home Center through Homebrew Channel.
- Do not uninstall the current version unless Homebrew explicitly requires reinstall; uninstalling may delete local app data.
- After updating, use Settings → Home Button → Check Home Chooser.

## Local build

Requirements: Windows, Node.js, npm and LG webOS TV CLI 3.2.6.

```powershell
npm install -g @webos-tools/cli@3.2.6
powershell -ExecutionPolicy Bypass -File .\build-ipk.ps1
```

## Notes

- TV standby and scheduled power-off settings remain preferences only until a root power service is verified against the exact firmware.
- Home Chooser is responsible for the physical HOME key assignment.
- USB file visibility in the webOS file picker can vary by firmware. A direct image URL is also supported.
