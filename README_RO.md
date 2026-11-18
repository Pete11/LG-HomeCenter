# LG Home Center — proiect complet webOS (v1.0.0)

Launcher personalizabil pentru televizoare LG webOS rootate. Arhiva include sursa completă, colecția de wallpaper-uri primită de la tine, miniaturi, workflow-ul GitHub Actions și scripturile Windows pentru publicare și construire IPK.

## v1.0.0 — Bibliotecă offline cu 37 de imagini din filme

- Include toate cele **37 de imagini JPG** din arhiva `LG_WALL.zip`.
- Imaginile originale sunt păstrate la rezoluția și calitatea sursei.
- Miniaturile separate de 480×270 fac navigarea prin galerie mai rapidă.
- Galeria Movies funcționează fără internet.
- Alege orice wallpaper din Settings → General → Wallpaper Library.
- Slideshow: Movies, Nature, artwork cinematic original, toate imaginile incluse, imagini importate anterior pe TV sau toate sursele.
- Interval: 1, 5, 10, 15, 30 sau 60 de minute.
- Pentru imagini noi, copiază fișiere JPG/JPEG în `app/assets/wallpapers/movies`, rulează `PUBLISH_TO_GITHUB.ps1`. Scriptul regenerează automat miniaturile și catalogul înainte de publicare; mărește `app/appinfo.json` la următoarea versiune patch (de exemplu 1.0.1) înainte de actualizare.
- Nu este necesar Digi Storage, un feed cloud sau selectorul de fișiere al televizorului pentru colecția inclusă.

## Unde sunt imaginile

Cele 37 de wallpaper-uri furnizate sunt în `app/assets/wallpapers/movies`. Miniaturile sunt în `app/assets/wallpapers/movies/thumbs`. Galeria afișează rezoluția reală a fiecărei imagini; nu toate fișierele sunt 4K.

## Publicare completă pe GitHub

1. Extrage arhiva.
2. Deschide PowerShell în folderul `LG-HomeCenter-v1.0.0-Full`.
3. Execută:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\PUBLISH_TO_GITHUB.ps1
   ```

4. Scriptul rulează mai întâi `GENERATE_MOVIE_LIBRARY.ps1`, care reconstruiește miniaturile și catalogul JavaScript din toate imaginile din folder. Apoi sincronizează repository-ul `Pete11/LG-HomeCenter`, păstrează istoricul `.git`, înlocuiește fișierele proiectului, face commit și push.
5. Intră în GitHub → Actions → **Build and publish Homebrew IPK** → **Run workflow**.
6. Verifică Release `v1.0.0`, care trebuie să conțină IPK-ul și manifestul Homebrew.

Scriptul folosește implicit `Desktop\LG-HomeCenter-git`. Dacă acel clone există, descarcă modificările noi și face fast-forward înainte de înlocuirea proiectului. Nu folosește force-push și nu rescrie istoricul Git.

## Construire locală

Cerințe: Windows, Git for Windows, Node.js, npm și LG webOS TV CLI 3.2.6.

```powershell
npm install -g @webos-tools/cli@3.2.6
powershell -ExecutionPolicy Bypass -File .\build-ipk.ps1
```

## Note importante

- Imaginile incluse sunt împachetate în IPK și disponibile offline.
- Imaginile adăugate ulterior în repository necesită construirea unui IPK nou și actualizarea aplicației prin Homebrew.
- Slideshow-ul rulează cât timp Home Center este activ; nu este un serviciu de fundal al sistemului.
- Redirecționarea butonului HOME și funcțiile native de standby/screensaver sunt integrări separate Home Chooser/root și nu sunt modificate de această versiune.

## Compatibilitate Windows PowerShell 5.1

Scripturile de generare a catalogului și miniaturilor folosesc numai .NET `System.Drawing` și Windows PowerShell; nu este necesar Python sau Pillow. Catalogul JSON este serializat dintr-un `System.Object[]` simplu pentru a evita eroarea PowerShell 5.1 `Argument types do not match`. Rulează direct `PUBLISH_TO_GITHUB.ps1`; acesta generează miniaturile și catalogul înainte de publicare.
