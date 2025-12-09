// === CONFIG ===
const API_KEY = "a0df3a129b9aae7b8aab104f4eca575a";
const LAT = "30.312156"; // replace with your latitude
const LON = "-95.456014 "; // replace with your longitude
const REFRESH_INTERVAL_MIN = 30; // refresh weather every 30 minutes

// === DOM Elements ===
const timeEl = document.getElementById('time');
const dateEl = document.getElementById('date');
const currentTempEl = document.getElementById('current-temp');
const currentPrecipEl = document.getElementById('current-precip');
const currentIconEl = document.getElementById('current-icon');
const forecastEl = document.getElementById('forecast');

const settingsEl = document.getElementById('settings');
const clockSizeInput = document.getElementById('clock-size');
const brightnessInput = document.getElementById('brightness');
const btnSave = document.getElementById('btn-save');

let settingsTimeout;

// === LOAD SETTINGS ===
function loadSettings() {
  const s = JSON.parse(localStorage.getItem('dashboard-settings') || '{}');
  clockSizeInput.value = s.clockSize || 100;
  brightnessInput.value = s.brightness || 100;
  applySettings();
}

function saveSettings() {
  localStorage.setItem('dashboard-settings', JSON.stringify({
    clockSize: clockSizeInput.value,
    brightness: brightnessInput.value
  }));
}

// === APPLY SETTINGS ===
function applySettings() {
  timeEl.style.fontSize = `${clockSizeInput.value}px`;
  const brightness = brightnessInput.value;
  const color = `rgb(${brightness},${brightness},${brightness})`;
  timeEl.style.color = color;
  dateEl.style.color = color;
  currentTempEl.style.color = color;
  currentPrecipEl.style.color = color;
}

// === CLOCK ===
function updateClock() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});
  const dateStr = now.toLocaleDateString([], {weekday:'short', month:'short', day:'numeric'});
  timeEl.textContent = timeStr;
  dateEl.textContent = dateStr;
}
setInterval(updateClock,1000);
updateClock();

// === WEATHER ===
async function fetchWeather() {
  try {
    const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${LAT}&lon=${LON}&exclude=minutely,daily,alerts&units=imperial&appid=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    // Current
    currentTempEl.textContent = `${Math.round(data.current.temp)}°F`;
    const precip = data.current.pop ? Math.round(data.current.pop*100) : 0;
    currentPrecipEl.textContent = `${precip}%`;
    currentIconEl.src = `https://openweathermap.org/img/wn/${data.current.weather[0].icon}@2x.png`;
    currentIconEl.alt = data.current.weather[0].description;

    // Forecast next 12 hours in 3 chunks of 4 hours
    forecastEl.innerHTML = "";
    for(let i=4;i<=12;i+=4){
      const h = data.hourly[i];
      const div = document.createElement('div');
      div.className='forecast-item';
      div.innerHTML = `
        <img src="https://openweathermap.org/img/wn/${h.weather[0].icon}@2x.png" alt="${h.weather[0].description}">
        <span>${Math.round(h.temp)}°F</span>
        <span>${Math.round(h.pop*100)}%</span>
      `;
      forecastEl.appendChild(div);
    }

  } catch(e){
    console.error(e);
  }
}
fetchWeather();
setInterval(fetchWeather, REFRESH_INTERVAL_MIN*60*1000);

// === SETTINGS PANEL ===
function showSettings() {
  settingsEl.classList.add('visible');
  if(settingsTimeout) clearTimeout(settingsTimeout);
  settingsTimeout = setTimeout(()=>settingsEl.classList.remove('visible'),10000);
}

// Tap anywhere to show settings
document.getElementById('dashboard').addEventListener('click', showSettings);

// Apply settings changes live
clockSizeInput.addEventListener('input', applySettings);
brightnessInput.addEventListener('input', applySettings);
btnSave.addEventListener('click', saveSettings);

// Load saved settings
loadSettings();

// === FULL SCREEN ===
document.documentElement.requestFullscreen?.();
