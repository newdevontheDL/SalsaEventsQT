let allEvents = [];

const eventsContainer = document.getElementById("events-container");
const filterButtons = document.querySelectorAll("button.filter");
const showPastToggle = document.getElementById("show-past-toggle"); // NEW

function getLocalTodayMidnight() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatDateTime(date) {
  const datePart = date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  const timePart = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  });

  return `${datePart} · ${timePart}`;
}

function renderEvents(filterType = "all") {
  if (!Array.isArray(allEvents) || allEvents.length === 0) {
    eventsContainer.innerHTML =
      '<div class="no-events">No events found. Check back soon.</div>';
    return;
  }

  const today = getLocalTodayMidnight();

  const upcoming = allEvents
    .map(evt => ({
      ...evt,
      dateObj: new Date(evt.dateTime)
    }))
    .filter(evt => {
      // If "Show past events" is checked, skip date filtering
      if (showPastToggle && showPastToggle.checked) {
        return true;
      }
      return evt.dateObj >= today;
    })
    .sort((a, b) => a.dateObj - b.dateObj)
    .filter(evt => {
      if (filterType === "all") return true;
      return evt.type === filterType;
    });

  if (upcoming.length === 0) {
    eventsContainer.innerHTML =
      '<div class="no-events">No upcoming events for this category yet. Check back soon.</div>';
    return;
  }

  const cardsHtml =
    '<div class="events-list">' +
    upcoming
      .map(evt => {
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
            '<img src="' + evt.imageUrl + '" alt="' + evt.title +
            ' poster" class="event-image" loading="lazy" />' +
            '</div>'
          : "";

        const linkBlock = evt.link
          ? '<div class="event-link"><a href="' +
            evt.link +
            '" target="_blank" rel="noopener noreferrer">More info / RSVP →</a></div>'
          : "";

        return (
          '<article class="event-card">' +
            '<div class="event-header">' +
              '<div class="event-title">' + evt.title + '</div>' +
              '<div class="event-chip ' + chipClass + '">' + chipLabel + '</div>' +
            '</div>' +
            imageBlock +
            '<div class="event-date-time">' + formatDateTime(evt.dateObj) + '</div>' +
            '<div class="event-location">' + evt.location + '</div>' +
            linkBlock +
          '</article>'
        );
      })
      .join("") +
    "</div>";

  eventsContainer.innerHTML = cardsHtml;
}

async function loadEvents() {
  try {
    const res = await fetch("events.json", { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    allEvents = data;
    renderEvents("all");
  } catch (err) {
    console.error("Failed to load events.json", err);
    eventsContainer.innerHTML =
      '<div class="no-events">Error loading events. Check back later.</div>';
  }
}

// Wire up filters
filterButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    filterButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const type = btn.dataset.type;
    renderEvents(type);
  });
});

// Wire up "Show past events" toggle
if (showPastToggle) {
  showPastToggle.addEventListener("change", () => {
    const activeBtn = document.querySelector("button.filter.active");
    const type = activeBtn ? activeBtn.dataset.type : "all";
    renderEvents(type);
  });
}

// Initial load
loadEvents();
