// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyA84Ty4SNDuLMKzeHX1pJMUgjoFZ89nbRE",
    authDomain: "graphzlive.firebaseapp.com",
    projectId: "graphzlive",
    storageBucket: "graphzlive.firebasestorage.app",
    messagingSenderId: "521947472086",
    appId: "1:521947472086:web:b7795552c40bb58b0b2977"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// App State
let currentUser = null;
let graphs = [];
let currentFilter = 'all';

// DOM Elements
const elements = {
    userInterface: document.getElementById('user-interface'),
    adminPanel: document.getElementById('admin-panel'),
    loginModal: document.getElementById('login-modal'),
    graphGrid: document.getElementById('graph-grid'),
    filterChips: document.getElementById('filter-chips'),
    searchInput: document.getElementById('search-input'),
    authButtons: document.getElementById('auth-buttons'),
    loginBtn: document.getElementById('login-btn'),
    logoutBtn: document.getElementById('logout-btn')
};

// Initialize App
function init() {
    setupEventListeners();
    checkAuthState();
    loadGraphs();
}

// Event Listeners
function setupEventListeners() {
    // Navigation
    document.getElementById('nav-home').addEventListener('click', showUserInterface);
    document.getElementById('nav-admin').addEventListener('click', showAdminPanel);
    document.getElementById('login-btn').addEventListener('click', showLoginModal);
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('close-login').addEventListener('click', hideLoginModal);
    
    // Search
    document.getElementById('search-btn').addEventListener('click', handleSearch);
    elements.searchInput.addEventListener('input', handleSearch);
    
    // Forms
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('graph-form').addEventListener('submit', handleGraphSubmit);
    
    // Google Sign-in
    document.getElementById('google-signin').addEventListener('click', handleGoogleSignIn);
}

// Auth State Listener
function checkAuthState() {
    auth.onAuthStateChanged((user) => {
        currentUser = user;
        if (user) {
            updateUIForLoggedIn(user);
        } else {
            updateUIForLoggedOut();
        }
    });
}

// Update UI for logged in user
function updateUIForLoggedIn(user) {
    elements.authButtons.innerHTML = `
        <span style="margin-right:15px">Hi, ${user.displayName || user.email}</span>
        <button class="btn btn-danger" id="logout-btn">
            <i class="fas fa-sign-out-alt"></i> Logout
        </button>
    `;
    document.getElementById('logout-btn').addEventListener('click', logout);
}

// Update UI for logged out user
function updateUIForLoggedOut() {
    elements.authButtons.innerHTML = `
        <a href="#" class="btn btn-outline" id="login-btn">
            <i class="fas fa-sign-in-alt"></i> Login
        </a>
    `;
    document.getElementById('login-btn').addEventListener('click', showLoginModal);
}

// Load Graphs from Firestore
function loadGraphs() {
    db.collection('graphs').onSnapshot((snapshot) => {
        graphs = [];
        snapshot.forEach((doc) => {
            const graph = doc.data();
            graph.id = doc.id;
            graphs.push(graph);
        });
        renderGraphs();
        renderFilterChips();
    });
}

// Render Graphs
function renderGraphs() {
    let filteredGraphs = graphs;
    
    // Apply filter
    if (currentFilter !== 'all') {
        filteredGraphs = filteredGraphs.filter(graph => 
            graph.subject === currentFilter
        );
    }
    
    // Apply search
    const searchTerm = elements.searchInput.value.toLowerCase();
    if (searchTerm) {
        filteredGraphs = filteredGraphs.filter(graph => 
            graph.name.toLowerCase().includes(searchTerm) ||
            graph.description.toLowerCase().includes(searchTerm)
        );
    }
    
    // Render
    elements.graphGrid.innerHTML = filteredGraphs.map(graph => `
        <div class="graph-card">
            <div class="graph-image">
                ${graph.imageUrl ? 
                    `<img src="${graph.imageUrl}" alt="${graph.name}" />` : 
                    `<i class="fas fa-chart-line"></i>`
                }
                <div class="graph-badge">${graph.subject}</div>
            </div>
            <div class="graph-content">
                <h4 class="graph-title">${graph.name}</h4>
                <p class="graph-description">${graph.description}</p>
                <div class="graph-footer">
                    <div class="graph-views">
                        <i class="fas fa-eye"></i> ${graph.views || 0} views
                    </div>
                    <button class="btn" onclick="downloadGraph('${graph.id}')">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Render Filter Chips
function renderFilterChips() {
    const subjects = [...new Set(graphs.map(g => g.subject))];
    elements.filterChips.innerHTML = `
        <div class="filter-chip ${currentFilter === 'all' ? 'active' : ''}" 
             onclick="setFilter('all')">All</div>
        ${subjects.map(subject => `
            <div class="filter-chip ${currentFilter === subject ? 'active' : ''}" 
                 onclick="setFilter('${subject}')">${subject}</div>
        `).join('')}
    `;
}

// Set Filter
function setFilter(subject) {
    currentFilter = subject;
    renderFilterChips();
    renderGraphs();
}

// Handle Search
function handleSearch() {
    renderGraphs();
}

// Show/Hide Interfaces
function showUserInterface() {
    elements.userInterface.style.display = 'block';
    elements.adminPanel.style.display = 'none';
}

function showAdminPanel() {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    elements.userInterface.style.display = 'none';
    elements.adminPanel.style.display = 'block';
    renderAdminGraphs();
}

function showLoginModal() {
    elements.loginModal.style.display = 'flex';
}

function hideLoginModal() {
    elements.loginModal.style.display = 'none';
}

// Authentication Handlers
function handleLogin(e) {
    e.preventDefault();
    const email = e.target[0].value;
    const password = e.target[1].value;
    
    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            hideLoginModal();
            showAdminPanel();
        })
        .catch(error => {
            alert('Login failed: ' + error.message);
        });
}

function handleGoogleSignIn() {
    // Google Sign-in implementation
    alert('Google Sign-in would be implemented here');
}

function logout() {
    auth.signOut();
    showUserInterface();
}

// Graph Management
function handleGraphSubmit(e) {
    e.preventDefault();
    
    const graphData = {
        name: document.getElementById('graph-name').value,
        subject: document.getElementById('graph-subject').value,
        description: document.getElementById('graph-description').value,
        imageUrl: document.getElementById('graph-image').value,
        views: 0,
        createdAt: new Date()
    };
    
    db.collection('graphs').add(graphData)
        .then(() => {
            e.target.reset();
            alert('Graph added successfully!');
        })
        .catch(error => {
            alert('Error adding graph: ' + error.message);
        });
}

function renderAdminGraphs() {
    const list = document.getElementById('admin-graphs-list');
    list.innerHTML = graphs.map(graph => `
        <div class="table-row">
            <div>${graph.name}</div>
            <div>${graph.subject}</div>
            <div class="action-buttons">
                <button class="btn" onclick="editGraph('${graph.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger" onclick="deleteGraph('${graph.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

function deleteGraph(graphId) {
    if (confirm('Are you sure?')) {
        db.collection('graphs').doc(graphId).delete();
    }
}

function downloadGraph(graphId) {
    const graph = graphs.find(g => g.id === graphId);
    if (graph && graph.imageUrl) {
        const link = document.createElement('a');
        link.href = graph.imageUrl;
        link.download = `${graph.name}.jpg`;
        link.click();
    } else {
        alert('No image available for download');
    }
}

// Initialize the app
init();
