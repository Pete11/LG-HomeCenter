# LG Home Center v0.9.0

## Wallpaper library and slideshow

- Add a configurable wallpaper slideshow.
- Intervals: 1, 5, 10, 15, 30, and 60 minutes.
- Sources: bundled, local personal uploads, cloud feed, or all.
- Uploading more than one personal image enables the slideshow automatically.
- Failed remote image loads do not blank the current wallpaper.

## Personal cloud feed

- Add a public HTTPS JSON feed URL in Settings → General.
- Load a list of direct image URLs and optional thumbnails.
- Render a cloud gallery with per-image apply action.
- Include an example manifest at `docs/cloud-wallpapers.example.json`.

## Visual refinements

- Increase dock width, padding, tile height, app icon dimensions, and labels slightly.

## Technical notes

- Cloud JSON feed requires CORS and unauthenticated public read access.
- Slideshow is an in-app timer and requires Home Center to remain active.
