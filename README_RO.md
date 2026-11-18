# LG Home Center — proiect complet webOS (v0.7.0)

Launcher personalizabil, cu aspect cinematic, pentru televizoare LG webOS rootate. Aceasta este o arhivă completă pentru înlocuirea repository-ului, nu doar un patch.

## Ce conține

- Sursa completă a aplicației webOS în `app/`, metadate, pictograme și calea pentru biblioteca oficială webOSTV.js.
- Dock cu maximum șase shortcut-uri, selector de aplicații instalate, pictograme originale citite din launch points webOS, navigare cu săgețile telecomenzii și lansare prin Application Manager / serviciul Homebrew.
- Ceas, dată, vreme și prognoză pe 10 zile.
- Glassmorphism negru/alb, gradient lateral, transparență, blur și reglaje de intensitate pentru elementele UI OLED.
- Screensaver overlay, setări locale, import/export și Custom CSS.
- Remediere wallpaper: imaginea este acum un element `<img>` real, poziționat deasupra fundalului de bază și sub overlay/UI. Se elimină problema stratului pseudo-element cu `z-index` negativ.
- Wallpaper-uri incluse offline: `assets/wallpapers/alpine-lake-4k.jpg` (3840×2160, imagine mărită/optimizată) precum și `assets/wallpapers/neo-noir-city.svg` (vector scalabil) și `assets/wallpapers/poster-wall.svg` (colaj original cu postere fictive). Galeria mai oferă imagini online de natură/cinematice; dacă un server extern nu răspunde, wallpaper-ul curent rămâne activ și apare un mesaj de eroare.
- Workflow GitHub Actions complet, catalog Homebrew și script local pentru compilarea IPK.

## Cerințe

- LG webOS rootat cu Homebrew Channel pentru descoperirea aplicațiilor instalate și bridge-ul root Homebrew.
- Internet pentru vreme, presetările online și actualizările din GitHub/Homebrew. Wallpaper-urile incluse funcționează fără internet.
- Recomand Git for Windows pentru înlocuirea repository-ului; interfața de upload GitHub poate omite directoarele ascunse `.github`.

## Înlocuirea completă a repository-ului GitHub

1. Extrage această arhivă într-un folder normal.
2. Instalează Git for Windows dacă `git --version` nu funcționează.
3. Deschide PowerShell în folderul extras.
4. Execută:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\PUBLISH_TO_GITHUB.ps1
   ```

5. Autentifică-te în GitHub dacă Git Credential Manager solicită acest lucru. Scriptul clonează `Pete11/LG-HomeCenter`, înlocuiește fișierele repository-ului, copiază inclusiv folderul ascuns `.github/workflows/release.yml`, face commit și push în `main`.
6. În GitHub deschide Actions → **Build and publish Homebrew IPK** → **Run workflow**.
7. Workflow-ul construiește IPK-ul și publică un GitHub Release folosind versiunea din `app/appinfo.json` (`0.7.0`).

Scriptul nu rescrie istoricul repository-ului și nu folosește force-push. Commit-urile și release-urile anterioare rămân disponibile.

## Alternativă: upload manual

Poți încărca fișierele și folderele vizibile prin interfața web GitHub, dar apoi trebuie să creezi manual `.github/workflows/release.yml`, folosind conținutul exact din arhivă. Nu omite folderul ascuns `.github`; fără el GitHub Actions nu găsește workflow-ul.

## Construire IPK pe calculator

Instalează webOS CLI și execută:

```powershell
npm install -g @webos-tools/cli@3.2.6
.\build-ipk.ps1
```

Scriptul descarcă arhiva oficială LG webOSTV.js 1.2.13 dacă biblioteca nu este deja prezentă, validează aplicația și creează IPK în `dist/`.

## Cum funcționează wallpaper-urile

- Wallpaper-urile incluse sunt fișiere locale relative la aplicație și nu depind de hosturi externe sau CORS.
- La selectarea unei imagini online, aplicația verifică mai întâi că aceasta se încarcă. Dacă eșuează, păstrează wallpaper-ul anterior și afișează o eroare.
- Imaginile personale încărcate din fișier sunt salvate în IndexedDB pe televizor. „Restore default wallpaper” revine la imaginea Alpine Lake inclusă.
- Galeria folosește și linkuri externe pentru imagini cinematice/postere. Rezoluția și disponibilitatea depind de site-ul-sursă; aceste imagini nu sunt redistribuite în repository.

## Limitări importante

- Acest pachet **nu interceptează și nu remapează butonul fizic HOME**. Integrarea Home Chooser / root trebuie verificată separat pe firmware-ul webOS 25 exact înainte de a schimba comportamentul HOME implicit.
- Screensaverul propriu rulează momentan ca overlay cât timp Home Center este activ; nu este încă înregistrat drept screensaver nativ al sistemului.
- Setările de power/standby sunt preferințe salvate; nu trimit încă o comandă reală de standby până la verificarea serviciului root potrivit pe acest firmware.
- Descoperirea aplicațiilor și citirea pictogramelor originale necesită serviciul root Homebrew. Lansarea aplicațiilor încearcă și API-ul webOS Application Manager.
- Arhiva a trecut verificări statice de sintaxă, dar nu a fost testată pe televizorul fizic. Păstrează disponibilă calea de revenire la HOME-ul original LG.

## Repository

`https://github.com/Pete11/LG-HomeCenter`
