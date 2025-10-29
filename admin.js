// admin.js
import { db, auth } from './firebase-config.js';
import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const adminDashboard = document.getElementById('adminDashboard');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const addGraphBtn = document.getElementById('addGraphBtn');
const refreshBtn = document.getElementById('refreshBtn');
const graphModal = document.getElementById('graphModal');
const deleteModal = document.getElementById('deleteModal');
const graphForm = document.getElementById('graphForm');
const graphsTableBody = document.getElementById('graphsTableBody');
const adminCommentsContainer = document.getElementById('adminCommentsContainer');
const refreshComments = document.getElementById('refreshComments');
const exportAnalytics = document.getElementById('exportAnalytics');

// Global Variables
let allGraphs = [];
let allComments = [];
let graphToDelete = null;

// Initialize Admin App
function initAdminApp() {
  checkAuthState();
  setupEventListeners();
}

// Auth State Listener
function checkAuthState() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      showAdminDashboard();
      loadAdminData();
    } else {
      showLoginScreen();
    }
  });
}

// Show/Hide Screens
function showLoginScreen() {
  loginScreen.classList.remove('hidden');
  adminDashboard.classList.add('hidden');
}

function showAdminDashboard() {
  loginScreen.classList.add('hidden');
  adminDashboard.classList.remove('hidden');
}

// Login Handler
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const loginError = document.getElementById('loginError');
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginError.classList.add('hidden');
  } catch (error) {
    console.error('Login error:', error);
    loginError.textContent = getAuthErrorMessage(error.code);
    loginError.classList.remove('hidden');
  }
});

// Logout Handler
logoutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
  }
});

// Auth Error Messages
function getAuthErrorMessage(errorCode) {
  const messages = {
    'auth/invalid-email': 'Invalid email address',
    'auth/user-disabled': 'Account disabled',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/too-many-requests': 'Too many attempts. Try again later'
  };
  return messages[errorCode] || 'Login failed. Please try again.';
}

// Load Admin Data
async function loadAdminData() {
  await loadGraphs();
  await loadStats();
  await loadRecentComments();
  await loadAnalytics();
}

// Load Graphs for Admin
async function loadGraphs() {
  try {
    graphsTableBody.innerHTML = '<tr><td colspan="6" class="loading-cell">Loading graphs...</td></tr>';
    
    const graphsQuery = query(collection(db, 'graphs'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(graphsQuery);
    
    allGraphs = [];
    querySnapshot.forEach((doc) => {
      const graphData = doc.data();
      allGraphs.push({
        id: doc.id,
        name: graphData.name || 'Untitled Graph',
        alias: graphData.alias || '',
        description: graphData.description || '',
        subject: graphData.subject || 'General',
        tags: graphData.tags || [],
        images: graphData.images || [graphData.image].filter(Boolean),
        source: graphData.source || '',
        affiliateLink: graphData.affiliateLink,
        affiliateTitle: graphData.affiliateTitle,
        sponsorName: graphData.sponsorName,
        sponsorMessage: graphData.sponsorMessage,
        sponsorLink: graphData.sponsorLink,
        sponsorLogo: graphData.sponsorLogo,
        telegramLink: graphData.telegramLink,
        likeCount: graphData.likeCount || graphData.likes || 0,
        commentCount: graphData.commentCount || graphData.comments || 0,
        viewCount: graphData.viewCount || 0,
        createdAt: graphData.createdAt?.toDate() || new Date(),
        updatedAt: graphData.updatedAt?.toDate() || new Date()
      });
    });
    
    renderGraphsTable(allGraphs);
    setupTableFilters();
    
  } catch (error) {
    console.error('Error loading graphs:', error);
    graphsTableBody.innerHTML = '<tr><td colspan="6" class="error-cell">Failed to load graphs</td></tr>';
  }
}

// Render Graphs Table
function renderGraphsTable(graphs) {
  if (graphs.length === 0) {
    graphsTableBody.innerHTML = '<tr><td colspan="6" class="no-data">No graphs found</td></tr>';
    return;
  }
  
  graphsTableBody.innerHTML = graphs.map(graph => `
    <tr>
      <td class="graph-preview">
        <img src="${graph.images[0] || 'assets/default.jpg'}" 
             alt="${graph.name}"
             onerror="this.src='assets/default.jpg'">
      </td>
      <td class="graph-info">
        <div class="graph-name">${graph.name}</div>
        <div class="graph-alias">${graph.alias || 'No alias'}</div>
        ${graph.affiliateLink ? '<div class="affiliate-indicator" title="Has affiliate link">💰</div>' : ''}
        ${graph.sponsorName ? '<div class="sponsor-indicator" title="Has sponsor">🎯</div>' : ''}
      </td>
      <td class="graph-meta">
        <div class="graph-subject">${graph.subject || 'General'}</div>
        <div class="graph-tags">
          ${graph.tags.slice(0, 3).map(tag => 
            `<span class="tag">${tag}</span>`
          ).join('')}
          ${graph.tags.length > 3 ? `<span class="tag-more">+${graph.tags.length - 3}</span>` : ''}
        </div>
      </td>
      <td class="graph-stats">
        <div class="stat">👁️ ${graph.viewCount || 0}</div>
        <div class="stat">❤️ ${graph.likeCount || 0}</div>
        <div class="stat">💬 ${graph.commentCount || 0}</div>
      </td>
      <td class="graph-date">
        ${formatDate(graph.createdAt)}
      </td>
      <td class="graph-actions">
        <button class="btn-icon edit-btn" onclick="editGraph('${graph.id}')" title="Edit">
          ✏️
        </button>
        <button class="btn-icon delete-btn" onclick="confirmDelete('${graph.id}')" title="Delete">
          🗑️
        </button>
        <button class="btn-icon view-btn" onclick="viewGraph('${graph.id}')" title="View">
          👁️
        </button>
      </td>
    </tr>
  `).join('');
}

// Setup Table Filters
function setupTableFilters() {
  const adminSearch = document.getElementById('adminSearch');
  const subjectFilter = document.getElementById('subjectFilter');
  
  adminSearch.addEventListener('input', filterGraphsTable);
  subjectFilter.addEventListener('change', filterGraphsTable);
}

function filterGraphsTable() {
  const searchTerm = document.getElementById('adminSearch').value.toLowerCase();
  const subjectFilter = document.getElementById('subjectFilter').value;
  
  let filtered = allGraphs;
  
  if (searchTerm) {
    filtered = filtered.filter(graph => 
      graph.name.toLowerCase().includes(searchTerm) ||
      graph.alias.toLowerCase().includes(searchTerm) ||
      graph.description.toLowerCase().includes(searchTerm)
    );
  }
  
  if (subjectFilter) {
    filtered = filtered.filter(graph => graph.subject === subjectFilter);
  }
  
  renderGraphsTable(filtered);
}

// Load Stats
async function loadStats() {
  try {
    // Total Graphs
    document.getElementById('totalGraphs').textContent = allGraphs.length;
    
    // Total Likes
    const totalLikes = allGraphs.reduce((sum, graph) => sum + (graph.likeCount || 0), 0);
    document.getElementById('totalLikes').textContent = totalLikes;
    
    // Total Comments
    const totalComments = allGraphs.reduce((sum, graph) => sum + (graph.commentCount || 0), 0);
    document.getElementById('totalComments').textContent = totalComments;
    
    // Today's Uploads
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayUploads = allGraphs.filter(graph => 
      graph.createdAt >= today
    ).length;
    document.getElementById('todayUploads').textContent = todayUploads;
    
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Load Recent Comments
async function loadRecentComments() {
  try {
    adminCommentsContainer.innerHTML = '<div class="loading">Loading comments...</div>';
    
    allComments = [];
    
    // Get comments from all graphs (limit to recent 20 graphs for performance)
    const recentGraphs = allGraphs.slice(0, 20);
    
    for (const graph of recentGraphs) {
      try {
        const commentsRef = collection(db, 'graphs', graph.id, 'comments');
        const commentsQuery = query(commentsRef, orderBy('timestamp', 'desc'));
        const commentsSnapshot = await getDocs(commentsQuery);
        
        commentsSnapshot.forEach(doc => {
          allComments.push({
            id: doc.id,
            graphId: graph.id,
            graphName: graph.name,
            ...doc.data()
          });
        });
      } catch (error) {
        console.error(`Error loading comments for graph ${graph.id}:`, error);
      }
    }
    
    // Sort by timestamp
    allComments.sort((a, b) => (b.timestamp?.toDate() || 0) - (a.timestamp?.toDate() || 0));
    
    renderRecentComments(allComments.slice(0, 20)); // Show latest 20 comments
    
  } catch (error) {
    console.error('Error loading comments:', error);
    adminCommentsContainer.innerHTML = '<div class="error">Failed to load comments</div>';
  }
}

function renderRecentComments(comments) {
  if (comments.length === 0) {
    adminCommentsContainer.innerHTML = '<div class="no-comments">No recent comments</div>';
    return;
  }
  
  adminCommentsContainer.innerHTML = comments.map(comment => `
    <div class="admin-comment">
      <div class="comment-header">
        <span class="comment-graph">📊 ${comment.graphName}</span>
        <span class="comment-time">${formatTime(comment.timestamp?.toDate())}</span>
      </div>
      <div class="comment-content">
        <div class="comment-text">${comment.text}</div>
        <div class="comment-author">- ${comment.author || 'Anonymous'}</div>
      </div>
      <div class="comment-actions">
        <button class="btn-sm btn-danger" onclick="deleteComment('${comment.graphId}', '${comment.id}')">
          Delete
        </button>
      </div>
    </div>
  `).join('');
}

// Load Analytics
async function loadAnalytics() {
  try {
    // Top Performing Graphs
    const topGraphs = [...allGraphs]
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, 5);
    
    document.getElementById('topGraphsList').innerHTML = topGraphs.map(graph => `
      <div class="analytics-item">
        <div class="analytics-item-main">
          <span class="analytics-name">${graph.name}</span>
          <span class="analytics-value">${graph.viewCount || 0} views</span>
        </div>
        <div class="analytics-stats">
          <small>❤️ ${graph.likeCount || 0} • 💬 ${graph.commentCount || 0}</small>
        </div>
      </div>
    `).join('');
    
    // Popular Subjects
    const subjectStats = {};
    allGraphs.forEach(graph => {
      const subject = graph.subject || 'General';
      subjectStats[subject] = (subjectStats[subject] || 0) + 1;
    });
    
    const popularSubjects = Object.entries(subjectStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    
    document.getElementById('popularSubjects').innerHTML = popularSubjects.map(([subject, count]) => `
      <div class="analytics-item">
        <div class="analytics-item-main">
          <span class="analytics-name">${subject}</span>
          <span class="analytics-value">${count} graphs</span>
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Error loading analytics:', error);
  }
}

// Graph Form Handlers
addGraphBtn.addEventListener('click', () => {
  openGraphModal();
});

function openGraphModal(graph = null) {
  const modalTitle = document.getElementById('modalTitle');
  const editGraphId = document.getElementById('editGraphId');
  const submitBtnText = document.getElementById('submitBtnText');
  
  if (graph) {
    // Edit mode
    modalTitle.textContent = 'Edit Graph';
    submitBtnText.textContent = 'Update Graph';
    editGraphId.value = graph.id;
    
    // Fill form with graph data
    document.getElementById('graphName').value = graph.name;
    document.getElementById('graphAlias').value = graph.alias || '';
    document.getElementById('graphDescription').value = graph.description || '';
    document.getElementById('graphSubject').value = graph.subject || '';
    document.getElementById('graphTags').value = graph.tags.join(', ');
    document.getElementById('graphImages').value = graph.images.join('\n');
    document.getElementById('graphSource').value = graph.source || '';
    document.getElementById('graphTelegram').value = graph.telegramLink || '';
    
    // Profit fields
    document.getElementById('affiliateTitle').value = graph.affiliateTitle || '';
    document.getElementById('affiliateLink').value = graph.affiliateLink || '';
    document.getElementById('sponsorName').value = graph.sponsorName || '';
    document.getElementById('sponsorMessage').value = graph.sponsorMessage || '';
    document.getElementById('sponsorLink').value = graph.sponsorLink || '';
    document.getElementById('sponsorLogo').value = graph.sponsorLogo || '';
    
  } else {
    // Add mode
    modalTitle.textContent = 'Add New Graph';
    submitBtnText.textContent = 'Add Graph';
    editGraphId.value = '';
    graphForm.reset();
  }
  
  graphModal.classList.remove('hidden');
}

// Submit Graph Form
graphForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const submitBtn = document.getElementById('submitGraphBtn');
  const submitBtnLoader = document.getElementById('submitBtnLoader');
  const editGraphId = document.getElementById('editGraphId').value;
  
  // Show loading state
  submitBtn.disabled = true;
  submitBtnLoader.classList.remove('hidden');
  
  try {
    const formData = {
      name: document.getElementById('graphName').value.trim(),
      alias: document.getElementById('graphAlias').value.trim(),
      description: document.getElementById('graphDescription').value.trim(),
      subject: document.getElementById('graphSubject').value,
      tags: document.getElementById('graphTags').value.split(',').map(tag => tag.trim()).filter(tag => tag),
      images: document.getElementById('graphImages').value.split('\n').map(url => url.trim()).filter(url => url),
      source: document.getElementById('graphSource').value.trim() || null,
      telegramLink: document.getElementById('graphTelegram').value.trim() || null,
      updatedAt: serverTimestamp(),
      
      // Profit fields
      affiliateTitle: document.getElementById('affiliateTitle').value.trim() || null,
      affiliateLink: document.getElementById('affiliateLink').value.trim() || null,
      sponsorName: document.getElementById('sponsorName').value.trim() || null,
      sponsorMessage: document.getElementById('sponsorMessage').value.trim() || null,
      sponsorLink: document.getElementById('sponsorLink').value.trim() || null,
      sponsorLogo: document.getElementById('sponsorLogo').value.trim() || null
    };
    
    // Validate required fields
    if (!formData.name || !formData.alias || !formData.description || !formData.subject || formData.tags.length === 0 || formData.images.length === 0) {
      throw new Error('Please fill all required fields');
    }
    
    if (editGraphId) {
      // Update existing graph
      const graphRef = doc(db, 'graphs', editGraphId);
      await updateDoc(graphRef, formData);
      showNotification('Graph updated successfully!', 'success');
    } else {
      // Add new graph
      formData.createdAt = serverTimestamp();
      formData.likeCount = 0;
      formData.commentCount = 0;
      formData.viewCount = 0;
      await addDoc(collection(db, 'graphs'), formData);
      showNotification('Graph added successfully!', 'success');
    }
    
    closeGraphModal();
    await loadAdminData();
    
  } catch (error) {
    console.error('Error saving graph:', error);
    showNotification(error.message || 'Failed to save graph', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtnLoader.classList.add('hidden');
  }
});

// Edit Graph
window.editGraph = function(graphId) {
  const graph = allGraphs.find(g => g.id === graphId);
  if (graph) {
    openGraphModal(graph);
  }
};

// View Graph
window.viewGraph = function(graphId) {
  window.open(`index.html?graph=${graphId}`, '_blank');
};

// Delete Graph
window.confirmDelete = function(graphId) {
  graphToDelete = graphId;
  deleteModal.classList.remove('hidden');
};

document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
  if (!graphToDelete) return;
  
  try {
    await deleteDoc(doc(db, 'graphs', graphToDelete));
    showNotification('Graph deleted successfully!', 'success');
    closeDeleteModal();
    await loadAdminData();
  } catch (error) {
    console.error('Error deleting graph:', error);
    showNotification('Failed to delete graph', 'error');
  }
});

// Delete Comment
window.deleteComment = async function(graphId, commentId) {
  if (!confirm('Are you sure you want to delete this comment?')) return;
  
  try {
    await deleteDoc(doc(db, 'graphs', graphId, 'comments', commentId));
    
    // Update comment count
    const graphRef = doc(db, 'graphs', graphId);
    const graph = allGraphs.find(g => g.id === graphId);
    if (graph) {
      await updateDoc(graphRef, {
        commentCount: (graph.commentCount || 0) - 1
      });
    }
    
    showNotification('Comment deleted successfully!', 'success');
    await loadRecentComments();
    await loadStats();
    
  } catch (error) {
    console.error('Error deleting comment:', error);
    showNotification('Failed to delete comment', 'error');
  }
};

// Export Analytics
exportAnalytics.addEventListener('click', () => {
  const analyticsData = {
    exportDate: new Date().toISOString(),
    totalGraphs: allGraphs.length,
    totalViews: allGraphs.reduce((sum, graph) => sum + (graph.viewCount || 0), 0),
    totalLikes: allGraphs.reduce((sum, graph) => sum + (graph.likeCount || 0), 0),
    totalComments: allGraphs.reduce((sum, graph) => sum + (graph.commentCount || 0), 0),
    graphs: allGraphs.map(graph => ({
      name: graph.name,
      alias: graph.alias,
      subject: graph.subject,
      views: graph.viewCount || 0,
      likes: graph.likeCount || 0,
      comments: graph.commentCount || 0,
      createdAt: graph.createdAt.toISOString()
    }))
  };
  
  const dataStr = JSON.stringify(analyticsData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `graphzlive-analytics-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  
  showNotification('Analytics data exported successfully!', 'success');
});

// Modal Controls
function closeGraphModal() {
  graphModal.classList.add('hidden');
}

function closeDeleteModal() {
  deleteModal.classList.add('hidden');
  graphToDelete = null;
}

// Event Listeners
function setupEventListeners() {
  // Refresh buttons
  refreshBtn.addEventListener('click', loadAdminData);
  refreshComments.addEventListener('click', loadRecentComments);
  
  // Modal close buttons
  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      closeGraphModal();
      closeDeleteModal();
    });
  });
  
  // Cancel buttons
  document.getElementById('cancelBtn').addEventListener('click', closeGraphModal);
  document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);
  
  // Close modals on outside click
  [graphModal, deleteModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeGraphModal();
        closeDeleteModal();
      }
    });
  });
}

// Utility Functions
function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

function formatTime(date) {
  if (!date) return '';
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-message">${message}</span>
      <button class="notification-close">&times;</button>
    </div>
  `;
  
  // Add styles if not already added
  if (!document.querySelector('#notification-styles')) {
    const styles = document.createElement('style');
    styles.id = 'notification-styles';
    styles.textContent = `
      .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-left: 4px solid #4F46E5;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease;
      }
      .notification-success { border-color: #10B981; }
      .notification-error { border-color: #EF4444; }
      .notification-content {
        padding: 12px 16px;
        display: flex;
        align-items: center;
        justify-content: between;
      }
      .notification-message {
        flex: 1;
        margin-right: 12px;
      }
      .notification-close {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #6B7280;
      }
      @keyframes slideIn {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
      }
    `;
    document.head.appendChild(styles);
  }
  
  document.body.appendChild(notification);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    notification.remove();
  }, 5000);
  
  // Close button
  notification.querySelector('.notification-close').addEventListener('click', () => {
    notification.remove();
  });
}

// Initialize Admin App
document.addEventListener('DOMContentLoaded', initAdminApp);
