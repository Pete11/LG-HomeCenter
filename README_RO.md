# LG Home Center — pachet de repository Homebrew

Acesta este pachetul de pregătire pentru publicarea pe GitHub și instalarea prin Homebrew Channel. Codul din `app/` provine din prototipul **v0.5.0** pentru LG webOS TV 25.

## Ce conține acum aplicația

Interfață cinematică, șase shortcut-uri configurabile, ceas și dată, vreme Open-Meteo și prognoză pe 10 zile, setări pentru efectul glass, luminozitatea elementelor UI pentru OLED, screensaver în interiorul aplicației și salvare/export/import al setărilor.

**Nu sunt încă implementate la nivel de sistem:** înlocuirea HOME-ului LG, screensaver global și oprirea/standby-ul real al televizorului. Setările de standby din prototip sunt doar preferințe și nu trebuie considerate funcționale.

## 1. Creează repository-ul GitHub

1. Creează un repository **public** numit `LG-HomeCenter` (sau alege alt nume).
2. Încarcă în rădăcina repository-ului tot conținutul acestui folder, inclusiv folderul ascuns `.github`.
3. În `repo.json`, înlocuiește ambele apariții `YOUR_GITHUB_USERNAME` cu numele tău GitHub. Dacă ai ales alt nume pentru repository, înlocuiește și `LG-HomeCenter` în aceleași URL-uri.
4. Salvează modificările pe branch-ul principal, de regulă `main`.

Repository-ul trebuie să fie public pentru ca televizorul să poată descărca `repo.json`, manifestul și IPK-ul prin HTTPS fără autentificare GitHub.

## 2. Construirea și publicarea primului IPK

Workflow-ul GitHub Actions construiește aplicația cu `@webos-tools/cli` și publică două fișiere în GitHub Release: pachetul `.ipk` și `com.homecenter.launcher.manifest.json`. Manifestul conține URL-ul exact al IPK-ului, versiunea, dimensiunea și hash-ul SHA-256.

După încărcarea fișierelor, creează și publică un tag dintr-un clone local:

```powershell
git tag v0.5.0
git push origin v0.5.0
```

Alternativ, deschide **Actions → Build and publish Homebrew IPK → Run workflow**. Pentru o versiune nouă, folosește un tag nou, de exemplu `v0.5.1` sau `v0.6.0`.

Verifică rularea GitHub Actions. Nu adăuga repository-ul în televizor până când workflow-ul nu s-a încheiat cu succes și ambele fișiere apar în Release.

## 3. Adăugare în Homebrew Channel

După ce primul Release este publicat:

1. Deschide Homebrew Channel pe televizor.
2. Intră la **Settings → Add Repository**.
3. Introdu URL-ul (înlocuiește utilizatorul/numele repository-ului dacă este cazul):

   `https://raw.githubusercontent.com/YOUR_GITHUB_USERNAME/LG-HomeCenter/main/repo.json`

4. Revino la lista de aplicații și reîmprospătează/deschide din nou lista repository-ului.
5. Selectează **LG Home Center** și verifică pagina aplicației înainte de instalare.

Această instalare adaugă aplicația ca aplicație webOS obișnuită. **Nu** înlocuiește HOME-ul LG și nu instalează încă funcții de screensaver sau alimentare la nivel de sistem.

## 4. Build local în Windows

Cerințe: Node.js 20 sau mai nou și `@webos-tools/cli`.

```powershell
npm install -g @webos-tools/cli@3.2.6
.\build-ipk.ps1
```

IPK-ul local va fi creat în `dist/`. Pentru publicarea prin Homebrew este recomandat workflow-ul GitHub Actions, deoarece generează manifestul cu hash-ul SHA-256 corect.

## Siguranță

- Nu schimba încă setările HOME ale televizorului.
- Testează Home Center mai întâi ca aplicație obișnuită.
- Nu instala încă scripturi de pornire și nu modifica serviciile HOME.
- Păstrează arhiva prototipului v0.5 ca backup local.
