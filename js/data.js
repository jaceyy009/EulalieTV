// EulalieTV – Shared Data

window.EulalieTVData = {
    settings: {
        channelName: "EulalieTV",
        timeZone: "America/New_York",
        timeZoneLabel: "ET",
        defaultSlotMinutes: 30,
        emptyScreen: "black",
        broadcastStartTime: "07:00",
        broadcastEndTime: "23:00"
    },
    
    shows: [],
    
    schedule: [],
    
    // Load all programming data from Firebase
    ready: (async function () {
        try {
            const [{ db }, firestore] = await Promise.all([
                import("./firebase.js"),
                import("https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js")
            ]);
            
            const {
                collection,
                getDocs,
                doc, getDoc
            } = firestore;
            
            // Load shows
            const showsSnapshot = await getDocs(
                collection(db, "shows")
            );
            
            const shows = showsSnapshot.docs.map(document => ({
                id: document.id,
                ...document.data(),
                seasons: []
            }));
            
            // Load episodes
            const episodesSnapshot = await getDocs(
                collection(db, "episodes")
            );
            
            const episodes = episodesSnapshot.docs.map(document => {
                const episodeData = document.data();
                
                return {
                    id: document.id,
                    number: Number(episodeData.episodeNumber),
                    title: episodeData.title || "",
                    description: episodeData.description || "",
                    durationSeconds: episodeData.durationSeconds || 0,
                    videoUrl: episodeData.videoUrl || "",
                    
                    adBreaks: (episodeData.adBreaks || []).map(adBreak => ({
                        atSeconds: adBreak.timeSeconds ?? adBreak.atSeconds,
                        maxDurationSeconds: adBreak.maxDurationSeconds
                    }))
                };
            });
            
            // Organize episodes into their respective shows and seasons
            episodesSnapshot.docs.forEach(document => {
                const episodeData = document.data();
                
                const show = shows.find(
                    item => item.id === episodeData.showId
                );
                
                if (!show) return;
                
                const seasonNumber = Number(
                    episodeData.seasonNumber
                );
                
                let season = show.seasons.find(
                    item => item.number === seasonNumber
                );
                
                if (!season) {
                    season = {
                        number: seasonNumber,
                        title: "Season " + seasonNumber,
                        episodes: []
                    };
                    
                    show.seasons.push(season);
                }
                
                const episode = episodes.find(
                    item => item.id === document.id
                );
                
                if (episode) {
                    season.episodes.push(episode);
                }
            });
            
            // Sort seasons and episodes
            shows.forEach(show => {
                show.seasons.sort(
                    (a, b) => a.number - b.number
                );
                
                show.seasons.forEach(season => {
                    season.episodes.sort(
                        (a, b) => a.number - b.number
                    );
                });
            });
            
            window.EulalieTVData.shows = shows;
            
            // Load the daily lineup
            const lineupSnapshot = await getDoc(
                doc(db, "schedule", "daily-lineup")
            );
            
            if (!lineupSnapshot.exists()) {
                throw new Error("This daily-lineup document was not found.");
            }
            
            const lineupData = lineupSnapshot.data();
            
            const startTime = lineupData.startTime || "07:00";
            const slotMinutes = Number(lineupdata.slotMinutes || 30);
            
            const lineup = lineupData.lineup || [];
            const daysOfWeek = lineupData.daysOfWeek || [];
            
            if (!lineup.length || slotMinutes <= 0) {
                throw new Error("The daily lineup is invalid.");
            }
            
            function formatTime(totalMinutes) {
                const minutes = totalMinutes % 1440;
                const hours = Math.floor(minutes / 60);
                const remainder = mintes % 60;
                
                return String(hours).padStart(2, "0") +
                    ":" +
                    String(remainder).padStart(2, "0");
            }
            
            const [startHour, startMinute] = startTime.split(":").map(Number);
            const startMinutes = startHour * 60 + startMinute;
            const endMinutes = 23 * 60;
            
            const slotCount = Math.floor(
                (endMinutes - startMinutes) / slotMintes
            );
            
            window.EulalieTVData.schedule = Array.from(
                { length: slotCount },
                (_, index) => {
                    const program = lineup[index % lineup.length];
                    const slotStart = startMinutes + index * slotMinutes;
                    const slotEnd = slotStart + slotMinutes;
                    
                    return {
                        id: "sample-slot-" + String(index + 1).padStart(3, "0"),
                        showId: program.showId,
                        seasonNumber: Number(program.seasonNumber),
                        episodeNumber: Number(program.episodeNumber),
                        startTime: formatTime(slotStart),
                        endTime: formatTime(slotEnd),
                        daysOfWeek: [...daysOfWeek]
                    };
                }
            );
            
            console.log("EulalieTV programming loaded from Firebase.");
            
            return true;
        } catch (error) {
            console.error("Unable to load EulalieTV programming:", error);
            
            throw error;
        }
    })(),
    
    // Look up a show by its ID
    getShow(showId) {
        return this.shows.find(show => show.id === showId) || null;
    },
    
    // Look up an episode using its show, season, and episode numbers
    getEpisode(showId, seasonNumber, episodeNumber) {
        const show = this.getShow(showId);
        
        if (!show) return null;
        
        const season = show.seasons.find(
            item => item.number === Number(seasonNumber)
        );
        
        if (!season) return null;
        
        return season.episodes.find(
            episode => episode.number === Number(episodeNumber)
        ) || null;
    },
    
    // Find the schedule entry for a particular slot ID
    getScheduleEntry(slotId) {
        return this.schedule.find(slot => slot.id === slotId) || null;
    },
    
    // Find the scheduled program containing a given time
    getCurrentScheduleEntry(dayOfWeek, time) {
        const entries = this.schedule.filter(slot =>
            Array.isArray(slot.daysOfWeek) &&
            slot.daysOfWeek.includes(dayOfWeek)
        );
        
        // Check today's schedule
        const currentEntry = entries.find(slot => {
            if (slot.startTime <= slot.endTime) {
                return time >= slot.startTime && time < slot.endTime;
            }
            
            // Handle a slot that crosses midnight
            return time >= slot.startTime || time < slot.endTime;
        });
        
        if (currentEntry) {
            return currentEntry;
        }
        
        // Check whether a slot that started yesterday continues past midnight
        const previousDay = (dayOfWeek + 6) % 7;
        
        return this.schedule.find(slot =>
            Array.isArray(slot.daysOfWeek) &&
            slot.daysOfWeek.includes(previousDay) &&
            slot.startTime > slot.endTime &&
            time < slot.endTime
        ) || null;
    },
    
    // Find the next scheduled program after a given time
    getNextScheduleEntry(dayOfWeek, time) {
        const todayEntries = this.schedule
            .filter(slot =>
                Array.isArray(slot.daysOfWeek) &&
                slot.daysOfWeek.includes(dayOfWeek) &&
                slot.startTime > time
            )
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
            
        if (todayEntries.length > 0) {
            return todayEntries[0];
        }
        
        // Look for the earliest program on a future day
        for (let offset = 1; offset <= 7; offset++) {
            const futureDay = (dayOfWeek + offset) % 7;
            
            const futureEntries = this.schedule
                .filter(slot =>
                    Array.isArray(slot.daysOfWeek) &&
                    slot.daysOfWeek.includes(futureDay)
                )
                .sort((a, b) => a.startTime.localeCompare(b.startTime));
                
            if (futureEntries.length > 0) {
                return futureEntries[0];
            }
        }
        
        return null;
    }
};
