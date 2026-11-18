# Assign LG Home Center to the remote HOME button

This project uses the supported webOS Home Chooser integration. It does not patch LG system files or silently replace the stock launcher.

## Requirements

- A rooted LG webOS TV.
- Homebrew Channel installed and running with root access.
- Home Chooser installed and opened once so it can complete its setup.

Home Chooser supports webOS 5 through 12. It lists apps that declare `appCategory: ["home"]`. Home Center 0.9.0 includes that declaration and requests the Home Chooser launcher permission.

## Important installation order

1. Open Homebrew Channel and install **Home Chooser** from the official Homebrew catalog.
2. Launch Home Chooser once and let its first-run setup finish.
3. Then install/update **LG Home Center 0.9.0**. The Home Chooser permission is declared in this version's `appinfo.json`.
4. Open Home Chooser again. Select **LG Home Center**, press OK, and confirm the prompt.
5. Press the physical HOME button to test.

If the launcher was installed before Home Chooser's first-run setup, Home Chooser's documentation says the launcher may need to be reinstalled after Home Chooser has been opened once, because the app permission is checked at install time.

## Restore LG's original HOME screen

Open Home Chooser and select **LG Home (stock)**. If the selected launcher is uninstalled, Home Chooser also restores LG Home.

## In-app status

Home Center → Settings → Home Button → Check Home Chooser reports whether the service is present, elevated, permitted, and whether Home Center is currently selected.
