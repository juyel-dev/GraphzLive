// app.js
import { db } from './firebase-config.js';
import { collection, getDocs, doc, updateDoc, increment, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';

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

// Initialize App
async function initApp() {
    await loadGraphs();
    setupEventListeners();
    setupTheme();
}

// Load Graphs from Firestore
async function loadGraphs() {
    try {
        graphContainer.innerHTML = '<div class="loading">Loading visual knowledge...</div>';
        
        const querySnapshot = await getDocs(collection(db, 'graphs'));
        allGraphs = [];
        
        querySnapshot.forEach((doc) => {
            const graphData = doc.data();
            allGraphs.push({
                id: doc.id,
                ...graphData,
                likes: graphData.likes || 0,
                comments: graphData.comments || 0
            });
        });
        
        // Sort by creation date or likes
        allGraphs.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        
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
    card.innerHTML = `
        <img src="${graph.images?.[0] || graph.image || 'assets/default.jpg'}" 
             alt="${graph.name}" 
             class="graph-image"
             loading="lazy"
             onerror="this.src='assets/default.jpg'">
        
        <div class="graph-content">
            <h3 class="graph-title">${graph.name}</h3>
            <div class="graph-alias">${graph.alias || ''}</div>
            <p class="graph-description">${(graph.description || '').substring(0, 120)}...</p>
            
            <div class="graph-tags">
                ${(graph.tags || []).slice(0, 3).map(tag => 
                    `<span class="tag">#${tag}</span>`
                ).join('')}
            </div>
            
            <div class="graph-meta">
                <a href="${graph.source || '#'}" target="_blank" class="source-link">
                    Source ↗
                </a>
                <div class="interaction-buttons">
                    <button class="like-btn" onclick="handleLike('${graph.id}')">
                        ❤️ <span>${graph.likes || 0}</span>
                    </button>
                    <button class="comment-btn" onclick="openGraphModal('${graph.id}')">
                        💬 <span>${graph.comments || 0}</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add click event to open modal
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.like-btn') && !e.target.closest('.comment-btn')) {
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
            likes: increment(1)
        });
        
        // Update local data
        const graphIndex = allGraphs.findIndex(g => g.id === graphId);
        if (graphIndex !== -1) {
            allGraphs[graphIndex].likes = (allGraphs[graphIndex].likes || 0) + 1;
            renderGraphs(filteredGraphs.length > 0 ? filteredGraphs : allGraphs);
        }
    } catch (error) {
        console.error('Error liking graph:', error);
    }
}

// Open Graph Modal
async function openGraphModal(graphId) {
    const graph = allGraphs.find(g => g.id === graphId);
    if (!graph) return;
    
    modalContent.innerHTML = `
        <div class="modal-graph">
            <div class="modal-header">
                <h2>${graph.name}</h2>
                <div class="modal-alias">${graph.alias || ''}</div>
            </div>
            
            <div class="modal-image">
                <img src="${graph.images?.[0] || graph.image || 'assets/default.jpg'}" 
                     alt="${graph.name}"
                     onerror="this.src='assets/default.jpg'">
            </div>
            
            <div class="modal-details">
                <div class="modal-description">
                    <h3>Description</h3>
                    <p>${graph.description || 'No description available.'}</p>
                </div>
                
                <div class="modal-tags">
                    <h3>Tags</h3>
                    <div class="tags-container">
                        ${(graph.tags || []).map(tag => 
                            `<span class="tag">#${tag}</span>`
                        ).join('')}
                    </div>
                </div>
                
                <div class="modal-subject">
                    <strong>Subject:</strong> ${graph.subject || 'General'}
                </div>
                
                <div class="modal-actions">
                    <a href="${graph.source || '#'}" target="_blank" class="source-btn">
                        🔗 Visit Source
                    </a>
                    <button class="share-btn" onclick="shareGraph('${graph.id}')">
                        📤 Share
                    </button>
                </div>
                
                <div class="feedback-section">
                    <h3>Feedback & Comments</h3>
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
    
    graphModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Load comments
    await loadComments(graphId);
}

// Close Modal
function closeGraphModal() {
    graphModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
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
            (graph.tags && graph.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
        );
    }
    
    renderGraphs(filteredGraphs);
    updateGraphCount();
}

// Popular Tags
function extractPopularTags() {
    const tagCounts = {};
    allGraphs.forEach(graph => {
        (graph.tags || []).forEach(tag => {
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

// Event Listeners
function setupEventListeners() {
    setupSearch();
    
    closeModal.addEventListener('click', closeGraphModal);
    graphModal.addEventListener('click', (e) => {
        if (e.target === graphModal) closeGraphModal();
    });
    
    donateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // UPI Payment URL - Replace with your UPI ID
        const upiUrl = 'upi://pay?pa=your-upi-id@oksbi&pn=GraphzLive&am=100&cu=INR';
        window.open(upiUrl, '_blank');
    });
    
    // Keyboard events
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeGraphModal();
    });
}

// Comments System
async function loadComments(graphId) {
    try {
        const commentsContainer = document.getElementById(`comments-${graphId}`);
        const commentsRef = collection(db, 'graphs', graphId, 'comments');
        const commentsSnapshot = await getDocs(commentsRef);
        
        const comments = [];
        commentsSnapshot.forEach(doc => {
            comments.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by timestamp
        comments.sort((a, b) => b.timestamp?.toDate() - a.timestamp?.toDate());
        
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
            author: 'Anonymous', // You can implement user system later
            timestamp: new Date(),
            likes: 0
        });
        
        // Update comment count
        const graphRef = doc(db, 'graphs', graphId);
        await updateDoc(graphRef, {
            comments: increment(1)
        });
        
        // Clear input and reload comments
        commentInput.value = '';
        await loadComments(graphId);
        
        // Update local data
        const graphIndex = allGraphs.findIndex(g => g.id === graphId);
        if (graphIndex !== -1) {
            allGraphs[graphIndex].comments = (allGraphs[graphIndex].comments || 0) + 1;
            renderGraphs(filteredGraphs.length > 0 ? filteredGraphs : allGraphs);
        }
        
    } catch (error) {
        console.error('Error adding comment:', error);
        alert('Failed to add comment. Please try again.');
    }
}

// Utility Functions
function formatTime(date) {
    if (!date) return '';
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
        Math.round((date - new Date()) / (1000 * 60)),
        'minute'
    );
}

function shareGraph(graphId) {
    const graph = allGraphs.find(g => g.id === graphId);
    if (!graph) return;
    
    const shareText = `Check out this graph: ${graph.name} on GraphzLive`;
    const shareUrl = window.location.href;
    
    if (navigator.share) {
        navigator.share({
            title: graph.name,
            text: shareText,
            url: shareUrl
        });
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(`${shareText} - ${shareUrl}`);
        alert('Link copied to clipboard!');
    }
}

// Make functions globally available for HTML onclick
window.handleLike = handleLike;
window.openGraphModal = openGraphModal;
window.closeGraphModal = closeGraphModal;
window.addComment = addComment;
window.shareGraph = shareGraph;

// Initialize App
document.addEventListener('DOMContentLoaded', initApp);
