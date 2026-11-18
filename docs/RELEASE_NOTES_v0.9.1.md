# LG Home Center v0.9.1 — Local Wallpaper Library

## Changes

- Reorganized wallpaper management into one dedicated **My Wallpaper Library** in Settings → General.
- Import multiple personal images in one selection; JPG, JPEG, PNG, WebP, GIF, BMP and AVIF are accepted when the TV browser can decode them.
- Store each uploaded image as a Blob in IndexedDB on the TV, with filename, type, size, dimensions and import time metadata.
- Added Refresh library and Clear all images actions.
- Added a current-wallpaper badge in the personal gallery.
- Slideshow sources are now local-only: My library, My library + included wallpapers, or Included wallpapers. Removed the cloud JSON feed UI and cloud-only slideshow mode.
- Slideshow can automatically enable when the personal library first reaches two images while Personal-only or All-libraries mode is selected.
- Slideshow rotations no longer show a toast on every automatic image change.
- Requests persistent browser storage where supported; quota and unsupported-image failures are reported in the library status.
- Kept direct single-image URL support as an optional setting.
- Retained the GitHub publication script and GitHub Actions IPK build workflow.

## Notes

- The browser file picker must expose the selected files to the webOS app. USB file access depends on the TV firmware and file picker behavior.
- Personal wallpaper binaries are stored locally in IndexedDB and are not included in Settings JSON export. Uninstalling the app or clearing its data may remove them.
- The slideshow runs while Home Center is active; it is not a background service.
