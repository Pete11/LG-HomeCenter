# LG Home Center v0.6.1

## Magic Remote navigation
- Added directional-key normalization for `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, legacy key codes, and webOS key identifiers.
- Added spatial focus navigation across Settings controls and the forecast dialog.
- Added Home-screen focus movement between app tiles, weather, and Settings.
- Added explicit OK/Enter activation for focused Home-screen tiles and controls.
- Preserved native arrow handling for select menus, range controls, and text editing.

## Installed applications and icons
- Read `icon`, `largeIcon`, `mediumLargeIcon`, `miniicon`, `folderPath`, `launchPointId`, and icon background color from webOS launch points.
- Added a large selected-app icon preview in Settings → Shortcuts.
- Resolve local icon files through the Homebrew Channel root command bridge and cache them as data URLs in local settings.
- Display the resolved original application icon on its Home Center dock tile.
- Increased installed-app selector, row labels, and shortcut fields for 10-foot TV viewing.

## Application launching
- Launch through Homebrew Channel's root command bridge using `luna-send` first.
- Fall back to the webOS Application Manager request / PalmServiceBridge when needed.
- Show a visible error if both launch paths fail.

## Compatibility notes
- Requires the Homebrew Channel root command service for live launch-point enumeration and local icon extraction.
- The standard HTML select control still uses the webOS/browser native options popup; the selected application's large icon is shown beside it and on the Home dock tile.
- Hardware validation on LG C2/webOS 25 is still required.
