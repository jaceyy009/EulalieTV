
// EulalieTV - Broadcast Player

// Elements

const broadcastPlayer = document.querySelector(".broadcast-player");
const broadcastOSD = document.getElementById("broadcast-osd");
const liveVideo = document.getElementById("live-video");
const broadcastMessage = document.getElementById("broadcast-message");
const broadcastLoading = document.getElementById("broadcast-loading");

function showLoading() {
    broadcastLoading?.classList.remove("hidden");
}

function hideLoading() {
    broadcastLoading?.classList.add("hidden");
}

const fullscreenButton = document.getElementById("fullscreen-button");
const fullscreenIcon = document.getElementById("fullscreen-icon");

liveVideo.addEventListener("pause", () => {
    console.log("Video paused. Current time:", liveVideo.currentTime);
});

liveVideo.addEventListener("waiting", () => {
    console.log("Video waiting for data.");
});

liveVideo.addEventListener("stalled", () => {
    console.log("Video stalled.");
});

liveVideo.addEventListener("error", () => {
    console.log("Video error:", liveVideo.error);
});

/* liveVideo.addEventListener("timeupdate", () => {
    console.log(
        "Playback:",
        liveVideo.currentTime,
        "Buffered:",
        liveVideo.buffered.length
            ? liveVideo.buffered.end(liveVideo.buffered.length - 1)
            : 0,
        "Paused:",
        liveVideo.paused
    );
}); */
                

// Shared Data

const data = window.EulalieTVData;

// OSD Visibility

let osdTimeout;

function showOSD() {
    if (!broadcastOSD) return;

    broadcastOSD.classList.add("visible");

    clearTimeout(osdTimeout);

    osdTimeout = setTimeout(function () {
        hideOSD();
    }, 4000);
}

function hideOSD() {
    if (!broadcastOSD) return;

    broadcastOSD.classList.remove("visible");
}

// Player Interaction

if (broadcastPlayer) {
    broadcastPlayer.addEventListener("mouseenter", showOSD);
    broadcastPlayer.addEventListener("mousemove", showOSD);
    broadcastPlayer.addEventListener("touchstart", showOSD);
}

// Fullscreen

if (fullscreenButton && broadcastPlayer) {
    fullscreenButton.addEventListener("click", async function (event) {
        event.preventDefault();
        event.stopPropagation();

        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else {
                await broadcastPlayer.requestFullscreen();
            }
        } catch (error) {
            console.error("Fullscreen operation failed:", error);
        }
    });
}

// Fullscreen Button State

function updateFullscreenIcon() {
    if (!fullscreenButton || !fullscreenIcon) return;

    const isFullscreen = Boolean(document.fullscreenElement);

    fullscreenIcon.src = isFullscreen
        ? "assets/icons/fullscreen-exit.svg"
        : "assets/icons/fullscreen.svg";

    fullscreenButton.setAttribute(
        "aria-label",
        isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
    );

    fullscreenButton.setAttribute(
        "aria-pressed",
        String(isFullscreen)
    );
}

document.addEventListener("fullscreenchange", updateFullscreenIcon);

updateFullscreenIcon();

function showMessage(message) {
    if (!broadcastMessage) return;

    broadcastMessage.textContent = message;
    broadcastMessage.hidden = false;
}

// Broadcast Schedule

if (liveVideo && broadcastPlayer) {
    (async function () {
        try {
            await data.ready;
        } catch (error) {
            showMessage("Unable to load the broadcast schedule.");
            console.error("Broadcast initialization failed:", error);
            return;
        }
        
        const timeZone = data.settings.timeZone || "America/New_York";

    const osdLiveStatus = document.getElementById("osd-live-status");
    const osdShowName = document.getElementById("osd-show-name");
    const osdSeason = document.getElementById("osd-season");
    const osdEpisode = document.getElementById("osd-episode");
    const osdEpisodeSeparator = document.getElementById("osd-episode-separator");
    const osdEpisodeTitle = document.getElementById("osd-episode-title");

    const osdNextShow = document.getElementById("osd-next-show");
    const osdNextEpisode = document.getElementById("osd-next-episode");

    let activeSlotId = null;
    let activeVideoUrl = null;
    let playbackOffset = 0;

    function getEasternTimeParts() {
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: timeZone,
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
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
            time: values.hour + ":" + values.minute,
            seconds: Number(values.second)
        };
    }

    function getProgramDetails(slot) {
        if (!slot || !data) return null;

        const show = data.getShow(slot.showId);

        if (!show) return null;

        const episode = data.getEpisode(
            slot.showId,
            slot.seasonNumber,
            slot.episodeNumber
        );

        if (!episode) return null;

        return {
            show: show,
            episode: episode,
            code: "S" +
                String(slot.seasonNumber).padStart(2, "0") +
                "E" +
                String(slot.episodeNumber).padStart(2, "0")
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

    function getPlaybackOffset(slot, currentTime) {
        const startParts = slot.startTime.split(":");

        const startMinutes =
            Number(startParts[0]) * 60 +
            Number(startParts[1]);

        const currentParts = currentTime.time.split(":");

        const currentMinutes =
            Number(currentParts[0]) * 60 +
            Number(currentParts[1]);

        let elapsedMinutes = currentMinutes - startMinutes;

        if (elapsedMinutes < 0) {
            elapsedMinutes += 1440;
        }

        return elapsedMinutes * 60 + currentTime.seconds;
    }

    function hideMessage() {
        if (!broadcastMessage) return;

        broadcastMessage.textContent = "";
        broadcastMessage.hidden = true;
    }

    function clearVideo() {        
        liveVideo.pause();
        liveVideo.removeAttribute("src");
        liveVideo.load();

        activeVideoUrl = null;
    }

    async function renderCurrentProgram(slot, currentTime) {
        const details = getProgramDetails(slot);

        if (!details) {
            osdLiveStatus.textContent = "OFF AIR";
            osdShowName.textContent = "";
            osdSeason.textContent = "";
            osdEpisode.textContent = "";
            osdEpisodeTitle.textContent = "";

            if (osdEpisodeSeparator) {
                osdEpisodeSeparator.hidden = true;
            }

            showMessage("No program is currently scheduled.");

            clearVideo();
            hideLoading();
            activeSlotId = null;

            return;
        }

        osdLiveStatus.textContent = "LIVE";
        osdShowName.textContent = details.show.title;
        osdSeason.textContent = "Season " + slot.seasonNumber;
        osdEpisode.textContent = details.code;
        osdEpisodeTitle.textContent = details.episode.title;

        if (osdEpisodeSeparator) {
            osdEpisodeSeparator.hidden = false;
        }

        const videoUrl = details.episode.videoUrl;

        if (!videoUrl) {
            showMessage("This program is not available yet.");

            if (activeSlotId !== slot.id || activeVideoUrl !== null) {
                clearVideo();
            }

            hideLoading();
            activeSlotId = slot.id;

            return;
        }

        hideMessage();

        if (
            activeSlotId === slot.id &&
            activeVideoUrl === videoUrl
        ) {
            return;
        }

        activeSlotId = slot.id;
        activeVideoUrl = videoUrl;

        playbackOffset = getPlaybackOffset(slot, currentTime);

        showLoading();

        try {
            const videoKey = new URL(
                videoUrl,
                document.baseURI
            ).pathname.replace(/^\/+/, "");

            const authorizationResponse = await fetch(
                "https://eulalietv-video-delivery.jaceyy012.workers.dev/authorize?key=" +
                encodeURIComponent(videoKey)
            );

            if (!authorizationResponse.ok) {
                throw new Error("Playback authorization failed.");
            }

            const authorization = await authorizationResponse.json();

            if (!authorization.url) {
                throw new Error("No playback URL was returned.");
            }

            // Make sure this is still the currently scheduled program
            if (
                activeSlotId !== slot.id ||
                activeVideoUrl !== videoUrl
            ) {
                return;
            }

            const signedVideoUrl = authorization.url;

            liveVideo.src = videoUrl;

            liveVideo.addEventListener("loadedmetadata", function onLoaded() {
                liveVideo.removeEventListener("loadedmetadata", onLoaded);

                const targetTime = Number.isFinite(liveVideo.duration)
                    ? Math.min(
                        playbackOffset,
                        Math.max(0, liveVideo.duration - 1)
                    )
                    : playbackOffset;

                liveVideo.muted = true;

                function startPlayback() {
                    liveVideo.play().then(function () {
                        hideLoading();
                    }).catch(function (error) {
                        console.warn("Automatic playback was blocked:", error);
                        showMessage("Press play to start the broadcast.");
                        hideLoading();
                    });
                }

                if (Math.abs(liveVideo.currentTime - targetTime) < 0.05) {
                    startPlayback();
                } else {
                    liveVideo.addEventListener("seeked", function onSeeked() {
                        if (liveVideo.src === new URL(videoUrl, document.baseURI).href) {
                            startPlayback();
                        }
                    }, { once: true });

                    liveVideo.currentTime = targetTime;
                }
            });

            liveVideo.load();
        } catch (error) {
            console.error("Unable to load broadcast:", error);
            showMessage("Unable to load this program. Please try again later.");
            hideLoading();
        }
    }

    function renderNextProgram(slot) {
        const details = getProgramDetails(slot);

        if (!details) {
            osdNextShow.textContent = "";
            osdNextEpisode.textContent = "No upcoming program";
            return;
        }

        osdNextShow.textContent = details.show.title;

        osdNextEpisode.textContent =
            details.code + " – " + details.episode.title +
            " (" + formatScheduleTime(slot.startTime) + " ET)";
    }

    function updateBroadcast() {
        if (!data || !Array.isArray(data.schedule)) {
            showMessage("Unable to load the broadcast schedule.");
            return;
        }

        const currentTime = getEasternTimeParts();

        const startTime = data.settings.broadcastStartTime || "07:00";
        const endTime = data.settings.broadcastEndTime || "23:00";

        // Check broadcast hours.

        if (
            currentTime.time < startTime ||
            currentTime.time >= endTime
        ) {
            osdLiveStatus.textContent = "OFF AIR";
            osdShowName.textContent = "";
            osdSeason.textContent = "";
            osdEpisode.textContent = "";
            osdEpisodeTitle.textContent = "";

            if (osdEpisodeSeparator) {
                osdEpisodeSeparator.hidden = true;
            }

            osdNextShow.textContent = "UP NEXT";
            osdNextEpisode.textContent =
                "Broadcast resumes at " +
                formatScheduleTime(startTime) + " ET";

            showMessage("EulalieTV is currently off air.");

            clearVideo();
            hideLoading();
            activeSlotId = null;

            return;
        }

        const currentSlot = data.getCurrentScheduleEntry(
            currentTime.dayOfWeek,
            currentTime.time
        );

        const nextSlot = data.getNextScheduleEntry(
            currentTime.dayOfWeek,
            currentTime.time
        );

        renderCurrentProgram(currentSlot, currentTime);
        renderNextProgram(nextSlot);
    }

        updateBroadcast();

        setInterval(updateBroadcast, 1000);
    })();
}
