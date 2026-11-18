// EulalieTV – Individual Show Page

document.addEventListener("DOMContentLoaded", async () => {
    const titleElement = document.getElementById("show-title");
    const descriptionElement = document.getElementById("show-description");
    const posterElement = document.getElementById("show-poster");
    const statusElement = document.getElementById("show-status");
    const episodesElement = document.getElementById("episodes");
    const notFoundElement = document.getElementById("show-not-found");
    const pageTitleElement = document.getElementById("show-page-title");
    const backButton = document.getElementById("back-to-shows");
    
    if (backButton) {
        backButton.addEventListener("click", () => {
            window.location.href = "shows.html";
        });
    }
    
    if (
        !titleElement ||
        !descriptionElement ||
        !statusElement ||
        !episodesElement ||
        !notFoundElement
    ) {
        console.error("EulalieTV: Show page elements are missing.");
        return;
    }
    
    if (!window.EulalieTVData) {
        console.error("EulalieTV: Shared data failed to load.");
        notFoundElement.hidden = false;
        notFoundElement.textContent = "Unable to load show information. Please try again later.";
        return;
    }

    const data = window.EulalieTVData;

    try {
        await data.ready;
    } catch (error) {
        console.error("EulalieTV: Failed to load show data.", error);
        notFoundElement.hidden = false;
        notFoundElement.textContent = "Unable to load show information. Please try again later.";
        return;
    }
    
    const params = new URLSearchParams(window.location.search);
    const showId = params.get("id");
    const show = data.getShow(showId);
    
    if (!show) {
        titleElement.textContent = "Show Not Found";
        descriptionElement.textContent = "This show may not exist or may no longer be available.";
        
        statusElement.hidden = true;
        episodesElement.hidden = true;
        notFoundElement.hidden = false;
        
        if (posterElement) {
            posterElement.hidden = true;
        }
        
        if (pageTitleElement) {
            pageTitleElement.textContent = "Show Not Found – EulalieTV";
        }
        
        return;
    }
    
    notFoundElement.hidden = true;
    episodesElement.hidden = false;
    
    titleElement.textContent = show.title;
    
    descriptionElement.textContent = show.description || "";
    descriptionElement.hidden = !show.description
    
    statusElement.textContent = show.status || "";
    statusElement.hidden = !show.status;
    
    if (show.status) {
        statusElement.dataset.status = show.status.toLowerCase();
    } else {
        delete statusElement.dataset.status;
    }
    
    if (pageTitleElement) {
        pageTitleElement.textContent = `${show.title} – EulalieTV`;
    }
    
    if (posterElement) {
        if (show.poster) {
            posterElement.src = show.poster;
            posterElement.alt = `${show.title} poster`;
            posterElement.hidden = false;
            
            posterElement.addEventListener("error", () => {
                posterElement.hidden = true;
            }, { once: true });
        } else {
            posterElement.removeAttribute("src");
            posterElement.alt = "";
            posterElement.hidden = true;
        }
    }
    
    // Build the episode list
    
    episodesElement.replaceChildren();
    
    const episodesHeading = document.createElement("h2");
    episodesHeading.textContent = "Episodes";
    episodesElement.appendChild(episodesHeading);
    
    let episodeCount = 0;
    
    const seasons = Array.isArray(show.seasons)
        ? show.seasons
        : [];
        
    seasons.forEach(season => {
        if (!season || !Number.isInteger(Number(season.number)) || !Array.isArray(season.episodes)) {
            console.warn("EulalieTV: Invalid season record skipped.", season);
            return;
        }
        
        const seasonNumber = Number(season.number);
        
        const validEpisodes = season.episodes.filter(episode => {
            if (!episode || !Number.isInteger(Number(episode.number)) || !episode.title) {
                console.warn("EulalieTV: Invalid episode record skipped.", episode);
                return false;
            }
            
            return true;
        });
        
        const seasonHeading = document.createElement("h3");
        seasonHeading.className = "season-heading";
        seasonHeading.textContent = season.title || `Season ${season.number}`;
        
        episodesElement.appendChild(seasonHeading);
        
        validEpisodes.forEach(episode => {
            episodeCount++;
            
            const card = document.createElement("article");
            card.className = "episode-card";
            
            const episodeTitle = document.createElement("h4");
            episodeTitle.textContent =
                `S${String(season.number).padStart(2, "0")}` +
                `E${String(episode.number).padStart(2, "0")} – ` +
                episode.title;
                
            card.appendChild(episodeTitle);
            
            if (episode.description) {
                const episodeDescription = document.createElement("p");
                
                episodeDescription.textContent = episode.description;
                
                card.appendChild(episodeDescription);
            }
            
            const duration = document.createElement("p");
            duration.className = "episode-duration";
            duration.textContent = formatDuration(episode.durationSeconds);
            
            card.appendChild(duration);
            
            episodesElement.appendChild(card);
        });
    });
    
    if (episodeCount === 0) {
        const message = document.createElement("p");
        message.textContent = "No episodes are available yet.";
        episodesElement.appendChild(message);
    }
});

function formatDuration(totalSeconds) {
    if (typeof totalSeconds !== "number" || !Number.isFinite(totalSeconds) || totalSeconds <= 0) {
        return ("Duration unavailable");
    }
    
    const totalMinutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (seconds === 0) {
        return `${totalMinutes} min`;
    }
    
    return `${totalMinutes} min ${seconds} sec`;
}
