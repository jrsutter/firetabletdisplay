// === CONFIG ===
const API_KEY = "ccd59c5e8afff546aeb07513036a9b55";
const LAT = "30.312156";
const LON = "-95.456014";
const REFRESH_INTERVAL_MIN = 30;

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

// === WEATHER ICON MAPPING ===
function getWeatherIcon(iconCode) {
    const map = {
        "01d":"wi-day-sunny","01n":"wi-night-clear",
        "02d":"wi-day-cloudy","02n":"wi-night-alt-cloudy",
        "03d":"wi-cloud","03n":"wi-cloud",
        "04d":"wi-cloudy","04n":"wi-cloudy",
        "09d":"wi-showers","09n":"wi-showers",
        "10d":"wi-rain","10n":"wi-rain",
        "11d":"wi-thunderstorm","11n":"wi-thunderstorm",
        "13d":"wi-snow","13n":"wi-snow",
        "50d":"wi-fog","50n":"wi-fog"
    };
    return map[iconCode] || "wi-cloud";
}

// === SETTINGS ===
function loadSettings() {
    console.log("Loading settings");
    const s = JSON.parse(localStorage.getItem('dashboard-settings') || '{}');
    clockSizeInput.value = s.clockSize || 100;
    brightnessInput.value = s.brightness || 255;
    dimStartInput.value = s.dimStart || "22:00";
    dimEndInput.value = s.dimEnd || "06:30";
    applySettings();
}

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

    // Clock and date
    timeEl.style.fontSize = `${clockSizeInput.value}px`;
    timeEl.style.color = color;
    dateEl.style.color = color;

    // Current weather
    currentTempEl.style.color = color;
    currentPrecipEl.style.color = color;
    currentIconEl.style.color = color;

    // Forecast items (text + icons)
    document.querySelectorAll('.forecast-item').forEach(item => {
        item.style.color = color; // text
        const icon = item.querySelector('.wi');
        if(icon) icon.style.color = color; // icon
    });
}

// === CLOCK ===
function updateClock() {
    const now = new Date();
    let h = now.getHours();
    const m = now.getMinutes().toString().padStart(2,"0");
    const ampm = h>=12?"PM":"AM";
    h=h%12; if(h===0) h=12;

    timeEl.textContent = `${h}:${m} ${ampm}`;
    dateEl.textContent = now.toDateString();

    // dimming
    const currentTime = now.getHours() + now.getMinutes()/60;
    const [dimStartH, dimStartM] = dimStartInput.value.split(':').map(Number);
    const [dimEndH, dimEndM] = dimEndInput.value.split(':').map(Number);
    const dimStart = dimStartH + dimStartM/60;
    const dimEnd = dimEndH + dimEndM/60;

    if(currentTime >= dimStart || currentTime < dimEnd){
        const dimmed = brightnessInput.value * 0.4;
        const color = `rgb(${dimmed},${dimmed},${dimmed})`;

        // Apply dim color to all text and icons
        timeEl.style.color=color;
        dateEl.style.color=color;
        currentTempEl.style.color=color;
        currentPrecipEl.style.color=color;
        currentIconEl.style.color=color;
        document.querySelectorAll('.forecast-item').forEach(item => {
            item.style.color = color;
            const icon = item.querySelector('.wi');
            if(icon) icon.style.color = color;
        });
    }
}

setInterval(updateClock,1000);
updateClock();

// === WEATHER FETCH ===
async function fetchWeather(){
    console.log("Fetching weather...");
    const url=`https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&units=imperial&appid=${API_KEY}`;
    console.log("URL:",url);

    try {
        const res = await fetch(url);
        if(!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();
        console.log("Weather data:",data);

        // Current weather
        const nowData = data.list[0];
        currentTempEl.textContent = `${Math.round(nowData.main.temp)}°F (H:${Math.round(nowData.main.temp_max)} L:${Math.round(nowData.main.temp_min)})`;
        const precip = nowData.pop ? Math.round(nowData.pop*100) : 0;
        currentPrecipEl.textContent = `${precip}% of rain`;
        currentIconEl.className = "wi "+getWeatherIcon(nowData.weather[0].icon);

        // Forecast next 12 hours in 4-hour chunks
        forecastEl.innerHTML="";
        for(let i=1;i<=3;i++){
            const h = data.list[i*2]; // approx 6h increments
            const hour = new Date(h.dt*1000).getHours();
            let displayHour = hour%12; if(displayHour===0) displayHour=12;
            const ampmF = hour>=12?"PM":"AM";

            const div=document.createElement('div');
            div.className='forecast-item';
            div.innerHTML=`
                <i class="wi ${getWeatherIcon(h.weather[0].icon)}"></i>
                <div>${displayHour}${ampmF}</div>
                <div>${Math.round(h.main.temp)}°F</div>
                <div>${Math.round(h.pop*100)}% of rain</div>
            `;
            forecastEl.appendChild(div);
        }

        applySettings();
    } catch(e){
        console.error("Weather fetch failed:",e);
        currentTempEl.textContent="Weather unavailable";
        currentPrecipEl.textContent="";
        currentIconEl.className="wi wi-na";
        forecastEl.innerHTML="";
    }
}

fetchWeather();
setInterval(fetchWeather, REFRESH_INTERVAL_MIN*60*1000);

// === SETTINGS PANEL ===
function showSettings(){
    settingsEl.classList.add('visible');
    if(settingsTimeout) clearTimeout(settingsTimeout);
    settingsTimeout = setTimeout(()=>settingsEl.classList.remove('visible'),5000);
}

document.getElementById('dashboard').addEventListener('click', showSettings);
clockSizeInput.addEventListener('input', applySettings);
brightnessInput.addEventListener('input', applySettings);
dimStartInput.addEventListener('input', applySettings);
dimEndInput.addEventListener('input', applySettings);
btnSave.addEventListener('click', saveSettings);
loadSettings();
