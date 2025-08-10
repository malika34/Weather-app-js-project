const API_KEY = "7b1024a0f658c5f1681d3c46be158a62";

// UI Elements
const searchInput = document.querySelector(".search-box input");
const searchBtn = document.querySelector(".search-box img");
const tempElement = document.querySelector(".temprature");
const cityElement = document.querySelector(".curr-loc-time-date h3");
const dateElement = document.querySelector(".curr-loc-time-date p");
const conditionElement = document.querySelector(".weather-condition");
const [
  tempMaxElement,
  tempMinElement,
  humidityElement,
  cloudElement,
  windElement,
] = document.querySelectorAll(".weather-stats .flex p");
const cloudIcon = document.querySelector(".cloud-icon");
const forecastContainer = document.querySelector("#forecast-container");

let clockInterval = null;

/* ---------- Utility Functions ---------- */

// Fetch JSON helper
async function fetchJSON(url, errorMessage) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(errorMessage);
  return res.json();
}

// Get coordinates & name from city
async function getCityData(city) {
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
    city
  )}&limit=1&appid=${API_KEY}`;
  const [data] = await fetchJSON(url, "Location lookup failed");
  if (!data) throw new Error("Location not found");
  return data;
}

// Local date for city
function getCityDate(tzOffset) {
  return new Date(Date.now() + tzOffset * 1000);
}

// Format date: "4:15 PM - Saturday, 9 Aug '25"
function formatFullDate(date) {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const hours = date.getUTCHours();
  const mins = String(date.getUTCMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${h12}:${mins} ${ampm} - ${
    days[date.getUTCDay()]
  }, ${date.getUTCDate()} ${months[date.getUTCMonth()]} '${String(
    date.getUTCFullYear()
  ).slice(2)}`;
}

// Format forecast time "hh:mm AM/PM"
function formatForecastTime(epoch, tz) {
  const date = new Date((epoch + tz) * 1000);
  const hours = date.getUTCHours();
  const mins = String(date.getUTCMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${h12}:${mins} ${ampm}`;
}

// Convert epoch to YYYY-MM-DD (local city time)
function localDateKey(epoch, tz) {
  const date = new Date((epoch + tz) * 1000);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

// Start live clock
function startClock(tz) {
  clearInterval(clockInterval);
  const updateTime = () =>
    (dateElement.textContent = formatFullDate(getCityDate(tz)));
  updateTime();
  clockInterval = setInterval(updateTime, 1000);
}

/* ---------- Main Weather Logic ---------- */

async function getWeather(city) {
  try {
    // 1) Get city details
    const { lat, lon, name, state, country } = await getCityData(city);
    const displayName = `${name}${state ? ", " + state : ""}, ${country}`;

    // 2) Current weather
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    const weather = await fetchJSON(weatherUrl, "Current weather not found");
    const tz = Number(weather.timezone || 0);

    // Update UI
    tempElement.textContent = `${Math.round(weather.main.temp)}°`;
    cityElement.textContent = displayName;
    conditionElement.textContent = (
      weather.weather?.[0]?.description || ""
    ).toUpperCase();
    humidityElement.textContent = `${weather.main.humidity}%`;
    cloudElement.textContent = `${weather.clouds?.all ?? 0}%`;
    windElement.textContent = `${weather.wind?.speed ?? 0} m/s`;
    cloudIcon.src = `https://openweathermap.org/img/wn/${
      weather.weather?.[0]?.icon || "01d"
    }@2x.png`;

    // Live clock
    startClock(tz);

    // 3) Forecast
    await getForecast(lat, lon, tz);
  } catch (err) {
    alert(err.message);
    console.error(err);
  }
}

async function getForecast(lat, lon, tz) {
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  const forecastData = await fetchJSON(url, "Forecast fetch failed");
  tz = Number(forecastData.city?.timezone ?? tz);

  // Max & Min Temp for today
  const todayKey = localDateKey(Math.floor(Date.now() / 1000), tz);
  const todayTemps = forecastData.list
    .filter((item) => localDateKey(item.dt, tz) === todayKey)
    .map((item) => item.main.temp);

  if (todayTemps.length) {
    tempMaxElement.textContent = `${Math.round(Math.max(...todayTemps))}°C`;
    tempMinElement.textContent = `${Math.round(Math.min(...todayTemps))}°C`;
  }

  // Forecast slots
  forecastContainer.innerHTML = "";
  forecastData.list
    .filter((item) => item.dt >= Math.floor(Date.now() / 1000))
    .slice(0, 5)
    .forEach((item) => {
      forecastContainer.innerHTML += `
        <div class="weather-forecast-stats">
          <div class="flex">
            <img src="https://openweathermap.org/img/wn/${
              item.weather[0].icon
            }.png" alt="${item.weather[0].main}" class="forecast-img">
            <div class="forecast">
              <p>${formatForecastTime(item.dt, tz)}</p>
              <p>${item.weather[0].main}</p>
            </div>
          </div>
          <p class="forecast-temp">${Math.round(item.main.temp)}°C</p>
        </div>
      `;
    });
}

/* ---------- Event Listeners ---------- */

searchBtn.addEventListener("click", () => {
  const city = searchInput.value.trim();
  if (city) getWeather(city);
});
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const city = searchInput.value.trim();
    if (city) getWeather(city);
  }
});

/* ---------- Initial Load ---------- */
getWeather("Karachi");
