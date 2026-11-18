# LG Home Center — proiect complet webOS (v0.9.1)

Launcher personalizabil pentru televizoare LG webOS rootate. Arhiva conține sursa completă, imaginile locale, workflow-ul GitHub Actions și scriptul Windows de publicare Git.

## v0.9.1 — Biblioteca locală de wallpaper-uri

- O bibliotecă unică în **Settings → General → My Wallpaper Library**.
- Poți selecta și importa mai multe imagini simultan din selectorul de fișiere al televizorului.
- Formate acceptate: JPG/JPEG, PNG, WebP, GIF, BMP și AVIF, dacă browserul televizorului le poate decoda.
- Fiecare imagine este verificată și salvată ca Blob în IndexedDB pe televizor.
- Galerie cu miniaturi, aplicarea imaginii selectate, marcaj pentru wallpaper-ul curent și ștergere individuală.
- Butoane Refresh Library și Clear All Images.
- Interval slideshow: 1, 5, 10, 15, 30 sau 60 de minute.
- Sursa slideshow: doar biblioteca personală, biblioteca personală + imaginile incluse sau doar imaginile incluse.
- Când biblioteca personală ajunge pentru prima dată la două imagini, slideshow-ul se activează automat dacă este selectată sursa Personal. Poate fi oprit oricând.
- Aplicația solicită stocare persistentă atunci când firmware-ul oferă această funcție.
- Rămâne disponibil și câmpul opțional pentru un URL direct către o singură imagine.

## Despre biblioteca locală

- Imaginile rămân în IndexedDB pe televizor între pornirile și actualizările normale ale aplicației, cât timp datele aplicației sunt păstrate de webOS.
- Dezinstalarea aplicației, ștergerea datelor sau resetarea stocării firmware-ului poate elimina imaginile. Exportul JSON al setărilor nu include fișierele imagine.
- Accesul la fișiere de pe USB depinde de selectorul de fișiere al firmware-ului webOS. Dacă acesta nu expune stick-ul USB aplicației, trebuie folosită o altă sursă locală compatibilă.
- Slideshow-ul rulează cât timp Home Center este activ; nu este un serviciu de fundal al sistemului.
- Nu este necesar Digi Storage, un cont cloud sau un feed extern.

## Publicare completă pe GitHub

1. Extrage arhiva.
2. Deschide PowerShell în folderul `LG-HomeCenter-v0.9.1-Full`.
3. Execută:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\PUBLISH_TO_GITHUB.ps1
   ```

4. Scriptul sincronizează repository-ul `Pete11/LG-HomeCenter`, înlocuiește fișierele proiectului păstrând `.git`, face commit și push.
5. Intră în GitHub → Actions → **Build and publish Homebrew IPK** → **Run workflow**.
6. Verifică Release `v0.9.1`, care trebuie să conțină IPK-ul și manifestul Homebrew.

Scriptul folosește implicit `Desktop\LG-HomeCenter-git` ca folder local. Dacă acel clone există, îl reutilizează, îl actualizează prin fast-forward de la `origin/main`, apoi înlocuiește fișierele proiectului. Nu folosește force-push și nu șterge istoricul Git.

## Construire locală

Cerințe: Windows, Git for Windows, Node.js, npm și LG webOS TV CLI 3.2.6.

```powershell
npm install -g @webos-tools/cli@3.2.6
powershell -ExecutionPolicy Bypass -File .\build-ipk.ps1
```

## Limitări importante

- Accesul selectorului TV la fișierele USB depinde de firmware și trebuie testat pe televizorul real.
- `appCategory: home` și permisiunea Home Chooser nu garantează singure redirecționarea butonului fizic HOME. Interceptarea HOME rămâne o integrare separată Home Chooser/Hearth/root.
- Standby-ul și screensaverul nativ al sistemului rămân integrări root separate.
