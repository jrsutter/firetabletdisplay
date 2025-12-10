/* script.js
   Uses OpenWeather free endpoints:
     - current:  /data/2.5/weather
     - forecast: /data/2.5/forecast
   Replace PLACEHOLDER_KEY with your OpenWeather API key.
*/

console.log("Script loaded (full dashboard)");

// CONFIG
const API_KEY = "ccd59c5e8afff546aeb07513036a9b55"; // <- replace this with your OpenWeather API key
const LAT = 30.312156;
const LON = -95.456014;
const REFRESH_MIN = 30;

// DOM
const timeEl = document.getElementById("time");
const dateEl = document.getElementById("date");

const currentIconEl = document.getElementById("current-icon");
const currentTempEl = document.getElementById("current-temp");
const currentDescEl = document.getElementById("current-desc");
const currentHighLowEl = document.getElementById("current-highlow");
const currentPrecipEl = document.getElementById("current-precip");

const forecastEl = document.getElementById("forecast");

const settingsEl = document.getElementById("settings");
const clockSizeInput = document.getElementById("clock-size");
const brightnessInput = document.getElementById("brightness");
const dimStartInput = document.getElementById("dim-start");
const dimEndInput = document.getElementById("dim-end");
const btnSave = document.getElementById("btn-save");

let settingsTimeout = null;

// --- Utilities / Debugging ---
function safeLog(...args){ console.log(...args); }
function isoNow(){ return Math.floor(Date.now()/1000); }

// --- Settings persistence ---
function loadSettings(){
  safeLog("loadSettings()");
  const raw = localStorage.getItem("dashboard-settings");
  let s = {};
  try { s = raw ? JSON.parse(raw) : {}; } catch(e){ s = {}; }
  clockSizeInput.value = s.clockSize ?? 150;
  brightnessInput.value = s.brightness ?? 220;
  dimStartInput.value = s.dimStart ?? "21:00";
  dimEndInput.value = s.dimEnd ?? "06:00";
  applySettings();
}

function saveSettings(){
  const s = {
    clockSize: clockSizeInput.value,
    brightness: brightnessInput.value,
    dimStart: dimStartInput.value,
    dimEnd: dimEndInput.value
  };
  localStorage.setItem("dashboard-settings", JSON.stringify(s));
  safeLog("Settings saved", s);
}

// --- Apply visual settings ---
function applySettings(){
  safeLog("applySettings()");
  // clock size
  timeEl.style.fontSize = `${clockSizeInput.value}px`;
  // immediate brightness application
  applyBrightness();
}

// parse HH:MM to minutes after midnight
function toMinutes(t){
  if(!t || !t.includes(":")) return 0;
  const [hh,mm] = t.split(":").map(x=>parseInt(x,10));
  return hh*60 + (isNaN(mm)?0:mm);
}

function applyBrightness(){
  const now = new Date();
  const curMinutes = now.getHours()*60 + now.getMinutes();
  const ds = toMinutes(dimStartInput.value);
  const de = toMinutes(dimEndInput.value);

  let target;
  // if dim window does not cross midnight (ds < de), check in-range
  if(ds < de){
    target = (curMinutes >= ds && curMinutes < de) ? 60 : parseInt(brightnessInput.value,10);
  } else {
    // wraps midnight
    target = (curMinutes >= ds || curMinutes < de) ? 60 : parseInt(brightnessInput.value,10);
  }

  const color = `rgb(${target},${target},${target})`;
  timeEl.style.color = color;
  dateEl.style.color = color;
  currentTempEl.style.color = color;
  currentDescEl.style.color = color;
  currentHighLowEl.style.color = color;
  currentPrecipEl.style.color = color;
  document.querySelectorAll(".forecast-item").forEach(el => el.style.color = color);
}

// --- Clock (12-hour) ---
function updateClock(){
  const now = new Date();
  let h = now.getHours();
  const m = String(now.getMinutes()).padStart(2,"0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  timeEl.textContent = `${h}:${m} ${ampm}`;
  dateEl.textContent = now.toLocaleDateString(undefined, { weekday:"long", month:"long", day:"numeric" });
}
setInterval(updateClock, 1000);
updateClock();

// --- Weather: use free endpoints ---
// 1) Current weather: /data/2.5/weather  (gives temp, weather[0], etc.)
// 2) Forecast: /data/2.5/forecast (3-hour steps) -> we will pick closest entries for +4h/+8h/+12h

function buildCurrentUrl(){
  return `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&units=imperial&appid=${API_KEY}`;
}
function buildForecastUrl(){
  return `https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&units=imperial&appid=${API_KEY}`;
}

// find forecast list item closest at-or-after targetUnix
function findForecastAfter(list, targetUnix){
  for(let i=0;i<list.length;i++){
    if(list[i].dt >= targetUnix) return list[i];
  }
  // fallback last
  return list[list.length-1];
}

async function fetchWeatherAll(){
  safeLog("fetchWeatherAll() start");
  try {
    // current
    const curUrl = buildCurrentUrl();
    safeLog("Fetching current:", curUrl);
    const curRes = await fetch(curUrl);
    if(!curRes.ok){
      const txt = await curRes.text();
      throw new Error(`Current weather HTTP ${curRes.status}: ${txt}`);
    }
    const curData = await curRes.json();
    safeLog("Current data:", curData);

    // forecast
    const fUrl = buildForecastUrl();
    safeLog("Fetching forecast:", fUrl);
    const fRes = await fetch(fUrl);
    if(!fRes.ok){
      const txt = await fRes.text();
      throw new Error(`Forecast HTTP ${fRes.status}: ${txt}`);
    }
    const fData = await fRes.json();
    safeLog("Forecast data:", fData);

    // Update UI with current
    try {
      const c = curData;
      const temp = Math.round(c.main.temp);
      currentTempEl.textContent = `${temp}°F`;

      // description and icon
      const cw = (c.weather && c.weather[0]) ? c.weather[0] : null;
      if(cw){
        currentDescEl.textContent = cw.description || "";
        currentIconEl.src = `https://openweathermap.org/img/wn/${cw.icon}@2x.png`;
        currentIconEl.alt = cw.description || "weather";
        safeLog("Current icon URL:", currentIconEl.src);
      } else {
        currentDescEl.textContent = "";
      }

      // precip chance: forecast.list[0] corresponds to next 3-hour block; use forecast for nearest period
      const nowUnix = isoNow();
      const next0 = findForecastAfter(fData.list, nowUnix);
      const pop0 = (typeof next0.pop !== "undefined") ? next0.pop : 0;
      currentPrecipEl.textContent = `${Math.round(pop0*100)}% of rain`;
      safeLog("Using forecast entry for current POP:", next0, "pop0:", pop0);

      // compute today's high/low from forecast's same day entries + current.temp
      const today = new Date().getDate();
      let temps = [c.main.temp];
      fData.list.forEach(it => {
        const d = new Date(it.dt*1000);
        if(d.getDate() === today) temps.push(it.main.temp);
      });
      const hi = Math.round(Math.max(...temps));
      const lo = Math.round(Math.min(...temps));
      currentHighLowEl.textContent = `H: ${hi}° • L: ${lo}°`;
      safeLog("Computed hi/lo:", hi, lo);
    } catch(e){
      console.error("Failed updating current UI:", e);
    }

    // Build forecast boxes for +4h, +8h, +12h (closest available entries)
    forecastEl.innerHTML = "";
    const offsets = [4,8,12];
    const nowUnix = isoNow();
    offsets.forEach(offsetHours => {
      const target = nowUnix + offsetHours*3600;
      const entry = findForecastAfter(fData.list, target);
      if(!entry){
        safeLog("No forecast entry found for offset", offsetHours);
        return;
      }
      const icon = entry.weather && entry.weather[0] ? entry.weather[0].icon : null;
      const desc = entry.weather && entry.weather[0] ? entry.weather[0].description : "";
      const temp = Math.round(entry.main.temp);
      const pop = Math.round((entry.pop ?? 0)*100);

      const dateObj = new Date(entry.dt*1000);
      let hour = dateObj.getHours();
      const ampm = hour >= 12 ? "PM" : "AM";
      hour = hour % 12 || 12;

      const div = document.createElement("div");
      div.className = "forecast-item";
      div.innerHTML = `
        <div class="t-hour">${hour} ${ampm}</div>
        <img class="forecast-icon" src="${icon ? `https://openweathermap.org/img/wn/${icon}@2x.png` : ''}" alt="${desc}">
        <div class="t-temp">${temp}°F</div>
        <div class="t-pop">${pop}% rain</div>
      `;
      forecastEl.appendChild(div);
      safeLog(`Forecast offset ${offsetHours}h -> entry dt:${entry.dt} hour:${hour} temp:${temp} pop:${pop} icon:${icon}`);
    });

    applyBrightness();
    safeLog("fetchWeatherAll() finished successfully");
  } catch (err){
    console.error("Weather fetch failed:", err);
    // show simple error text in UI so user sees something
    currentDescEl.textContent = "Weather unavailable";
    currentTempEl.textContent = "--°F";
    currentHighLowEl.textContent = "";
    currentPrecipEl.textContent = "";
    forecastEl.innerHTML = `<div style="padding:12px;color:rgba(255,255,255,0.8)">Forecast unavailable</div>`;
  }
}

// initial fetch + interval
fetchWeatherAll();
setInterval(fetchWeatherAll, REFRESH_MIN * 60 * 1000);

// --- Settings interactions ---
// Show settings on any tap/click; hide after 10s inactivity
function showSettings(){
  settingsEl.classList.add("visible");
  if(settingsTimeout) clearTimeout(settingsTimeout);
  settingsTimeout = setTimeout(()=> settingsEl.classList.remove("visible"), 10000);
}
document.body.addEventListener("click", (ev) => {
  // ignore clicks inside settings (so user can interact)
  if(ev.target.closest("#settings")) return;
  showSettings();
});
clockSizeInput.addEventListener("input", applySettings);
brightnessInput.addEventListener("input", applySettings);
dimStartInput.addEventListener("input", applySettings);
dimEndInput.addEventListener("input", applySettings);
btnSave.addEventListener("click", ()=>{ saveSettings(); showSettings(); });

// load stored settings
loadSettings();

// remove automatic fullscreen call (must be user gesture): provide console guidance
console.log("Note: automatic fullscreen is disabled to avoid browser restrictions. Tap the browser menu to enable fullscreen (or implement a user-triggered fullscreen button).");
