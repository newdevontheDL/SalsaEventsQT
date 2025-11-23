let allEvents = [];

const eventsContainer = document.getElementById("events-container");
const filterButtons = document.querySelectorAll("button.filter");
const cityFilter = document.getElementById("cityFilter");
const styleFilter = document.getElementById("styleFilter");

let activeType = "all";
let activeCity = "all";
let activeStyle = "all";

function getLocalTodayMidnight() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function capitalise(str) {
  if (!str) return "";
  const s = String(str);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatEventDate(start, end) {
  const dateOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
    year : "numeric"
  };
  const timeOptions = {
    hour: "2-digit",
    minute: "2-digit"
  };

  const startDatePart = start.toLocaleDateString("en-NZ", dateOptions);
  const endDatePart = end.toLocaleDateString("en-NZ", dateOptions);
  const startTimePart = start.toLocaleTimeString("en-NZ", timeOptions);
  const endTimePart = end.toLocaleTimeString("en-NZ", timeOptions);

  // Same day
  if (isSameDay(start, end)) {
    if (startTimePart !== endTimePart) {
      return startDatePart + " · " + startTimePart + "–" + endTimePart;
    }
    return startDatePart + " · " + startTimePart;
  }

  // Multi-day
  return (
    startDatePart +
    " · " +
    startTimePart +
    " – " +
    endDatePart
  );
}

function populateDropdown(selectEl, values, allLabel) {
  if (!selectEl) return;

  selectEl.innerHTML = "";

  const optAll = document.createElement("option");
  optAll.value = "all";
  optAll.textContent = allLabel;
  selectEl.appendChild(optAll);

  values.forEach((v) => {
    if (!v) return;
    const opt = document.createElement("option");
    opt.value = v.toLowerCase();
    opt.textContent = v;
    selectEl.appendChild(opt);
  });
}

function buildUpcomingList() {
  const today = getLocalTodayMidnight();

  return allEvents
    .map((evt) => {
      const startObj = new Date(evt.dateTime);
      const endObj = evt.endDateTime
        ? new Date(evt.endDateTime)
        : new Date(evt.dateTime);

      // normalised matching values
      const cityNorm = evt.city ? evt.city.trim().toLowerCase() : "";
      const styleNorm = evt.style ? String(evt.style).trim().toLowerCase() : "";
      const typeNorm = evt.type ? evt.type.trim().toLowerCase() : "";

      return {
        ...evt,
        startObj,
        endObj,
        _cityNorm: cityNorm,
        _styleNorm: styleNorm,
        _typeNorm: typeNorm
      };
    })
    // keep events whose END is today or in future
    .filter((evt) => evt.endObj >= today)
    // filter by type
    .filter((evt) => {
      if (activeType === "all") return true;
      return evt._typeNorm === activeType;
    })
    // filter by city
    .filter((evt) => {
      if (activeCity === "all") return true;
      return evt._cityNorm === activeCity;
    })
    // filter by style
    .filter((evt) => {
      if (activeStyle === "all") return true;
      return evt._styleNorm === activeStyle;
    })
    // sort by START
    .sort((a, b) => a.startObj - b.startObj);
}

function renderEvents() {
  if (!Array.isArray(allEvents) || allEvents.length === 0) {
    eventsContainer.innerHTML =
      '<div class="no-events">No events found. Check back soon.</div>';
    return;
  }

  const upcoming = buildUpcomingList();

  if (upcoming.length === 0) {
    eventsContainer.innerHTML =
      '<div class="no-events">No upcoming events that match these filters.</div>';
    return;
  }

  const cardsHtml =
    '<div class="events-list">' +
    upcoming
      .map((evt) => {
        const chipClass = evt.type || "other";
        const chipLabel =
          evt.type === "class"
            ? "Class"
            : evt.type === "social"
            ? "Social"
            : evt.type === "special"
            ? "Workshop / Special"
            : "Event";

        const imageBlock = evt.imageUrl
          ? '<div class="event-image-wrapper">' +
            '<img src="' +
            evt.imageUrl +
            '" alt="' +
            evt.title +
            ' poster" class="event-image" loading="lazy" />' +
            "</div>"
          : "";

        const linkBlock = evt.link
          ? '<div class="event-link"><a href="' +
            evt.link +
            '" target="_blank" rel="noopener noreferrer">More info / RSVP →</a></div>'
          : "";

        const metaBits = [];
        if (evt.city) metaBits.push(evt.city);
        if (evt.style) metaBits.push(capitalise(evt.style));
        const metaBlock = metaBits.length
          ? '<div class="event-meta">' + metaBits.join(" · ") + "</div>"
          : "";

        return (
          '<article class="event-card">' +
          '<div class="event-header">' +
          '<div class="event-title">' +
          evt.title +
          "</div>" +
          '<div class="event-chip ' +
          chipClass +
          '">' +
          chipLabel +
          "</div>" +
          "</div>" +
          imageBlock +
          metaBlock +
          '<div class="event-date-time">' +
          formatEventDate(evt.startObj, evt.endObj) +
          "</div>" +
          '<div class="event-location">' +
          evt.location +
          "</div>" +
          linkBlock +
          "</article>"
        );
      })
      .join("") +
    "</div>";

  eventsContainer.innerHTML = cardsHtml;
}

function setupFilterDropdowns() {
  if (!Array.isArray(allEvents) || allEvents.length === 0) return;

  const cities = new Set();
  const styles = new Set();

  allEvents.forEach((evt) => {
    if (evt.city) cities.add(evt.city.trim());
    if (evt.style) styles.add(capitalise(String(evt.style).trim()));
  });

  const sortedCities = Array.from(cities).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
  const sortedStyles = Array.from(styles).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );

  populateDropdown(cityFilter, sortedCities, "All cities");
  populateDropdown(styleFilter, sortedStyles, "All styles");

  activeCity = "all";
  activeStyle = "all";
}

async function loadEvents() {
  try {
    const res = await fetch("events.json", { cache: "no-store" });
    if (!res.ok) {
      throw new Error("HTTP " + res.status);
    }
    const data = await res.json();
    allEvents = Array.isArray(data) ? data : [];
    setupFilterDropdowns();
    renderEvents();
  } catch (err) {
    console.error("Failed to load events.json", err);
    eventsContainer.innerHTML =
      '<div class="no-events">Error loading events. Check back later.</div>';
  }
}

// Wire up type filter buttons
filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeType = (btn.dataset.type || "all").toLowerCase();
    renderEvents();
  });
});

// Wire up city/style dropdowns
if (cityFilter) {
  cityFilter.addEventListener("change", (e) => {
    const val = e.target.value || "all";
    activeCity = val === "all" ? "all" : val.toLowerCase();
    renderEvents();
  });
}

if (styleFilter) {
  styleFilter.addEventListener("change", (e) => {
    const val = e.target.value || "all";
    activeStyle = val === "all" ? "all" : val.toLowerCase();
    renderEvents();
  });
}

// Initial load
loadEvents();
