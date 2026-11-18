# LG Home Center — full webOS project (v1.0.0)

Custom launcher for rooted LG webOS TVs. This package includes the source, the complete user-supplied offline movie wallpaper collection, thumbnails, GitHub Actions workflow, and Windows publishing/build scripts.

## v1.0.0 — 37-image offline movie library

- Includes all **37 JPG images** supplied in `LG_WALL.zip`.
- Preserves original image dimensions and quality; the gallery uses separate 480×270 thumbnails for fast browsing.
- The Movies gallery works fully offline.
- Choose individual wallpapers from Settings → General → Wallpaper Library.
- Slideshow sources: Movies, Nature, original cinematic artwork, all included wallpapers, imported-on-TV images, or everything.
- Interval options: 1, 5, 10, 15, 30, or 60 minutes.
- To add more images later, copy JPG/JPEG images to `app/assets/wallpapers/movies`, regenerate thumbnails (the helper script is included), then run `PUBLISH_TO_GITHUB.ps1`. The script regenerates thumbnails and the movie catalog automatically before publishing; bump `app/appinfo.json` to a new patch version (for example 1.0.1) before publishing an update.
- No Digi Storage, cloud feed, or file picker is required for the included collection.

## Image collection

The 37 user-provided film wallpapers are packaged under `app/assets/wallpapers/movies`. Their thumbnails are under `app/assets/wallpapers/movies/thumbs`. Resolution metadata in the gallery reflects each source image's actual dimensions; not every image is 4K.

## Publish the complete project to GitHub

1. Extract the archive.
2. Open PowerShell in the `LG-HomeCenter-v1.0.0-Full` folder.
3. Run:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\PUBLISH_TO_GITHUB.ps1
   ```

4. The script first runs `GENERATE_MOVIE_LIBRARY.ps1` to rebuild thumbnails and the local JS catalog from the images in the folder. It then syncs `Pete11/LG-HomeCenter`, preserves the `.git` history, replaces the project files, commits and pushes.
5. Open GitHub → Actions → **Build and publish Homebrew IPK** → **Run workflow**.
6. Verify Release `v1.0.0` includes the IPK and Homebrew manifest.

The script uses `Desktop\LG-HomeCenter-git` by default. If that clone already exists, it fetches and fast-forwards `main` before replacing the project. It does not force-push or rewrite Git history.

## Build locally

Requirements: Windows, Git for Windows, Node.js, npm and LG webOS TV CLI 3.2.6.

```powershell
npm install -g @webos-tools/cli@3.2.6
powershell -ExecutionPolicy Bypass -File .\build-ipk.ps1
```

## Notes

- Bundled wallpapers are part of the IPK and available offline.
- Additional images added to the repository require a new IPK build and Homebrew update.
- The app's slideshow operates while Home Center is active. It is not a background system service.
- The Home key routing and native system standby/screensaver remain separate root/Home Chooser integrations and are not changed by this wallpaper release.

## Windows PowerShell 5.1 compatibility

The movie catalog and thumbnail scripts use .NET `System.Drawing` and Windows PowerShell only; Python and Pillow are not required. The JSON catalog is serialized from a plain `System.Object[]` to avoid the Windows PowerShell 5.1 `Argument types do not match` failure. Run `PUBLISH_TO_GITHUB.ps1` directly; it generates thumbnails and the catalog before publishing.
