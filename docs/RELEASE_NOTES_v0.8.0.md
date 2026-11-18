# LG Home Center 0.8.0 release notes

## Settings and Magic Remote

- Rebuilt the Settings viewport as a dedicated vertical scroll area for webOS TV.
- Added automatic scroll-to-focus so the selected control remains visible while navigating with the remote.
- Replaced native HTML dropdowns with remote-friendly selectors: OK opens an option list, UP/DOWN moves through options, and BACK closes the list and advances to the next setting.
- Added LG BACK key variants, including key codes 461 and 8, and prevented BACK from exiting Home Center while Settings is open.
- Sidebar tabs remain reachable with UP/DOWN; RIGHT enters the current page; LEFT returns to the sidebar; Done exits Settings.

## Wallpaper library

- Added a Personal Wallpapers library in IndexedDB.
- Import several images/posters in one file selection; common browser-supported image formats are accepted, up to 30 MB per file.
- Images are decoded and checked by the TV before being stored. The user can apply or remove each image later.
- Bundled offline artwork includes Alpine Lake 4K, Otherworld Desert 4K, Neo-Noir City, and Original Poster Wall.
- Added safe fallback behavior: a failed image load does not replace the currently working wallpaper.
- Personal image files are stored on the TV; Export Settings backs up preferences, not the image blobs.

## Home screen design

- Centered the clock, date, and weather together near the top center.
- Reduced the glass dock width, height, padding, app tile size, icon size, and labels while keeping six shortcuts in one row.

## Physical HOME button

- Declares `appCategory: ["home"]` and requests the Home Chooser launcher permission.
- Adds Settings → Home Button status checks and a shortcut to open Home Chooser.
- The physical HOME assignment remains a deliberate one-time choice in Home Chooser. Select LG Home Center there, confirm, and use LG Home (stock) to restore the original launcher.

## Important limitations

- This source package has syntax/structure checks, but it has not yet been compiled as an IPK or tested on the user's LG C2. GitHub Actions builds the IPK after publication.
- The TV's power-off/standby schedule remains a saved preference until the root power service is verified on the exact firmware.
