// Global Application State
let appState = {
    notes: [],
    selectedNote: null,
    activeCategory: 'all',
    searchQuery: '',
    isFetching: false
};

// SVG progress ring values
const RING_CIRCUMFERENCE = 56.54; // 2 * PI * 9

// DOM Elements
const elements = {
    btnRefresh: document.getElementById('btn-refresh'),
    iconRefresh: document.getElementById('icon-refresh'),
    statusText: document.getElementById('status-text'),
    statusDot: document.querySelector('.status-dot'),
    searchInput: document.getElementById('search-input'),
    btnClearSearch: document.getElementById('btn-clear-search'),
    filterButtons: document.querySelectorAll('.filter-btn'),
    feedShimmer: document.getElementById('feed-shimmer'),
    errorAlert: document.getElementById('error-alert'),
    errorMessage: document.getElementById('error-message'),
    btnRetry: document.getElementById('btn-retry'),
    emptyState: document.getElementById('empty-state'),
    btnClearFilters: document.getElementById('btn-clear-filters'),
    notesList: document.getElementById('notes-list'),
    
    // Desktop Composer
    composerEmptyState: document.getElementById('composer-empty-state'),
    composerActiveState: document.getElementById('composer-active-state'),
    composerBadge: document.getElementById('composer-badge'),
    composerDate: document.getElementById('composer-date'),
    composerOriginalLink: document.getElementById('composer-original-link'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    btnCopyTweet: document.getElementById('btn-copy-tweet'),
    btnPublishTweet: document.getElementById('btn-publish-tweet'),
    charCountText: document.getElementById('char-count-text'),
    progressIndicator: document.getElementById('progress-indicator'),
    charCounter: document.getElementById('char-counter'),
    
    // Mobile Drawer
    mobileComposerOverlay: document.getElementById('mobile-composer-overlay'),
    mobileComposerBody: document.getElementById('mobile-composer-body'),
    btnCloseSheet: document.getElementById('btn-close-sheet'),
    
    // Toast Notification
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toast-message')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    fetchNotes(false);
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Refresh button
    elements.btnRefresh.addEventListener('click', () => {
        if (!appState.isFetching) fetchNotes(true);
    });
    
    // Retry button on error
    elements.btnRetry.addEventListener('click', () => {
        fetchNotes(true);
    });
    
    // Search input
    elements.searchInput.addEventListener('input', (e) => {
        appState.searchQuery = e.target.value.trim();
        elements.btnClearSearch.style.display = appState.searchQuery ? 'block' : 'none';
        applyFiltersAndSearch();
    });
    
    // Clear search button
    elements.btnClearSearch.addEventListener('click', () => {
        elements.searchInput.value = '';
        appState.searchQuery = '';
        elements.btnClearSearch.style.display = 'none';
        elements.searchInput.focus();
        applyFiltersAndSearch();
    });
    
    // Category filter pills
    elements.filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            appState.activeCategory = btn.getAttribute('data-category');
            applyFiltersAndSearch();
        });
    });
    
    // Clear all filters from empty state
    elements.btnClearFilters.addEventListener('click', () => {
        elements.searchInput.value = '';
        appState.searchQuery = '';
        elements.btnClearSearch.style.display = 'none';
        
        elements.filterButtons.forEach(b => b.classList.remove('active'));
        document.querySelector('.filter-btn[data-category="all"]').classList.add('active');
        appState.activeCategory = 'all';
        
        applyFiltersAndSearch();
    });
    
    // Desktop Composer Character Count & Live Preview
    elements.tweetTextarea.addEventListener('input', (e) => {
        updateCharacterCount(e.target.value);
    });
    
    // Copy Tweet button (Desktop)
    elements.btnCopyTweet.addEventListener('click', () => {
        copyTweetToClipboard(elements.tweetTextarea.value);
    });
    
    // Publish Tweet button (Desktop)
    elements.btnPublishTweet.addEventListener('click', () => {
        publishTweet(elements.tweetTextarea.value);
    });
    
    // Close mobile sheet
    elements.btnCloseSheet.addEventListener('click', closeMobileComposer);
    elements.mobileComposerOverlay.addEventListener('click', (e) => {
        if (e.target === elements.mobileComposerOverlay) {
            closeMobileComposer();
        }
    });
}

// Fetch Release Notes from Flask API
async function fetchNotes(forceRefresh = false) {
    appState.isFetching = true;
    showLoadingState();
    
    try {
        const url = `/api/notes${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        appState.notes = data.notes;
        
        // Show status
        const fetchTime = new Date(data.last_fetched * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        elements.statusText.textContent = forceRefresh ? `Refreshed at ${fetchTime}` : `Updated at ${fetchTime}`;
        elements.statusDot.className = "status-dot green";
        
        // Hide errors
        elements.errorAlert.style.display = 'none';
        
        // Render
        applyFiltersAndSearch();
        
        // Re-select note if it still exists
        if (appState.selectedNote) {
            const stillExists = appState.notes.find(n => n.id === appState.selectedNote.id);
            if (stillExists) {
                selectNote(stillExists);
            } else {
                deselectNote();
            }
        }
    } catch (error) {
        console.error("Failed to fetch release notes:", error);
        elements.statusText.textContent = "Error updating feed";
        elements.statusDot.className = "status-dot";
        
        // Show error UI if notes are empty
        if (appState.notes.length === 0) {
            elements.errorMessage.textContent = error.message || "Could not retrieve release notes.";
            elements.errorAlert.style.display = 'flex';
            elements.notesList.style.display = 'none';
            elements.emptyState.style.display = 'none';
        } else {
            showToast(`Could not refresh: ${error.message || "Server error"}`);
        }
    } finally {
        appState.isFetching = false;
        hideLoadingState();
    }
}

// Show Shimmer Loading Animations
function showLoadingState() {
    elements.feedShimmer.style.display = 'flex';
    elements.iconRefresh.classList.add('spinning');
    elements.btnRefresh.disabled = true;
    if (elements.notesList) elements.notesList.style.opacity = '0.5';
}

// Hide Shimmer Loading Animations
function hideLoadingState() {
    elements.feedShimmer.style.display = 'none';
    elements.iconRefresh.classList.remove('spinning');
    elements.btnRefresh.disabled = false;
    if (elements.notesList) elements.notesList.style.opacity = '1';
}

// Apply Filters and Search to Notes list
function applyFiltersAndSearch() {
    if (appState.notes.length === 0) {
        elements.notesList.style.display = 'none';
        elements.emptyState.style.display = 'none';
        return;
    }
    
    const query = appState.searchQuery.toLowerCase();
    const category = appState.activeCategory.toLowerCase();
    
    const filtered = appState.notes.filter(note => {
        // Category Filter
        let categoryMatch = false;
        if (category === 'all') {
            categoryMatch = true;
        } else if (category === 'other') {
            // "Other" matches anything not Feature, Announcement, or Issue
            const stdCategories = ['feature', 'announcement', 'issue'];
            categoryMatch = !stdCategories.includes(note.category.toLowerCase());
        } else {
            categoryMatch = note.category.toLowerCase() === category;
        }
        
        // Keyword Search Match
        let searchMatch = true;
        if (query) {
            const inDate = note.date.toLowerCase().includes(query);
            const inCat = note.category.toLowerCase().includes(query);
            const inText = note.text_content.toLowerCase().includes(query);
            searchMatch = inDate || inCat || inText;
        }
        
        return categoryMatch && searchMatch;
    });
    
    renderNotes(filtered);
}

// Render Release Notes Cards to DOM
function renderNotes(filteredNotes) {
    elements.notesList.innerHTML = '';
    
    if (filteredNotes.length === 0) {
        elements.notesList.style.display = 'none';
        elements.emptyState.style.display = 'flex';
        return;
    }
    
    elements.emptyState.style.display = 'none';
    elements.notesList.style.display = 'flex';
    
    filteredNotes.forEach(note => {
        const card = document.createElement('div');
        const catClass = note.category.toLowerCase();
        
        // Add classes for styling
        card.className = `note-card glass-panel category-${catClass}`;
        card.setAttribute('data-id', note.id);
        
        // Check if selected
        if (appState.selectedNote && appState.selectedNote.id === note.id) {
            card.classList.add('selected');
        }
        
        // Render html layout inside card
        card.innerHTML = `
            <div class="card-header">
                <div class="card-meta">
                    <span class="badge badge-${catClass}">${note.category}</span>
                    <span class="date-label"><i class="fa-regular fa-calendar"></i> ${note.date}</span>
                </div>
                <div class="card-action-shortcut" title="Draft Tweet">
                    <i class="fa-brands fa-x-twitter"></i>
                </div>
            </div>
            <div class="card-body">
                ${note.content_html}
            </div>
            <div class="card-footer">
                <a href="${note.link}" class="docs-link" target="_blank" rel="noopener noreferrer">
                    Official release notes <i class="fa-solid fa-arrow-up-right-from-square"></i>
                </a>
            </div>
        `;
        
        // Click action to select card
        card.addEventListener('click', (e) => {
            // Prevent select event if clicking links in card
            if (e.target.tagName === 'A' || e.target.closest('a')) {
                return;
            }
            selectNote(note);
        });
        
        elements.notesList.appendChild(card);
    });
}

// Select a Release Note and Open Composer
function selectNote(note) {
    appState.selectedNote = note;
    
    // Update card selection highlights
    document.querySelectorAll('.note-card').forEach(card => {
        if (card.getAttribute('data-id') === note.id) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
    
    // Check viewport width.
    const isMobile = window.innerWidth < 1024;
    
    if (isMobile) {
        openMobileComposer(note);
    } else {
        // Desktop Panel Update
        elements.composerEmptyState.style.display = 'none';
        elements.composerActiveState.style.display = 'flex';
        
        populateComposer(note, elements);
    }
}

// Deselect Selected Note
function deselectNote() {
    appState.selectedNote = null;
    document.querySelectorAll('.note-card').forEach(card => card.classList.remove('selected'));
    
    elements.composerActiveState.style.display = 'none';
    elements.composerEmptyState.style.display = 'flex';
}

// Populate Composer fields
function populateComposer(note, domElements) {
    const catClass = note.category.toLowerCase();
    
    domElements.composerBadge.textContent = note.category;
    domElements.composerBadge.className = `badge badge-${catClass}`;
    domElements.composerDate.textContent = note.date;
    domElements.composerOriginalLink.href = note.link;
    
    // Populate tweet textarea
    domElements.tweetTextarea.value = note.tweet_text;
    
    // Update length counter
    updateCharacterCount(note.tweet_text, domElements);
}

// Calculate length of tweet matching Twitter's counting (23 chars for URLs)
function calculateTweetLength(text) {
    const urlRegex = /https?:\/\/[^\s]+/g;
    let length = text.length;
    const matches = text.match(urlRegex);
    if (matches) {
        for (const match of matches) {
            length = length - match.length + 23;
        }
    }
    return length;
}

// Update Character Count progress indicators
function updateCharacterCount(text, dom = elements) {
    const length = calculateTweetLength(text);
    const charsLeft = 280 - length;
    
    dom.charCountText.textContent = charsLeft;
    
    // Progress bar percent
    const percent = Math.min(Math.max((length / 280), 0), 1);
    const strokeOffset = RING_CIRCUMFERENCE - (percent * RING_CIRCUMFERENCE);
    
    // Update SVG stroke ring
    dom.progressIndicator.style.strokeDashoffset = strokeOffset;
    
    // Check thresholds
    dom.charCounter.className = 'char-counter';
    dom.btnPublishTweet.disabled = false;
    
    if (charsLeft <= 0) {
        dom.charCounter.classList.add('error');
        dom.progressIndicator.style.stroke = 'var(--color-danger)';
        if (charsLeft < 0) {
            dom.btnPublishTweet.disabled = true; // Exceeded limit
        }
    } else if (charsLeft <= 20) {
        dom.charCounter.classList.add('warning');
        dom.progressIndicator.style.stroke = 'var(--color-issue)';
    } else {
        dom.progressIndicator.style.stroke = 'var(--primary)';
    }
}

// Copy Tweet text to Clipboard
function copyTweetToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast("Tweet copied to clipboard!");
    }).catch(err => {
        console.error("Failed to copy text: ", err);
        showToast("Failed to copy tweet text");
    });
}

// Publish Tweet via Twitter Intent API
function publishTweet(text) {
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    // Open in a standard popup window
    const width = 550;
    const height = 420;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    
    window.open(shareUrl, '_blank', `width=${width},height=${height},top=${top},left=${left},toolbar=0,status=0`);
}

// Mobile Composer Handling (Slide-up Drawer)
function openMobileComposer(note) {
    // Generate active composer contents inside mobile body
    elements.mobileComposerBody.innerHTML = `
        <div class="composer-active">
            <div class="selected-details">
                <div class="selected-meta">
                    <span id="mobile-composer-badge" class="badge">Feature</span>
                    <span id="mobile-composer-date" class="date-label">June 17, 2026</span>
                </div>
                <div class="original-link-wrapper">
                    <a id="mobile-composer-original-link" href="#" target="_blank" rel="noopener noreferrer">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i> View docs
                    </a>
                </div>
            </div>

            <div class="tweet-box-wrapper">
                <div class="tweet-user-profile">
                    <div class="user-avatar">
                        <i class="fa-solid fa-user-ninja"></i>
                    </div>
                    <div class="user-info">
                        <span class="user-name">GCP Cloud Architect</span>
                        <span class="user-handle">@gcp_tracker</span>
                    </div>
                </div>
                
                <textarea id="mobile-tweet-textarea" rows="6" placeholder="What's happening?"></textarea>
                
                <div class="tweet-footer">
                    <span class="help-text">Links automatically shrink on X.</span>
                    <div id="mobile-char-counter" class="char-counter">
                        <svg class="progress-ring" width="24" height="24">
                            <circle class="progress-ring__circle-bg" stroke="rgba(255,255,255,0.1)" stroke-width="2" fill="transparent" r="9" cx="12" cy="12"/>
                            <circle id="mobile-progress-indicator" class="progress-ring__circle" stroke="var(--primary)" stroke-width="2.5" fill="transparent" r="9" cx="12" cy="12"/>
                        </svg>
                        <span id="mobile-char-count-text">280</span>
                    </div>
                </div>
            </div>

            <div class="composer-actions">
                <button id="mobile-btn-copy-tweet" class="btn btn-outline-primary btn-full">
                    <i class="fa-solid fa-copy"></i>
                    <span>Copy Tweet Text</span>
                </button>
                <button id="mobile-btn-publish-tweet" class="btn btn-twitter btn-full">
                    <i class="fa-brands fa-x-twitter"></i>
                    <span>Tweet on X</span>
                </button>
            </div>
        </div>
    `;
    
    // Create elements mapping for mobile fields
    const mobileElements = {
        composerBadge: document.getElementById('mobile-composer-badge'),
        composerDate: document.getElementById('mobile-composer-date'),
        composerOriginalLink: document.getElementById('mobile-composer-original-link'),
        tweetTextarea: document.getElementById('mobile-tweet-textarea'),
        btnCopyTweet: document.getElementById('mobile-btn-copy-tweet'),
        btnPublishTweet: document.getElementById('mobile-btn-publish-tweet'),
        charCountText: document.getElementById('mobile-char-count-text'),
        progressIndicator: document.getElementById('mobile-progress-indicator'),
        charCounter: document.getElementById('mobile-char-counter')
    };
    
    populateComposer(note, mobileElements);
    
    // Add mobile event listeners
    mobileElements.tweetTextarea.addEventListener('input', (e) => {
        updateCharacterCount(e.target.value, mobileElements);
    });
    
    mobileElements.btnCopyTweet.addEventListener('click', () => {
        copyTweetToClipboard(mobileElements.tweetTextarea.value);
    });
    
    mobileElements.btnPublishTweet.addEventListener('click', () => {
        publishTweet(mobileElements.tweetTextarea.value);
    });
    
    // Slide up display overlay
    elements.mobileComposerOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // prevent scrolling main feed behind drawer
}

function closeMobileComposer() {
    elements.mobileComposerOverlay.style.display = 'none';
    document.body.style.overflow = ''; // restore scrolling
}

// Show Toast notification
let toastTimeout;
function showToast(message) {
    elements.toastMessage.textContent = message;
    elements.toast.style.display = 'flex';
    
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        elements.toast.style.display = 'none';
    }, 3000);
}
