// EulalieTV – Schedule Page

document.addEventListener("DOMContentLoaded", () => {
    const scheduleList = document.getElementById("schedule-list");
    const scheduleEmpty = document.getElementById("schedule-empty");
    const scheduleDate = document.getElementById("schedule-date");
    const previousButton = document.getElementById("previous-day");
    const nextButton = document.getElementById("next-day");
    const todayButton = document.getElementById("today-button");

    if (
        !scheduleList ||
        !scheduleEmpty ||
        !scheduleDate ||
        !previousButton ||
        !nextButton ||
        !todayButton
    ) {
        console.error("EulalieTV: Schedule page elements are missing.");
        return;
    }

    if (!window.EulalieTVData) {
        console.error("EulalieTV: Shared data failed to load.");
        scheduleEmpty.hidden = false;
        scheduleEmpty.textContent =
            "Unable to load the schedule. Please try again later.";
        return;
    }

    const data = window.EulalieTVData;
    const settings = data.settings;

    let selectedDate = getEasternDate();

    function getEasternDate() {
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: settings.timeZone,
            year: "numeric",
            month: "numeric",
            day: "numeric"
        }).formatToParts(new Date());

        const getPart = type =>
            Number(parts.find(part => part.type === type).value);

        return new Date(Date.UTC(
            getPart("year"),
            getPart("month") - 1,
            getPart("day")
        ));
    }

    function formatDate(date) {
        return date.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: "UTC"
        });
    }

    function formatScheduleTime(time) {
        const [hours, minutes] = time.split(":").map(Number);

        const date = new Date(
            Date.UTC(2000, 0, 1, hours, minutes)
        );

        return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
            timeZone: "UTC"
        });
    }

    function getDayOfWeek(date) {
        return date.getUTCDay();
    }

    function renderSchedule() {
        scheduleDate.textContent = formatDate(selectedDate);
        scheduleList.replaceChildren();

        const dayOfWeek = getDayOfWeek(selectedDate);
        const startTime = settings.broadcastStartTime || "07:00";
        const endTime = settings.broadcastEndTime || "23:00";

        const entries = data.schedule
            .filter(slot =>
                Array.isArray(slot.daysOfWeek) &&
                slot.daysOfWeek.includes(dayOfWeek) &&
                typeof slot.startTime === "string" &&
                typeof slot.endTime === "string" &&
                slot.startTime >= startTime &&
                slot.endTime <= endTime &&
                slot.startTime < slot.endTime
            )
            .sort((a, b) =>
                a.startTime.localeCompare(b.startTime)
            );

        if (entries.length === 0) {
            scheduleEmpty.hidden = false;
            scheduleEmpty.textContent =
                "No programs are scheduled for this date.";
            return;
        }

        scheduleEmpty.hidden = true;

        entries.forEach(slot => {
            const show = data.getShow(slot.showId);

            if (!show) {
                console.warn(
                    `EulalieTV: Show for schedule slot "${slot.id}" was not found.`,
                    slot
                );
                return;
            }

            const episode = data.getEpisode(
                slot.showId,
                slot.seasonNumber,
                slot.episodeNumber
            );

            const entry = document.createElement("article");
            entry.className = "schedule-entry";

            const time = document.createElement("div");
            time.className = "schedule-entry-time";
            time.textContent =
                `${formatScheduleTime(slot.startTime)} – ` +
                `${formatScheduleTime(slot.endTime)} ET`;

            const details = document.createElement("div");
            details.className = "schedule-entry-details";

            const title = document.createElement("h2");
            title.textContent = show.title;

            const episodeInfo = document.createElement("p");

            if (episode) {
                episodeInfo.textContent =
                    `S${String(slot.seasonNumber).padStart(2, "0")}` +
                    `E${String(slot.episodeNumber).padStart(2, "0")} • ` +
                    episode.title;
            } else {
                episodeInfo.textContent =
                    "Episode information unavailable";
            }

            const link = document.createElement("a");
            link.className = "schedule-entry-link";
            link.href =
                `show.html?id=${encodeURIComponent(show.id)}`;
            link.textContent = "View show";

            details.append(title, episodeInfo, link);
            entry.append(time, details);
            scheduleList.appendChild(entry);
        });

        if (scheduleList.children.length === 0) {
            scheduleEmpty.hidden = false;
            scheduleEmpty.textContent =
                "No valid programs are available for this date.";
        }
    }

    previousButton.addEventListener("click", () => {
        selectedDate.setUTCDate(selectedDate.getUTCDate() - 1);
        renderSchedule();
    });

    nextButton.addEventListener("click", () => {
        selectedDate.setUTCDate(selectedDate.getUTCDate() + 1);
        renderSchedule();
    });

    todayButton.addEventListener("click", () => {
        selectedDate = getEasternDate();
        renderSchedule();
    });

    renderSchedule();
});