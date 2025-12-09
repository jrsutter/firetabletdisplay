// === CONFIG ===
const API_KEY = "ccd59c5e8afff546aeb07513036a9b55"; // replace with your API key
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
    console.log("Loading settings");
    const s = JSON.parse(localStorage.getItem("dashboard-settings") || "{}");
    clockSizeInput.value = s.clockSize || 150;
    brightnessInput.value = s.brightness || 100;
    dimStartInput.value = s.dimStart || "21:00";
    dimEndInput.value = s.dimEnd || "06:00";
    applySettings();
}

// === SAVE SETTINGS ===
function saveSettings() {
    console.log("Saving settings");
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
    console.log("Applying settings");
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
        brightness = (current >= dimStart && current < dimEnd) ? 40 : brightnessInput.value;
    } else {
        brightness = (current >= dimStart || current < dimEnd) ? 40 : brightnessInput.value;
    }

    const val = `rgb(${brightness},${brightness},${brightness})`;
    timeEl.style.color = val;
    dateEl.style.color = val;
    currentTempEl.style.color = val;
    currentPrecipEl.style.color = val;
    currentDescEl.style.color = val;
    document.querySelectorAll(".forecast-item").forEach(el => el.style.color = val);
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
    dateEl.textContent = now.toDateString();
}
setInterval(updateClock, 1000);
updateClock();

// === WEATHER ===
async function fetchWeather() {
    console.log("Fetching weather...");
    try {
        const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${LAT}&lon=${LON}&exclude=minutely,daily,alerts&units=imperial&appid=${API_KEY}`;
        console.log("Weather API URL:", url);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        console.log("Weather data received:", data);

        // Current weather
        const curr = data.current;
        currentTempEl.textContent = `${Math.round(curr.temp)}°F`;
        const currentPop = data.hourly[0]?.pop ?? 0;
        currentPrecipEl.textContent = `${Math.round(currentPop*100)}% of rain`;

        const currentWeather = curr.weather[0];
        currentIconEl.src = `https://openweathermap.org/img/wn/${currentWeather.icon}@2x.png`;
        currentIconEl.alt = currentWeather.description;
        currentDescEl.textContent = currentWeather.description;

        console.log("Current Temp:", curr.temp);
        console.log("Current Rain Chance:", currentPop);
        console.log("Current Icon URL:", currentIconEl.src);

        // Forecast next 12 hours in 3 chunks of 4 hours
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
                <img class="forecast-icon" src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${h.weather[0].description}">
                <div>${Math.round(h.temp)}°F</div>
                <div>${Math.round(h.pop*100)}% rain</div>
            `;
            forecastEl.appendChild(div);
            console.log(`Forecast icon URL: https://openweathermap.org/img/wn/${icon}@2x.png`);
        }

        applyBrightness();
    } catch (e) {
        console.error("Weather fetch failed:", e);
    }
}

fetchWeather();
setInterval(fetchWeather, REFRESH_INTERVAL_MIN*60*1000);

// === SETTINGS PANEL ===
function showSettings() {
    settingsEl.classList.add("visible");
    if(settingsTimeout) clearTimeout(settingsTimeout);
    settingsTimeout = setTimeout(() => settingsEl.classList.remove("visible"), 10000);
}

document.getElementById("dashboard").addEventListener("click", showSettings);

clockSizeInput.addEventListener("input", applySettings);
brightnessInput.addEventListener("input", applySettings);
dimStartInput.addEventListener("input", applySettings);
dimEndInput.addEventListener("input", applySettings);
btnSave.addEventListener("click", saveSettings);

loadSettings();

// Fullscreen
document.documentElement.requestFullscreen?.();
