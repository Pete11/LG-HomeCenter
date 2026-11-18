# LG Home Center v0.6.1 – actualizare

Această arhivă conține folderul `app` actualizat pentru repository-ul GitHub `Pete11/LG-HomeCenter`.

## Modificări în v0.6.1

- Navigare cu săgețile Magic Remote pe ecranul principal, în Settings și în fereastra prognozei.
- OK/Enter activează butonul sau shortcut-ul selectat.
- Selectorul aplicațiilor instalate și câmpurile din Shortcuts au text mai mare pentru citirea de la distanță.
- Se citesc câmpurile originale de icon din lista Launch Points webOS (`icon`, `largeIcon` etc.).
- Iconurile locale sunt citite prin serviciul root Homebrew, transformate în data URL și salvate în setările locale.
- Iconul aplicației selectate apare în previzualizarea din Settings și pe shortcut-ul din dock.
- Lansarea folosește mai întâi `luna-send` prin Homebrew root service și apoi încearcă API-ul webOS ca fallback.

## Actualizare pe GitHub

1. Extrage arhiva.
2. În repository-ul `Pete11/LG-HomeCenter`, deschide `app/` și alege Add file → Upload files.
3. Încarcă toate fișierele din folderul `app` din această arhivă, înlocuind fișierele existente cu aceleași nume.
4. Nu șterge și nu modifica `.github/workflows/release.yml`.
5. Commit direct pe `main`, cu mesajul `Fix Magic Remote navigation and app icons`.
6. Deschide Actions și rulează `Build and publish Homebrew IPK`.
7. Verifică să apară Release `v0.6.1` și IPK `com.homecenter.launcher_0.6.1_all.ipk`.
8. Actualizează aplicația din Homebrew Channel numai după confirmarea release-ului.

## Notă despre iconuri

Elementele `<option>` dintr-un control HTML `<select>` standard nu pot afișa în mod fiabil imagini în popup-ul nativ webOS. De aceea, versiunea 0.6.1 afișează iconul selectat într-o previzualizare mare lângă selector și în dock. Navigarea nativă a popup-ului select rămâne controlată de webOS.

## Notă de testare

Codul a fost verificat static (sintaxă JavaScript și JSON). Navigarea Magic Remote, accesul la fișierele icon și lansarea aplicațiilor trebuie confirmate pe televizorul LG C2 cu webOS 25 și Homebrew Channel.
