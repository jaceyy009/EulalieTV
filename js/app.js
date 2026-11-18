// EulalieTV - Shared Application JavaScript

// Page loading

window.addEventListener("load", function () {
    const loadingScreen = document.getElementById("page-loading");
    
    if (!loadingScreen) return;
    
    loadingScreen.style.opacity = "0";
    loadingScreen.style.transition = "opacity 0.4s ease";
    
    setTimeout(function () {
        loadingScreen.style.display = "none";
    }, 400);
});

// Homepage Navigation

const watchNowButton = document.getElementById("watch-now");

if (watchNowButton) {
    watchNowButton.addEventListener("click", function () {
        window.location.href = "broadcast.html";
    });
}

const browseShowsButton = document.getElementById("browse-shows");

if (browseShowsButton) {
    browseShowsButton.addEventListener("click", function () {
        window.location.href = "shows.html";
    });
}

// Homepage Schedule

document.addEventListener("DOMContentLoaded", function () {
    const data = window.EulalieTVData;
    
    const liveStatus = document.getElementById("live-status");
    const nowShowName = document.getElementById("now-show-name");
    const nextShowName = document.getElementById("next-show-name");
    
    if (!liveStatus || !nowShowName || !nextShowName) {
        return;
    }
    
    try {
        await data.ready;
    } catch (error) {
        liveStatus.textContent = "Schedule unavailable";
        nowShowName.textContent = "Unable to load the schedule.";
        nextShowName.textContent = "";
        return;
    }
    
    const timeZone = data.settings.timeZone || "America/New_York";
    
    function getEasternTimeParts() {
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: timeZone,
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23"
        }).formatToParts(new Date());
        
        const values = {};
        
        parts.forEach(function (part) {
            if (part.type !== "literal") {
                values[part.type] = part.value;
            }
        });
        
        const weekdays = {
            Sun: 0,
            Mon: 1,
            Tue: 2,
            Wed: 3,
            Thu: 4,
            Fri: 5,
            Sat: 6
        };
        
        return {
            dayOfWeek: weekdays[values.weekday],
            time: values.hour + ":" + values.minute
        };
    }
    
    function formatScheduleTime(time) {
        if (!time || !/^\d{2}:\d{2}$/.test(time)) {
            return "";
        }
        
        const parts = time.split(":");
        
        const date = new Date(Date.UTC(
            2000,
            0,
            1,
            Number(parts[0]),
            Number(parts[1])
        ));
        
        return date.toLocaleTimeString("en-US", {
            timeZone: "UTC",
            hour: "numeric",
            minute: "2-digit"
        });
    }
    
    function formatSlotTime(slot) {
        if (!slot) return "";
        
        return formatScheduleTime(slot.startTime) +
            "-" +
            formatScheduleTime(slot.endTime) +
            " ET";
    }
    
    function getEpisodeCode(slot) {
        if (!slot) return "";
        
        const season = String(slot.seasonNumber).padStart(2, "0");
        const episode = String(slot.episodeNumber).padStart(2, "0");
        
        return "S" + season + "E" + episode;
    }
    
    function getProgramDetails(slot) {
        if (!slot) return null;
        
        const show = data.getShow(slot.showId);
        
        const episode = data.getEpisode(
            slot.showId,
            slot.seasonNumber,
            slot.episodeNumber
        );
        
        if (!show || !episode) return null;
        
        return {
            show: show,
            episode: episode,
            code: getEpisodeCode(slot)
        };
    }
    
    function clearProgramDetails() {
        showName.textContent = "";
        seasonLabel.textContent = "";
        episodeLabel.textContent = "";
        episodeTitle.textContent = "";
        
        if (episodeSeparator) {
            episodeSeparator.hidden = true;
        }
    }
    
    function renderOffAir() {
        liveStatus.textContent = "OFF AIR";
        
        nowShowName.textContent = "EulalieTV is currently off air.";
        nowSeason.textContent = "";
        nowEpisode.textContent = "";
        nowTime.textContent = "";
        
        clearProgramDetails();
        
        nextShowName.textContent = "Broadcast resumes at";
        nextSeason.textContent = "";
        nextEpisode.textContent = formatScheduleTime(
            data.settings.broadcastStartTime
        ) + " ET";
        nextTime.textContent = "";
    }
    
    function renderCurrentProgram(slot) {
        const details = getProgramDetails(slot);
        
        if (!details) {
            liveStatus.textContent = "ON AIR";
            nowShowName.textContent = "No program scheduled";
            nowSeason.textContent = "";
            nowEpisode.textContent = "";
            nowTime.textContent = "";
            
            clearProgramDetails();
            return;
        }
        
        liveStatus.textContent = "ON NOW";
        showName.textContent = details.show.title;
        seasonLabel.textContent = "Season " + slot.seasonNumber;
        episodeLabel.textContent = details.code;
        episodeTitle.textContent = details.episode.title;
        
        if (episodeSeparator) {
            episodeSeparator.hidden = false;
        }
        
        nowShowName.textContent = details.show.title;
        nowSeason.textContent = "Season " + slot.seasonNumber;
        nowEpisode.textContent = details.code + " - " + details.episode.title;
        nowTime.textContent = formatSlotTime(slot);
    }
    
    function renderNextProgram(slot) {
        const details = getProgramDetails(slot);
        
        if (!details) {
            nextShowName.textContent = "No upcoming program";
            nextSeason.textContent = "";
            nextEpisode.textContent = "";
            nextTime.textContent = "";
            return;
        }
        
        nextShowName.textContent = details.show.title;
        nextSeason.textContent = "Season " + slot.seasonNumber;
        nextEpisode.textContent = details.code + " - " + details.episode.title;
        nextTime.textContent = formatSlotTime(slot);
    }
    
    function renderHomepageSchedule() {
        const currentTime = getEasternTimeParts();
        
        const startTime = data.settings.broadcastStartTime || "07:00";
        const endTime = data.settings.broadcastEndTime || "23:00";
        
        if (currentTime.time < startTime || currentTime.time >= endTime) {
            renderOffAir();
            return;
        }
        
        const currentSlot = data.getCurrentScheduleEntry(currentTime.dayOfWeek, currentTime.time);
        const nextSlot = data.getNextScheduleEntry(currentTime.dayOfWeek, currentTime.time);
        
        renderCurrentProgram(currentSlot);
        renderNextProgram(nextSlot);
    }
    
    renderHomepageSchedule();
    
    setInterval(renderHomepageSchedule, 60 * 1000);
});