/* ==========================================================================
   Météo Splash – Script v4.6
   Version INTERMEDIAIRE (stabilité maximale)
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. SELECTEURS + ÉTATS GLOBAUX
-------------------------------------------------------------------------- */

const cityInput = document.getElementById("city-input");
const autocompleteList = document.getElementById("autocomplete-list");

const btnGeolocate = document.getElementById("btn-geolocate");
const btnSpeak = document.getElementById("btn-speak");
const btnThemeToggle = document.getElementById("btn-theme-toggle");
const btnRadar = document.getElementById("btn-radar");
const toast = document.getElementById("toast");

const radarOverlay = document.getElementById("radar-overlay");
const btnCloseRadar = document.getElementById("btn-close-radar");
const radarTabRain = document.getElementById("radar-tab-rain");
const radarTabWind = document.getElementById("radar-tab-wind");
const radarTabTemp = document.getElementById("radar-tab-temp");
const radarWindowText = document.getElementById("radar-window-text");
const radarPlay = document.getElementById("radar-play");
const radarGrid = document.getElementById("radar-grid");
const radarTimelineSlider = document.getElementById("radar-timeline-slider");
const radarModeToggle = document.getElementById("radar-mode-toggle");

const cityList = document.getElementById("city-list");
const btnReset = document.getElementById("btn-reset");
const sortSelect = document.getElementById("sort-select");

const detailsTitle = document.getElementById("details-title");
const detailsSubtitle = document.getElementById("details-subtitle");
const detailsCurrent = document.getElementById("details-current");

const windCompass = document.getElementById("wind-compass");
const windArrow = windCompass ? windCompass.querySelector(".compass-arrow") : null;
const windLineMain = document.getElementById("wind-line-main");
const windLineSub = document.getElementById("wind-line-sub");

const detailsTip = document.getElementById("details-tip");

const forecastList = document.getElementById("forecast-list");
const dayOverlay = document.getElementById("day-overlay");
const btnCloseDay = document.getElementById("btn-close-day");
const dayOverlayTitle = document.getElementById("day-overlay-title");
const dayOverlaySubtitle = document.getElementById("day-overlay-subtitle");
const chartTemp = document.getElementById("chart-temp");
const chartRain = document.getElementById("chart-rain");
const chartWind = document.getElementById("chart-wind");
const chartHumidity = document.getElementById("chart-humidity");

const dayTabTemp = document.getElementById("day-tab-temp");
const dayTabRain = document.getElementById("day-tab-rain");
const dayTabWind = document.getElementById("day-tab-wind");
const dayTabHumidity = document.getElementById("day-tab-humidity");
const dayGraphTemp = document.getElementById("day-graph-temp");
const dayGraphRain = document.getElementById("day-graph-rain");
const dayGraphWind = document.getElementById("day-graph-wind");
const dayGraphHumidity = document.getElementById("day-graph-humidity");

const btnForecast7 = document.getElementById("btn-forecast-7");
const btnForecast14 = document.getElementById("btn-forecast-14");

let selectedCity = null;
let weatherCache = {};
let cities = [];
let lastForecastData = null;

/* --------------------------------------------------------------------------
   2. UTILITAIRES
-------------------------------------------------------------------------- */

function degreeToCardinal(angle) {
  const directions = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  const index = Math.round((angle % 360) / 45) % 8;
  return directions[index];
}

function formatDayShort(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", { weekday: "short" });
}

function selectCityByIndex(idx) {
  if (idx >= 0 && idx < cities.length) {
    loadCityWeather(cities[idx]);
  }
}

function updateTip(j) {
  if (!detailsTip) return;

  if (!selectedCity || !j) {
    detailsTip.textContent = "Ajoute une ville ou active la géolocalisation.";
    return;
  }

  const c = j.current;
  let tip = "";

  if (c.temperature_2m <= 0) {
    tip = "Pense à bien te couvrir, il gèle aujourd’hui.";
  } else if (c.rain > 0 || c.precipitation > 0) {
    tip = "Prends un parapluie avant de sortir.";
  } else if (c.wind_speed_10m >= 40) {
    tip = "Le vent souffle fort, garde un œil sur ton parapluie.";
  } else if (c.temperature_2m >= 28) {
    tip = "Bois beaucoup d’eau, il fait très chaud aujourd’hui.";
  } else {
    tip = "Journée plutôt calme côté météo.";
  }

  detailsTip.textContent = tip;
}

/* --------------------------------------------------------------------------
   3. FOND ANIMÉ SELON MÉTÉO
-------------------------------------------------------------------------- */

let themeMode = "auto"; // "auto" | "day" | "night"

function applyWeatherBackground(code) {
  const body = document.body;

  if (code === null) {
    body.classList.remove(
      "weather-clear",
      "weather-cloudy",
      "weather-rain",
      "weather-snow",
      "weather-storm"
    );
    return;
  }

  let cls = "";

  if (code === 0) cls = "weather-clear";
  else if ([1, 2, 3].includes(code)) cls = "weather-cloudy";
  else if ([45, 48].includes(code)) cls = "weather-cloudy";
  else if ([51, 53, 55, 56, 57].includes(code)) cls = "weather-rain";
  else if ([61, 63, 65, 66, 67].includes(code)) cls = "weather-rain";
  else if ([71, 73, 75, 77].includes(code)) cls = "weather-snow";
  else if ([80, 81, 82].includes(code)) cls = "weather-rain";
  else if ([95, 96, 99].includes(code)) cls = "weather-storm";

  // si mode manuel (jour/nuit), ne pas écraser
  if (themeMode !== "auto") {
    return;
  }

  const hour = new Date().getHours();
  const baseTheme = hour >= 21 || hour < 7 ? "theme-night" : "theme-day";

  body.className = `${baseTheme} ${cls}`;
}

/* --------------------------------------------------------------------------
   4. THÈME JOUR / NUIT / AUTO
-------------------------------------------------------------------------- */

function applyTheme() {
  const body = document.body;

  if (themeMode === "auto") {
    const hour = new Date().getHours();
    const baseTheme = hour >= 21 || hour < 7 ? "theme-night" : "theme-day";
    // On laisse applyWeatherBackground gérer la classe météo
    if (!body.classList.contains("weather-clear") &&
        !body.classList.contains("weather-cloudy") &&
        !body.classList.contains("weather-rain") &&
        !body.classList.contains("weather-snow") &&
        !body.classList.contains("weather-storm")) {
      body.className = baseTheme;
    } else {
      // on conserve la classe météo et on ajuste juste theme-*
      body.classList.remove("theme-day", "theme-night");
      body.classList.add(baseTheme);
    }
  } else if (themeMode === "day") {
    document.body.classList.remove("theme-night");
    document.body.classList.add("theme-day");
  } else if (themeMode === "night") {
    document.body.classList.remove("theme-day");
    document.body.classList.add("theme-night");
  }

  // on redessine les graphes si besoin :
  if (lastForecastData) {
    // rien de spécifique ici, les prochains graphes utiliseront le bon thème
  }
}

if (btnThemeToggle) {
  btnThemeToggle.addEventListener("click", () => {
    if (themeMode === "auto") {
      themeMode = "day";
      btnThemeToggle.textContent = "☀ Jour";
    } else if (themeMode === "day") {
      themeMode = "night";
      btnThemeToggle.textContent = "🌙 Nuit";
    } else if (themeMode === "night") {
      themeMode = "auto";
      btnThemeToggle.textContent = "🌓 Auto";
    }
    applyTheme();
  });
}

/* --------------------------------------------------------------------------
   5. AUTO-COMPLÉTION VILLES (API geocoding)
-------------------------------------------------------------------------- */

let autocompleteItems = [];
let autocompleteSelectedIndex = -1;

const stateCodeMap = {
  Californie: "CA",
  Floride: "FL",
  "New York": "NY",
  Nevada: "NV",
  Texas: "TX",
  Washington: "WA",
};

function refreshAutocompleteSelection() {
  const items = autocompleteList.querySelectorAll(".autocomplete-item");
  items.forEach((li, idx) => {
    if (idx === autocompleteSelectedIndex) li.classList.add("selected");
    else li.classList.remove("selected");
  });
}

if (cityInput) {
  cityInput.addEventListener("keydown", (e) => {
    if (!autocompleteList || !autocompleteList.childElementCount) return;

    const maxIndex = autocompleteList.childElementCount - 1;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      autocompleteSelectedIndex =
        autocompleteSelectedIndex < maxIndex ? autocompleteSelectedIndex + 1 : maxIndex;
      refreshAutocompleteSelection();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      autocompleteSelectedIndex =
        autocompleteSelectedIndex > 0 ? autocompleteSelectedIndex - 1 : 0;
      refreshAutocompleteSelection();
    } else if (e.key === "Enter") {
      if (autocompleteSelectedIndex >= 0) {
        e.preventDefault();
        const items = autocompleteList.querySelectorAll(".autocomplete-item");
        const target = items[autocompleteSelectedIndex];
        if (target) {
          target.click();
        }
      }
    } else if (e.key === "Escape") {
      autocompleteList.innerHTML = "";
      autocompleteSelectedIndex = -1;
    }
  });

  cityInput.addEventListener("input", async () => {
    const query = cityInput.value.trim();
    autocompleteList.innerHTML = "";

    if (!query) return;

    try {
      autocompleteSelectedIndex = -1;

      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        query
      )}&count=10&language=fr&format=json`;

      const r = await fetch(url);
      const j = await r.json();

      if (!j.results) return;

      autocompleteItems = [];
      j.results.forEach((item) => {
        const li = document.createElement("li");
        li.className = "autocomplete-item";

        const main = document.createElement("span");
        main.className = "autocomplete-main";
        let regionLabel = "";
        if (item.admin1) {
          const code = stateCodeMap[item.admin1] ? ` ${stateCodeMap[item.admin1]}` : "";
          regionLabel = `, ${item.admin1}${code}`;
        }
        main.textContent = `${item.name}${regionLabel} — ${item.country}`;

        const meta = document.createElement("span");
        meta.className = "autocomplete-meta";
        meta.textContent = `Lat ${item.latitude.toFixed(2)} • Lon ${item.longitude.toFixed(
          2
        )}`;

        li.appendChild(main);
        li.appendChild(meta);
        autocompleteItems.push(li);

        li.addEventListener("click", () => {
          addCity({
            name: item.name,
            country: item.country,
            lat: item.latitude,
            lon: item.longitude,
          });
          autocompleteList.innerHTML = "";
          autocompleteSelectedIndex = -1;
          cityInput.value = "";
        });

        autocompleteList.appendChild(li);
      });
    } catch (err) {
      console.error("Erreur geocoding", err);
    }
  });
}

/* --------------------------------------------------------------------------
   6. GÉOLOCALISATION
-------------------------------------------------------------------------- */

function showToast(message, type = "info") {
  if (!toast) return;
  toast.textContent = message;
  toast.className = "toast toast-visible";
  if (type === "error") toast.classList.add("toast-error");
  if (type === "success") toast.classList.add("toast-success");
  setTimeout(() => {
    toast.classList.remove("toast-visible");
  }, 1800);
}

function setGeolocateIdle() {
  if (!btnGeolocate) return;
  btnGeolocate.disabled = false;
  btnGeolocate.classList.remove("location-loading", "location-success");
  btnGeolocate.textContent = "📍 Ma position";
}

function setGeolocateLoading() {
  if (!btnGeolocate) return;
  btnGeolocate.disabled = true;
  btnGeolocate.classList.remove("location-success");
  btnGeolocate.classList.add("location-loading");
  btnGeolocate.textContent = "📍 Recherche…";
}

function setGeolocateSuccess(cityName) {
  if (!btnGeolocate) return;
  btnGeolocate.disabled = false;
  btnGeolocate.classList.remove("location-loading");
  btnGeolocate.classList.add("location-success");
  btnGeolocate.textContent = "✅ Position trouvée";
  if (cityName) {
    showToast(`Position détectée : ${cityName}`, "success");
  }
  setTimeout(() => {
    setGeolocateIdle();
  }, 1200);
}

function setGeolocateError(message) {
  showToast(message || "Impossible de déterminer votre position.", "error");
  setGeolocateIdle();
}

async function geolocateByIp() {
  try {
    const r = await fetch("https://ipapi.co/json/");
    const j = await r.json();
    if (!j || !j.city || !j.latitude || !j.longitude) {
      setGeolocateError("Impossible de récupérer votre position approximative.");
      return;
    }

    addCity({
      name: j.city,
      country: j.country_name || "—",
      lat: j.latitude,
      lon: j.longitude,
      isCurrentLocation: true,
    });
    setGeolocateSuccess(j.city);
  } catch (err) {
    console.error("Erreur géoloc IP", err);
    setGeolocateError("Impossible de déterminer votre position.");
  }
}

if (btnGeolocate) {
  btnGeolocate.addEventListener("click", () => {
    setGeolocateLoading();

    if (!navigator.geolocation) {
      // pas de GPS → fallback IP direct
      geolocateByIp();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        try {
          const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=fr`;
          const r = await fetch(url);
          const j = await r.json();
          const info = j?.results?.[0];
          const cityName =
            info?.name || `Position (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
          const countryName = info?.country || "—";

          addCity({
            name: cityName,
            country: countryName,
            lat,
            lon,
            isCurrentLocation: true,
          });
          setGeolocateSuccess(cityName);
        } catch (err) {
          console.error("Erreur géocodage inverse", err);
          // si reverse échoue → fallback IP
          geolocateByIp();
        }
      },
      async (err) => {
        console.warn("Erreur géolocalisation navigateur", err);
        // refus / timeout / erreur → fallback IP
        geolocateByIp();
      },
      { enableHighAccuracy: true, timeout: 7000 }
    );
  });
}

/* --------------------------------------------------------------------------
   7. AJOUT / SUPPRESSION DE VILLES
-------------------------------------------------------------------------- */

function addCity(ci) {
  /* éviter doublon (même ville / coordonnées proches) */
  const existingIndex = cities.findIndex(
    (x) =>
      x.name === ci.name &&
      Math.abs(x.lat - ci.lat) < 0.01 &&
      Math.abs(x.lon - ci.lon) < 0.01
  );

  if (existingIndex !== -1) {
    // si c'est une localisation actuelle, on transfère le flag
    if (ci.isCurrentLocation) {
      cities.forEach((c) => {
        c.isCurrentLocation = false;
      });
      cities[existingIndex].isCurrentLocation = true;
      saveCities();
      renderCityList();
      highlightCity(existingIndex);
    }
    loadCityWeather(cities[existingIndex]);
    return;
  }

  if (ci.isCurrentLocation) {
    cities.forEach((c) => {
      c.isCurrentLocation = false;
    });
  }

  cities.push(ci);
  saveCities();
  renderCityList();
  loadCityWeather(ci);

  if (ci.isCurrentLocation) {
    const idx = cities.length - 1;
    highlightCity(idx);
  }
}

function removeCity(idx) {
  cities.splice(idx, 1);
  renderCityList();
  saveCities();

  if (cities.length > 0) loadCityWeather(cities[0]);
  else {
    detailsTitle.textContent = "Aucune ville sélectionnée";
    detailsSubtitle.textContent = "Ajoute une ville ou utilise “Ma position”.";
    detailsCurrent.innerHTML = "";
    windLineMain.textContent = "Vent : —";
    windLineSub.textContent = "Rafales : —";
    forecastList.innerHTML = "";
    applyWeatherBackground(null);
    updateTip(null);
  }
}

function saveCities() {
  localStorage.setItem("meteosplash-cities", JSON.stringify(cities));
}

function loadSavedCities() {
  const raw = localStorage.getItem("meteosplash-cities");
  if (raw) {
    cities = JSON.parse(raw);
    renderCityList();
  }
}

if (btnReset) {
  btnReset.addEventListener("click", () => {
    cities = [];
    saveCities();
    renderCityList();
  });
}

/* --------------------------------------------------------------------------
   8. AFFICHAGE LISTE DES VILLES
-------------------------------------------------------------------------- */

function renderCityList() {
  if (!cityList) return;
  cityList.innerHTML = "";

  /* Tri */
  if (sortSelect && sortSelect.value === "alpha") {
    cities.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortSelect && sortSelect.value === "temp") {
    cities.sort((a, b) => {
      const Ta = weatherCache[a.name]?.current?.temperature_2m ?? -9999;
      const Tb = weatherCache[b.name]?.current?.temperature_2m ?? -9999;
      return Tb - Ta;
    });
  }

  cities.forEach((ci, idx) => {
    const el = document.createElement("div");
    el.className = "city-item";
    el.dataset.index = idx;

    const tempVal = weatherCache[ci.name]?.current?.temperature_2m ?? "—";
    const badge = ci.isCurrentLocation
      ? '<span class="city-badge-location">Ma position</span>'
      : "";

    el.innerHTML = `
      <div class="city-main">
        <span class="city-name">${ci.name}</span>
        <span class="city-meta">${ci.country} • ${ci.lat.toFixed(
          2
        )}, ${ci.lon.toFixed(2)}</span>
      </div>
      <span class="city-temp">${tempVal}°</span>
      ${badge}
      <button class="city-remove">✕</button>
    `;

    el.addEventListener("click", (e) => {
      if (e.target.classList.contains("city-remove")) {
        removeCity(idx);
        e.stopPropagation();
        return;
      }
      loadCityWeather(ci);
    });

    cityList.appendChild(el);
  });
}

function highlightCity(index) {
  if (!cityList) return;
  const item = cityList.querySelector(`.city-item[data-index="${index}"]`);
  if (!item) return;
  item.classList.add("city-item-highlight");
  setTimeout(() => {
    item.classList.remove("city-item-highlight");
  }, 1200);
}

/* --------------------------------------------------------------------------
   9. CHARGER LES DONNÉES MÉTÉO
-------------------------------------------------------------------------- */

async function loadCityWeather(ci) {
  selectedCity = ci;

  detailsTitle.textContent = ci.name;
  detailsSubtitle.textContent = `Lat ${ci.lat.toFixed(
    2
  )}, Lon ${ci.lon.toFixed(2)}`;

  try {
    /* DEMANDE API MÉTÉO */
    const url =
      "https://api.open-meteo.com/v1/forecast" +
      `?latitude=${ci.lat}&longitude=${ci.lon}` +
      "&current=temperature_2m,relative_humidity_2m,precipitation,rain,showers,snowfall,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code" +
      "&hourly=temperature_2m,precipitation,rain,relative_humidity_2m,cloud_cover,wind_speed_10m,wind_gusts_10m,weather_code" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max" +
      "&forecast_days=14" +
      "&timezone=auto";

    const r = await fetch(url);
    const j = await r.json();

    weatherCache[ci.name] = j;

    renderCurrent(j);
    renderWind(j);
    renderForecast(j);
    applyWeatherBackground(j.current.weather_code);
    renderCityList();
    updateTip(j);
  } catch (err) {
    console.error("Erreur météo", err);
    alert("Impossible de récupérer la météo.");
  }
}

/* --------------------------------------------------------------------------
   10. AFFICHAGE METEO ACTUELLE
-------------------------------------------------------------------------- */

function renderCurrent(j) {
  if (!detailsCurrent) return;
  const c = j.current;

  detailsCurrent.innerHTML = `
    <div class="detail-block">
      <div class="detail-label">Température</div>
      <div class="detail-value">${c.temperature_2m}°C</div>
      <div class="detail-sub">Ressenti : ${c.temperature_2m}°C</div>
    </div>

    <div class="detail-block">
      <div class="detail-label">Humidité</div>
      <div class="detail-value">${Math.min(100, c.relative_humidity_2m)}%</div>
      <div class="detail-sub">Nuages : ${c.cloud_cover}%</div>
    </div>

    <div class="detail-block">
      <div class="detail-label">Précipitations</div>
      <div class="detail-value">${c.precipitation} mm</div>
      <div class="detail-sub">Pluie : ${c.rain} mm</div>
    </div>

    <div class="detail-block">
      <div class="detail-label">Neige</div>
      <div class="detail-value">${c.snowfall} mm</div>
      <div class="detail-sub">Averse : ${c.showers} mm</div>
    </div>
  `;
}

/* --------------------------------------------------------------------------
   11. Boussole du vent
-------------------------------------------------------------------------- */

function renderWind(j) {
  if (!windArrow) return;
  const c = j.current;
  const dir = c.wind_direction_10m;
  const speed = c.wind_speed_10m;
  const gust = c.wind_gusts_10m;

  windArrow.style.transform = `translate(-50%, -50%) rotate(${dir}deg)`;

  if (windLineMain) {
    windLineMain.textContent = `Vent : ${degreeToCardinal(dir)} (${speed} km/h)`;
  }
  if (windLineSub) {
    windLineSub.textContent = `Rafales : ${gust} km/h`;
  }
}

/* --------------------------------------------------------------------------
   13. PRÉVISIONS 7 & 14 jours
-------------------------------------------------------------------------- */

if (btnForecast7) {
  btnForecast7.addEventListener("click", () => {
    btnForecast7.classList.add("pill-button-active");
    btnForecast14 && btnForecast14.classList.remove("pill-button-active");
    if (selectedCity) renderForecast(weatherCache[selectedCity.name], 7);
  });
}

if (btnForecast14) {
  btnForecast14.addEventListener("click", () => {
    btnForecast14.classList.add("pill-button-active");
    btnForecast7 && btnForecast7.classList.remove("pill-button-active");
    if (selectedCity) renderForecast(weatherCache[selectedCity.name], 14);
  });
}

function renderForecast(j, days = 7) {
  if (!forecastList) return;
  const d = j.daily;
  lastForecastData = j;

  forecastList.innerHTML = "";

  for (let i = 0; i < days; i++) {
    const day = d.time[i];
    const code = d.weather_code[i];
    const tmax = d.temperature_2m_max[i];
    const tmin = d.temperature_2m_min[i];
    const rain = d.precipitation_sum[i];
    const prob = d.precipitation_probability_max[i];
    const wind = d.wind_speed_10m_max[i];

    const item = document.createElement("div");
    item.className = "forecast-item";
    item.dataset.dayIndex = i;

    item.innerHTML = `
      <div class="forecast-line">
        <span class="f-day">${formatDayShort(day)}</span>
        <span class="f-wind">${wind} km/h</span>
        <span class="f-icon">${iconForWeatherCode(code)}</span>
        <span class="f-temps">Max ${tmax}° · Min ${tmin}°</span>
        <span class="f-rain">${rain} mm</span>
        <span class="f-prob">${prob}%</span>
      </div>
    `;

    forecastList.appendChild(item);
  }
}

function labelForWeatherCode(code) {
  if (code === 0) return "Ciel clair";
  if ([1, 2, 3].includes(code)) return "Partiellement nuageux";
  if ([45, 48].includes(code)) return "Brouillard";
  if ([51, 53, 55].includes(code)) return "Bruine ou pluie légère";
  if ([61, 63, 65].includes(code)) return "Pluie";
  if ([71, 73, 75].includes(code)) return "Neige";
  if ([80, 81, 82].includes(code)) return "Averses";
  if ([95, 96, 99].includes(code)) return "Orage";
  return "Conditions variables";
}

function iconForWeatherCode(code) {
  if (code === 0) return "☀️";
  if ([1, 2, 3].includes(code)) return "⛅";
  if ([45, 48].includes(code)) return "🌫";
  if ([51, 53, 55].includes(code)) return "🌦";
  if ([61, 63, 65].includes(code)) return "🌧";
  if ([71, 73, 75].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈";
  return "🌡";
}

/* --------------------------------------------------------------------------
   14. DÉTAIL JOUR (graphiques température / pluie / vent)
-------------------------------------------------------------------------- */

function openDayOverlay(dayIndex) {
  if (!lastForecastData || !selectedCity) return;
  const d = lastForecastData.daily;
  const h = lastForecastData.hourly;

  const dayStr = d.time[dayIndex];
  const baseDate = new Date(dayStr + "T00:00:00");
  const nextDate = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);

  const times = h.time.map((t) => new Date(t));
  const hours = [];
  const temps = [];
  const rains = [];
  const winds = [];
  const humidities = [];

  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    if (t >= baseDate && t < nextDate) {
      hours.push(t.getHours());
      temps.push(h.temperature_2m[i]);
      rains.push(h.precipitation[i]);
      winds.push(h.wind_speed_10m[i]);
      if (h.relative_humidity_2m) {
        humidities.push(Math.min(100, h.relative_humidity_2m[i]));
      }
    }
  }

  if (dayOverlayTitle) {
    dayOverlayTitle.textContent = `Détail pour ${selectedCity.name}`;
  }
  if (dayOverlaySubtitle) {
    dayOverlaySubtitle.textContent = new Date(dayStr).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
  }

  // on prépare les graphes
  drawSimpleLineChart(chartTemp, hours, temps, "°C");
  drawSimpleLineChart(chartRain, hours, rains, "mm");
  drawSimpleLineChart(chartWind, hours, winds, "km/h");
  if (humidities.length && chartHumidity) {
    drawSimpleLineChart(chartHumidity, hours, humidities, "%");
  }

  // onglet par défaut : température
  setActiveDayTab("temp");

  if (dayOverlay) {
    dayOverlay.classList.add("active");
    document.body.classList.add("no-scroll");
  }
}

function closeDayOverlay() {
  if (!dayOverlay) return;
  dayOverlay.classList.remove("active");
  document.body.classList.remove("no-scroll");
}

if (btnCloseDay) {
  btnCloseDay.addEventListener("click", closeDayOverlay);
}

if (dayOverlay) {
  dayOverlay.addEventListener("click", (e) => {
    if (e.target.classList.contains("overlay-backdrop")) {
      closeDayOverlay();
    }
  });
}

function setActiveDayTab(kind) {
  if (!dayTabTemp || !dayTabRain || !dayTabWind || !dayTabHumidity) return;
  if (!dayGraphTemp || !dayGraphRain || !dayGraphWind || !dayGraphHumidity) return;

  dayTabTemp.classList.remove("day-tab-button-active");
  dayTabRain.classList.remove("day-tab-button-active");
  dayTabWind.classList.remove("day-tab-button-active");
  dayTabHumidity.classList.remove("day-tab-button-active");

  dayGraphTemp.classList.remove("active-day-graph");
  dayGraphRain.classList.remove("active-day-graph");
  dayGraphWind.classList.remove("active-day-graph");
  dayGraphHumidity.classList.remove("active-day-graph");

  if (kind === "temp") {
    dayTabTemp.classList.add("day-tab-button-active");
    dayGraphTemp.classList.add("active-day-graph");
  } else if (kind === "rain") {
    dayTabRain.classList.add("day-tab-button-active");
    dayGraphRain.classList.add("active-day-graph");
  } else if (kind === "wind") {
    dayTabWind.classList.add("day-tab-button-active");
    dayGraphWind.classList.add("active-day-graph");
  } else if (kind === "humidity") {
    dayTabHumidity.classList.add("day-tab-button-active");
    dayGraphHumidity.classList.add("active-day-graph");
  }
}

if (dayTabTemp && dayTabRain && dayTabWind && dayTabHumidity) {
  dayTabTemp.addEventListener("click", () => setActiveDayTab("temp"));
  dayTabRain.addEventListener("click", () => setActiveDayTab("rain"));
  dayTabWind.addEventListener("click", () => setActiveDayTab("wind"));
  dayTabHumidity.addEventListener("click", () => setActiveDayTab("humidity"));
}

/* clic sur une ligne de prévision */
if (forecastList) {
  forecastList.addEventListener("click", (e) => {
    const item = e.target.closest(".forecast-item");
    if (!item) return;
    const idx = Number(item.dataset.dayIndex ?? -1);
    if (idx >= 0) {
      openDayOverlay(idx);
    }
  });
}

/* petit moteur de graphique maison */
function drawSimpleLineChart(canvas, hours, values, unit) {
  // Style Apple Health : courbe lisse sans points, avec abscisses/ordonnées.
  if (!canvas || !canvas.getContext || !hours.length) {
    const ctx = canvas && canvas.getContext && canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || 400;
  const height = rect.height || 140;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0, 0, width, height);

  const isNight = document.body.classList.contains("theme-night");
  const axisColor = isNight ? "rgba(240,240,255,0.88)" : "rgba(40,40,60,0.75)";
  const gridColor = isNight ? "rgba(240,240,255,0.20)" : "rgba(0,0,0,0.07)";

  const paddingLeft = 36;
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 28;

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  ctx.fillStyle = "rgba(255,255,255,0)";
  ctx.fillRect(0, 0, width, height);

  let minVal = Math.min(...values);
  let maxVal = Math.max(...values);
  if (minVal === maxVal) {
    minVal -= 1;
    maxVal += 1;
  }

  const paddingValue = (maxVal - minVal) * 0.15;
  minVal -= paddingValue;
  maxVal += paddingValue;

  function xForIndex(i) {
    if (hours.length === 1) return paddingLeft + plotWidth / 2;
    return paddingLeft + (plotWidth * i) / (hours.length - 1);
  }

  function yForValue(v) {
    const ratio = (v - minVal) / (maxVal - minVal);
    return paddingTop + plotHeight * (1 - ratio);
  }

  // grille horizontale douce
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  const gridLines = 3;
  for (let i = 0; i <= gridLines; i++) {
    const y = paddingTop + (plotHeight * i) / gridLines;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(paddingLeft + plotWidth, y);
    ctx.stroke();
  }

  // axe Y
  ctx.strokeStyle = axisColor;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(paddingLeft, paddingTop);
  ctx.lineTo(paddingLeft, paddingTop + plotHeight);
  ctx.stroke();

  // axe X
  ctx.beginPath();
  ctx.moveTo(paddingLeft, paddingTop + plotHeight);
  ctx.lineTo(paddingLeft + plotWidth, paddingTop + plotHeight);
  ctx.stroke();

  // courbe
  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = isNight ? "rgba(255, 214, 107, 0.95)" : "rgba(79,141,255,0.95)";

  values.forEach((v, i) => {
    const x = xForIndex(i);
    const y = yForValue(v);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();
}

/* --------------------------------------------------------------------------
   15. MÉTÉO PARLÉE
-------------------------------------------------------------------------- */

if (btnSpeak) {
  btnSpeak.addEventListener("click", () => {
    if (!selectedCity) {
      speech("Aucune ville n'est sélectionnée pour la météo parlée.");
      return;
    }

    const j = weatherCache[selectedCity.name];
    if (!j || !j.current) {
      speech("Les données ne sont pas encore disponibles.");
      return;
    }

    const c = j.current;

    const text = `
    Voici la météo pour ${selectedCity.name} :
    Température actuelle ${c.temperature_2m} degrés.
    Humidité ${Math.min(100, c.relative_humidity_2m)} pour cent.
    Vent ${c.wind_speed_10m} kilomètres par heure,
    direction ${degreeToCardinal(c.wind_direction_10m)}.
  `;

    speech(text);
  });
}

function speech(txt) {
  const synth = window.speechSynthesis;
  if (!synth) return;
  const utter = new SpeechSynthesisUtterance(txt);
  utter.lang = "fr-FR";
  synth.speak(utter);
}

/* --------------------------------------------------------------------------
   16. RADAR POPUP (RainViewer + Open-Meteo)
-------------------------------------------------------------------------- */

/* --------------------------------------------------------------------------
   16. RADAR POPUP (RainViewer + Open-Meteo + Temp + Vent)
-------------------------------------------------------------------------- */

/**
 * - RainViewer : radar réel pour les 2 dernières heures (pluie).
 * - Open-Meteo : timeline animée pour les prochaines heures (pluie / vent / température).
 * - OpenWeather : tuiles vent / température si besoin.
 * - Bouton "Radar réel / Radar futur" pour basculer passé ↔ futur.
 * - Bouton "Résumé pluie -2 h" pour synthèse de la pluie récente.
 */

const OPENWEATHER_API_KEY = "c63f9893f5d21327a9c390818db9f240";
const RAINVIEWER_API_URL = "https://api.rainviewer.com/public/weather-maps.json";

let radarTemporalMode = "real"; // "real" | "future"
let radarVariable = "rain";     // "rain" | "wind" | "temp"

let radarMapInstance = null;
let radarBaseLayer = null;
let radarTileLayer = null;
let radarFutureOverlay = null;

// RainViewer (radar réel -2 h)
let rainviewerMeta = null;
let rainviewerPastFrames = [];
let rainviewerHost = "";
let rainviewerTileLayer = null;
let rainviewerAnimTimer = null;

// Timeline animation (Open-Meteo)
let radarTimelinePlaying = false;
let radarTimelineTimer = null;

// Bouton résumé pluie -2 h
let radarSummaryButton = null;
const radarLegend = document.querySelector(".radar-legend");

/* Création dynamique du bouton "Résumé pluie -2 h" */
if (radarLegend) {
  radarSummaryButton = document.createElement("button");
  radarSummaryButton.id = "radar-summary-button";
  radarSummaryButton.className = "pill-button radar-summary-button";
  radarSummaryButton.textContent = "Résumé pluie -2 h";
  radarLegend.appendChild(radarSummaryButton);
}

/* --------------------------------------------------------------------------
   16.1 – Utilitaires RainViewer & Open-Meteo
-------------------------------------------------------------------------- */

/** Charge les méta-données RainViewer (dernières 2 h) si pas déjà fait */
async function loadRainviewerMeta() {
  if (rainviewerMeta) return;
  try {
    const res = await fetch(RAINVIEWER_API_URL);
    const data = await res.json();
    rainviewerMeta = data;
    rainviewerHost = data.host || "https://tilecache.rainviewer.com";
    if (data.radar && Array.isArray(data.radar.past)) {
      // On garde les dernières ~2h (max ~12 frames)
      const arr = data.radar.past;
      rainviewerPastFrames = arr.slice(Math.max(0, arr.length - 12));
    }
  } catch (err) {
    console.error("Erreur RainViewer:", err);
  }
}

/** Applique un frame RainViewer donné (index) */
function applyRainviewerFrame(index) {
  if (!radarMapInstance || !rainviewerPastFrames.length) return;

  if (rainviewerTileLayer) {
    radarMapInstance.removeLayer(rainviewerTileLayer);
    rainviewerTileLayer = null;
  }

  const frame = rainviewerPastFrames[index];
  if (!frame || !frame.path) return;

  const url = `${rainviewerHost}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`;

  rainviewerTileLayer = L.tileLayer(url, {
    opacity: 0.8,
  });
  rainviewerTileLayer.addTo(radarMapInstance);
}

/** Démarre l'animation RainViewer (frames passées) */
function startRainviewerAnimation() {
  stopRainviewerAnimation();
  if (!radarMapInstance || !rainviewerPastFrames.length) return;

  let idx = 0;
  applyRainviewerFrame(idx);

  rainviewerAnimTimer = setInterval(() => {
    idx = (idx + 1) % rainviewerPastFrames.length;
    applyRainviewerFrame(idx);
  }, 650);
}

/** Stoppe l'animation RainViewer et enlève la couche */
function stopRainviewerAnimation() {
  if (rainviewerAnimTimer) {
    clearInterval(rainviewerAnimTimer);
    rainviewerAnimTimer = null;
  }
  if (radarMapInstance && rainviewerTileLayer) {
    radarMapInstance.removeLayer(rainviewerTileLayer);
    rainviewerTileLayer = null;
  }
}

/** Retourne l'index de l'heure "maintenant" dans le tableau Open-Meteo */
function getRadarBaseIndex(hourlyTimes) {
  const now = new Date();
  for (let i = 0; i < hourlyTimes.length; i++) {
    const t = new Date(hourlyTimes[i]);
    if (t >= now) return i;
  }
  return 0;
}

/** Met à jour le label de fenêtre temporelle */
function updateRadarWindowLabel(baseIndex, startIndex, horizonHours) {
  if (!radarWindowText) return;
  const diffHours = Math.max(0, startIndex - baseIndex);
  const startH = diffHours;
  const endH = diffHours + horizonHours;
  if (diffHours === 0) {
    radarWindowText.textContent = `Maintenant → +${horizonHours} h`;
  } else {
    radarWindowText.textContent = `+${startH} h → +${endH} h`;
  }
}

/** Initialise / recentre la carte Leaflet sur la ville sélectionnée */
function ensureRadarMap() {
  if (!selectedCity) return;
  if (!radarMapInstance) {
    radarMapInstance = L.map("radar-map", {
      zoomControl: false,
      attributionControl: false,
    });
  }
  radarMapInstance.setView([selectedCity.lat, selectedCity.lon], 8);

  if (!radarBaseLayer) {
    radarBaseLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 11,
    });
    radarBaseLayer.addTo(radarMapInstance);
  }
}

/** Choix de la couche OpenWeather (vent / température / pluie) */
function getOpenWeatherLayerName() {
  if (radarVariable === "wind") return "wind_new";
  if (radarVariable === "temp") return "temp_new";
  return "precipitation_new";
}

/** Applique la couche OpenWeather (sauf si RainViewer est actif pour la pluie réelle) */
function refreshOpenWeatherLayer() {
  if (!radarMapInstance) return;

  // si pluie réelle = RainViewer gère l'overlay
  if (radarTemporalMode === "real" && radarVariable === "rain") {
    if (radarTileLayer) {
      radarMapInstance.removeLayer(radarTileLayer);
      radarTileLayer = null;
    }
    return;
  }

  if (radarTileLayer) {
    radarMapInstance.removeLayer(radarTileLayer);
    radarTileLayer = null;
  }

  if (!OPENWEATHER_API_KEY || OPENWEATHER_API_KEY === "A_METTRE_ICI") {
    return;
  }

  const layerName = getOpenWeatherLayerName();
  const url = `https://tile.openweathermap.org/map/${layerName}/{z}/{x}/{y}.png?appid=${OPENWEATHER_API_KEY}`;

  radarTileLayer = L.tileLayer(url, {
    opacity: 0.7,
  });
  radarTileLayer.addTo(radarMapInstance);
}

/** Colorise un halo autour de la ville pour illustrer l'intensité locale */
function updateFutureOverlay(variable, intensity) {
  if (!radarMapInstance || !selectedCity) return;

  if (radarFutureOverlay) {
    radarMapInstance.removeLayer(radarFutureOverlay);
    radarFutureOverlay = null;
  }

  if (!intensity || intensity === 0) {
    return; // pas de phénomène notable
  }

  let fillColor = "rgba(79,141,255,0.25)";
  let fillOpacity = 0.25;

  if (variable === "rain") {
    if (intensity === 1) {
      fillColor = "rgba(74,157,255,0.25)";
      fillOpacity = 0.25;
    } else if (intensity === 2) {
      fillColor = "rgba(245,208,52,0.32)";
      fillOpacity = 0.32;
    } else if (intensity === 3) {
      fillColor = "rgba(255,74,74,0.40)";
      fillOpacity = 0.40;
    }
  } else if (variable === "wind") {
    if (intensity === 1) {
      fillColor = "rgba(53,214,156,0.25)"; // vent faible
      fillOpacity = 0.25;
    } else if (intensity === 2) {
      fillColor = "rgba(255,154,60,0.32)"; // vent modéré/fort
      fillOpacity = 0.32;
    } else if (intensity === 3) {
      fillColor = "rgba(255,74,74,0.40)"; // tempête
      fillOpacity = 0.40;
    }
  } else if (variable === "temp") {
    if (intensity === 1) {
      fillColor = "rgba(15,23,42,0.35)"; // très froid
      fillOpacity = 0.35;
    } else if (intensity === 2) {
      fillColor = "rgba(251,191,36,0.32)"; // tempéré
      fillOpacity = 0.32;
    } else if (intensity === 3) {
      fillColor = "rgba(185,28,28,0.40)"; // chaud / très chaud
      fillOpacity = 0.40;
    }
  }

  radarFutureOverlay = L.circle([selectedCity.lat, selectedCity.lon], {
    radius: 25000, // ~25 km -> "zone locale" agrandissable via zoom
    color: "transparent",
    fillColor,
    fillOpacity,
    stroke: false,
  });

  radarFutureOverlay.addTo(radarMapInstance);
}

/* --------------------------------------------------------------------------
   16.2 – Timeline radar (pluie / vent / température)
-------------------------------------------------------------------------- */

/** Ajoute les classes de mode (pluie / vent / temp) pour colorer la grille */
function applyRadarGridModeClass() {
  if (!radarGrid) return;
  radarGrid.classList.remove("radar-grid-rain", "radar-grid-wind", "radar-grid-temp");
  if (radarVariable === "rain") radarGrid.classList.add("radar-grid-rain");
  else if (radarVariable === "wind") radarGrid.classList.add("radar-grid-wind");
  else if (radarVariable === "temp") radarGrid.classList.add("radar-grid-temp");
}

/** Dessine la timeline 12 cases selon la variable active */
function renderRadarTimeline() {
  if (!radarGrid || !selectedCity) return;
  const data = weatherCache[selectedCity.name];
  if (!data || !data.hourly || !data.hourly.time || !data.hourly.time.length) return;

  const h = data.hourly;
  const baseIndex = getRadarBaseIndex(h.time);

  // HORIZON (en heures) selon la variable :
  // - Pluie futur : +3 h (simulation) / 12 cases
  // - Vent/Temp : fenêtre de 12 h dans un horizon jusqu'à +36 h
  let horizonHours = 12;
  let maxOffset = 0;

  if (radarVariable === "rain") {
    if (radarTemporalMode === "future") {
      // Pluie future : fenêtre de 3 h (12 pas de 15 min) avec slider actif
      horizonHours = 3; 
      maxOffset = 12;
    } else {
      horizonHours = 12;
      maxOffset = Math.min(12, Math.max(0, h.time.length - baseIndex - horizonHours));
    }
  } else {
    // vent / température : horizon étendu à +36 h, fenêtre de 12 h
    const maxPossible = Math.max(0, h.time.length - baseIndex - horizonHours);
    maxOffset = Math.min(36, maxPossible);
  }

  let offset = 0;
  if (radarTimelineSlider) {
    radarTimelineSlider.min = "0";
    radarTimelineSlider.max = String(maxOffset);
    offset = Math.min(maxOffset, Number(radarTimelineSlider.value || "0"));
  }

  let startIndex = baseIndex + offset;
  const maxStart = Math.max(0, h.time.length - horizonHours);
  if (startIndex < 0) startIndex = 0;
  if (startIndex > maxStart) startIndex = maxStart;

  radarGrid.innerHTML = "";
  updateRadarWindowLabel(baseIndex, startIndex, horizonHours);

  let overlayIntensity = 0;
  const midIndexInWindow = Math.floor(horizonHours / 2);

  for (let i = 0; i < horizonHours; i++) {
    const idx = startIndex + i;
    if (idx >= h.time.length) break;
    const time = new Date(h.time[idx]);

    let value = 0;
    let intensity = 0;

    if (radarVariable === "rain") {
      value =
        (h.rain && h.rain[idx] != null)
          ? h.rain[idx]
          : (h.precipitation && h.precipitation[idx] != null
              ? h.precipitation[idx]
              : 0);
      if (value === 0) intensity = 0;
      else if (value < 0.2) intensity = 1;
      else if (value < 1) intensity = 2;
      else intensity = 3;
    } else if (radarVariable === "wind") {
      value = h.wind_speed_10m && h.wind_speed_10m[idx] != null ? h.wind_speed_10m[idx] : 0;
      if (value < 15) intensity = 1;          // vent faible
      else if (value < 35) intensity = 2;     // vent modéré / fort
      else intensity = 3;                     // tempête
    } else if (radarVariable === "temp") {
      value = h.temperature_2m && h.temperature_2m[idx] != null ? h.temperature_2m[idx] : 0;
      if (value < 0) intensity = 1;           // très froid
      else if (value < 20) intensity = 2;     // tempéré
      else intensity = 3;                     // chaud / très chaud
    }

    const hourLabel = time.getHours().toString().padStart(2, "0") + "h";

    const cell = document.createElement("div");
    cell.className = "radar-cell";
    cell.dataset.intensity = intensity.toString();
    cell.innerHTML = `
      <div class="radar-bar"></div>
      <div class="radar-hour">${hourLabel}</div>
    `;
    radarGrid.appendChild(cell);

    if (i === midIndexInWindow) {
      overlayIntensity = intensity;
    }
  }

  // mise à jour du halo local
  if (radarTemporalMode === "future") {
    updateFutureOverlay(radarVariable, overlayIntensity);
  } else if (radarFutureOverlay && radarMapInstance) {
    radarMapInstance.removeLayer(radarFutureOverlay);
    radarFutureOverlay = null;
  }
}

/** Recentrage sur "maintenant" + reset slider */
function resetRadarTimelineToNow() {
  if (!selectedCity) return;
  const data = weatherCache[selectedCity.name];
  if (!data || !data.hourly || !data.hourly.time || !data.hourly.time.length) return;

  const h = data.hourly;
  const baseIndex = getRadarBaseIndex(h.time);

  let horizonHours = 12;
  let maxOffset = 0;

  if (radarVariable === "rain" && radarTemporalMode === "future") {
    // Pluie future : fenêtre de 3 h (12 pas) et slider actif
    horizonHours = 3;
    maxOffset = 12;
  } else if (radarVariable === "rain") {
    horizonHours = 12;
    maxOffset = Math.min(12, Math.max(0, h.time.length - baseIndex - horizonHours));
  } else {
    horizonHours = 12;
    const maxPossible = Math.max(0, h.time.length - baseIndex - horizonHours);
    maxOffset = Math.min(36, maxPossible);
  }

  if (radarTimelineSlider) {
    radarTimelineSlider.min = "0";
    radarTimelineSlider.max = String(maxOffset);
    radarTimelineSlider.value = "0";
  }

  updateRadarWindowLabel(baseIndex, baseIndex, horizonHours);
  renderRadarTimeline();
}

/* --------------------------------------------------------------------------
   16.3 – Pluie / Vent / Temp : changement d'onglet & ouverture radar
-------------------------------------------------------------------------- */

/** Tabs Pluie / Vent / Températures */
function setRadarMode(kind) {
  radarVariable = kind;
  applyRadarGridModeClass();

  if (radarTabRain && radarTabWind && radarTabTemp) {
    radarTabRain.classList.remove("radar-tab-active");
    radarTabWind.classList.remove("radar-tab-active");
    radarTabTemp.classList.remove("radar-tab-active");

    if (kind === "rain") radarTabRain.classList.add("radar-tab-active");
    else if (kind === "wind") radarTabWind.classList.add("radar-tab-active");
    else if (kind === "temp") radarTabTemp.classList.add("radar-tab-active");
  }

  // Pluie réelle = RainViewer ; le reste = OpenWeather + Open-Meteo
  if (radarTemporalMode === "real" && radarVariable === "rain") {
    loadRainviewerMeta().then(() => {
      startRainviewerAnimation();
    });
  } else {
    stopRainviewerAnimation();
    refreshOpenWeatherLayer();
  }

  resetRadarTimelineToNow();
}

/** Ouverture de l'overlay Radar */
function openRadarOverlay() {
  if (!selectedCity) {
    showToast("Ajoute d'abord une ville pour afficher le radar.");
    return;
  }

  radarOverlay.classList.remove("hidden");
  radarOverlay.classList.add("active");
  document.body.classList.add("no-scroll");

  setTimeout(() => {
    ensureRadarMap();
    if (radarMapInstance) {
      radarMapInstance.invalidateSize();
    }

    applyRadarGridModeClass();

    if (radarTemporalMode === "real" && radarVariable === "rain") {
      loadRainviewerMeta().then(() => {
        startRainviewerAnimation();
      });
    } else {
      stopRainviewerAnimation();
      refreshOpenWeatherLayer();
    }

    resetRadarTimelineToNow();
  }, 60);
}

/* --------------------------------------------------------------------------
   16.4 – Résumé pluie des 2 dernières heures (basé sur Open-Meteo)
-------------------------------------------------------------------------- */

/**
 * Résumé textuel simple de l'activité pluvieuse des 2 dernières heures,
 * en utilisant les données horaires Open-Meteo autour de "maintenant".
 */
function summarizePastRain() {
  if (!selectedCity) {
    showToast("Aucune ville sélectionnée.", "error");
    return;
  }

  const data = weatherCache[selectedCity.name];
  if (!data || !data.hourly || !data.hourly.time || !data.hourly.time.length) {
    showToast("Données météo indisponibles.", "error");
    return;
  }

  const h = data.hourly;
  const times = h.time.map((t) => new Date(t));
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  let totalRain = 0;
  let maxRain = 0;
  let firstRainTime = null;
  let lastRainTime = null;

  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    if (t >= twoHoursAgo && t <= now) {
      const val =
        (h.rain && h.rain[i] != null)
          ? h.rain[i]
          : (h.precipitation && h.precipitation[i] != null
              ? h.precipitation[i]
              : 0);
      if (val > 0) {
        totalRain += val;
        maxRain = Math.max(maxRain, val);
        if (!firstRainTime) firstRainTime = t;
        lastRainTime = t;
      }
    }
  }

  if (!firstRainTime) {
    showToast("Aucune pluie détectée sur les 2 dernières heures.", "info");
    return;
  }

  const formatHour = (d) => d.getHours().toString().padStart(2, "0") + "h" + d.getMinutes().toString().padStart(2, "0");

  let maxLabel = "";
  if (maxRain < 0.2) maxLabel = "faible";
  else if (maxRain < 1) maxLabel = "modérée";
  else maxLabel = "forte / très forte";

  const msg = `Pluie entre ${formatHour(firstRainTime)} et ${formatHour(
    lastRainTime
  )} · cumul ~${totalRain.toFixed(1)} mm · intensité max ${maxLabel}.`;

  showToast(msg, "success");
}

/* --------------------------------------------------------------------------
   16.5 – Animation timeline & écouteurs
-------------------------------------------------------------------------- */

/** Démarre l'animation de la timeline Open-Meteo (mode futur) */
function startRadarTimelineAnimation() {
  if (!radarTimelineSlider) return;
  radarTimelinePlaying = true;
  radarPlay.textContent = "⏸";
  if (radarTimelineTimer) {
    clearInterval(radarTimelineTimer);
  }

  radarTimelineTimer = setInterval(() => {
    if (!radarTimelineSlider) return;
    const max = Number(radarTimelineSlider.max || "0");
    let val = Number(radarTimelineSlider.value || "0");
    if (val >= max) {
      val = 0;
    } else {
      val += 1;
    }
    radarTimelineSlider.value = String(val);
    renderRadarTimeline();
  }, 900);
}

/** Stoppe l'animation de la timeline */
function stopRadarTimelineAnimation() {
  radarTimelinePlaying = false;
  radarPlay.textContent = "▶︎";
  if (radarTimelineTimer) {
    clearInterval(radarTimelineTimer);
    radarTimelineTimer = null;
  }
}

/* --- Écouteurs RADAR --- */

if (btnRadar && radarOverlay) {
  btnRadar.addEventListener("click", openRadarOverlay);
}

if (btnCloseRadar) {
  btnCloseRadar.addEventListener("click", () => {
    radarOverlay.classList.remove("active");
    radarOverlay.classList.add("hidden");
    document.body.classList.remove("no-scroll");
    stopRainviewerAnimation();
    stopRadarTimelineAnimation();
    if (radarFutureOverlay && radarMapInstance) {
      radarMapInstance.removeLayer(radarFutureOverlay);
      radarFutureOverlay = null;
    }
  });
}

if (radarTabRain && radarTabWind && radarTabTemp) {
  radarTabRain.addEventListener("click", () => setRadarMode("rain"));
  radarTabWind.addEventListener("click", () => setRadarMode("wind"));
  radarTabTemp.addEventListener("click", () => setRadarMode("temp"));
}

if (radarTimelineSlider) {
  radarTimelineSlider.addEventListener("input", () => {
    renderRadarTimeline();
  });
}

/** Bouton unique qui alterne Radar réel / Radar futur */
if (radarModeToggle) {
  radarModeToggle.addEventListener("click", () => {
    radarTemporalMode = radarTemporalMode === "real" ? "future" : "real";
    radarModeToggle.textContent =
      radarTemporalMode === "real" ? "Radar réel" : "Radar futur";

    if (radarTemporalMode === "real" && radarVariable === "rain") {
      // Pluie réelle : RainViewer
      stopRadarTimelineAnimation();
      loadRainviewerMeta().then(() => {
        startRainviewerAnimation();
      });
    } else {
      // Futur ou autres variables : OpenWeather + timeline
      stopRainviewerAnimation();
      refreshOpenWeatherLayer();
      resetRadarTimelineToNow();
    }
  });
}

/** Play / pause de la timeline Open-Meteo (surtout utile en mode futur) */
if (radarPlay) {
  radarPlay.addEventListener("click", () => {
    if (radarTemporalMode === "real" && radarVariable === "rain") {
      // On bascule automatiquement en futur pour l'animation timeline
      radarTemporalMode = "future";
      radarModeToggle.textContent = "Radar futur";
      stopRainviewerAnimation();
      refreshOpenWeatherLayer();
      resetRadarTimelineToNow();
    }

    if (radarTimelinePlaying) {
      stopRadarTimelineAnimation();
    } else {
      startRadarTimelineAnimation();
    }
  });
}

/** Bouton résumé pluie -2 h */
if (radarSummaryButton) {
  radarSummaryButton.addEventListener("click", summarizePastRain);
}


/* --------------------------------------------------------------------------
   17. INITIALISATION
-------------------------------------------------------------------------- */

function init() {
  loadSavedCities();
  applyTheme();
}

document.addEventListener("DOMContentLoaded", init);
