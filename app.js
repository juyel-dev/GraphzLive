// app.js
import { db } from './firebase-config.js';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  increment, 
  getDoc, 
  setDoc,
  serverTimestamp,
  query,
  orderBy,
  where
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';

// DOM Elements
const graphContainer = document.getElementById('graphContainer');
const searchInput = document.getElementById('searchInput');
const filterChips = document.getElementById('filterChips');
const graphCount = document.getElementById('graphCount');
const noResults = document.getElementById('noResults');
const graphModal = document.getElementById('graphModal');
const modalContent = document.getElementById('modalContent');
const closeModal = document.querySelector('.close-modal');
const themeToggle = document.getElementById('themeToggle');
const donateBtn = document.getElementById('donateBtn');

// Global Variables
let allGraphs = [];
let filteredGraphs = [];
let popularTags = [];
let currentGraphId = null;

// Initialize App
async function initApp() {
    await loadGraphs();
    setupEventListeners();
    setupTheme();
    initializeProfitSystems();
    updateGraphCount();
}

// Load Graphs from Firestore
async function loadGraphs() {
    try {
        graphContainer.innerHTML = '<div class="loading">Loading visual knowledge...</div>';
        
        const graphsQuery = query(collection(db, 'graphs'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(graphsQuery);
        allGraphs = [];
        
        querySnapshot.forEach((doc) => {
            const graphData = doc.data();
            allGraphs.push({
                id: doc.id,
                name: graphData.name || 'Untitled Graph',
                alias: graphData.alias || '',
                description: graphData.description || 'No description available.',
                subject: graphData.subject || 'General',
                tags: graphData.tags || [],
                images: graphData.images || [graphData.image].filter(Boolean),
                source: graphData.source || '#',
                affiliateLink: graphData.affiliateLink,
                affiliateTitle: graphData.affiliateTitle,
                sponsorName: graphData.sponsorName,
                sponsorMessage: graphData.sponsorMessage,
                sponsorLink: graphData.sponsorLink,
                sponsorLogo: graphData.sponsorLogo,
                telegramLink: graphData.telegramLink,
                donationLink: graphData.donationLink,
                likeCount: graphData.likeCount || graphData.likes || 0,
                commentCount: graphData.commentCount || graphData.comments || 0,
                viewCount: graphData.viewCount || 0,
                createdAt: graphData.createdAt?.toDate() || new Date()
            });
        });
        
        updateGraphCount();
        renderGraphs(allGraphs);
        extractPopularTags();
        renderFilterChips();
        
    } catch (error) {
        console.error('Error loading graphs:', error);
        graphContainer.innerHTML = `
            <div class="error" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <h3>Failed to load graphs</h3>
                <p>Please check your connection and try again</p>
                <button onclick="loadGraphs()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--primary-color); color: white; border: none; border-radius: 8px; cursor: pointer;">Retry</button>
            </div>
        `;
    }
}

// Render Graphs
function renderGraphs(graphs) {
    graphContainer.innerHTML = '';
    filteredGraphs = graphs;
    
    if (graphs.length === 0) {
        noResults.classList.remove('hidden');
        return;
    }
    
    noResults.classList.add('hidden');
    
    graphs.forEach(graph => {
        const graphCard = createGraphCard(graph);
        graphContainer.appendChild(graphCard);
    });
}

// Create Graph Card
function createGraphCard(graph) {
    const card = document.createElement('div');
    card.className = 'graph-card';
    card.setAttribute('data-graph-id', graph.id);
    
    card.innerHTML = `
        <img src="${graph.images[0] || 'assets/default.jpg'}" 
             alt="${graph.name}" 
             class="graph-image"
             loading="lazy"
             onerror="this.src='assets/default.jpg'">
        
        <div class="graph-content">
            <h3 class="graph-title">${graph.name}</h3>
            <div class="graph-alias">${graph.alias || ''}</div>
            <p class="graph-description">${graph.description.substring(0, 100)}...</p>
            
            <div class="graph-tags">
                ${graph.tags.slice(0, 3).map(tag => 
                    `<span class="tag">#${tag}</span>`
                ).join('')}
            </div>
            
            ${graph.affiliateLink ? `
                <a href="${graph.affiliateLink}" target="_blank" class="affiliate-btn" onclick="trackEvent('affiliate_click', '${graph.id}')">
                    📘 ${graph.affiliateTitle || 'Get Notes'}
                </a>
            ` : ''}
            
            <div class="graph-meta">
                <a href="${graph.source}" target="_blank" class="source-link" onclick="trackEvent('source_click', '${graph.id}')">
                    Source ↗
                </a>
                <div class="interaction-buttons">
                    <button class="like-btn" onclick="handleLike('${graph.id}')">
                        ❤️ <span>${graph.likeCount}</span>
                    </button>
                    <button class="comment-btn" onclick="openGraphModal('${graph.id}')">
                        💬 <span>${graph.commentCount}</span>
                    </button>
                </div>
            </div>
            
            ${graph.sponsorName ? `
                <div class="sponsor-badge">
                    <span>Sponsored by ${graph.sponsorName}</span>
                </div>
            ` : ''}
        </div>
    `;
    
    // Add click event to open modal
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.like-btn') && 
            !e.target.closest('.comment-btn') && 
            !e.target.closest('.affiliate-btn') &&
            !e.target.closest('.source-link')) {
            openGraphModal(graph.id);
        }
    });
    
    return card;
}

// Handle Like
async function handleLike(graphId) {
    try {
        const graphRef = doc(db, 'graphs', graphId);
        await updateDoc(graphRef, {
            likeCount: increment(1)
        });
        
        // Update local data
        const graphIndex = allGraphs.findIndex(g => g.id === graphId);
        if (graphIndex !== -1) {
            allGraphs[graphIndex].likeCount = (allGraphs[graphIndex].likeCount || 0) + 1;
            renderGraphs(filteredGraphs.length > 0 ? filteredGraphs : allGraphs);
        }
        
        trackEvent('like', graphId);
        
    } catch (error) {
        console.error('Error liking graph:', error);
    }
}

// Open Graph Modal
async function openGraphModal(graphId) {
    const graph = allGraphs.find(g => g.id === graphId);
    if (!graph) return;
    
    currentGraphId = graphId;
    
    // Track view
    await updateDoc(doc(db, 'graphs', graphId), {
        viewCount: increment(1)
    });
    
    trackEvent('view', graphId);
    
    modalContent.innerHTML = createGraphModalContent(graph);
    graphModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Load comments
    await loadComments(graphId);
}

// Create Graph Modal Content
function createGraphModalContent(graph) {
    return `
        <div class="modal-graph" data-graph-id="${graph.id}">
            <div class="modal-header">
                <h2>${graph.name}</h2>
                <div class="modal-alias">${graph.alias || ''}</div>
            </div>
            
            <div class="modal-image">
                <img src="${graph.images[0] || 'assets/default.jpg'}" 
                     alt="${graph.name}"
                     onerror="this.src='assets/default.jpg'">
            </div>
            
            <div class="modal-details">
                <div class="modal-description">
                    <h3>Description</h3>
                    <p>${graph.description}</p>
                </div>
                
                ${graph.affiliateLink ? `
                    <div class="affiliate-section">
                        <h3>📚 Related Resources</h3>
                        <a href="${graph.affiliateLink}" target="_blank" class="affiliate-cta" onclick="trackEvent('affiliate_modal_click', '${graph.id}')">
                            ${graph.affiliateTitle || 'Get Complete Notes & Study Materials'}
                        </a>
                        <p class="affiliate-note">Premium content from trusted partners</p>
                    </div>
                ` : ''}
                
                <div class="modal-tags">
                    <h3>Tags</h3>
                    <div class="tags-container">
                        ${graph.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
                    </div>
                </div>
                
                <div class="modal-subject">
                    <strong>Subject:</strong> ${graph.subject}
                </div>
                
                ${graph.sponsorName ? `
                    <div class="sponsor-section">
                        <div class="sponsor-header">
                            <h3>🎯 Sponsored By</h3>
                            ${graph.sponsorLogo ? `<img src="${graph.sponsorLogo}" alt="${graph.sponsorName}" class="sponsor-logo">` : ''}
                        </div>
                        <div class="sponsor-body">
                            <div class="sponsor-name">${graph.sponsorName}</div>
                            <div class="sponsor-message">${graph.sponsorMessage}</div>
                            <a href="${graph.sponsorLink}" target="_blank" class="sponsor-cta" onclick="trackEvent('sponsor_click', '${graph.id}')">Learn More →</a>
                        </div>
                    </div>
                ` : ''}
                
                <div class="modal-actions">
                    <a href="${graph.source}" target="_blank" class="source-btn" onclick="trackEvent('source_modal_click', '${graph.id}')">
                        🔗 Visit Source
                    </a>
                    ${graph.telegramLink ? `
                        <a href="${graph.telegramLink}" target="_blank" class="telegram-btn" onclick="trackEvent('telegram_click', '${graph.id}')">
                            📢 Join Telegram
                        </a>
                    ` : ''}
                    <button class="share-btn" onclick="shareGraph('${graph.id}')">
                        📤 Share
                    </button>
                </div>
                
                <div class="feedback-section">
                    <h3>💬 Feedback & Comments</h3>
                    <div class="comments-container" id="comments-${graph.id}">
                        <div class="loading-comments">Loading comments...</div>
                    </div>
                    <div class="add-comment">
                        <input type="text" id="commentInput-${graph.id}" 
                               placeholder="Add your comment..." 
                               class="comment-input">
                        <button onclick="addComment('${graph.id}')" class="comment-submit">
                            Post
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Close Modal
function closeGraphModal() {
    graphModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    currentGraphId = null;
}

// Search and Filter
function setupSearch() {
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        filterGraphs(term);
    });
}

function filterGraphs(searchTerm = '') {
    if (!searchTerm) {
        filteredGraphs = [...allGraphs];
    } else {
        filteredGraphs = allGraphs.filter(graph => 
            graph.name.toLowerCase().includes(searchTerm) ||
            graph.description.toLowerCase().includes(searchTerm) ||
            graph.alias.toLowerCase().includes(searchTerm) ||
            graph.subject.toLowerCase().includes(searchTerm) ||
            graph.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
    }
    
    renderGraphs(filteredGraphs);
    updateGraphCount();
}

// Popular Tags
function extractPopularTags() {
    const tagCounts = {};
    allGraphs.forEach(graph => {
        graph.tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    });
    
    popularTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag]) => tag);
}

function renderFilterChips() {
    filterChips.innerHTML = '';
    
    popularTags.forEach(tag => {
        const chip = document.createElement('span');
        chip.className = 'filter-chip';
        chip.textContent = `#${tag}`;
        chip.addEventListener('click', () => {
            searchInput.value = tag;
            filterGraphs(tag);
        });
        filterChips.appendChild(chip);
    });
}

// Update Graph Count
function updateGraphCount() {
    const count = filteredGraphs.length > 0 ? filteredGraphs.length : allGraphs.length;
    graphCount.textContent = `${count} graphs available`;
}

// Theme Management
function setupTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggle(savedTheme);
    
    themeToggle.addEventListener('click', toggleTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeToggle(newTheme);
}

function updateThemeToggle(theme) {
    themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
}

// Comments System
async function loadComments(graphId) {
    try {
        const commentsContainer = document.getElementById(`comments-${graphId}`);
        const commentsRef = collection(db, 'graphs', graphId, 'comments');
        const commentsQuery = query(commentsRef, orderBy('timestamp', 'desc'));
        const commentsSnapshot = await getDocs(commentsQuery);
        
        const comments = [];
        commentsSnapshot.forEach(doc => {
            comments.push({ id: doc.id, ...doc.data() });
        });
        
        if (comments.length === 0) {
            commentsContainer.innerHTML = '<p class="no-comments">No comments yet. Be the first to comment!</p>';
        } else {
            commentsContainer.innerHTML = comments.map(comment => `
                <div class="comment">
                    <div class="comment-header">
                        <span class="comment-author">${comment.author || 'Anonymous'}</span>
                        <span class="comment-time">${formatTime(comment.timestamp?.toDate())}</span>
                    </div>
                    <div class="comment-text">${comment.text}</div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading comments:', error);
        const commentsContainer = document.getElementById(`comments-${graphId}`);
        commentsContainer.innerHTML = '<p class="error-comments">Failed to load comments</p>';
    }
}

async function addComment(graphId) {
    const commentInput = document.getElementById(`commentInput-${graphId}`);
    const commentText = commentInput.value.trim();
    
    if (!commentText) return;
    
    try {
        const commentsRef = collection(db, 'graphs', graphId, 'comments');
        await setDoc(doc(commentsRef), {
            text: commentText,
            author: 'Anonymous',
            timestamp: serverTimestamp(),
            likes: 0
        });
        
        // Update comment count
        const graphRef = doc(db, 'graphs', graphId);
        await updateDoc(graphRef, {
            commentCount: increment(1)
        });
        
        // Clear input and reload comments
        commentInput.value = '';
        await loadComments(graphId);
        
        // Update local data
        const graphIndex = allGraphs.findIndex(g => g.id === graphId);
        if (graphIndex !== -1) {
            allGraphs[graphIndex].commentCount = (allGraphs[graphIndex].commentCount || 0) + 1;
            renderGraphs(filteredGraphs.length > 0 ? filteredGraphs : allGraphs);
        }
        
        trackEvent('comment', graphId);
        
    } catch (error) {
        console.error('Error adding comment:', error);
        alert('Failed to add comment. Please try again.');
    }
}

// Donation System
function initializeProfitSystems() {
    setupDonationEvents();
    setupAnalytics();
}

function setupDonationEvents() {
    const donationToggle = document.getElementById('donationToggle');
    const donationPanel = document.getElementById('donationPanel');
    const closeDonation = document.querySelector('.close-donation');
    
    if (donationToggle && donationPanel) {
        donationToggle.addEventListener('click', () => {
            donationPanel.classList.toggle('hidden');
        });
        
        closeDonation.addEventListener('click', () => {
            donationPanel.classList.add('hidden');
        });
        
        // Donation option clicks
        document.querySelectorAll('.donation-option').forEach(option => {
            option.addEventListener('click', function() {
                const amount = this.dataset.amount;
                if (amount) {
                    openUPI(amount);
                }
            });
        });
        
        // Custom amount input
        const customAmountInput = document.querySelector('.custom-amount input');
        if (customAmountInput) {
            customAmountInput.addEventListener('change', (e) => {
                const amount = e.target.value;
                if (amount && amount >= 10) {
                    openUPI(amount);
                }
            });
        }
    }
    
    // Footer donate button
    if (donateBtn) {
        donateBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openUPI();
        });
    }
}

// UPI Payment Function
function openUPI(amount = '100') {
    const upiId = 'juyel@upi'; // Replace with your UPI ID
    const note = 'Support GraphzLive - Visual Learning Platform';
    const name = 'GraphzLive';
    
    const upiURL = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
    
    // Try to open UPI app
    window.location.href = upiURL;
    
    // Track donation attempt
    trackEvent('donation_attempt', null, { amount });
    
    // Fallback: Show UPI details
    setTimeout(() => {
        if (confirm('Unable to open UPI app. Copy UPI ID to clipboard?')) {
            navigator.clipboard.writeText(upiId);
            alert(`UPI ID copied: ${upiId}\nAmount: ₹${amount}\n\nPlease open your UPI app and paste the ID.`);
        }
    }, 1000);
}

function openRazorpay() {
    // Placeholder for Razorpay integration
    alert('Razorpay integration coming soon!');
    trackEvent('razorpay_click');
}

// Analytics Tracking
function setupAnalytics() {
    // Track affiliate clicks
    document.addEventListener('click', (e) => {
        if (e.target.closest('.affiliate-btn') || e.target.closest('.affiliate-cta')) {
            const graphId = e.target.closest('[data-graph-id]')?.dataset?.graphId;
            trackEvent('affiliate_click', graphId);
        }
        
        if (e.target.closest('.sponsor-cta')) {
            const graphId = e.target.closest('[data-graph-id]')?.dataset?.graphId;
            trackEvent('sponsor_click', graphId);
        }
        
        if (e.target.closest('.telegram-btn')) {
            const graphId = e.target.closest('[data-graph-id]')?.dataset?.graphId;
            trackEvent('telegram_click', graphId);
        }
    });
}

function trackEvent(eventName, graphId = null, extraData = {}) {
    const eventData = {
        event: eventName,
        graphId: graphId,
        timestamp: new Date().toISOString(),
        ...extraData
    };
    
    console.log(`📊 Analytics: ${eventName}`, eventData);
    
    // Store in localStorage for basic analytics
    const analytics = JSON.parse(localStorage.getItem('graphzlive_analytics') || '{}');
    if (!analytics.events) analytics.events = [];
    analytics.events.push(eventData);
    
    // Keep only last 100 events
    if (analytics.events.length > 100) {
        analytics.events = analytics.events.slice(-100);
    }
    
    localStorage.setItem('graphzlive_analytics', JSON.stringify(analytics));
    
    // You can send to Firebase Analytics or other service here
    // sendToFirebaseAnalytics(eventData);
}

// Share Graph
function shareGraph(graphId) {
    const graph = allGraphs.find(g => g.id === graphId);
    if (!graph) return;
    
    const shareText = `Check out this graph: ${graph.name} on GraphzLive`;
    const shareUrl = window.location.origin + window.location.pathname + `?graph=${graphId}`;
    
    if (navigator.share) {
        navigator.share({
            title: graph.name,
            text: shareText,
            url: shareUrl
        }).then(() => {
            trackEvent('share_success', graphId);
        }).catch(() => {
            trackEvent('share_failed', graphId);
        });
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(`${shareText} - ${shareUrl}`).then(() => {
            alert('Link copied to clipboard!');
            trackEvent('share_copied', graphId);
        }).catch(() => {
            // Final fallback: show URL
            prompt('Copy this link to share:', shareUrl);
        });
    }
}

// Utility Functions
function formatTime(date) {
    if (!date) return '';
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
}

function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }).format(date);
}

// Event Listeners
function setupEventListeners() {
    setupSearch();
    
    closeModal.addEventListener('click', closeGraphModal);
    graphModal.addEventListener('click', (e) => {
        if (e.target === graphModal) closeGraphModal();
    });
    
    // Keyboard events
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeGraphModal();
    });
    
    // Handle URL parameters for direct graph opening
    const urlParams = new URLSearchParams(window.location.search);
    const graphParam = urlParams.get('graph');
    if (graphParam) {
        setTimeout(() => openGraphModal(graphParam), 1000);
    }
}

// Make functions globally available for HTML onclick
window.handleLike = handleLike;
window.openGraphModal = openGraphModal;
window.closeGraphModal = closeGraphModal;
window.addComment = addComment;
window.shareGraph = shareGraph;
window.openUPI = openUPI;
window.openRazorpay = openRazorpay;
window.trackEvent = trackEvent;
window.loadGraphs = loadGraphs;

// Initialize App
document.addEventListener('DOMContentLoaded', initApp);
