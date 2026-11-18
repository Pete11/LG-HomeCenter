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
    autoStandby: 'off', scheduledPowerOffEnabled: false, scheduledPowerOff: '01:00', customCss: '', wallpaperUrl: ''
  };
  const WALLPAPER_PRESETS = [
    { id: 'nature-waterfall', title: 'Mountain Waterfall', category: 'nature', resolution: '3840 × 2160', source: 'WallpapersCraft', url: 'https://wallpaperscraft.com/download/mountains_waterfall_aerial_view_148198/3840x2160' },
    { id: 'nature-mountain-lake', title: 'Mountain Lake', category: 'nature', resolution: '3840 × 2160', source: 'WallpapersCraft', url: 'https://wallpaperscraft.com/download/mountain_lake_forest_150577/3840x2160' },
    { id: 'nature-lake-forest', title: 'Lake & Forest', category: 'nature', resolution: '3840 × 2160', source: 'WallpapersCraft', url: 'https://wallpaperscraft.com/download/lake_mountains_forest_152659/3840x2160' },
    { id: 'nature-waterfall-rocks', title: 'Waterfall & Rocks', category: 'nature', resolution: '3840 × 2160', source: 'WallpapersCraft', url: 'https://wallpaperscraft.com/download/waterfall_body_of_water_water_203016/3840x2160' },
    { id: 'cinema-blade-runner', title: 'Blade Runner 2049', category: 'cinema', resolution: '3840 × 2160', source: 'Wallpapers Den', url: 'https://images.wallpapersden.com/image/download/blade-runner-2049-still_amxtZ2aUmZqaraWkpJRobWllrWdma2U.jpg' },
    { id: 'cinema-interstellar', title: 'Interstellar · Ice Planet', category: 'cinema', resolution: '3840 × 2160', source: 'Alpha Coders', url: 'https://images3.alphacoders.com/551/551456.jpg' },
    { id: 'cinema-knock-cabin', title: 'Knock at the Cabin', category: 'cinema', resolution: '3840 × 2400 · 5K', source: '10Wallpaper', url: 'https://www.10wallpaper.com/wallpaper/3840x2400/2305/Knock_at_the_Cabin_2023_Films_5K_Poster_3840x2400.jpg' },
    { id: 'cinema-blade-runner-8k', title: 'Blade Runner 2049 · 8K', category: 'cinema', resolution: '7680 × 4320 · 8K', source: 'Wallpapers Den', url: 'https://images.wallpapersden.com/image/download/ryan-gosling-blade-runner-2049-still_am5sbW2UmZqaraWkpJRsa21lrWloZ2U.jpg' }
  ];
  let installedApps = [];
  let serviceRequests = [];
  let settings = loadSettings();
  let weatherTimer = null;
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
    const gallery = $('wallpaperGallery'); if (!gallery) return;
    const category = $('wallpaperCategory').value || 'nature';
    gallery.innerHTML = '';
    WALLPAPER_PRESETS.filter(item => item.category === category).forEach(item => {
      const card = document.createElement('button'); card.type = 'button'; card.className = 'wallpaper-card';
      if (settings.wallpaperUrl === item.url) card.classList.add('selected');
      const image = document.createElement('img'); image.src = item.url; image.alt = item.title; image.loading = 'lazy'; image.decoding = 'async';
      const title = document.createElement('span'); title.className = 'wallpaper-card-title'; title.textContent = item.title;
      const meta = document.createElement('span'); meta.className = 'wallpaper-card-meta'; meta.textContent = item.resolution + ' · ' + item.source;
      card.append(image, title, meta);
      card.addEventListener('click', () => {
        settings.wallpaperUrl = item.url;
        $('wallpaperUrl').value = item.url;
        localStorage.removeItem('homecenter.wallpaper.blob');
        applyWallpaperUrl(item.url); saveSettings();
        gallery.querySelectorAll('.wallpaper-card').forEach(node => node.classList.remove('selected'));
        card.classList.add('selected');
        $('wallpaperGalleryStatus').textContent = item.title + ' selected (' + item.resolution + ').';
        toast('Wallpaper applied: ' + item.title);
      });
      gallery.appendChild(card);
    });
    $('wallpaperGalleryStatus').textContent = 'Choose a preset or use your own image below. External images require internet access.';
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
  function openSettings(tab) {
    closeScreensaver(); $('settingsOverlay').classList.remove('hidden'); $('settingsOverlay').setAttribute('aria-hidden', 'false');
    selectTab(tab || 'general'); renderAppEditor(); hydrateSettingsForm(); renderWallpaperGallery();
    const first = document.querySelector('.settings-tab.active'); if (first) first.focus();
  }
  function closeSettings() {
    $('settingsOverlay').classList.add('hidden'); $('settingsOverlay').setAttribute('aria-hidden', 'true');
    if (tiles()[currentFocus]) tiles()[currentFocus].focus(); resetIdleTimer();
  }
  function selectTab(name) {
    document.querySelectorAll('.settings-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.tab === name));
    document.querySelectorAll('.settings-page').forEach(page => page.classList.toggle('active', page.dataset.page === name));
    const title = document.querySelector('.settings-tab.active'); $('settingsTitle').textContent = title ? title.textContent : 'General';
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
    ['textBrightness','iconBrightness','clockBrightness','glassTransparency','dockBlur','glassGradient'].forEach(id => {
      $(id).value = settings[id]; const suffix = id === 'dockBlur' ? 'px' : '%'; $(id + 'Value').textContent = settings[id] + suffix;
    });
    $('glassTint').value = settings.glassTint || 'dark';
    ['pixelShift','idleDim','screensaverEnabled','scheduledPowerOffEnabled'].forEach(id => $(id).checked = !!settings[id]);
    $('screensaverDelay').value = String(settings.screensaverDelay); $('screensaverMode').value = settings.screensaverMode;
    $('autoStandby').value = settings.autoStandby; $('scheduledPowerOff').value = settings.scheduledPowerOff;
    $('customCss').value = settings.customCss || '';
  }
  function bindSettings() {
    document.querySelectorAll('.settings-tab').forEach(tab => tab.addEventListener('click', () => selectTab(tab.dataset.tab)));
    $('settingsButton').addEventListener('click', () => openSettings('general'));
    $('addShortcut').addEventListener('click', addShortcut);
    $('loadInstalledApps').addEventListener('click', loadInstalledApps);
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
    $('applyWallpaperUrl').addEventListener('click', () => { const url = $('wallpaperUrl').value.trim(); if (url && /^https?:\/\//i.test(url)) { settings.wallpaperUrl = url; localStorage.removeItem('homecenter.wallpaper.blob'); applyWallpaperUrl(url); saveSettings(); toast('Wallpaper updated.'); } else toast('Enter a valid HTTP(S) URL.'); });
    $('wallpaperFile').addEventListener('change', handleWallpaperFile);
    $('clearWallpaper').addEventListener('click', async () => { settings.wallpaperUrl = ''; saveSettings(); await deleteWallpaperBlob(); applyWallpaperUrl(''); toast('Default wallpaper restored.'); });
    $('exportSettings').addEventListener('click', exportSettings);
    $('importSettingsFile').addEventListener('change', importSettings);
  }
  function applyWallpaperUrl(url) {
    if (wallpaperObjectUrl) { URL.revokeObjectURL(wallpaperObjectUrl); wallpaperObjectUrl = null; }
    const home = $('home');
    if (!url) { home.classList.remove('has-wallpaper'); home.style.removeProperty('--wallpaper-image'); $('screensaver').style.removeProperty('--screensaver-image'); return; }
    const safeUrl = url.replace(/["\\]/g, ''); home.style.setProperty('--wallpaper-image', 'url("' + safeUrl + '")'); home.classList.add('has-wallpaper');
    $('screensaver').style.setProperty('--screensaver-image', 'url("' + safeUrl + '")');
  }
  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('IndexedDB unavailable'));
      const request = indexedDB.open('HomeCenterDB', 1);
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('wallpaper')) request.result.createObjectStore('wallpaper'); };
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
  async function handleWallpaperFile(event) {
    const file = event.target.files && event.target.files[0]; if (!file) return;
    if (!file.type.startsWith('image/')) { toast('Select an image file.'); return; }
    if (file.size > 12 * 1024 * 1024) { toast('Choose an image no larger than 12 MB.'); return; }
    try { await saveWallpaperBlob(file); settings.wallpaperUrl = ''; saveSettings(); await showStoredWallpaper(); toast('Wallpaper saved locally.'); }
    catch (error) { toast('Could not save the image to local storage.'); }
  }
  async function showStoredWallpaper() {
    try {
      const blob = await getWallpaperBlob();
      if (!blob) return;
      if (wallpaperObjectUrl) URL.revokeObjectURL(wallpaperObjectUrl);
      wallpaperObjectUrl = URL.createObjectURL(blob);
      $('home').style.setProperty('--wallpaper-image', 'url("' + wallpaperObjectUrl + '")'); $('home').classList.add('has-wallpaper');
      $('screensaver').style.setProperty('--screensaver-image', 'url("' + wallpaperObjectUrl + '")');
    } catch (_) { /* wallpaper is optional */ }
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
        if (!Number.isFinite(Number(imported.glassTransparency))) settings.glassTransparency = DEFAULTS.glassTransparency;
        delete settings.dockOpacity;
        if (!Array.isArray(settings.apps)) settings.apps = clone(DEFAULTS.apps);
        settings.apps = settings.apps.slice(0, 6);
        if (settings.apps.length && /^Shortcut 6$/i.test(String(settings.apps[settings.apps.length - 1].name || '')) && !settings.apps[settings.apps.length - 1].appId && settings.apps[settings.apps.length - 1].kind === 'custom') settings.apps.pop();
        if (!settings.apps.length) settings.apps = clone(DEFAULTS.apps);
        saveSettings(); applyVisualSettings(); renderApps(); renderAppEditor(); hydrateSettingsForm(); scheduleWeather(); toast('Settings imported.');
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
  function directionalKey(event) {
    const keyNames = [event.key, event.keyIdentifier].filter(Boolean).map(value => String(value).toLowerCase());
    const code = Number(event.keyCode || event.which || 0);
    if (keyNames.some(key => ['arrowleft','left','leftarrow'].includes(key)) || code === 37) return 'left';
    if (keyNames.some(key => ['arrowright','right','rightarrow'].includes(key)) || code === 39) return 'right';
    if (keyNames.some(key => ['arrowup','up','uparrow'].includes(key)) || code === 38) return 'up';
    if (keyNames.some(key => ['arrowdown','down','downarrow'].includes(key)) || code === 40) return 'down';
    return '';
  }
  function visibleFocusable(scope) {
    const selector = 'button:not(:disabled), select:not(:disabled), input:not(:disabled):not([type="hidden"]), textarea:not(:disabled), [tabindex="0"]';
    return Array.from(scope.querySelectorAll(selector)).filter(element => {
      if (element.closest('.hidden')) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== 'hidden';
    });
  }
  function moveFocusSpatial(direction, scope) {
    const candidates = visibleFocusable(scope);
    if (!candidates.length) return false;
    const active = document.activeElement;
    if (!active || !candidates.includes(active)) { candidates[0].focus(); return true; }
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
    if (!best) {
      // Wrap within a row/column when there is no element in the requested direction.
      const others = candidates.filter(candidate => candidate !== active);
      others.sort((left, right) => {
        const l = left.getBoundingClientRect(), r = right.getBoundingClientRect();
        const lc = direction === 'left' ? -l.right : direction === 'right' ? l.left : direction === 'up' ? -l.bottom : l.top;
        const rc = direction === 'left' ? -r.right : direction === 'right' ? r.left : direction === 'up' ? -r.bottom : r.top;
        return lc - rc;
      });
      best = others[0] || null;
    }
    if (!best) return false;
    best.focus({ preventScroll: true });
    if (best.scrollIntoView) best.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    return true;
  }
  function isEditableTarget(target) {
    if (!target) return false;
    const tag = String(target.tagName || '').toLowerCase();
    return tag === 'textarea' || (tag === 'input' && !['checkbox','radio','range','button','file','submit'].includes(String(target.type || '').toLowerCase()));
  }
  function handleKeyDown(event) {
    const inSettings = !$('settingsOverlay').classList.contains('hidden');
    const forecastVisible = !$('forecastOverlay').classList.contains('hidden');
    const saverVisible = !$('screensaver').classList.contains('hidden');
    const keyCode = Number(event.keyCode || event.which || 0);
    const key = String(event.key || event.keyIdentifier || '').toLowerCase();
    const direction = directionalKey(event);
    const isConfirm = key === 'enter' || key === 'accept' || keyCode === 13 || keyCode === 23 || keyCode === 66;
    const isBack = key === 'escape' || keyCode === 461 || keyCode === 27;

    if (saverVisible) { event.preventDefault(); closeScreensaver(); return; }
    if (isBack) {
      if (forecastVisible) { event.preventDefault(); closeForecast(); }
      else if (inSettings) { event.preventDefault(); closeSettings(); }
      else { event.preventDefault(); openSettings('general'); }
      return;
    }
    if (forecastVisible) {
      if (direction) { event.preventDefault(); moveFocusSpatial(direction, $('forecastOverlay')); }
      else if (isConfirm && document.activeElement && document.activeElement.tagName === 'BUTTON') { event.preventDefault(); document.activeElement.click(); }
      return;
    }
    if (inSettings) {
      const target = event.target || document.activeElement;
      const tag = String(target && target.tagName || '').toLowerCase();
      const type = String(target && target.type || '').toLowerCase();
      // Let native selects and range controls consume their own adjustment arrows.
      if (direction && !(tag === 'select' && (direction === 'up' || direction === 'down')) && !(type === 'range' && (direction === 'left' || direction === 'right')) && !(isEditableTarget(target) && (direction === 'left' || direction === 'right'))) {
        event.preventDefault();
        moveFocusSpatial(direction, $('settingsOverlay'));
        return;
      }
      if (isConfirm && target && (target.tagName === 'BUTTON' || target.classList.contains('file-button'))) {
        event.preventDefault(); target.click(); return;
      }
      return;
    }

    if (direction) {
      const active = document.activeElement;
      const tileIndex = active && active.classList && active.classList.contains('app-tile') ? Number(active.dataset.index) : -1;
      if (tileIndex >= 0 && (direction === 'left' || direction === 'right')) {
        event.preventDefault();
        const next = (tileIndex + (direction === 'right' ? 1 : tiles().length - 1)) % Math.max(1, tiles().length);
        setFocus(next); tiles()[next].focus(); return;
      }
      if (tileIndex >= 0 && direction === 'up') { event.preventDefault(); $('weatherDisplay').focus(); return; }
      if (tileIndex >= 0 && direction === 'down') { event.preventDefault(); $('settingsButton').focus(); return; }
      if ((active && active.id === 'weatherDisplay' && direction === 'down') || (active && active.id === 'settingsButton' && direction === 'up')) {
        event.preventDefault(); if (tiles()[currentFocus]) tiles()[currentFocus].focus(); return;
      }
      if (active && active.id === 'weatherDisplay' && (direction === 'left' || direction === 'right')) {
        event.preventDefault(); if (tiles()[currentFocus]) tiles()[currentFocus].focus(); return;
      }
      if (active && active.id === 'settingsButton' && (direction === 'left' || direction === 'right')) {
        event.preventDefault(); if (tiles()[currentFocus]) tiles()[currentFocus].focus(); return;
      }
      if (!active || !active.classList || !active.classList.contains('app-tile')) {
        event.preventDefault(); if (tiles()[currentFocus]) tiles()[currentFocus].focus(); return;
      }
    }
    if (isConfirm) {
      const active = document.activeElement;
      if (active && (active.id === 'weatherDisplay' || active.id === 'settingsButton')) { event.preventDefault(); active.click(); return; }
      if (active && active.classList && active.classList.contains('app-tile')) { event.preventDefault(); launchApp(Number(active.dataset.index)); return; }
      event.preventDefault(); launchApp(currentFocus);
    }
  }
  function init() {
    renderApps(); applyVisualSettings(); bindSettings();
    $('settingsButton').addEventListener('focus', () => {});
    $('weatherDisplay').addEventListener('click', openForecast);
    $('closeForecast').addEventListener('click', closeForecast);
    window.addEventListener('keydown', handleKeyDown, true);
    // Some webOS builds dispatch mousemove rather than Pointer Events for the Magic Remote.
    const updatePointerFocus = (event) => {
      const tile = event.target && event.target.closest ? event.target.closest('.app-tile') : null;
      if (tile && Number(tile.dataset.index) !== currentFocus) focusTileFromPointer(tile);
    };
    $('appRow').addEventListener('pointermove', updatePointerFocus, { passive: true });
    $('appRow').addEventListener('mousemove', updatePointerFocus, { passive: true });
    ['pointerdown','mousemove','touchstart','keydown'].forEach(name => window.addEventListener(name, () => { if (!$('screensaver').classList.contains('hidden')) closeScreensaver(); else resetIdleTimer(); }, { passive: true }));
    updateClock(); setInterval(updateClock, 1000); scheduleWeather(); resetIdleTimer();
    if (settings.wallpaperUrl) applyWallpaperUrl(settings.wallpaperUrl); else showStoredWallpaper();
    if (tiles()[0]) tiles()[0].focus();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
