# LG Home Center — proiect complet webOS (v0.8.0)

Launcher cinematic personalizabil pentru televizoare LG webOS rootate. Arhiva conține proiectul complet, workflow-ul GitHub Actions și scriptul de publicare.

## Noutăți v0.8.0

- Scroll vertical funcțional în Settings pe webOS, cu focus vizibil, derulare automată și navigare cu săgețile Magic Remote. Selector-ele sunt controale TV dedicate, cu text mare și listă proprie pentru telecomandă.
- BACK închide lista unui selector și mută focusul la următoarea setare; BACK din controalele paginii revine la meniul lateral. Ieșirea se face cu Done sau BACK când focusul este în bara laterală.
- Galerie Personal Wallpapers: importă mai multe imagini/postere JPG, PNG, WEBP sau GIF, selectează-le ulterior și șterge-le. Fișierele sunt păstrate local în IndexedDB pe televizor.
- Wallpaper-uri locale incluse: Alpine Lake 4K, Otherworld Desert 4K, Neo-Noir City și Original Poster Wall. Funcționează offline.
- Ora, data și vremea sunt grupate central în partea superioară a ecranului.
- Dock Glass și shortcut-uri mai compacte, cu pictograme și etichete reduse.
- Integrare Home Chooser: `appCategory: ["home"]`, permisiune dedicată și verificare de stare în Settings → Home Button.

## Wallpaper-uri și postere personale

Deschide Settings → General → Upload your wallpapers / movie posters. Selectează unul sau mai multe fișiere. După import apar în Personal Wallpapers; selectează o miniatură pentru a o aplica.

Poți folosi imagini pe care le ai și ai dreptul să le folosești. Arhiva include artă cinematică originală, nu postere comerciale copiate din filme protejate.

Imaginile personale sunt păstrate pe TV în IndexedDB. Export Settings salvează preferințele, nu și fișierele imagine; păstrează separat copiile originale pe PC/USB.

## Butonul HOME al telecomenzii

Urmează `docs/HOME_BUTTON_SETUP.md`. Pe scurt: instalează Home Chooser și deschide-l o dată înainte de actualizarea Home Center 0.8.0, apoi deschide Home Chooser, selectează LG Home Center și confirmă. Pentru revenire, selectează LG Home (stock).

Nu se modifică automat setarea HOME și nu se înlocuiesc fișierele de sistem LG.

## Publicare pe GitHub

1. Extrage arhiva completă.
2. Deschide PowerShell în folderul principal.
3. Rulează `powershell -ExecutionPolicy Bypass -File .\PUBLISH_TO_GITHUB.ps1`.
4. Scriptul sincronizează repository-ul `Pete11/LG-HomeCenter`, înlocuiește fișierele vechi, păstrează istoricul Git și publică un commit nou.
5. Intră în GitHub → Actions → Build and publish Homebrew IPK → Run workflow.
6. Verifică Release-ul `v0.8.0` și cele două assets: IPK + manifest JSON.

Scriptul folosește folderul local existent `Desktop\LG-HomeCenter-git` dacă există. Nu este necesară ștergerea lui.

## Instalare / actualizare pe TV

- Înainte să actualizezi la 0.8.0, instalează și deschide Home Chooser o dată, apoi actualizează Home Center prin Homebrew Channel.
- Nu dezinstala versiunea actuală decât dacă Homebrew solicită explicit reinstalarea; dezinstalarea poate șterge datele locale ale aplicației.
- După instalare, Settings → Home Button → Check Home Chooser verifică integrarea.

## Construire locală

Cerințe: Windows, Node.js, npm și LG webOS TV CLI 3.2.6.

```powershell
npm install -g @webos-tools/cli@3.2.6
powershell -ExecutionPolicy Bypass -File .\build-ipk.ps1
```

## Limitări tehnice

- Programarea standby și oprirea TV rămân setări demonstrative până când serviciul root de alimentare este verificat pe firmware-ul exact.
- Home Chooser este componenta care setează destinația butonului HOME; Home Center nu schimbă această alegere în fundal.
- Unele fișiere USB pot să nu apară în selectorul browserului webOS pe toate versiunile de firmware; poți folosi și selectorul de fișiere local disponibil pe TV sau URL direct către o imagine.
