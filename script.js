/* script.js
   Uses OpenWeather free endpoints:
     - current:  /data/2.5/weather
     - forecast: /data/2.5/forecast
   Replace PLACEHOLDER_KEY with your OpenWeather API key.
   Option C selected: show next 3 forecast entries (approx +3h, +6h, +9h)
*/

console.log("Script loaded (Option C - next 3 forecast entries)");

// CONFIG
const API_KEY = "ccd59c5e8afff546aeb07513036a9b55"; // <-- REPLACE this with your API key
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

// Helpers
function safeLog(...args){ console.log(...args); }
function isoNow(){ return Math.floor(Date.now()/1000); }
function toMinutes(t){ if(!t || !t.includes(":")) return 0; const [hh,mm]=t.split(":").map(x=>parseInt(x,10)); return hh*60 + (isNaN(mm)?0:mm); }

// Settings load/save
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

// Apply visual settings
function applySettings(){
  safeLog("applySettings()");
  timeEl.style.fontSize = `${clockSizeInput.value}px`;
  applyBrightness();
}

// Brightness/dimming
function applyBrightness(){
  const now = new Date();
  const curMinutes = now.getHours()*60 + now.getMinutes();
  const ds = toMinutes(dimStartInput.value);
  const de = toMinutes(dimEndInput.value);
  let target;
  if(ds < de){
    target = (curMinutes >= ds && curMinutes < de) ? 60 : parseInt(brightnessInput.value,10);
  } else {
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
setInterval(applyBrightness, 1000);

// Clock (12-hour)
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

// Build API URLs
function curUrl(){ return `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&units=imperial&appid=${API_KEY}`; }
function forecastUrl(){ return `https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&units=imperial&appid=${API_KEY}`; }

// find next forecast entry at-or-after targetUnix
function findForecastAfter(list, targetUnix){
  for(let i=0;i<list.length;i++){
    if(list[i].dt >= targetUnix) return list[i];
  }
  return list[list.length-1];
}

// Fetch both APIs and update DOM
async function fetchWeatherAll(){
  safeLog("fetchWeatherAll() start");
  try {
    // current
    const u1 = curUrl();
    safeLog("Fetching current:", u1);
    const r1 = await fetch(u1);
    if(!r1.ok){
      const txt = await r1.text();
      throw new Error(`Current HTTP ${r1.status}: ${txt}`);
    }
    const cur = await r1.json();
    safeLog("Current data:", cur);

    // forecast
    const u2 = forecastUrl();
    safeLog("Fetching forecast:", u2);
    const r2 = await fetch(u2);
    if(!r2.ok){
      const txt = await r2.text();
      throw new Error(`Forecast HTTP ${r2.status}: ${txt}`);
    }
    const f = await r2.json();
    safeLog("Forecast data:", f);

    // Update current UI
    try {
      const temp = Math.round(cur.main.temp);
      currentTempEl.textContent = `${temp}°F`;

      const weatherObj = cur.weather && cur.weather[0] ? cur.weather[0] : null;
      if(weatherObj){
        currentDescEl.textContent = weatherObj.description || "";
        currentIconEl.src = `https://openweathermap.org/img/wn/${weatherObj.icon}@2x.png`;
        currentIconEl.alt = weatherObj.description || "weather";
        safeLog("Current icon URL:", currentIconEl.src);
      } else {
        currentDescEl.textContent = "";
      }

      // precip chance: use forecast nearest to now
      const nowUnix = isoNow();
      const nearest = findForecastAfter(f.list, nowUnix);
      const popNow = (typeof nearest.pop !== "undefined") ? nearest.pop : 0;
      currentPrecipEl.textContent = `${Math.round(popNow*100)}% of rain`;
      safeLog("Nearest forecast for current pop:", nearest.dt, "pop:", popNow);

      // compute today's hi/lo from forecast entries (plus current)
      const todayNum = new Date().getDate();
      let temps = [cur.main.temp];
      f.list.forEach(it=>{
        const d = new Date(it.dt*1000);
        if(d.getDate() === todayNum) temps.push(it.main.temp);
      });
      const hi = Math.round(Math.max(...temps));
      const lo = Math.round(Math.min(...temps));
      currentHighLowEl.textContent = `H: ${hi}° • L: ${lo}°`;
      safeLog("Computed hi/lo:", hi, lo);
    } catch(e){
      console.error("Error updating current UI:", e);
    }

    // Build forecast boxes: next 3 forecast list entries (C: next 3 entries)
    forecastEl.innerHTML = "";
    const nowUnix = isoNow();
    // find first forecast at-or-after now
    let firstIndex = f.list.findIndex(it=> it.dt >= nowUnix);
    if(firstIndex === -1) firstIndex = 0;
    const picks = [firstIndex, firstIndex+1, firstIndex+2]; // next 3 entries
    safeLog("Forecast pick indexes:", picks, "list length:", f.list.length);

    picks.forEach(idx=>{
      const entry = f.list[Math.min(idx, f.list.length-1)];
      if(!entry) return;
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
      safeLog("Added forecast entry:", entry.dt, "hour:", hour, "temp:", temp, "pop:", pop, "icon:", icon);
    });

    applyBrightness();
    safeLog("fetchWeatherAll() finished");
  } catch(err){
    console.error("Weather fetch failed:", err);
    currentDescEl.textContent = "Weather unavailable";
    currentTempEl.textContent = "--°F";
    currentHighLowEl.textContent = "";
    currentPrecipEl.textContent = "";
    forecastEl.innerHTML = `<div style="padding:12px;color:rgba(255,255,255,0.8)">Forecast unavailable</div>`;
  }
}

// initial fetch + periodic refresh
fetchWeatherAll();
setInterval(fetchWeatherAll, REFRESH_MIN * 60 * 1000);

// Settings interactions
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

console.log("Dashboard initialized. Replace PLACEHOLDER_KEY with your OpenWeather API key and reload.");
