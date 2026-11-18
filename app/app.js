(function () {
  'use strict';
  const STORAGE_KEY = 'homecenter.settings.v1';
  const DEFAULTS = {
    city: 'Bucharest', weatherInterval: 30,
    apps: [
      { name: 'Nuvio', appId: '', symbol: 'N', kind: 'nuvio' },
      { name: 'YouTube', appId: '', symbol: '▶', kind: 'youtube' },
      { name: 'Prime Video', appId: '', symbol: 'prime', kind: 'prime' },
      { name: 'Spotify', appId: '', symbol: '◉', kind: 'spotify' },
      { name: 'Plex', appId: '', symbol: 'P', kind: 'plex' }
    ],
    textBrightness: 78, iconBrightness: 72, clockBrightness: 72, glassTransparency: 62, dockBlur: 16, glassTint: 'dark', glassGradient: 58,
    pixelShift: false, idleDim: true, screensaverEnabled: true, screensaverDelay: 5, screensaverMode: 'clock',
    autoStandby: 'off', scheduledPowerOffEnabled: false, scheduledPowerOff: '01:00', customCss: '', wallpaperUrl: '', personalWallpaperId: '',
    wallpaperSlideshowEnabled: false, wallpaperSlideshowInterval: 10, wallpaperSlideshowSource: 'personal'
  };
  const DEFAULT_WALLPAPER = 'assets/wallpapers/alpine-lake-4k.jpg';
  // Bundled images are always available offline. Online sources are optional and are checked before applying.
  const WALLPAPER_PRESETS = [
    { id: 'nature-alpine-bundled', title: 'Alpine Lake', category: 'nature', resolution: '3840 × 2160 · 4K', source: 'Included offline', url: 'assets/wallpapers/alpine-lake-4k.jpg', preview: 'assets/wallpapers/alpine-lake-thumb.jpg', bundled: true },
    { id: 'cinema-desert-bundled', title: 'Otherworld Desert', category: 'cinema', resolution: '3840 × 2160 · 4K', source: 'Original cinematic artwork · included offline', url: 'assets/wallpapers/otherworld-desert-4k.jpg', preview: 'assets/wallpapers/otherworld-desert-thumb.jpg', bundled: true },
    { id: 'cinema-noir-bundled', title: 'Neo-Noir City', category: 'cinema', resolution: '3840 × 2160 · scalable vector', source: 'Included offline', url: 'assets/wallpapers/neo-noir-city.svg', bundled: true },
    { id: 'cinema-poster-wall-bundled', title: 'Original Poster Wall', category: 'cinema', resolution: '3840 × 2160 · scalable vector', source: 'Original artwork · included offline', url: 'assets/wallpapers/poster-wall.svg', bundled: true }
  ];
  let installedApps = [];
  let serviceRequests = [];
  let settings = loadSettings();
  let weatherTimer = null;
  let wallpaperSlideshowTimer = null;
  let wallpaperSlideshowBusy = false;
  let idleTimer = null;
  let dimTimer = null;
  let toastTimer = null;
  let currentFocus = 0;
  let weatherState = { temperature: null, code: null, description: 'Loading weather', daily: null, location: 'Bucharest', updatedAt: null };
  let wallpaperObjectUrl = null;
  let dbPromise = null;

  const $ = (id) => document.getElementById(id);
  const tiles = () => Array.from(document.querySelectorAll('.app-tile'));

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      let apps = Array.isArray(saved.apps) ? saved.apps.slice(0, 6) : clone(DEFAULTS.apps);
      // Remove the old visible '+' placeholder from prototype 0.1 during migration.
      if (apps.length && /^Shortcut 6$/i.test(String(apps[apps.length - 1].name || '')) && !apps[apps.length - 1].appId && apps[apps.length - 1].kind === 'custom') apps.pop();
      if (!apps.length) apps = clone(DEFAULTS.apps);
      const merged = Object.assign(clone(DEFAULTS), saved, { apps });
      if (typeof merged.personalWallpaperId !== 'string') merged.personalWallpaperId = '';
      if (merged.wallpaperSlideshowSource === 'cloud') merged.wallpaperSlideshowSource = 'personal';
      delete merged.cloudWallpaperFeedUrl;
      if (!Number.isFinite(Number(saved.glassTransparency))) merged.glassTransparency = DEFAULTS.glassTransparency;
      delete merged.dockOpacity;
      return merged;
    } catch (_) { return clone(DEFAULTS); }
  }
  function saveSettings() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); $('saveState').textContent = 'Saved locally'; }
    catch (error) { $('saveState').textContent = 'Could not save: storage is full'; }
  }
  function toast(message) {
    const node = $('toast'); node.textContent = message; node.classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('visible'), 2500);
  }
  function pad(value) { return String(value).padStart(2, '0'); }
  function updateClock() {
    const now = new Date();
    const time = pad(now.getHours()) + ':' + pad(now.getMinutes());
    const date = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
    $('clockTime').textContent = time; $('clockDate').textContent = date.toUpperCase();
    $('screensaverTime').textContent = time; $('screensaverDate').textContent = date.toUpperCase();
  }
  function weatherDescription(code) {
    const map = {0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Rime fog',51:'Light drizzle',53:'Drizzle',55:'Dense drizzle',56:'Freezing drizzle',57:'Heavy freezing drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',66:'Freezing rain',67:'Heavy freezing rain',71:'Light snow',73:'Snow',75:'Heavy snow',77:'Snow grains',80:'Rain showers',81:'Rain showers',82:'Heavy rain showers',85:'Snow showers',86:'Heavy snow showers',95:'Thunderstorm',96:'Thunderstorm with hail',99:'Severe thunderstorm with hail'};
    return map[code] || 'Current conditions';
  }
  function weatherSymbol(code) {
    if (code === 0) return '☼'; if ([1,2].includes(code)) return '◐'; if ([3,45,48].includes(code)) return '☁';
    if (code >= 51 && code <= 67 || code >= 80 && code <= 82) return '☂'; if (code >= 71 && code <= 77) return '❄'; if (code >= 95) return 'ϟ'; return '◌';
  }
  async function refreshWeather() {
    const city = (settings.city || 'Bucharest').trim();
    $('weatherDetail').textContent = 'Updating…';
    try {
      const geoUrl = 'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(city) + '&count=1&language=en&format=json';
      const geoResponse = await fetch(geoUrl, { cache: 'no-store' });
      if (!geoResponse.ok) throw new Error('Geocoding unavailable');
      const geo = await geoResponse.json();
      if (!geo.results || !geo.results.length) throw new Error('City not found');
      const place = geo.results[0];
      const forecastUrl = 'https://api.open-meteo.com/v1/forecast?latitude=' + place.latitude + '&longitude=' + place.longitude + '&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&forecast_days=10&timezone=auto';
      const forecastResponse = await fetch(forecastUrl, { cache: 'no-store' });
      if (!forecastResponse.ok) throw new Error('Forecast unavailable');
      const forecast = await forecastResponse.json();
      const current = forecast.current;
      weatherState = { temperature: Math.round(current.temperature_2m), code: current.weather_code, description: weatherDescription(current.weather_code), daily: forecast.daily || null, location: place.name, updatedAt: new Date() };
      $('weatherTemp').textContent = weatherState.temperature + '°';
      $('weatherIcon').textContent = weatherSymbol(weatherState.code);
      $('weatherDetail').textContent = weatherState.description;
      $('screensaverWeather').textContent = weatherState.temperature + '° · ' + weatherState.description.toUpperCase();
    } catch (error) {
      $('weatherDetail').textContent = 'Weather unavailable';
    }
  }
  function formatForecastDate(isoDate) {
    const date = new Date(String(isoDate) + 'T12:00:00');
    return {
      weekday: new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(date).toUpperCase(),
      date: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(date).toUpperCase()
    };
  }
  function renderForecast() {
    const grid = $('forecastGrid');
    grid.innerHTML = '';
    $('forecastLocation').textContent = String(weatherState.location || settings.city || 'BUCHAREST').toUpperCase();
    if (!weatherState.daily || !Array.isArray(weatherState.daily.time) || !weatherState.daily.time.length) {
      const empty = document.createElement('div'); empty.className = 'forecast-empty'; empty.textContent = 'Forecast is not available yet. Check your internet connection and try again.'; grid.appendChild(empty);
      $('forecastUpdated').textContent = 'NO FORECAST DATA';
      return;
    }
    const daily = weatherState.daily;
    const count = Math.min(10, daily.time.length);
    for (let i = 0; i < count; i++) {
      const day = document.createElement('article'); day.className = 'forecast-day';
      const date = formatForecastDate(daily.time[i]);
      const name = document.createElement('div'); name.className = 'forecast-day-name'; name.textContent = i === 0 ? 'TODAY' : date.weekday;
      const dateLabel = document.createElement('div'); dateLabel.className = 'forecast-day-date'; dateLabel.textContent = date.date;
      const icon = document.createElement('div'); icon.className = 'forecast-day-icon'; icon.textContent = weatherSymbol(Number(daily.weather_code && daily.weather_code[i]));
      const summary = document.createElement('div'); summary.className = 'forecast-day-summary'; summary.textContent = weatherDescription(Number(daily.weather_code && daily.weather_code[i]));
      const temps = document.createElement('div'); temps.className = 'forecast-temps';
      const high = document.createElement('span'); high.className = 'forecast-high'; high.textContent = Number.isFinite(Number(daily.temperature_2m_max && daily.temperature_2m_max[i])) ? Math.round(daily.temperature_2m_max[i]) + '°' : '—';
      const low = document.createElement('span'); low.className = 'forecast-low'; low.textContent = Number.isFinite(Number(daily.temperature_2m_min && daily.temperature_2m_min[i])) ? Math.round(daily.temperature_2m_min[i]) + '°' : '—';
      temps.append(high, low);
      const extra = document.createElement('div'); extra.className = 'forecast-extra';
      const rain = daily.precipitation_probability_max && daily.precipitation_probability_max[i];
      const wind = daily.wind_speed_10m_max && daily.wind_speed_10m_max[i];
      extra.textContent = (rain == null ? '—' : Math.round(rain) + '% rain') + '  ·  ' + (wind == null ? '—' : Math.round(wind) + ' km/h');
      day.append(name, dateLabel, icon, summary, temps, extra); grid.appendChild(day);
    }
    const updated = weatherState.updatedAt instanceof Date ? weatherState.updatedAt : new Date();
    $('forecastUpdated').textContent = 'UPDATED ' + new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(updated);
  }
  function openForecast() {
    closeScreensaver();
    renderForecast();
    $('forecastOverlay').classList.remove('hidden'); $('forecastOverlay').setAttribute('aria-hidden', 'false');
    $('closeForecast').focus();
    if (!weatherState.daily) refreshWeather().then(renderForecast);
  }
  function closeForecast() {
    $('forecastOverlay').classList.add('hidden'); $('forecastOverlay').setAttribute('aria-hidden', 'true');
    $('weatherDisplay').focus(); resetIdleTimer();
  }
  function scheduleWeather() {
    clearInterval(weatherTimer); refreshWeather();
    weatherTimer = setInterval(refreshWeather, Math.max(15, Number(settings.weatherInterval) || 30) * 60000);
  }
  function applyVisualSettings() {
    const root = document.documentElement;
    root.style.setProperty('--text-brightness', Math.max(.15, settings.textBrightness / 100));
    root.style.setProperty('--icon-brightness', Math.max(.15, settings.iconBrightness / 100));
    root.style.setProperty('--clock-brightness', Math.max(.15, settings.clockBrightness / 100));
    root.style.setProperty('--dock-glass-alpha', Math.max(.15, Math.min(.8, 1 - (settings.glassTransparency / 100))));
    root.style.setProperty('--dock-blur', Math.max(0, settings.dockBlur) + 'px');
    root.style.setProperty('--dock-gradient-alpha', Math.max(0, Math.min(1, Number(settings.glassGradient) / 100)) * .68);
    document.body.classList.toggle('glass-light', settings.glassTint === 'light');
    document.body.classList.toggle('pixel-shift', !!settings.pixelShift);
    document.body.classList.toggle('idle-dim', !!settings.idleDim);
    applyCustomCss(settings.customCss || '');
  }
  function applyCustomCss(css) {
    let style = $('userCustomCss');
    if (!style) { style = document.createElement('style'); style.id = 'userCustomCss'; document.head.appendChild(style); }
    style.textContent = String(css || '').slice(0, 12000);
  }
  function requestWebOSService(uri, method, parameters, onSuccess, onFailure) {
    if (!window.webOS || !webOS.service || typeof webOS.service.request !== 'function') {
      if (typeof onFailure === 'function') onFailure({ errorText: 'webOSTV.js is not available in this build.' });
      return null;
    }
    let request = null;
    request = webOS.service.request(uri, {
      method: method, parameters: parameters || {},
      onSuccess: function (response) { if (typeof onSuccess === 'function') onSuccess(response || {}); },
      onFailure: function (error) { if (typeof onFailure === 'function') onFailure(error || {}); },
      onComplete: function () { serviceRequests = serviceRequests.filter(item => item !== request); }
    });
    if (request) serviceRequests.push(request);
    return request;
  }
  function getCommandOutput(response) {
    if (response && typeof response.stdoutString === 'string') return response.stdoutString;
    if (response && response.stdoutBytes) {
      try { return atob(response.stdoutBytes); } catch (_) { return String(response.stdoutBytes); }
    }
    return '';
  }
  function parseCommandJson(output) {
    const text = String(output || '').trim();
    if (!text) throw new Error('The TV returned an empty response.');
    const first = text.indexOf('{'); const last = text.lastIndexOf('}');
    if (first < 0 || last <= first) throw new Error(text.slice(0, 260) || 'Could not read the TV response.');
    return JSON.parse(text.slice(first, last + 1));
  }
  function shellQuote(value) {
    return "'" + String(value).replace(/'/g, "'\\''") + "'";
  }
  function iconMime(path) {
    const value = String(path || '').toLowerCase().split('?')[0];
    if (value.endsWith('.jpg') || value.endsWith('.jpeg')) return 'image/jpeg';
    if (value.endsWith('.svg')) return 'image/svg+xml';
    if (value.endsWith('.webp')) return 'image/webp';
    if (value.endsWith('.gif')) return 'image/gif';
    return 'image/png';
  }
  function normalizeIconPath(item, value) {
    let path = String(value || '').trim();
    if (!path) return '';
    if (/^(https?:|data:image\/)/i.test(path)) return path;
    if (path.startsWith('file://')) path = path.slice(7);
    if (!path.startsWith('/')) {
      const folder = String(item.folderPath || item.appPath || '').replace(/\/$/, '');
      if (folder) path = folder + '/' + path;
    }
    return path;
  }
  function resolveInstalledIcon(item, callback) {
    const candidates = [item.largeIcon, item.icon, item.mediumLargeIcon, item.miniicon]
      .filter(value => typeof value === 'string' && value.trim());
    let position = 0;
    const tryNext = () => {
      if (position >= candidates.length) { callback(''); return; }
      const original = candidates[position++];
      const path = normalizeIconPath(item, original);
      if (!path) { tryNext(); return; }
      if (/^(https?:|data:image\/)/i.test(path)) { callback(path); return; }
      const command = 'if [ -r ' + shellQuote(path) + ' ]; then base64 ' + shellQuote(path) + " 2>/dev/null | tr -d '\r\n'; else exit 2; fi";
      requestWebOSService('luna://org.webosbrew.hbchannel.service', 'exec', { command: command }, function (response) {
        const encoded = getCommandOutput(response).replace(/\s+/g, '');
        if (encoded.length > 80 && /^[A-Za-z0-9+/=]+$/.test(encoded)) {
          callback('data:' + iconMime(path) + ';base64,' + encoded);
        } else tryNext();
      }, tryNext);
    };
    tryNext();
  }
  function hydrateAssignedIcons() {
    settings.apps.forEach((app, index) => {
      if (app.iconSrc || !app.appId) return;
      const item = installedApps.find(entry => entry.id === app.appId);
      if (!item) return;
      resolveInstalledIcon(item, function (iconSrc) {
        if (!iconSrc || !settings.apps[index] || settings.apps[index].appId !== item.id) return;
        settings.apps[index].iconSrc = iconSrc;
        settings.apps[index].iconColor = item.iconColor || item.bgColor || '';
        saveSettings(); renderApps();
        const preview = document.querySelector('.app-picker-preview[data-index="' + index + '"]');
        if (preview) renderAppIconPreview(preview, settings.apps[index]);
      });
    });
  }
  function loadInstalledApps() {
    $('installedAppsStatus').textContent = 'Reading the installed app list…';
    $('loadInstalledApps').disabled = true;
    const command = "luna-send -n 1 -f luna://com.webos.applicationManager/listLaunchPoints '{}' 2>/dev/null || luna-send -n 1 -f luna://com.webos.service.applicationmanager/listLaunchPoints '{}'";
    requestWebOSService('luna://org.webosbrew.hbchannel.service', 'exec', { command: command }, function (response) {
      $('loadInstalledApps').disabled = false;
      try {
        if (response.error) throw new Error(String(response.error));
        const payload = parseCommandJson(getCommandOutput(response));
        const entries = Array.isArray(payload.launchPoints) ? payload.launchPoints : (Array.isArray(payload.apps) ? payload.apps : []);
        const unique = new Map();
        entries.forEach(item => {
          const id = String(item.id || item.appId || item.appid || '').trim();
          if (!id || id === 'com.homecenter.launcher') return;
          if (!unique.has(id)) unique.set(id, {
            id: id,
            launchPointId: String(item.launchPointId || id),
            title: String(item.title || item.appName || item.name || id).trim(),
            icon: String(item.icon || ''),
            largeIcon: String(item.largeIcon || ''),
            mediumLargeIcon: String(item.mediumLargeIcon || ''),
            miniicon: String(item.miniicon || ''),
            folderPath: String(item.folderPath || item.appPath || ''),
            iconColor: String(item.iconColor || item.bgColor || '')
          });
        });
        installedApps = Array.from(unique.values()).sort((a,b) => a.title.localeCompare(b.title));
        if (!installedApps.length) throw new Error('No launchable apps were returned. Check Homebrew root access.');
        $('installedAppsStatus').textContent = installedApps.length + ' apps found on this TV. Select an app to load its original icon.';
        renderAppEditor();
        hydrateAssignedIcons();
        toast('Installed apps loaded. Choose an app for each shortcut.');
      } catch (error) {
        $('installedAppsStatus').textContent = 'Could not load installed apps.';
        toast('App list error: ' + (error.message || 'Unknown error'));
      }
    }, function (error) {
      $('loadInstalledApps').disabled = false;
      $('installedAppsStatus').textContent = 'Homebrew root service unavailable.';
      toast('Could not read installed apps. Open Homebrew Channel and verify root status.');
      console.warn('Homebrew app-list request failed:', error);
    });
  }
  function renderWallpaperGallery() {
    const gallery = $('wallpaperGallery');
    if (!gallery) return;
    const category = $('wallpaperCategory').value || 'nature';
    gallery.innerHTML = '';
    WALLPAPER_PRESETS.filter(item => item.category === category).forEach(item => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'wallpaper-card';
      card.dataset.wallpaperId = item.id;
      if (settings.wallpaperUrl === item.url) card.classList.add('selected');

      const image = document.createElement('img');
      image.src = item.preview || item.url;
      image.alt = item.title;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.referrerPolicy = 'no-referrer';
      image.addEventListener('error', () => {
        if (image.parentNode) {
          const fallback = document.createElement('span');
          fallback.className = 'wallpaper-preview-fallback';
          fallback.textContent = item.bundled ? 'PREVIEW UNAVAILABLE' : 'ONLINE PREVIEW UNAVAILABLE';
          image.replaceWith(fallback);
        }
      }, { once: true });

      const title = document.createElement('span');
      title.className = 'wallpaper-card-title';
      title.textContent = item.title;
      const meta = document.createElement('span');
      meta.className = 'wallpaper-card-meta';
      meta.textContent = item.resolution + ' · ' + item.source;
      card.append(image, title, meta);

      card.addEventListener('click', async () => {
        $('wallpaperGalleryStatus').textContent = 'Loading ' + item.title + '…';
        card.disabled = true;
        const applied = await applyWallpaperUrl(item.url);
        card.disabled = false;
        if (!applied) {
          $('wallpaperGalleryStatus').textContent = 'Could not load this image. Try a bundled wallpaper or use a direct image URL.';
          toast('Wallpaper unavailable: ' + item.title);
          return;
        }
        settings.wallpaperUrl = item.url;
        settings.personalWallpaperId = '';
        await deleteWallpaperBlob();
        $('wallpaperUrl').value = item.bundled ? '' : item.url;
        saveSettings();
        gallery.querySelectorAll('.wallpaper-card').forEach(node => node.classList.toggle('selected', node === card));
        $('wallpaperGalleryStatus').textContent = item.title + ' applied. ' + item.resolution + '.';
        toast('Wallpaper applied: ' + item.title);
      });
      gallery.appendChild(card);
    });
    $('wallpaperGalleryStatus').textContent = 'All included wallpapers work offline. Upload your own movie posters and images below.';
  }
  async function collectSlideshowItems() {
    const source = settings.wallpaperSlideshowSource || 'personal';
    const items = [];
    if (source === 'all' || source === 'bundled') {
      WALLPAPER_PRESETS.forEach(item => items.push({ key: 'url:' + item.url, type: 'url', title: item.title, url: item.url }));
    }
    if (source === 'all' || source === 'personal') {
      const records = await getPersonalWallpapers();
      records.forEach(record => items.push({ key: 'personal:' + record.id, type: 'personal', id: record.id, title: record.name }));
    }
    const seen = new Set();
    return items.filter(item => { if (seen.has(item.key)) return false; seen.add(item.key); return true; });
  }
  function startWallpaperSlideshow() {
    clearInterval(wallpaperSlideshowTimer);
    wallpaperSlideshowTimer = null;
    if (!settings.wallpaperSlideshowEnabled) {
      const status = $('wallpaperSlideshowStatus');
      if (status) status.textContent = 'Slideshow is off. Enable it to rotate through your selected wallpaper library.';
      return;
    }
    const interval = Math.max(1, Number(settings.wallpaperSlideshowInterval) || 10);
    const status = $('wallpaperSlideshowStatus');
    if (status) status.textContent = 'Slideshow is on · changes every ' + interval + ' minute(s).';
    const schedule = () => {
      if (!settings.wallpaperSlideshowEnabled || wallpaperSlideshowTimer) return;
      wallpaperSlideshowTimer = setInterval(() => advanceWallpaperSlideshow(), interval * 60000);
    };
    if (settings.wallpaperSlideshowSource === 'personal') {
      getPersonalWallpapers().then(records => {
        if (!settings.wallpaperSlideshowEnabled) return;
        if (records.length < 2) {
          if (status) status.textContent = 'Add at least two images to My Wallpaper Library to start the slideshow.';
          return;
        }
        schedule();
      }).catch(() => {
        if (status) status.textContent = 'The personal wallpaper library could not be read.';
      });
    } else {
      schedule();
    }
  }
  async function advanceWallpaperSlideshow() {
    if (wallpaperSlideshowBusy || !settings.wallpaperSlideshowEnabled) return;
    if (!$('settingsOverlay').classList.contains('hidden') || !$('forecastOverlay').classList.contains('hidden')) return;
    wallpaperSlideshowBusy = true;
    try {
      const items = await collectSlideshowItems();
      if (items.length < 2) {
        const status = $('wallpaperSlideshowStatus');
        if (status) status.textContent = 'Add at least two wallpapers to the selected source before slideshow can rotate.';
        return;
      }
      let currentKey = settings.personalWallpaperId ? 'personal:' + settings.personalWallpaperId : (settings.wallpaperUrl ? 'url:' + settings.wallpaperUrl : '');
      let currentIndex = items.findIndex(item => item.key === currentKey);
      let nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
      let attempts = 0;
      while (attempts < items.length) {
        const item = items[nextIndex];
        const applied = item.type === 'personal' ? await applyPersonalWallpaper(item.id, true) : await applyWallpaperUrl(item.url);
        if (applied) {
          if (item.type === 'url') {
            settings.wallpaperUrl = item.url;
            settings.personalWallpaperId = '';
            $('wallpaperUrl').value = /^https?:\/\//i.test(item.url) ? item.url : '';
            await deleteWallpaperBlob();
            saveSettings();
          }
          const status = $('wallpaperSlideshowStatus');
          if (status) status.textContent = 'Now showing: ' + item.title + ' · next change in ' + (Number(settings.wallpaperSlideshowInterval) || 10) + ' minute(s).';
          return;
        }
        nextIndex = (nextIndex + 1) % items.length;
        attempts += 1;
      }
      toast('Slideshow could not load any of the next wallpapers.');
    } catch (error) {
      console.warn('Wallpaper slideshow failed:', error);
      toast('Wallpaper slideshow error: ' + (error.message || 'unknown error'));
    } finally {
      wallpaperSlideshowBusy = false;
    }
  }
  function renderApps() {
    const row = $('appRow'); row.innerHTML = '';
    settings.apps = settings.apps.slice(0, 6);
    const count = Math.max(1, settings.apps.length);
    row.style.setProperty('--app-count', count);
    settings.apps.forEach((app, index) => {
      const button = document.createElement('button'); button.className = 'app-tile'; button.type = 'button'; button.dataset.index = String(index);
      const fallback = document.createElement('span'); fallback.className = 'app-symbol symbol-' + safeClass(app.kind); fallback.textContent = app.symbol === 'prime' ? '' : (app.symbol || '◇');
      if (app.kind === 'prime') fallback.innerHTML = 'prime<br><small>video</small>';
      if (app.iconColor && /^#[0-9a-f]{3,8}$/i.test(app.iconColor)) button.style.setProperty('--app-icon-bg', app.iconColor);
      if (app.iconSrc) {
        const image = document.createElement('img'); image.className = 'app-icon-image'; image.alt = (app.name || 'Application') + ' icon'; image.src = app.iconSrc;
        image.addEventListener('error', () => { image.remove(); if (!button.contains(fallback)) button.insertBefore(fallback, button.firstChild); });
        button.appendChild(image);
      } else button.appendChild(fallback);
      const label = document.createElement('span'); label.className = 'app-label'; label.textContent = app.name || ('Shortcut ' + (index + 1));
      button.appendChild(label); button.setAttribute('aria-label', 'Open ' + (app.name || ('Shortcut ' + (index + 1))));
      button.addEventListener('click', () => launchApp(index));
      button.addEventListener('focus', () => setFocus(index));
      button.addEventListener('pointerenter', () => focusTileFromPointer(button));
      button.addEventListener('mouseenter', () => focusTileFromPointer(button));
      row.appendChild(button);
    });
    setFocus(Math.min(currentFocus, settings.apps.length - 1));
  }
  function focusTileFromPointer(tile) {
    const index = Number(tile && tile.dataset ? tile.dataset.index : NaN);
    if (!Number.isInteger(index) || index < 0 || index >= tiles().length) return;
    setFocus(index);
    if (document.activeElement !== tile) {
      try { tile.focus({ preventScroll: true }); } catch (_) { tile.focus(); }
    }
  }
  function safeClass(value) { return String(value || 'custom').replace(/[^a-z0-9_-]/gi, '').slice(0, 20) || 'custom'; }
  function setFocus(index) {
    const maxIndex = Math.max(0, tiles().length - 1);
    currentFocus = Math.max(0, Math.min(maxIndex, index));
    tiles().forEach((tile, i) => { tile.classList.toggle('focused', i === currentFocus); });
  }
  function launchApp(index) {
    const app = settings.apps[index];
    if (!app || !String(app.appId || '').trim()) { toast('This shortcut has no app assigned. Open Settings → Shortcuts and select an installed app.'); return; }
    const appId = String(app.appId).trim();
    const payload = JSON.stringify({ id: appId, params: {} });
    const command = 'luna-send -n 1 -f luna://com.webos.applicationManager/launch ' + shellQuote(payload);
    // Use Homebrew's root command bridge first. It avoids application-launch
    // permission differences between webOS TV firmware builds.
    requestWebOSService('luna://org.webosbrew.hbchannel.service', 'exec', { command: command }, function (response) {
      try {
        if (response.error) throw new Error(String(response.error));
        const output = getCommandOutput(response);
        if (output.trim()) {
          const result = parseCommandJson(output);
          if (result.returnValue === false) throw new Error(result.errorText || result.errorCode || 'Application Manager rejected the app ID.');
        }
        toast('Opening ' + (app.name || appId) + '…');
      } catch (error) {
        launchAppDirect(appId, app.name, error);
      }
    }, function (error) { launchAppDirect(appId, app.name, error); });
  }
  function launchAppDirect(appId, appName, previousError) {
    if (window.webOS && webOS.service && typeof webOS.service.request === 'function') {
      requestWebOSService('luna://com.webos.applicationManager', 'launch', { id: appId, params: {} }, function (response) {
        if (response.returnValue === false) toast('Launch failed: ' + (response.errorText || 'Application Manager rejected the app ID.'));
        else toast('Opening ' + (appName || appId) + '…');
      }, function (error) {
        toast('Could not launch ' + (appName || appId) + ': ' + (error.errorText || error.message || (previousError && previousError.message) || 'webOS service error'));
        console.warn('Application launch failed:', error, previousError);
      });
      return;
    }
    if (typeof window.PalmServiceBridge === 'function') {
      const bridge = new window.PalmServiceBridge();
      bridge.onservicecallback = function (message) {
        try { const result = JSON.parse(message); if (result.returnValue === false) toast('Launch failed: ' + (result.errorText || 'webOS error')); }
        catch (_) { toast('Launch request sent.'); }
      };
      bridge.call('luna://com.webos.applicationManager/launch', JSON.stringify({ id: appId, params: {} }));
      return;
    }
    toast('Could not launch ' + (appName || appId) + '. Homebrew root service and webOS launch API are unavailable.');
  }
  function checkHomeChooser() {
    const status = $('homeChooserStatus');
    if (!status) return;
    status.textContent = 'Checking Home Chooser service…';
    requestWebOSService('luna://org.webosbrew.homechooser.service', 'getInfo', {}, function (info) {
      if (!info || info.returnValue === false) {
        status.textContent = 'Home Chooser is not ready. Install it from Homebrew Channel and open it once, then update Home Center.';
        return;
      }
      if (!info.root) {
        status.textContent = 'Home Chooser is installed but its root service is not initialized. Open Home Chooser once and complete its setup.';
      } else if (!info.permitted) {
        status.textContent = 'Home Chooser is running, but this installed Home Center copy does not have its launcher permission yet. Reinstall/update Home Center after opening Home Chooser.';
      } else if (info.isSelectedHome) {
        status.textContent = 'LG Home Center is selected for the remote HOME button.';
      } else {
        status.textContent = 'Home Chooser is ready. Open Home Chooser and select LG Home Center to assign the remote HOME button.';
      }
    }, function () {
      status.textContent = 'Home Chooser service not found. Install Home Chooser from Homebrew Channel, open it once, then check again.';
    });
  }
  function openHomeChooser() {
    const appId = 'org.webosbrew.homechooser';
    if (window.webOS && webOS.service && typeof webOS.service.request === 'function') {
      requestWebOSService('luna://com.webos.applicationManager', 'launch', { id: appId, params: {} }, function (response) {
        if (response.returnValue === false) toast('Could not open Home Chooser: ' + (response.errorText || 'launch rejected'));
        else toast('Opening Home Chooser…');
      }, function (error) {
        toast('Home Chooser could not be opened. Install it from Homebrew Channel first.');
        console.warn('Home Chooser launch failed:', error);
      });
    } else {
      toast('Home Chooser is only available on the LG TV.');
    }
  }

  function openSettings(tab) {
    closeScreensaver(); $('settingsOverlay').classList.remove('hidden'); $('settingsOverlay').setAttribute('aria-hidden', 'false');
    selectTab(tab || 'general'); renderAppEditor(); hydrateSettingsForm(); renderWallpaperGallery(); renderPersonalWallpaperGallery();
    const first = document.querySelector('.settings-tab.active'); if (first) first.focus();
    if ((tab || 'general') === 'home') checkHomeChooser();
  }
  function closeSettings() {
    closeAnyTvSelect();
    $('settingsOverlay').classList.add('hidden'); $('settingsOverlay').setAttribute('aria-hidden', 'true');
    if (tiles()[currentFocus]) tiles()[currentFocus].focus(); resetIdleTimer();
  }
  function selectTab(name) {
    closeAnyTvSelect();
    document.querySelectorAll('.settings-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.tab === name));
    document.querySelectorAll('.settings-page').forEach(page => page.classList.toggle('active', page.dataset.page === name));
    const title = document.querySelector('.settings-tab.active'); $('settingsTitle').textContent = title ? title.textContent : 'General';
    if ($('settingsContent')) $('settingsContent').scrollTop = 0;
  }
  function renderAppIconPreview(container, app) {
    container.innerHTML = '';
    if (app && app.iconSrc) {
      const image = document.createElement('img'); image.alt = (app.name || 'Application') + ' icon'; image.src = app.iconSrc;
      image.addEventListener('error', () => { container.textContent = (app.name || '?').slice(0, 1).toUpperCase(); });
      container.appendChild(image);
      if (app.iconColor && /^#[0-9a-f]{3,8}$/i.test(app.iconColor)) container.style.backgroundColor = app.iconColor;
    } else {
      container.textContent = app && app.name ? app.name.slice(0, 1).toUpperCase() : '◇';
      container.style.backgroundColor = app && app.iconColor && /^#[0-9a-f]{3,8}$/i.test(app.iconColor) ? app.iconColor : '';
    }
  }
  function renderAppEditor() {
    closeAnyTvSelect();
    const editor = $('appEditor'); editor.innerHTML = '';
    settings.apps.forEach((app, index) => {
      const row = document.createElement('div'); row.className = 'app-edit-row';
      const header = document.createElement('div'); header.className = 'app-edit-head';
      const label = document.createElement('label'); label.textContent = 'SHORTCUT ' + (index + 1);
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove-shortcut'; remove.textContent = '×'; remove.title = 'Remove shortcut'; remove.setAttribute('aria-label', 'Remove shortcut ' + (index + 1));
      const pickerLine = document.createElement('div'); pickerLine.className = 'app-picker-line';
      const preview = document.createElement('div'); preview.className = 'app-picker-preview'; preview.dataset.index = String(index); renderAppIconPreview(preview, app);
      const picker = document.createElement('select'); picker.className = 'installed-app-picker'; picker.setAttribute('aria-label', 'Select installed app for shortcut ' + (index + 1));
      const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = installedApps.length ? 'Choose an installed app…' : 'Load installed apps from TV first…'; picker.appendChild(placeholder);
      installedApps.forEach(item => { const option = document.createElement('option'); option.value = item.id; option.textContent = item.title; option.title = item.id; picker.appendChild(option); });
      if (app.appId && !installedApps.some(item => item.id === app.appId)) { const current = document.createElement('option'); current.value = app.appId; current.textContent = 'Current app · ' + app.appId; picker.appendChild(current); }
      picker.value = app.appId || '';
      const fields = document.createElement('div'); fields.className = 'app-edit-fields';
      const name = document.createElement('input'); name.type = 'text'; name.maxLength = 22; name.value = app.name || ''; name.placeholder = 'Tile label'; name.setAttribute('aria-label', 'Shortcut name ' + (index + 1));
      const id = document.createElement('input'); id.type = 'text'; id.maxLength = 120; id.value = app.appId || ''; id.placeholder = 'Or enter app ID manually'; id.setAttribute('aria-label', 'App ID ' + (index + 1));
      picker.addEventListener('change', () => {
        const selected = installedApps.find(item => item.id === picker.value);
        const current = settings.apps[index];
        current.appId = picker.value;
        current.iconSrc = '';
        current.iconColor = selected ? selected.iconColor : '';
        if (selected) {
          current.name = selected.title.slice(0,22); name.value = current.name; id.value = selected.id;
          current.launchPointId = selected.launchPointId || selected.id;
          renderAppIconPreview(preview, current);
          resolveInstalledIcon(selected, function (iconSrc) {
            if (!settings.apps[index] || settings.apps[index].appId !== selected.id) return;
            if (iconSrc) {
              selected.iconSrc = iconSrc;
              settings.apps[index].iconSrc = iconSrc;
              settings.apps[index].iconColor = selected.iconColor || '';
              renderAppIconPreview(preview, settings.apps[index]);
              renderApps();
            } else {
              toast('The app was assigned, but its icon could not be read from the TV.');
            }
            saveSettings();
          });
        } else {
          current.name = name.value.trim() || ('Shortcut ' + (index + 1));
          current.launchPointId = '';
          renderAppIconPreview(preview, current);
        }
        saveSettings(); renderApps();
        toast(selected ? selected.title + ' assigned to shortcut.' : 'Shortcut app cleared.');
      });
      name.addEventListener('change', () => { settings.apps[index].name = name.value.trim() || ('Shortcut ' + (index + 1)); saveSettings(); renderApps(); renderAppIconPreview(preview, settings.apps[index]); });
      id.addEventListener('change', () => {
        settings.apps[index].appId = id.value.trim();
        const selected = installedApps.find(item => item.id === settings.apps[index].appId);
        if (selected) {
          settings.apps[index].name = selected.title.slice(0,22); name.value = settings.apps[index].name;
          resolveInstalledIcon(selected, iconSrc => { if (iconSrc && settings.apps[index] && settings.apps[index].appId === selected.id) { settings.apps[index].iconSrc = iconSrc; renderAppIconPreview(preview, settings.apps[index]); renderApps(); saveSettings(); } });
        }
        picker.value = settings.apps[index].appId; saveSettings(); renderApps();
      });
      remove.addEventListener('click', () => {
        if (settings.apps.length <= 1) { toast('At least one shortcut must remain in the dock.'); return; }
        settings.apps.splice(index, 1); currentFocus = Math.min(currentFocus, settings.apps.length - 1);
        saveSettings(); renderAppEditor(); renderApps(); updateShortcutCount(); toast('Shortcut removed.');
      });
      header.append(label, remove); pickerLine.append(preview, picker); fields.append(name, id); row.append(header, pickerLine, fields); editor.appendChild(row);
      enhanceTvSelect(picker);
    });
    updateShortcutCount();
  }
  function updateShortcutCount() {
    $('shortcutCount').textContent = settings.apps.length + ' of 6 shortcuts';
    $('addShortcut').disabled = settings.apps.length >= 6;
  }
  function addShortcut() {
    if (settings.apps.length >= 6) { toast('The dock supports up to 6 shortcuts.'); return; }
    settings.apps.push({ name: 'New Shortcut', appId: '', symbol: '◇', kind: 'custom' });
    currentFocus = settings.apps.length - 1; saveSettings(); renderAppEditor(); renderApps();
    const nameInputs = $('appEditor').querySelectorAll('input[type="text"]');
    if (nameInputs.length) nameInputs[nameInputs.length - 2].focus();
    toast('New shortcut added. Enter its name and webOS app ID.');
  }
  function hydrateSettingsForm() {
    $('weatherCityInput').value = settings.city || 'Bucharest'; $('weatherInterval').value = String(settings.weatherInterval || 30);
    $('wallpaperUrl').value = settings.wallpaperUrl || '';
    $('wallpaperSlideshowEnabled').checked = !!settings.wallpaperSlideshowEnabled;
    $('wallpaperSlideshowInterval').value = String(settings.wallpaperSlideshowInterval || 10);
    $('wallpaperSlideshowSource').value = settings.wallpaperSlideshowSource || 'personal';
    document.querySelectorAll('select').forEach(syncTvSelect);
    ['textBrightness','iconBrightness','clockBrightness','glassTransparency','dockBlur','glassGradient'].forEach(id => {
      $(id).value = settings[id]; const suffix = id === 'dockBlur' ? 'px' : '%'; $(id + 'Value').textContent = settings[id] + suffix;
    });
    $('glassTint').value = settings.glassTint || 'dark';
    ['pixelShift','idleDim','screensaverEnabled','scheduledPowerOffEnabled'].forEach(id => $(id).checked = !!settings[id]);
    $('screensaverDelay').value = String(settings.screensaverDelay); $('screensaverMode').value = settings.screensaverMode;
    $('autoStandby').value = settings.autoStandby; $('scheduledPowerOff').value = settings.scheduledPowerOff;
    $('customCss').value = settings.customCss || '';
    document.querySelectorAll('select').forEach(syncTvSelect);
  }
  function bindSettings() {
    document.querySelectorAll('.settings-tab').forEach(tab => tab.addEventListener('click', () => { selectTab(tab.dataset.tab); if (tab.dataset.tab === 'home') checkHomeChooser(); }));
    $('settingsButton').addEventListener('click', () => openSettings('general'));
    $('addShortcut').addEventListener('click', addShortcut);
    $('loadInstalledApps').addEventListener('click', loadInstalledApps);
    $('checkHomeChooser').addEventListener('click', checkHomeChooser);
    $('openHomeChooser').addEventListener('click', openHomeChooser);
    $('wallpaperCategory').addEventListener('change', renderWallpaperGallery);
    $('closeSettings').addEventListener('click', closeSettings); $('doneSettings').addEventListener('click', closeSettings);
    $('weatherCityInput').addEventListener('change', () => { settings.city = $('weatherCityInput').value.trim() || 'Bucharest'; saveSettings(); scheduleWeather(); });
    $('weatherInterval').addEventListener('change', () => { settings.weatherInterval = Number($('weatherInterval').value); saveSettings(); scheduleWeather(); });
    ['textBrightness','iconBrightness','clockBrightness','glassTransparency','dockBlur','glassGradient'].forEach(id => $(id).addEventListener('input', () => {
      settings[id] = Number($(id).value); const suffix = id === 'dockBlur' ? 'px' : '%'; $(id + 'Value').textContent = settings[id] + suffix; applyVisualSettings(); saveSettings();
    }));
    ['pixelShift','idleDim','screensaverEnabled','scheduledPowerOffEnabled'].forEach(id => $(id).addEventListener('change', () => { settings[id] = $(id).checked; applyVisualSettings(); saveSettings(); resetIdleTimer(); }));
    ['screensaverDelay','screensaverMode','autoStandby','scheduledPowerOff'].forEach(id => $(id).addEventListener('change', () => { settings[id] = $(id).value; saveSettings(); resetIdleTimer(); }));
    $('glassTint').addEventListener('change', () => { settings.glassTint = $('glassTint').value === 'light' ? 'light' : 'dark'; applyVisualSettings(); saveSettings(); toast(settings.glassTint === 'light' ? 'Frosted white glass enabled.' : 'Smoked black glass enabled.'); });
    $('applyCustomCss').addEventListener('click', () => { settings.customCss = $('customCss').value; applyCustomCss(settings.customCss); saveSettings(); toast('Custom CSS applied.'); });
    $('applyWallpaperUrl').addEventListener('click', async () => {
      const url = $('wallpaperUrl').value.trim();
      if (!url || !/^https?:\/\//i.test(url)) { toast('Enter a direct HTTPS or HTTP image URL.'); return; }
      $('applyWallpaperUrl').disabled = true;
      const applied = await applyWallpaperUrl(url);
      $('applyWallpaperUrl').disabled = false;
      if (!applied) { toast('Image could not be loaded. Use a direct .jpg, .png or .webp image URL.'); return; }
      settings.wallpaperUrl = url;
      settings.personalWallpaperId = '';
      await deleteWallpaperBlob();
      saveSettings();
      toast('Wallpaper updated.');
    });
    $('wallpaperFile').addEventListener('change', handleWallpaperFiles);
    const wallpaperUploadLabel = document.querySelector('label[for="wallpaperFile"]');
    if (wallpaperUploadLabel) wallpaperUploadLabel.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); $('wallpaperFile').click(); }
    });
    $('refreshPersonalWallpapers').addEventListener('click', refreshPersonalWallpaperLibrary);
    $('clearPersonalWallpapers').addEventListener('click', clearPersonalWallpaperLibraryWithConfirm);
    $('wallpaperSlideshowEnabled').addEventListener('change', () => { settings.wallpaperSlideshowEnabled = $('wallpaperSlideshowEnabled').checked; saveSettings(); startWallpaperSlideshow(); });
    $('wallpaperSlideshowInterval').addEventListener('change', () => { settings.wallpaperSlideshowInterval = Number($('wallpaperSlideshowInterval').value) || 10; saveSettings(); startWallpaperSlideshow(); });
    $('wallpaperSlideshowSource').addEventListener('change', () => { settings.wallpaperSlideshowSource = $('wallpaperSlideshowSource').value || 'all'; saveSettings(); startWallpaperSlideshow(); });
    $('clearWallpaper').addEventListener('click', async () => {
      await deleteWallpaperBlob();
      settings.wallpaperUrl = DEFAULT_WALLPAPER;
      settings.personalWallpaperId = '';
      $('wallpaperUrl').value = '';
      renderPersonalWallpaperGallery();
      const applied = await applyWallpaperUrl(DEFAULT_WALLPAPER);
      saveSettings();
      toast(applied ? 'Default bundled wallpaper restored.' : 'Could not load the bundled wallpaper.');
    });
    $('exportSettings').addEventListener('click', exportSettings);
    $('importSettingsFile').addEventListener('change', importSettings);
  }
  function applyWallpaperUrl(url) {
    const home = $('home');
    const imageElement = $('wallpaperImage');
    const screensaverBg = document.querySelector('.screensaver-bg');
    const requestedUrl = String(url || '').trim();

    if (!requestedUrl) {
      home.classList.remove('has-wallpaper');
      imageElement.removeAttribute('src');
      if (screensaverBg) screensaverBg.style.removeProperty('background-image');
      if (wallpaperObjectUrl) { URL.revokeObjectURL(wallpaperObjectUrl); wallpaperObjectUrl = null; }
      return Promise.resolve(true);
    }

    return new Promise(resolve => {
      const candidate = new Image();
      let settled = false;
      const loadTimeout = setTimeout(() => finish(false), 18000);
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        clearTimeout(loadTimeout);
        if (ok) {
          const previousObjectUrl = wallpaperObjectUrl;
          imageElement.src = requestedUrl;
          home.classList.add('has-wallpaper');
          if (screensaverBg) screensaverBg.style.backgroundImage = 'url(' + JSON.stringify(requestedUrl) + ')';
          wallpaperObjectUrl = requestedUrl.indexOf('blob:') === 0 ? requestedUrl : null;
          if (previousObjectUrl && previousObjectUrl !== wallpaperObjectUrl) URL.revokeObjectURL(previousObjectUrl);
        }
        resolve(ok);
      };
      candidate.onload = () => finish(candidate.naturalWidth > 0 && candidate.naturalHeight > 0);
      candidate.onerror = () => finish(false);
      candidate.src = requestedUrl;
      if (candidate.complete && candidate.naturalWidth > 0) finish(true);
    });
  }
  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('IndexedDB unavailable'));
      const request = indexedDB.open('HomeCenterDB', 2);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('wallpaper')) db.createObjectStore('wallpaper');
        if (!db.objectStoreNames.contains('userWallpapers')) db.createObjectStore('userWallpapers', { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    return dbPromise;
  }
  async function saveWallpaperBlob(blob) {
    const db = await openDb(); return new Promise((resolve, reject) => { const tx = db.transaction('wallpaper', 'readwrite'); tx.objectStore('wallpaper').put(blob, 'current'); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
  }
  async function getWallpaperBlob() {
    const db = await openDb(); return new Promise((resolve, reject) => { const request = db.transaction('wallpaper', 'readonly').objectStore('wallpaper').get('current'); request.onsuccess = () => resolve(request.result || null); request.onerror = () => reject(request.error); });
  }
  async function deleteWallpaperBlob() {
    try { const db = await openDb(); return new Promise(resolve => { const tx = db.transaction('wallpaper', 'readwrite'); tx.objectStore('wallpaper').delete('current'); tx.oncomplete = resolve; tx.onerror = resolve; }); } catch (_) { /* no-op */ }
  }
  function createId() {
    return 'wallpaper-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
  }
  async function savePersonalWallpaper(file, dimensions) {
    const db = await openDb();
    const record = { id: createId(), name: String(file.name || 'Custom wallpaper').slice(0, 90), blob: file, type: file.type || 'image/jpeg', size: file.size, width: dimensions && dimensions.width || 0, height: dimensions && dimensions.height || 0, createdAt: Date.now() };
    return new Promise((resolve, reject) => {
      const tx = db.transaction('userWallpapers', 'readwrite');
      tx.objectStore('userWallpapers').put(record);
      tx.oncomplete = () => resolve(record.id);
      tx.onerror = () => reject(tx.error || new Error('Could not store image'));
      tx.onabort = () => reject(tx.error || new Error('Image storage was aborted'));
    });
  }
  async function getPersonalWallpapers() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction('userWallpapers', 'readonly').objectStore('userWallpapers').getAll();
      request.onsuccess = () => resolve((request.result || []).sort((a, b) => b.createdAt - a.createdAt));
      request.onerror = () => reject(request.error || new Error('Could not read personal wallpapers'));
    });
  }
  async function getPersonalWallpaper(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction('userWallpapers', 'readonly').objectStore('userWallpapers').get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('Could not read wallpaper'));
    });
  }
  async function deletePersonalWallpaper(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('userWallpapers', 'readwrite');
      tx.objectStore('userWallpapers').delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('Could not delete wallpaper'));
    });
  }
  async function applyPersonalWallpaper(id, quiet) {
    try {
      const record = await getPersonalWallpaper(id);
      if (!record || !record.blob) throw new Error('The saved image could not be found.');
      const objectUrl = URL.createObjectURL(record.blob);
      const applied = await applyWallpaperUrl(objectUrl);
      if (!applied) {
        if (wallpaperObjectUrl !== objectUrl) URL.revokeObjectURL(objectUrl);
        throw new Error('The TV could not decode this image.');
      }
      settings.personalWallpaperId = id;
      settings.wallpaperUrl = '';
      $('wallpaperUrl').value = '';
      saveSettings();
      if (!quiet) toast('Wallpaper applied: ' + record.name);
      return true;
    } catch (error) {
      toast(error.message || 'Could not apply personal wallpaper.');
      return false;
    }
  }
  let personalPreviewUrls = [];
  async function renderPersonalWallpaperGallery() {
    const gallery = $('personalWallpaperGallery');
    if (!gallery) return;
    personalPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    personalPreviewUrls = [];
    gallery.innerHTML = '';
    try {
      const records = await getPersonalWallpapers();
      $('personalWallpaperCount').textContent = records.length + (records.length === 1 ? ' image' : ' images');
      if (!records.length) {
        const empty = document.createElement('div');
        empty.className = 'wallpaper-empty';
        empty.textContent = 'Your library is empty. Select Add images to import movie posters, film stills or 4K photos.';
        gallery.appendChild(empty);
        $('personalWallpaperStatus').textContent = 'Your images are stored locally on this TV.';
        return;
      }
      records.forEach(record => {
        const card = document.createElement('div');
        card.className = 'personal-wallpaper-card' + (settings.personalWallpaperId === record.id ? ' selected' : '');
        const select = document.createElement('button');
        select.type = 'button';
        select.className = 'personal-wallpaper-select';
        select.setAttribute('aria-label', 'Apply wallpaper ' + record.name);
        const image = document.createElement('img');
        const objectUrl = URL.createObjectURL(record.blob);
        personalPreviewUrls.push(objectUrl);
        image.src = objectUrl;
        image.alt = record.name;
        const title = document.createElement('span');
        title.textContent = record.name;
        const dimensions = document.createElement('small');
        const width = Number(record.width) || 0;
        const height = Number(record.height) || 0;
        const sizeMb = (Number(record.size) || 0) / (1024 * 1024);
        dimensions.className = 'wallpaper-image-meta';
        dimensions.textContent = (width && height ? width + ' × ' + height + ' · ' : '') + sizeMb.toFixed(1) + ' MB';
        if (settings.personalWallpaperId === record.id) {
          const active = document.createElement('small');
          active.className = 'wallpaper-current-badge';
          active.textContent = 'CURRENT WALLPAPER';
          select.append(image, title, dimensions, active);
        } else {
          select.append(image, title, dimensions);
        }
        select.addEventListener('click', async () => {
          const applied = await applyPersonalWallpaper(record.id);
          if (applied) {
            gallery.querySelectorAll('.personal-wallpaper-card').forEach(item => item.classList.toggle('selected', item === card));
            $('personalWallpaperStatus').textContent = record.name + ' is now your wallpaper.';
          }
        });
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'small-action personal-wallpaper-delete';
        remove.textContent = 'Remove';
        remove.setAttribute('aria-label', 'Remove ' + record.name);
        remove.addEventListener('click', async () => {
          try {
            await deletePersonalWallpaper(record.id);
            if (settings.personalWallpaperId === record.id) {
              settings.personalWallpaperId = '';
              settings.wallpaperUrl = DEFAULT_WALLPAPER;
              await applyWallpaperUrl(DEFAULT_WALLPAPER);
              saveSettings();
            }
            renderPersonalWallpaperGallery();
            toast('Personal wallpaper removed.');
          } catch (error) { toast('Could not remove wallpaper: ' + (error.message || 'storage error')); }
        });
        card.append(select, remove);
        gallery.appendChild(card);
      });
      $('personalWallpaperStatus').textContent = 'Select a thumbnail to apply it. Your images stay in this TV app storage while its app data is retained.';
    } catch (error) {
      $('personalWallpaperStatus').textContent = 'Personal wallpaper storage is unavailable on this firmware.';
      console.warn('Personal wallpaper gallery failed:', error);
    }
  }
  function getImageInfo(file) {
    return new Promise((resolve, reject) => {
      const testUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        const info = { width: image.naturalWidth || 0, height: image.naturalHeight || 0 };
        URL.revokeObjectURL(testUrl);
        if (!info.width || !info.height) reject(new Error('The image could not be decoded by this TV.'));
        else resolve(info);
      };
      image.onerror = () => { URL.revokeObjectURL(testUrl); reject(new Error('The TV cannot decode this image format.')); };
      image.src = testUrl;
    });
  }
  async function clearPersonalWallpaperLibrary() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('userWallpapers', 'readwrite');
      tx.objectStore('userWallpapers').clear();
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('Could not clear wallpaper library'));
      tx.onabort = () => reject(tx.error || new Error('Wallpaper library clear was aborted'));
    });
  }
  async function requestPersistentStorage() {
    try {
      if (navigator.storage && typeof navigator.storage.persist === 'function') {
        await navigator.storage.persist();
      }
    } catch (_) { /* Persistent storage is optional on older webOS builds. */ }
  }
  async function handleWallpaperFiles(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const before = await getPersonalWallpapers().catch(() => []);
    const hadSlideshowLibrary = before.length >= 2;
    const added = [];
    const skipped = [];
    await requestPersistentStorage();
    for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
      const file = files[fileIndex];
      $('personalWallpaperStatus').textContent = 'Importing image ' + (fileIndex + 1) + ' of ' + files.length + ': ' + file.name;
      const extension = String(file.name || '').split('.').pop().toLowerCase();
      const supportedExtension = ['jpg','jpeg','png','webp','gif','bmp','avif'].includes(extension);
      const imageType = String(file.type || '').toLowerCase().startsWith('image/');
      if (!imageType && !supportedExtension) {
        skipped.push(file.name + ': unsupported file type');
        continue;
      }
      if (file.size <= 0 || file.size > 30 * 1024 * 1024) {
        skipped.push(file.name + ': file must be smaller than 30 MB');
        continue;
      }
      try {
        const dimensions = await getImageInfo(file);
        const id = await savePersonalWallpaper(file, dimensions);
        added.push(id);
      } catch (error) {
        skipped.push(file.name + ': ' + (error.message || 'storage error'));
        console.warn('Wallpaper import failed:', file.name, error);
      }
    }
    event.target.value = '';
    const records = await getPersonalWallpapers().catch(() => []);
    await renderPersonalWallpaperGallery();
    if (added.length) {
      await applyPersonalWallpaper(added[0], true);
      $('personalWallpaperStatus').textContent = added.length + ' image(s) imported. ' + records.length + ' image(s) in your local library.';
      if (!hadSlideshowLibrary && records.length >= 2 && settings.wallpaperSlideshowSource !== 'bundled') {
        settings.wallpaperSlideshowEnabled = true;
        $('wallpaperSlideshowEnabled').checked = true;
      }
      saveSettings();
      startWallpaperSlideshow();
      toast(added.length + ' wallpaper(s) added to My Wallpaper Library.' + (settings.wallpaperSlideshowEnabled ? ' Slideshow is enabled.' : ''));
    }
    if (skipped.length) {
      $('personalWallpaperStatus').textContent += ' Skipped: ' + skipped.slice(0, 3).join(' · ') + (skipped.length > 3 ? ' · and ' + (skipped.length - 3) + ' more.' : '.');
      if (!added.length) toast('No images were imported. Check supported formats and available storage.');
    }
  }
  async function refreshPersonalWallpaperLibrary() {
    await renderPersonalWallpaperGallery();
    const records = await getPersonalWallpapers().catch(() => []);
    $('personalWallpaperStatus').textContent = records.length
      ? records.length + ' image(s) stored locally on this TV.'
      : 'Your personal wallpaper library is empty. Select Add images to import posters or photos.';
  }
  async function clearPersonalWallpaperLibraryWithConfirm() {
    const records = await getPersonalWallpapers();
    if (!records.length) { toast('Your wallpaper library is already empty.'); return; }
    const accepted = window.confirm('Delete all ' + records.length + ' personal wallpapers from this TV? This cannot be undone.');
    if (!accepted) return;
    await clearPersonalWallpaperLibrary();
    personalPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    personalPreviewUrls = [];
    if (settings.personalWallpaperId) {
      settings.personalWallpaperId = '';
      settings.wallpaperUrl = DEFAULT_WALLPAPER;
      await applyWallpaperUrl(DEFAULT_WALLPAPER);
    }
    if (settings.wallpaperSlideshowSource === 'personal') {
      settings.wallpaperSlideshowEnabled = false;
      $('wallpaperSlideshowEnabled').checked = false;
    }
    saveSettings();
    await renderPersonalWallpaperGallery();
    startWallpaperSlideshow();
    $('personalWallpaperStatus').textContent = 'All personal wallpapers have been removed from this TV.';
    toast('Personal wallpaper library cleared.');
  }
  async function restorePersonalWallpaper() {
    if (!settings.personalWallpaperId) return false;
    return applyPersonalWallpaper(settings.personalWallpaperId);
  }

  function exportSettings() {
    const data = JSON.stringify(settings, null, 2); const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'homecenter-settings.json'; anchor.click(); URL.revokeObjectURL(url); toast('Settings exported.');
  }
  function importSettings(event) {
    const file = event.target.files && event.target.files[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result));
        settings = Object.assign(clone(DEFAULTS), imported);
        delete settings.cloudWallpaperFeedUrl;
        if (settings.wallpaperSlideshowSource === 'cloud') settings.wallpaperSlideshowSource = 'personal';
        if (!Number.isFinite(Number(imported.glassTransparency))) settings.glassTransparency = DEFAULTS.glassTransparency;
        delete settings.dockOpacity;
        if (!Array.isArray(settings.apps)) settings.apps = clone(DEFAULTS.apps);
        settings.apps = settings.apps.slice(0, 6);
        if (settings.apps.length && /^Shortcut 6$/i.test(String(settings.apps[settings.apps.length - 1].name || '')) && !settings.apps[settings.apps.length - 1].appId && settings.apps[settings.apps.length - 1].kind === 'custom') settings.apps.pop();
        if (!settings.apps.length) settings.apps = clone(DEFAULTS.apps);
        saveSettings(); applyVisualSettings(); renderApps(); renderAppEditor(); hydrateSettingsForm(); scheduleWeather();
        if (settings.personalWallpaperId) restorePersonalWallpaper();
        else if (settings.wallpaperUrl) applyWallpaperUrl(settings.wallpaperUrl);
        else showStoredWallpaper();
        renderWallpaperGallery(); renderPersonalWallpaperGallery();
        startWallpaperSlideshow();
        toast('Settings imported.');
      }
      catch (_) { toast('Invalid JSON file.'); }
    }; reader.readAsText(file); event.target.value = '';
  }
  function showScreensaver() {
    if (!settings.screensaverEnabled || !$('settingsOverlay').classList.contains('hidden') || !$('forecastOverlay').classList.contains('hidden')) return;
    $('screensaver').classList.toggle('mode-wallpaper', settings.screensaverMode === 'wallpaper');
    $('screensaver').classList.remove('hidden'); $('screensaver').setAttribute('aria-hidden', 'false'); updateClock();
  }
  function closeScreensaver() {
    $('screensaver').classList.add('hidden'); $('screensaver').setAttribute('aria-hidden', 'true'); resetIdleTimer();
  }
  function resetIdleTimer() {
    clearTimeout(idleTimer); clearTimeout(dimTimer); document.body.classList.remove('idle-dim');
    if (!$('settingsOverlay').classList.contains('hidden') || !$('forecastOverlay').classList.contains('hidden')) return;
    if (settings.idleDim) dimTimer = setTimeout(() => document.body.classList.add('idle-dim'), 30000);
    if (!settings.screensaverEnabled) return;
    const delay = Math.max(1, Number(settings.screensaverDelay) || 5) * 60000;
    idleTimer = setTimeout(showScreensaver, delay);
  }
  const tvSelectRegistry = new WeakMap();
  let openTvSelectElement = null;
  let tvSelectSequence = 0;

  function syncTvSelect(select) {
    const record = tvSelectRegistry.get(select);
    if (!record) return;
    const option = select.options[select.selectedIndex];
    record.trigger.textContent = option ? option.textContent : 'Select…';
    record.trigger.title = option ? option.textContent : '';
    record.menu.querySelectorAll('.tv-select-option').forEach((button, index) => {
      const selected = index === select.selectedIndex;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
  }

  function closeTvSelect(select, restoreFocus) {
    const target = select || openTvSelectElement;
    if (!target) return;
    const record = tvSelectRegistry.get(target);
    if (!record) return;
    record.menu.classList.add('hidden');
    record.trigger.setAttribute('aria-expanded', 'false');
    if (openTvSelectElement === target) openTvSelectElement = null;
    if (restoreFocus) focusAndReveal(record.trigger);
  }

  function closeAnyTvSelect() {
    if (openTvSelectElement) closeTvSelect(openTvSelectElement, false);
  }

  function chooseTvSelectOption(select, index) {
    const record = tvSelectRegistry.get(select);
    if (!record || !select.options[index] || select.options[index].disabled) return;
    select.selectedIndex = index;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    syncTvSelect(select);
    closeTvSelect(select, true);
  }

  function openTvSelect(select) {
    const record = tvSelectRegistry.get(select);
    if (!record) return;
    if (openTvSelectElement && openTvSelectElement !== select) closeAnyTvSelect();
    record.menu.classList.remove('hidden');
    record.trigger.setAttribute('aria-expanded', 'true');
    openTvSelectElement = select;

    const rect = record.trigger.getBoundingClientRect();
    const maxHeight = Math.min(470, Math.floor(window.innerHeight * 0.44));
    const below = Math.max(0, window.innerHeight - rect.bottom - 18);
    const placeAbove = below < Math.min(190, maxHeight) && rect.top > below;
    const height = Math.min(maxHeight, placeAbove ? Math.max(160, rect.top - 18) : Math.max(160, below));
    const top = placeAbove ? Math.max(10, rect.top - height - 6) : Math.min(window.innerHeight - height - 10, rect.bottom + 6);
    record.menu.style.position = 'fixed';
    record.menu.style.left = Math.max(10, Math.min(rect.left, window.innerWidth - rect.width - 10)) + 'px';
    record.menu.style.top = top + 'px';
    record.menu.style.width = Math.min(rect.width, window.innerWidth - 20) + 'px';
    record.menu.style.maxHeight = height + 'px';

    const options = Array.from(record.menu.querySelectorAll('.tv-select-option'));
    const selected = options[select.selectedIndex] || options.find(option => !option.disabled);
    if (selected) focusAndReveal(selected);
  }

  function refreshTvSelectOptions(select) {
    const record = tvSelectRegistry.get(select);
    if (!record) return;
    record.menu.innerHTML = '';
    Array.from(select.options).forEach((option, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tv-select-option';
      button.textContent = option.textContent;
      button.disabled = !!option.disabled;
      button.dataset.optionIndex = String(index);
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', index === select.selectedIndex ? 'true' : 'false');
      button.addEventListener('click', () => chooseTvSelectOption(select, index));
      record.menu.appendChild(button);
    });
    syncTvSelect(select);
  }

  function enhanceTvSelect(select) {
    if (!select || tvSelectRegistry.has(select) || !select.parentNode) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'tv-select-wrap';
    wrapper.dataset.selectId = String(++tvSelectSequence);
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);
    select.classList.add('tv-native-select');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'tv-select-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', select.getAttribute('aria-label') || select.id || 'Choose an option');

    const menu = document.createElement('div');
    menu.className = 'tv-select-menu hidden';
    menu.id = 'tv-select-menu-' + tvSelectSequence;
    menu.setAttribute('role', 'listbox');
    trigger.setAttribute('aria-controls', menu.id);

    wrapper.append(trigger, menu);
    tvSelectRegistry.set(select, { wrapper, trigger, menu });
    trigger.addEventListener('click', () => {
      if (openTvSelectElement === select) closeTvSelect(select, false);
      else openTvSelect(select);
    });
    select.addEventListener('change', () => syncTvSelect(select));
    refreshTvSelectOptions(select);
  }

  function enhanceAllTvSelects(scope) {
    (scope || document).querySelectorAll('select').forEach(enhanceTvSelect);
  }

  function moveFocusFromTvSelectMenu(direction, page) {
    const select = openTvSelectElement;
    if (!select) return false;
    const record = tvSelectRegistry.get(select);
    const moved = focusSequential(direction, page);
    const active = document.activeElement;
    if (!record || !record.menu.contains(active)) closeTvSelect(select, false);
    return moved;
  }

  function visibleFocusable(scope) {
    const selector = 'button:not(:disabled), select:not(:disabled):not(.tv-native-select), input:not(:disabled):not([type="hidden"]), textarea:not(:disabled), .file-button[tabindex="0"], [tabindex="0"]';
    return Array.from(scope.querySelectorAll(selector)).filter(element => {
      if (element.closest('.hidden')) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== 'hidden';
    });
  }
  function focusAndReveal(element) {
    if (!element) return false;
    try { element.focus({ preventScroll: true }); } catch (_) { element.focus(); }
    const content = $('settingsContent');
    const selectMenu = element.closest ? element.closest('.tv-select-menu:not(.hidden)') : null;
    if (selectMenu) {
      const er = element.getBoundingClientRect();
      const mr = selectMenu.getBoundingClientRect();
      const margin = 12;
      if (er.top < mr.top + margin) selectMenu.scrollTop -= (mr.top + margin - er.top);
      else if (er.bottom > mr.bottom - margin) selectMenu.scrollTop += (er.bottom - (mr.bottom - margin));
    } else if (content && content.contains(element)) {
      const er = element.getBoundingClientRect();
      const cr = content.getBoundingClientRect();
      const margin = 32;
      if (er.top < cr.top + margin) content.scrollTop = Math.max(0, content.scrollTop - (cr.top + margin - er.top));
      else if (er.bottom > cr.bottom - margin) content.scrollTop += (er.bottom - (cr.bottom - margin));
    } else if (element.scrollIntoView) {
      try { element.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (_) { /* older webOS */ }
    }
    return true;
  }
  function focusSequential(direction, scope) {
    const candidates = visibleFocusable(scope);
    if (!candidates.length) return false;
    const active = document.activeElement;
    let index = candidates.indexOf(active);
    if (index < 0) index = direction === 'up' ? candidates.length : -1;
    const nextIndex = index + (direction === 'down' ? 1 : -1);
    if (nextIndex < 0 || nextIndex >= candidates.length) return false;
    return focusAndReveal(candidates[nextIndex]);
  }
  function moveFocusSpatial(direction, scope) {
    const candidates = visibleFocusable(scope);
    if (!candidates.length) return false;
    const active = document.activeElement;
    if (!active || !candidates.includes(active)) return focusAndReveal(candidates[0]);
    const a = active.getBoundingClientRect();
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best = null, bestScore = Infinity;
    candidates.forEach(candidate => {
      if (candidate === active) return;
      const r = candidate.getBoundingClientRect();
      const dx = r.left + r.width / 2 - ax;
      const dy = r.top + r.height / 2 - ay;
      const primary = direction === 'left' ? -dx : direction === 'right' ? dx : direction === 'up' ? -dy : dy;
      const secondary = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx);
      if (primary <= 2) return;
      const score = primary + secondary * 1.7 + (secondary > primary * 1.6 ? primary * 2 : 0);
      if (score < bestScore) { bestScore = score; best = candidate; }
    });
    if (!best) return false;
    return focusAndReveal(best);
  }
  function isEditableTarget(target) {
    if (!target) return false;
    const tag = String(target.tagName || '').toLowerCase();
    return tag === 'textarea' || (tag === 'input' && !['checkbox','radio','range','button','file','submit'].includes(String(target.type || '').toLowerCase()));
  }
  function handleSettingsBack(active) {
    const page = document.querySelector('.settings-page.active');
    const sidebar = $('settingsOverlay').querySelector('.settings-sidebar');

    // BACK while a custom TV dropdown is open closes it and advances to the next setting.
    if (openTvSelectElement) {
      const select = openTvSelectElement;
      const record = tvSelectRegistry.get(select);
      closeTvSelect(select, false);
      if (record) focusAndReveal(record.trigger);
      if (!page || !focusSequential('down', page)) focusAndReveal($('doneSettings'));
      return true;
    }

    if (active && page && page.contains(active)) {
      if (active.classList && active.classList.contains('tv-select-trigger')) {
        if (!focusSequential('down', page)) focusAndReveal($('doneSettings'));
        return true;
      }
      if (isEditableTarget(active) || active.tagName === 'TEXTAREA') {
        if (typeof active.blur === 'function') active.blur();
        const selectedTab = document.querySelector('.settings-tab.active');
        if (selectedTab) focusAndReveal(selectedTab);
        else focusAndReveal($('doneSettings'));
        return true;
      }
      const selectedTab = document.querySelector('.settings-tab.active');
      if (selectedTab) { focusAndReveal(selectedTab); return true; }
      focusAndReveal($('doneSettings'));
      return true;
    }
    if (active && sidebar && sidebar.contains(active)) {
      closeSettings();
      return true;
    }
    if (active && (active.id === 'doneSettings' || active.id === 'closeSettings')) {
      closeSettings();
      return true;
    }
    closeSettings();
    return true;
  }
  function directionalKey(event) {
    const keyNames = [event.key, event.keyIdentifier].filter(Boolean).map(value => String(value).toLowerCase());
    const code = Number(event.keyCode || event.which || 0);
    if (keyNames.some(key => ['arrowleft','left','leftarrow'].includes(key)) || code === 37) return 'left';
    if (keyNames.some(key => ['arrowright','right','rightarrow'].includes(key)) || code === 39) return 'right';
    if (keyNames.some(key => ['arrowup','up','uparrow'].includes(key)) || code === 38) return 'up';
    if (keyNames.some(key => ['arrowdown','down','downarrow'].includes(key)) || code === 40) return 'down';
    return '';
  }
  function handleKeyDown(event) {
    const inSettings = !$('settingsOverlay').classList.contains('hidden');
    const forecastVisible = !$('forecastOverlay').classList.contains('hidden');
    const saverVisible = !$('screensaver').classList.contains('hidden');
    const keyCode = Number(event.keyCode || event.which || 0);
    const key = String(event.key || event.keyIdentifier || '').toLowerCase();
    const direction = directionalKey(event);
    const isConfirm = key === 'enter' || key === 'accept' || keyCode === 13 || keyCode === 23 || keyCode === 66;
    const isBack = ['escape','back','browserback','goback','backspace','u+0008'].includes(key) || keyCode === 461 || keyCode === 27 || keyCode === 8 || keyCode === 10009;
    const active = document.activeElement;

    if (saverVisible) { event.preventDefault(); closeScreensaver(); return; }
    if (isBack) {
      if (forecastVisible) { event.preventDefault(); closeForecast(); return; }
      if (inSettings) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
        handleSettingsBack(active);
        return;
      }
      // Do not repurpose BACK as Settings or app-exit. HOME is handled by Home Chooser.
      event.preventDefault();
      return;
    }
    if (forecastVisible) {
      if (direction) {
        event.preventDefault();
        const scope = $('forecastOverlay');
        if (direction === 'up' || direction === 'down') focusSequential(direction, scope);
        else moveFocusSpatial(direction, scope);
      } else if (isConfirm && active && active.tagName === 'BUTTON') {
        event.preventDefault(); active.click();
      }
      return;
    }
    if (inSettings) {
      const sidebar = $('settingsOverlay').querySelector('.settings-sidebar');
      const page = document.querySelector('.settings-page.active');
      if (direction) {
        if (sidebar.contains(active)) {
          if (direction === 'up' || direction === 'down') {
            event.preventDefault(); focusSequential(direction, sidebar); return;
          }
          if (direction === 'right') {
            event.preventDefault();
            const candidates = visibleFocusable(page);
            if (candidates.length) focusAndReveal(candidates[0]);
            return;
          }
        }
        if (page && page.contains(active)) {
          const tag = String(active.tagName || '').toLowerCase();
          const type = String(active.type || '').toLowerCase();
          if (active.classList && active.classList.contains('tv-select-option') && (direction === 'up' || direction === 'down')) {
            event.preventDefault();
            moveFocusFromTvSelectMenu(direction, page);
            return;
          }
          if (active.classList && active.classList.contains('tv-select-trigger') && (direction === 'up' || direction === 'down')) {
            event.preventDefault();
            if (!focusSequential(direction, page)) {
              if (direction === 'down') focusAndReveal($('doneSettings'));
              else focusAndReveal(document.querySelector('.settings-tab.active'));
            }
            return;
          }
          // Range sliders and text inputs keep native left/right adjustment and caret behavior.
          if ((type === 'range' || isEditableTarget(active)) && (direction === 'left' || direction === 'right')) return;
          event.preventDefault();
          if (direction === 'up' || direction === 'down') {
            if (!focusSequential(direction, page)) {
              if (direction === 'down') focusAndReveal($('doneSettings'));
              else focusAndReveal(document.querySelector('.settings-tab.active'));
            }
          } else if (direction === 'left') {
            const selectedTab = document.querySelector('.settings-tab.active');
            if (selectedTab) focusAndReveal(selectedTab);
          } else {
            moveFocusSpatial(direction, page);
          }
          return;
        }
        if (active && active.id === 'settingsContent') {
          event.preventDefault();
          const candidates = visibleFocusable(page);
          if (candidates.length) focusAndReveal(direction === 'up' ? candidates[candidates.length - 1] : candidates[0]);
          return;
        }
      }
      if (isConfirm && active) {
        if (active.classList && (active.classList.contains('settings-tab') || active.classList.contains('file-button'))) {
          event.preventDefault(); active.click(); return;
        }
        if (active.tagName === 'BUTTON') { event.preventDefault(); active.click(); return; }
        // Let SELECT, INPUT and TEXTAREA keep their native OK/edit behavior.
      }
      return;
    }

    if (direction) {
      const tileIndex = active && active.classList && active.classList.contains('app-tile') ? Number(active.dataset.index) : -1;
      if (tileIndex >= 0 && (direction === 'left' || direction === 'right')) {
        event.preventDefault();
        const next = (tileIndex + (direction === 'right' ? 1 : tiles().length - 1)) % Math.max(1, tiles().length);
        setFocus(next); focusAndReveal(tiles()[next]); return;
      }
      if (tileIndex >= 0 && direction === 'up') { event.preventDefault(); focusAndReveal($('weatherDisplay')); return; }
      if (tileIndex >= 0 && direction === 'down') { event.preventDefault(); focusAndReveal($('settingsButton')); return; }
      if ((active && active.id === 'weatherDisplay' && direction === 'down') || (active && active.id === 'settingsButton' && direction === 'up')) {
        event.preventDefault(); if (tiles()[currentFocus]) focusAndReveal(tiles()[currentFocus]); return;
      }
      if (active && (active.id === 'weatherDisplay' || active.id === 'settingsButton') && (direction === 'left' || direction === 'right')) {
        event.preventDefault(); if (tiles()[currentFocus]) focusAndReveal(tiles()[currentFocus]); return;
      }
      if (!active || !active.classList || !active.classList.contains('app-tile')) {
        event.preventDefault(); if (tiles()[currentFocus]) focusAndReveal(tiles()[currentFocus]); return;
      }
    }
    if (isConfirm) {
      if (active && (active.id === 'weatherDisplay' || active.id === 'settingsButton')) { event.preventDefault(); active.click(); return; }
      if (active && active.classList && active.classList.contains('app-tile')) { event.preventDefault(); launchApp(Number(active.dataset.index)); return; }
      event.preventDefault(); launchApp(currentFocus);
    }
  }
  function init() {
    renderApps(); applyVisualSettings(); enhanceAllTvSelects(); bindSettings();
    const settingsContent = $('settingsContent');
    settingsContent.addEventListener('focusin', event => {
      const focusedElement = event.target;
      if (focusedElement && focusedElement !== settingsContent) {
        requestAnimationFrame(() => {
          if (document.activeElement === focusedElement) focusAndReveal(focusedElement);
        });
      }
    });
    settingsContent.addEventListener('wheel', () => { closeAnyTvSelect(); }, { passive: true });
    $('settingsButton').addEventListener('focus', () => {});
    $('weatherDisplay').addEventListener('click', openForecast);
    $('closeForecast').addEventListener('click', closeForecast);
    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('pointerdown', event => {
      if (!openTvSelectElement) return;
      const record = tvSelectRegistry.get(openTvSelectElement);
      if (record && !record.wrapper.contains(event.target)) closeAnyTvSelect();
    }, true);
    // Some webOS builds dispatch mousemove rather than Pointer Events for the Magic Remote.
    const updatePointerFocus = (event) => {
      const tile = event.target && event.target.closest ? event.target.closest('.app-tile') : null;
      if (tile && Number(tile.dataset.index) !== currentFocus) focusTileFromPointer(tile);
    };
    $('appRow').addEventListener('pointermove', updatePointerFocus, { passive: true });
    $('appRow').addEventListener('mousemove', updatePointerFocus, { passive: true });
    ['pointerdown','mousemove','touchstart','keydown'].forEach(name => window.addEventListener(name, () => { if (!$('screensaver').classList.contains('hidden')) closeScreensaver(); else resetIdleTimer(); }, { passive: true }));
    updateClock(); setInterval(updateClock, 1000); scheduleWeather(); resetIdleTimer();
    requestPersistentStorage();
    (async function restoreWallpaperOnStartup() {
      let restored = false;
      if (settings.personalWallpaperId) restored = await restorePersonalWallpaper();
      else if (settings.wallpaperUrl) restored = await applyWallpaperUrl(settings.wallpaperUrl);
      else restored = await showStoredWallpaper();
      if (!restored) {
        settings.personalWallpaperId = '';
        settings.wallpaperUrl = DEFAULT_WALLPAPER;
        const fallbackApplied = await applyWallpaperUrl(DEFAULT_WALLPAPER);
        if (fallbackApplied) saveSettings();
      }
    })();
    startWallpaperSlideshow();
    if (tiles()[0]) tiles()[0].focus();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
