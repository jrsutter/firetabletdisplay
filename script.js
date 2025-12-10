// === CONFIG ===
const API_KEY = "ccd59c5e8afff546aeb07513036a9b55";
const LAT = "30.312156";
const LON = "-95.456014";
const REFRESH_INTERVAL_MIN = 30; // refresh every 30 min

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
const dimStartInput = document.getElementById('dim-start');
const dimEndInput = document.getElementById('dim-end');
const btnSave = document.getElementById('btn-save');

let settingsTimeout;

// === LOAD SETTINGS ===
function loadSettings() {
    console.log("Loading settings");
    const s = JSON.parse(localStorage.getItem('dashboard-settings') || '{}');
    clockSizeInput.value = s.clockSize || 100;
    brightnessInput.value = s.brightness || 100;
    dimStartInput.value = s.dimStart || "22:00";
    dimEndInput.value = s.dimEnd || "06:30";
    applySettings();
}

// === SAVE SETTINGS ===
function saveSettings() {
    console.log("Saving settings");
    localStorage.setItem('dashboard-settings', JSON.stringify({
        clockSize: clockSizeInput.value,
        brightness: brightnessInput.value,
        dimStart: dimStartInput.value,
        dimEnd: dimEndInput.value
    }));
}

// === APPLY SETTINGS ===
function applySettings() {
    const brightness = brightnessInput.value;
    const color = `rgb(${brightness},${brightness},${brightness})`;

    timeEl.style.fontSize = `${clockSizeInput.value}px`;
    timeEl.style.color = color;
    dateEl.style.color = color;
    currentTempEl.style.color = color;
    currentPrecipEl.style.color = color;
    currentIconEl.style.filter = `brightness(${brightness}%)`;
}

// === CLOCK ===
function updateClock() {
    const now = new Date();
    let h = now.getHours();
    const m = now.getMinutes().toString().padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;

    timeEl.textContent = `${h}:${m} ${ampm}`;
    dateEl.textContent = now.toDateString();

    // auto-dimming
    const currentTime = now.getHours() + now.getMinutes()/60;
    const [dimStartH, dimStartM] = dimStartInput.value.split(':').map(Number);
    const [dimEndH, dimEndM] = dimEndInput.value.split(':').map(Number);
    const dimStart = dimStartH + dimStartM/60;
    const dimEnd = dimEndH + dimEndM/60;

    if(currentTime >= dimStart || currentTime < dimEnd){
        const dimmed = brightnessInput.value * 0.4;
        timeEl.style.color = `rgb(${dimmed},${dimmed},${dimmed})`;
        dateEl.style.color = `rgb(${dimmed},${dimmed},${dimmed})`;
        currentTempEl.style.color = `rgb(${dimmed},${dimmed},${dimmed})`;
        currentPrecipEl.style.color = `rgb(${dimmed},${dimmed},${dimmed})`;
    }
}

setInterval(updateClock, 1000);
updateClock();

// === WEATHER ===
async function fetchWeather() {
    console.log("Fetching weather...");
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&units=imperial&appid=${API_KEY}`;
    console.log("Weather API URL:", url);

    try {
        const res = await fetch(url);
        if(!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        console.log("Weather data received:", data);

        // Current weather (first item in list)
        const nowData = data.list[0];
        currentTempEl.textContent = `${Math.round(nowData.main.temp)}°F (H:${Math.round(nowData.main.temp_max)} L:${Math.round(nowData.main.temp_min)})`;
        const precip = nowData.pop ? Math.round(nowData.pop*100) : 0;
        currentPrecipEl.textContent = `${precip}% of rain`;
        currentIconEl.src = `https://openweathermap.org/img/wn/${nowData.weather[0].icon}@2x.png`;
        currentIconEl.alt = nowData.weather[0].description;

        // Forecast next 12 hours in 3 chunks of 4 hours
        forecastEl.innerHTML = "";
        for(let i=1; i<=3; i++){
            const h = data.list[i*2]; // each forecast is 3h apart, so *2 = 6h increments
            const div = document.createElement('div');
            div.className='forecast-item';
            const hour = new Date(h.dt * 1000).getHours();
            let displayHour = hour % 12;
            if(displayHour === 0) displayHour = 12;
            const ampmF = hour >= 12 ? "PM" : "AM";

            div.innerHTML = `
                <div style="text-align:center;">
                    <img src="https://openweathermap.org/img/wn/${h.weather[0].icon}@2x.png" 
                         alt="${h.weather[0].description}" style="width:64px;height:64px;">
                    <div>${displayHour}${ampmF}</div>
                    <div>${Math.round(h.main.temp)}°F</div>
                    <div>${Math.round(h.pop*100)}% of rain</div>
                </div>
            `;
            forecastEl.appendChild(div);
        }

    } catch(e){
        console.error("Weather fetch failed:", e);
        currentTempEl.textContent = "Weather unavailable";
        currentPrecipEl.textContent = "";
        currentIconEl.src = "";
    }
}

fetchWeather();
setInterval(fetchWeather, REFRESH_INTERVAL_MIN*60*1000);

// === SETTINGS PANEL ===
function showSettings() {
    settingsEl.classList.add('visible');
    if(settingsTimeout) clearTimeout(settingsTimeout);
    settingsTimeout = setTimeout(()=>settingsEl.classList.remove('visible'),5000);
}

// Tap anywhere to show settings
document.getElementById('dashboard').addEventListener('click', showSettings);

// Apply settings changes live
clockSizeInput.addEventListener('input', applySettings);
brightnessInput.addEventListener('input', applySettings);
dimStartInput.addEventListener('input', applySettings);
dimEndInput.addEventListener('input', applySettings);
btnSave.addEventListener('click', saveSettings);

// Load saved settings
loadSettings();
