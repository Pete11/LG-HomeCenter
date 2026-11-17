# LG Home Center — webOS TV 25 (prototip 0.1)

Primul prototip al launcherului personalizat pentru LG C2 / webOS 25. Proiectul este o aplicație webOS simplă, fără framework-uri grele, cu interfață 16:9 și navigare pentru Magic Remote.

## Ce este inclus acum

- Interfață cinematică, full-screen, cu dock de **6 shortcut-uri într-un singur rând**.
- Ceas și dată locale.
- Vreme curentă pentru localitatea configurată, prin Open-Meteo (fără cheie API; necesită conexiune la internet).
- Configurarea numelui și a ID-ului webOS pentru fiecare shortcut.
- Apel către `com.webos.applicationManager/launch` prin bridge-ul webOS atunci când rulează pe TV.
- Wallpaper prin URL sau fișier imagine local (salvare IndexedDB).
- Controale independente pentru luminozitatea textului, pictogramelor și ceasului; opacitatea și blurul dock-ului.
- Screensaver în aplicație, declanșat după inactivitate și închis la orice apăsare/tastă.
- CSS personalizat, export/import JSON și memorarea setărilor local.
- Setări de standby și oră de oprire salvate ca preferințe, dar **neexecutate** în această versiune.

## Ce NU este încă implementat

1. Înlocuirea reală a ecranului HOME al LG. Deocamdată aplicația pornește ca o aplicație webOS obișnuită.
2. Screensaver nativ la nivel de sistem. Screensaverul actual este o suprapunere care rulează doar cât aplicația Home Center rămâne activă.
3. Oprirea/standby-ul real al televizorului. UI-ul memorează programul, însă nu trimite o comandă de alimentare. Nu activa această funcție ca și cum ar fi deja operațională.
4. Detectarea automată a ID-urilor aplicațiilor instalate. Acestea trebuie completate manual în Setări → Shortcut-uri; în pasul următor putem interoga lista reală de aplicații de pe C2.
5. Wallpaper-ul local este salvat în IndexedDB, dar nu este inclus în exportul JSON al setărilor.

## Testare rapidă pe PC

Deschide `app/index.html` în Chrome sau Edge. Ceasul, interfața, setările și screensaverul din aplicație funcționează. Lansarea aplicațiilor webOS este disponibilă numai pe televizor; vremea necesită internet.

Taste utile: săgeți stânga/dreapta, Enter, Esc. Click pe SETTINGS pentru configurare.

## Construirea pachetului IPK

1. Instalează **webOS TV CLI** de la documentația oficială LG: https://webostv.developer.lge.com/develop/tools/cli-dev-guide
2. Deschide PowerShell în folderul `HomeCenter_WebOS25`.
3. Rulează:

   ```powershell
   .\build-ipk.ps1
   ```

4. Scriptul folosește `ares-package` pentru a crea fișierul IPK în folderul `dist`.
5. Instalează-l prin fluxul de instalare pe care îl folosești pentru aplicațiile Homebrew/root. Nu seta încă aplicația drept HOME implicit.

Alternativ, manual:

```powershell
ares-package .\app -o .\dist
```

Documentația LG descrie `ares-package`, `ares-install` și `ares-launch` pentru pachetele webOS TV: https://webostv.developer.lge.com/develop/tools/cli-dev-guide

## Configurarea shortcut-urilor

Pe TV, deschide Settings → Shortcut-uri și introdu pentru fiecare aplicație:

- numele afișat;
- ID-ul real al aplicației webOS.

Nu am introdus ID-uri presupuse pentru Nuvio, YouTube, Prime Video, Spotify sau Plex: identificatorii trebuie verificați pe televizorul tău.

## Structura

```text
HomeCenter_WebOS25/
├── app/
│   ├── appinfo.json
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── icon.png
│   └── largeIcon.png
├── dist/
├── build-ipk.ps1
└── README_RO.md
```

## Note tehnice

- Lansarea aplicațiilor folosește API-ul oficial Application Manager (`luna://com.webos.applicationManager`, metoda `launch`).
- Apelul este încercat prin `webOS.service.request`; există și fallback direct prin `PalmServiceBridge`.
- Conform tabelului LG pentru webOS TV 25 și versiunile anterioare, mecanismul ACG nu este suportat pe acea ramură de firmware. Dacă proiectul va fi adaptat pentru webOS 26/27, trebuie revizuite declarațiile `requiredACG`.
- Open-Meteo oferă API fără cheie pentru utilizare non-comercială și solicită atribuirea sursei: https://open-meteo.com/ .
- Toate efectele de focus sunt scurte; blurul este controlabil pentru a evita costul vizual excesiv pe TV.

## Următorul pas tehnic

După instalarea și pornirea acestui prototip pe LG C2, colectăm ID-urile reale ale aplicațiilor și verificăm prin SSH/root ce servicii sunt disponibile pentru integrarea HOME, screensaver nativ și standby. Nu modificăm serviciul HOME sau alimentarea până nu avem o cale de revenire testată.
