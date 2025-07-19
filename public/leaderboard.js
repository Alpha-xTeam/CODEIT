// Leaderboard Page JavaScript

// Initialize Supabase client for leaderboard (will use global client from script.js)
let supabaseClient;

// تم تحديث الكود ليستخدم بيانات حقيقية من قاعدة البيانات
let leaderboardData = [];
let statsData = {
    totalUsers: 0,
    totalGames: 0,
    totalCoins: 0
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Loading leaderboard page...');
    
    // Initialize Supabase first
    await initializeSupabase();
    
    // Hide loading screen
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    }, 1000);

    // Check user authentication
    await checkUserAuthentication();
    
    // Load leaderboard data
    await loadLeaderboardData();
    
    // Load stats
    await loadStats();
});

// Initialize Supabase (use global client from script.js)
async function initializeSupabase() {
    try {
        // Wait for global supabase to be available
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            // Use the same configuration as script.js
            if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
                supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
            } else if (window.supabase.client) {
                // Use existing client if available
                supabaseClient = window.supabase.client;
            } else {
                // Fallback: try to use global supabase instance
                supabaseClient = window.supabase;
            }
            console.log('Supabase initialized for leaderboard');
        } else {
            console.error('Supabase library not loaded or not available');
        }
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
    }
}

// Check if user is logged in and update UI
async function checkUserAuthentication() {
    const user = localStorage.getItem('codeit_user');
    const userMenu = document.getElementById('user-menu');
    
    if (user && userMenu) {
        try {
            const currentUser = JSON.parse(user);
            userMenu.classList.remove('hidden');
            
            // Update user avatar
            const navAvatar = document.getElementById('nav-avatar');
            if (navAvatar && currentUser.avatar) {
                navAvatar.src = 'avatars/' + currentUser.avatar;
            }
            
            // Update coins display - get fresh data from Supabase
            await updateUserCoinsDisplay(currentUser.id);
            
            // Show admin button for admins
            const adminBtn = document.getElementById('admin-btn');
            if (adminBtn && currentUser.role === 'admin') {
                adminBtn.classList.remove('hidden');
            }
            
        } catch (error) {
            console.error('Error parsing user data:', error);
        }
    }
}

// Update user coins display with fresh data from database
async function updateUserCoinsDisplay(userId) {
    try {
        const client = supabaseClient || window.supabase?.client || window.supabase;
        
        if (client && userId) {
            const { data: userData, error } = await client
                .from('users')
                .select('total_coins')
                .eq('id', userId)
                .single();

            if (!error && userData) {
                const userCoins = document.getElementById('user-coins');
                if (userCoins) {
                    userCoins.textContent = userData.total_coins || 0;
                }
                
                // Also update localStorage with current coins
                const storedUser = localStorage.getItem('codeit_user');
                if (storedUser) {
                    const currentUser = JSON.parse(storedUser);
                    currentUser.total_coins = userData.total_coins;
                    currentUser.coins = userData.total_coins; // for compatibility
                    localStorage.setItem('codeit_user', JSON.stringify(currentUser));
                }
            } else {
                // Fallback to stored value
                const storedUser = localStorage.getItem('codeit_user');
                if (storedUser) {
                    const currentUser = JSON.parse(storedUser);
                    const userCoins = document.getElementById('user-coins');
                    if (userCoins) {
                        userCoins.textContent = currentUser.total_coins || currentUser.coins || 0;
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error updating coins display:', error);
        // Fallback to stored value
        const storedUser = localStorage.getItem('codeit_user');
        if (storedUser) {
            const currentUser = JSON.parse(storedUser);
            const userCoins = document.getElementById('user-coins');
            if (userCoins) {
                userCoins.textContent = currentUser.total_coins || currentUser.coins || 0;
            }
        }
    }
}

// Load leaderboard data and populate the page
async function loadLeaderboardData() {
    console.log('Loading leaderboard data from Supabase...');
    
    try {
        // جلب البيانات الحقيقية من Supabase
        const client = supabaseClient || window.supabase?.client || window.supabase;
        
        if (!client) {
            console.error('Supabase client not available');
            showError('فشل في الاتصال بقاعدة البيانات');
            return;
        }

        const { data: users, error } = await client
            .from('users')
            .select('id, name, email, avatar, total_coins, tests_completed, average_accuracy, best_time')
            .order('total_coins', { ascending: false });

        if (error) {
            console.error('Error fetching leaderboard data:', error);
            showError('فشل في جلب بيانات لوحة الترتيب');
            return;
        }

        if (!users || users.length === 0) {
            showNoDataMessage();
            return;
        }

        // تحديث البيانات العامة
        leaderboardData = users.map(user => ({
            ...user,
            score: user.total_coins || 0
        }));

        // ترتيب البيانات حسب العملات
        const sortedData = leaderboardData.sort((a, b) => (b.total_coins || 0) - (a.total_coins || 0));

        // معالجة البيانات وعرضها
        processLeaderboardData(sortedData, 'total_coins');

        console.log('Leaderboard data loaded successfully from Supabase:', sortedData);

    } catch (error) {
        console.error('Error in loadLeaderboardData:', error);
        showError('حدث خطأ أثناء جلب البيانات');
    }
}

// Process leaderboard data and display it
function processLeaderboardData(leaderboard, scoreField) {
    // Hide loading indicator
    const loadingIndicator = document.getElementById('loading-leaderboard');
    const leaderboardContent = document.getElementById('leaderboard-content');
    
    if (loadingIndicator) loadingIndicator.classList.add('hidden');
    if (leaderboardContent) leaderboardContent.classList.remove('hidden');

    if (!leaderboard || leaderboard.length === 0) {
        // Show no data message if no real data available
        showNoDataMessage();
        return;
    }

    // Add rank to each user and ensure they have the score field
    const rankedLeaderboard = leaderboard.map((user, index) => ({
        ...user,
        rank: index + 1,
        score: user[scoreField] || user.coins || 0,
        avatar: user.avatar || 'man.png'
    }));

    // Populate top 3 podium
    populateTopThree(rankedLeaderboard.slice(0, 3));
    
    // Populate remaining ranks
    if (rankedLeaderboard.length > 3) {
        populateRemainingRanks(rankedLeaderboard.slice(3));
    } else {
        // Hide remaining ranks section if less than 4 users
        const remainingRanks = document.querySelector('.remaining-ranks');
        if (remainingRanks) remainingRanks.style.display = 'none';
    }
}

// Populate top 3 podium places
function populateTopThree(topUsers) {
    const topThree = document.getElementById('top-three');
    if (!topThree) return;

    topThree.innerHTML = '';

    // Define podium positions
    const positions = [
        { place: 'second', rank: 2, user: topUsers[1] },
        { place: 'first', rank: 1, user: topUsers[0] },
        { place: 'third', rank: 3, user: topUsers[2] }
    ];

    positions.forEach(position => {
        if (!position.user) return;

        const podiumDiv = document.createElement('div');
        podiumDiv.className = `podium-place ${position.place}`;
        
        const rankColors = {
            1: '#ffd700',
            2: '#c0c0c0', 
            3: '#cd7f32'
        };

        podiumDiv.innerHTML = `
            <div class="podium-rank ${position.place}">${position.rank}</div>
            <img src="avatars/${position.user.avatar || 'man.png'}" 
                 alt="User Avatar" 
                 class="podium-avatar ${position.place}">
            <div class="podium-name">${position.user.name || 'Unknown User'}</div>
            <div class="podium-score">
                <i class="fas fa-coins" style="color: ${rankColors[position.rank]}"></i>
                ${formatNumber(position.user.score || 0)}
            </div>
        `;

        topThree.appendChild(podiumDiv);
    });
}

// Populate remaining ranks (4th place and below)
function populateRemainingRanks(remainingUsers) {
    const leaderboardList = document.getElementById('leaderboard-list');
    if (!leaderboardList) return;

    leaderboardList.innerHTML = '';

    remainingUsers.forEach((user, index) => {
        const rank = index + 4; // Starting from 4th place
        const entryDiv = document.createElement('div');
        entryDiv.className = 'leaderboard-entry';
        
        // Check if this is the current user
        const currentUser = getCurrentUser();
        const isCurrentUser = currentUser && currentUser.id === user.id;
        if (isCurrentUser) {
            entryDiv.classList.add('current-user');
        }

        entryDiv.innerHTML = `
            <div class="rank">${rank}</div>
            <div class="user-info">
                <img src="avatars/${user.avatar || 'man.png'}" alt="User Avatar">
                <div class="name">${user.name || 'Unknown User'}</div>
            </div>
            <div class="points">
                <i class="fas fa-coins"></i>
                ${formatNumber(user.score || 0)}
            </div>
        `;

        leaderboardList.appendChild(entryDiv);
    });
}

// Load and display statistics
async function loadStats() {
    console.log('Loading stats from Supabase...');
    
    try {
        const client = supabaseClient || window.supabase?.client || window.supabase;
        
        if (!client) {
            console.error('Supabase client not available for stats');
            return;
        }

        // جلب إحصائيات المستخدمين
        const { data: users, error: usersError } = await client
            .from('users')
            .select('total_coins, tests_completed');

        if (usersError) {
            console.error('Error fetching user stats:', usersError);
            throw usersError;
        }

        // جلب إحصائيات النتائج
        const { data: testResults, error: testsError } = await client
            .from('test_results')
            .select('coins_earned');

        if (testsError) {
            console.error('Error fetching test results:', testsError);
            // Continue without test results if they fail
        }

        // حساب الإحصائيات الحقيقية
        const totalUsers = users ? users.length : 0;
        const totalTests = users ? users.reduce((sum, user) => sum + (user.tests_completed || 0), 0) : 0;
        const totalCoins = users ? users.reduce((sum, user) => sum + (user.total_coins || 0), 0) : 0;
        
        // تحديث واجهة المستخدم
        const totalUsersEl = document.getElementById('total-users');
        const totalGamesEl = document.getElementById('total-games');
        const totalCoinsEl = document.getElementById('total-coins');

        if (totalUsersEl) totalUsersEl.textContent = formatNumber(totalUsers);
        if (totalGamesEl) totalGamesEl.textContent = formatNumber(totalTests);
        if (totalCoinsEl) totalCoinsEl.textContent = formatNumber(totalCoins);

        console.log('Stats loaded successfully from Supabase:', { totalUsers, totalTests, totalCoins });

    } catch (error) {
        console.error('Error loading stats:', error);
        // تعيين قيم افتراضية في حالة الخطأ
        const totalUsersEl = document.getElementById('total-users');
        const totalGamesEl = document.getElementById('total-games');
        const totalCoinsEl = document.getElementById('total-coins');

        if (totalUsersEl) totalUsersEl.textContent = '0';
        if (totalGamesEl) totalGamesEl.textContent = '0';
        if (totalCoinsEl) totalCoinsEl.textContent = '0';
    }
}

// Get current user from localStorage
function getCurrentUser() {
    const userStr = localStorage.getItem('codeit_user');
    if (userStr) {
        try {
            return JSON.parse(userStr);
        } catch (error) {
            console.error('Error parsing user data:', error);
        }
    }
    return null;
}

// Format number with commas
function formatNumber(num) {
    if (typeof num !== 'number') {
        num = parseInt(num) || 0;
    }
    return num.toLocaleString('en-US');
}

// Show error message
function showError(message) {
    const loadingIndicator = document.getElementById('loading-leaderboard');
    if (loadingIndicator) {
        loadingIndicator.innerHTML = `
            <i class="fas fa-exclamation-triangle" style="color: #ff4444; font-size: 2rem; margin-bottom: 1rem;"></i>
            <p style="color: #ff4444;">${message}</p>
        `;
    }
}

// Show no data message
function showNoDataMessage() {
    const loadingIndicator = document.getElementById('loading-leaderboard');
    if (loadingIndicator) {
        loadingIndicator.innerHTML = `
            <i class="fas fa-users" style="color: #666; font-size: 2rem; margin-bottom: 1rem;"></i>
            <p>لا يوجد مستخدمون في لوحة الترتيب حتى الآن</p>
            <p style="color: #999; font-size: 0.9rem;">ابدأ بلعب بعض الألعاب لتظهر في الترتيب!</p>
        `;
    }
}

// Handle logout
function handleLogout() {
    localStorage.removeItem('codeit_user');
    window.location.href = 'index.html';
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    const container = document.getElementById('toast-container');
    if (container) {
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (container.contains(toast)) {
                    container.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// Mobile menu functionality
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navMenu = document.querySelector('.nav-menu');

    if (mobileMenuBtn && navMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            mobileMenuBtn.classList.toggle('active');
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!mobileMenuBtn.contains(e.target) && !navMenu.contains(e.target)) {
                navMenu.classList.remove('active');
                mobileMenuBtn.classList.remove('active');
            }
        });
    }
});
