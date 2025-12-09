// === CONFIG ===
const API_KEY = "a0df3a129b9aae7b8aab104f4eca575a";
const LAT = "30.312156";
const LON = "-95.456014";
const REFRESH_INTERVAL_MIN = 30;

// === DOM Elements ===
const timeEl = document.getElementById("time");
const dateEl = document.getElementById("date");
const currentTempEl = document.getElementById("current-temp");
const currentPrecipEl = document.getElementById("current-precip");
const currentIconEl = document.getElementById("current-icon");
const currentDescEl = document.getElementById("current-desc");
const forecastEl = document.getElementById("forecast");

const settingsEl = document.getElementById("settings");
const clockSizeInput = document.getElementById("clock-size");
const brightnessInput = document.getElementById("brightness");
const dimStartInput = document.getElementById("dim-start");
const dimEndInput = document.getElementById("dim-end");
const btnSave = document.getElementById("btn-save");

let settingsTimeout;

// === LOAD SETTINGS ===
function loadSettings() {
    const s = JSON.parse(localStorage.getItem("dashboard-settings") || "{}");

    clockSizeInput.value = s.clockSize || 150;
    brightnessInput.value = s.brightness || 100;
    dimStartInput.value = s.dimStart || "21:00";
    dimEndInput.value = s.dimEnd || "06:00";

    applySettings();
}

// === SAVE SETTINGS ===
function saveSettings() {
    localStorage.setItem(
        "dashboard-settings",
        JSON.stringify({
            clockSize: clockSizeInput.value,
            brightness: brightnessInput.value,
            dimStart: dimStartInput.value,
            dimEnd: dimEndInput.value,
        })
    );
}

// === APPLY SETTINGS ===
function applySettings() {
    // Apply clock size
    timeEl.style.fontSize = `${clockSizeInput.value}px`;

    applyBrightness();
}

// === AUTO DIM / BRIGHTEN ===
function applyBrightness() {
    const now = new Date();
    const current = now.getHours() * 60 + now.getMinutes();

    const dimStart = parseTime(dimStartInput.value);
    const dimEnd = parseTime(dimEndInput.value);

    let brightness;

    if (dimStart < dimEnd) {
        // Example: dim from 21:00 to 06:00 (wraps midnight)
        if (current >= dimStart && current < dimEnd) brightness = 40;
        else brightness = brightnessInput.value;
    } else {
        // Example: dim from 22:00 to 23:00 (no wrap)
        if (current >= dimStart || current < dimEnd) brightness = 40;
        else brightness = brightnessInput.value;
    }

    const val = `rgb(${brightness},${brightness},${brightness})`;
    timeEl.style.color = val;
    dateEl.style.color = val;
    currentTempEl.style.color = val;
    currentPrecipEl.style.color = val;
    currentDescEl.style.color = val;

    document.querySelectorAll(".forecast-item").forEach((el) => {
        el.style.color = val;
    });
}

function parseTime(t) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
}

setInterval(applyBrightness, 1000);

// === CLOCK ===
function updateClock() {
    const now = new Date();
    let h = now.getHours();
    const m = now.getMinutes().toString().padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;

    timeEl.textContent = `${h}:${m} ${ampm}`;
}
setInterval(updateClock, 1000);
updateClock();

// === WEATHER ===
async function fetchWeather() {
    try {
        const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${LAT}&lon=${LON}&exclude=minutely,daily,alerts&units=imperial&appid=${API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();

        // Current
        const curr = data.current;
        currentTempEl.textContent = `${Math.round(curr.temp)}°F`;
        currentPrecipEl.textContent = `${Math.round((curr.pop || 0) * 100)}% of rain`;
        currentIconEl.src = `https://openweathermap.org/img/wn/${curr.weather[0].icon}@2x.png`;
        currentDescEl.textContent = curr.weather[0].description;

        // Forecast
        forecastEl.innerHTML = "";

        for (let i = 4; i <= 12; i += 4) {
            const h = data.hourly[i];
            const icon = h.weather[0].icon;

            const dateObj = new Date(h.dt * 1000);
            let hour = dateObj.getHours();
            const ampm = hour >= 12 ? "PM" : "AM";
            hour = hour % 12 || 12;

            const div = document.createElement("div");
            div.className = "forecast-item";
            div.innerHTML = `
                <div>${hour} ${ampm}</div>
                <img class="forecast-icon" src="https://openweathermap.org/img/wn/${icon}@2x.png">
                <div>${Math.round(h.temp)}°F</div>
                <div>${Math.round(h.pop * 100)}% rain</div>
            `;
            forecastEl.appendChild(div);
        }

        applyBrightness();
    } catch (e) {
        console.error(e);
    }
}

fetchWeather();
setInterval(fetchWeather, REFRESH_INTERVAL_MIN * 60 * 1000);

// === SETTINGS PANEL ===
function showSettings() {
    settingsEl.classList.add("visible");
    if (settingsTimeout) clearTimeout(settingsTimeout);
    settingsTimeout = setTimeout(() => settingsEl.classList.remove("visible"), 10000);
}

document.getElementById("dashboard").addEventListener("click", showSettings);

clockSizeInput.max = 500; // increase maximum size

clockSizeInput.addEventListener("input", applySettings);
brightnessInput.addEventListener("input", applySettings);
dimStartInput.addEventListener("input", applySettings);
dimEndInput.addEventListener("input", applySettings);
btnSave.addEventListener("click", saveSettings);

// Load saved settings
loadSettings();

// Fullscreen
document.documentElement.requestFullscreen?.();
