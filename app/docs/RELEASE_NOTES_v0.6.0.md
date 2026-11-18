# LG Home Center v0.6.0

## Fixes and features

- Bundles the official webOSTV.js runtime at build time from the official webOS CLI basic template; Luna service calls are no longer left without the required JS bridge.
- Shortcut settings can load installed launch points through the rooted Homebrew Channel exec service and offer a picker, with manual app-ID entry retained as a fallback.
- Empty shortcut tiles no longer throw the user into Settings; they show an actionable message instead.
- Adds a curated remote 4K/5K wallpaper gallery for nature and cinematic movie artwork, alongside custom URL and local image options.
- Declares `appCategory: ["home"]` so Home Chooser can list LG Home Center as a Home app.

## Home button setup

Install Home Chooser from the Homebrew Channel after updating to v0.6.0. Open Home Chooser, select LG Home Center, confirm, then press the remote's HOME button. To restore LG's interface, open Home Chooser and select "LG Home (stock)". No system UI files are edited by this launcher.

## Notes

- The installed-app picker requires a rooted TV with Homebrew Channel root services available.
- Wallpaper presets are hosted by third-party sites and require an internet connection. Resolution and availability are those reported by the source pages; some providers may change their URLs.
- The app has not been tested on the owner's TV by the build environment. Confirm app discovery and app launches on the LG C2 before changing the default Home app.
