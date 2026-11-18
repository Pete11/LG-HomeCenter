# LG Home Center v0.7.0

## Wallpaper reliability
- Replaced the negative-z-index pseudo-element wallpaper layer with a dedicated image element above the base background and below the darkening overlay/UI.
- Added a bundled 3840×2160 Alpine Lake wallpaper and a scalable offline Neo-Noir City wallpaper.
- Reworked wallpaper selection to preload and verify images before saving the selected URL. Failed online sources leave the previous wallpaper intact and show an error.
- Local file uploads continue to use IndexedDB and are restored at app startup.

## Included project
- Complete source tree, Homebrew repository catalog, GitHub Actions workflow, local IPK build script, and a PowerShell repository replacement helper.
- Versioned as 0.7.0.

## Clarified integration boundaries
- Physical HOME remapping, native screensaver registration and real TV standby remain separate firmware-specific root integration work.
