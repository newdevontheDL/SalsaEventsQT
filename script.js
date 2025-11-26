const META_URL = "meta.json";
const EVENTS_URL = "events.json";

// state
let metaData = null;
let allEvents = [];
let activeTypeFilter = "all";
let activeCityFilter = "all";
let activeStyleFilter = "all";

document.addEventListener("DOMContentLoaded", () => {
  init();
});

async function init() {
  try {
    const [metaRes, eventsRes] = await Promise.all([
      fetch(META_URL),
      fetch(EVENTS_URL)
    ]);

    if (!metaRes.ok) throw new Error("Failed to load meta.json");
    if (!eventsRes.ok) throw new Error("Failed to load events.json");

    metaData = await metaRes.json();
    const eventsJson = await eventsRes.json();

    // support both [ ... ] and { events: [ ... ] }
    allEvents = Array.isArray(eventsJson)
      ? eventsJson
      : eventsJson.events || [];

    // sort by start date ascending
    allEvents.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

    setupFilters();
    renderEvents();
  } catch (err) {
    console.error(err);
    const container = document.getElementById("events-container");
    if (container) {
      container.textContent = "Error loading events.";
    }
  }
}

/* ---------- LOOKUP HELPERS ---------- */

function getCity(id) {
  return metaData?.cities?.find(c => c.id === id) || null;
}

function getStyle(id) {
  return metaData?.styles?.find(s => s.id === id) || null;
}

function getType(id) {
  return metaData?.types?.find(t => t.id === id) || null;
}

function getVenue(id) {
  return metaData?.venues?.find(v => v.id === id) || null;
}

/* ---------- FILTER UI SETUP ---------- */

function setupFilters() {
  setupTypeButtons();
  setupCityFilter();
  setupStyleFilter();
}

function setupTypeButtons() {
  const buttons = document.querySelectorAll(".filter");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeTypeFilter = btn.dataset.type || "all";
      renderEvents();
    });
  });
}

function setupCityFilter() {
  const select = document.getElementById("cityFilter");
  if (!select || !metaData?.cities) return;

  // remove any options except the "all" one
  select.querySelectorAll("option:not([value='all'])").forEach(o => o.remove());

  metaData.cities.forEach(city => {
    const opt = document.createElement("option");
    opt.value = city.id;
    opt.textContent = city.name;
    select.appendChild(opt);
  });

  select.addEventListener("change", () => {
    activeCityFilter = select.value || "all";
    renderEvents();
  });
}

function setupStyleFilter() {
  const select = document.getElementById("styleFilter");
  if (!select || !metaData?.styles) return;

  select.querySelectorAll("option:not([value='all'])").forEach(o => o.remove());

  metaData.styles.forEach(style => {
    const opt = document.createElement("option");
    opt.value = style.id;
    opt.textContent = style.name;
    select.appendChild(opt);
  });

  select.addEventListener("change", () => {
    activeStyleFilter = select.value || "all";
    renderEvents();
  });
}

/* ---------- FILTER + RENDER ---------- */

function applyFilters(events) {
  return events.filter(evt => {
    if (activeTypeFilter !== "all" && evt.type !== activeTypeFilter) {
      return false;
    }
    if (activeCityFilter !== "all" && evt.city !== activeCityFilter) {
      return false;
    }
    if (activeStyleFilter !== "all" && evt.style !== activeStyleFilter) {
      return false;
    }
    return true;
  });
}

function renderEvents() {
  const container = document.getElementById("events-container");
  if (!container) {
    console.error('No #events-container found in DOM');
    return;
  }

  const events = applyFilters(allEvents);

  if (!events.length) {
    container.innerHTML = "<p>No events match your filters.</p>";
    return;
  }

  container.innerHTML = "";

  events.forEach(evt => {
    const city  = getCity(evt.city);
    const style = getStyle(evt.style);
    const type  = getType(evt.type);
    const venue = getVenue(evt.venue);

    const when = formatEventTime(evt.dateTime, evt.endDateTime);

    const styleLabel = style?.name || evt.style || "";
    const typeLabel  = type?.label || evt.type || "";
    const cityLabel  = city?.name || evt.city || "";
    const venueName  = venue?.name || evt.location || "";
    const venueAddr  = venue?.address || "";

    const styleEmoji = style?.emoji || "";
    const typeEmoji  = type?.emoji || "";

    const card = document.createElement("article");
    card.className = "event-card";

    card.innerHTML = `
      <div class="event-image-wrapper">
        ${evt.imageUrl ? `<img src="${evt.imageUrl}" alt="${evt.title}" class="event-image" />` : ""}
      </div>

      <div class="event-content">
        <h2 class="event-title">${evt.title}</h2>

        <div class="event-datetime">${when}</div>

        <div class="event-tags">
          ${
            styleLabel
              ? `<span class="event-tag style-tag">${styleEmoji ? styleEmoji + " " : ""}${styleLabel}</span>`
              : ""
          }
          ${
            typeLabel
              ? `<span class="event-tag type-tag">${typeEmoji ? typeEmoji + " " : ""}${typeLabel}</span>`
              : ""
          }
        </div>

        <div class="event-location">
          <span class="event-venue">${venueName}</span>
          ${
            venueAddr
              ? `<span class="event-address">${venueAddr}</span>`
              : ""
          }
          ${
            cityLabel
              ? `<span class="event-city">${cityLabel}</span>`
              : ""
          }
        </div>

        ${
          evt.link
            ? `<a href="${evt.link}" target="_blank" rel="noopener" class="event-link">More info</a>`
            : ""
        }
      </div>
    `;

    container.appendChild(card);
  });
}

/* ---------- DATE FORMAT ---------- */

function formatEventTime(startIso, endIso) {
  if (!startIso) return "";

  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : null;

  const startStr = start.toLocaleString("en-NZ", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });

  if (!end) return startStr;

  // same day? just show time range
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  const endTimeStr = end.toLocaleTimeString("en-NZ", {
    hour: "2-digit",
    minute: "2-digit"
  });

  if (sameDay) {
    return `${startStr} – ${endTimeStr}`;
  }

  const endStr = end.toLocaleString("en-NZ", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });

  return `${startStr} → ${endStr}`;
}
