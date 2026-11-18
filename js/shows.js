// EulalieTV – Shows Page

document.addEventListener("DOMContentLoaded", () => {
    const showsGrid = document.getElementById("shows-grid");
    const showsEmpty = document.getElementById("shows-empty");
    
    if (!showsGrid || !showsEmpty) {
        console.error("EulalieTV: Shows page elements were not found.");
        return;
    }
    
    if (!window.EulalieTVData) {
        console.error("EulalieTV: Shared data failed to load.");
        showsEmpty.hidden = false;
        showsEmpty.textContent = "Unable to load shows. Please try again later.";
        return;
    }
    
    const shows = window.EulalieTVData.shows;
    
    showsGrid.replaceChildren();
    
    if (!Array.isArray(shows) || shows.length === 0) {
        showsEmpty.hidden = false;
        showsEmpty.textContent = "No shows currently available.";
        return;
    }
    
    const validShows = shows.filter(show => {
        if (!show || !show.id || !show.title) {
            console.warn("EulalieTV: Invalid show record skipped.", show);
            return false;
        }
        
        return true;
    });
    
    if (validShows.length === 0) {
        showsEmpty.hidden = false;
        showsEmpty.textContent = "No valid shows are currently available.";
        return;
    }
    
    showsEmpty.hidden = true;
    
    validShows.forEach(show => {
        const card = document.createElement("a");
        card.className = "show-card";
        card.href = `show.html?id=${encodeURIComponent(show.id)}`;
        card.setAttribute("aria-label", `View ${show.title}`);
        
        if (show.poster) {
            const poster = document.createElement("img");
            poster.className = "show-poster";
            poster.src = show.poster;
            poster.alt = `${show.title} poster`;
            poster.loading = "lazy";
            
            poster.addEventListener("error", () => {
                poster.remove();
            });
            
            card.appendChild(poster);
        }
        
        const details = document.createElement("div");
        details.className = "show-details";
        
        const title = document.createElement("h2");
        title.className = "show-title";
        title.textContent = show.title;
        
        details.append(title);
        
        if (show.description) {
            const description = document.createElement("p");
            description.className = "show-description";
            description.textContent = show.description || "";
            
            details.appendChild(description);
        }
        
        if (show.status) {
            const status = document.createElement("span");
            status.className = "show-status";
            status.textContent = show.status || "";
            
            details.appendChild(status);
        }
        
        card.appendChild(details);
        showsGrid.appendChild(card);
    });
});