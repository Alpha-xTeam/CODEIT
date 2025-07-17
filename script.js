alert('test script.js loaded');
// Supabase Configuration
const SUPABASE_URL = 'https://xspzacvpizjjaosrebgz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcHphY3ZwaXpqamFvc3JlYmd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MTA4MDQsImV4cCI6MjA2ODA4NjgwNH0.pq-YKgKTY38hiqpJaivv8m79hhr_jYRkDg9Idon-TRY';

// Initialize Supabase client
let supabase;
let currentUser = null;
let gameState = {
    isPlaying: false,
    startTime: null,
    currentSnippet: null,
    language: 'python',
    difficulty: 'easy',
    timer: null,
    totalCharacters: 0,
    correctCharacters: 0
};

// (تم حذف كائن codeSnippets من هنا، استخدمه من ملف snippets.js)

// Initialize the application فقط في الصفحة الرئيسية
if (document.getElementById('welcome-section')) {
  document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
  });
}

async function initializeApp() {
    console.log('Initializing app...'); // Debug log
    
    // Initialize Supabase
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase initialized successfully');
        
        // Test Supabase connection
        const { data, error } = await supabase.from('users').select('count').limit(1);
        if (error) {
            console.error('Supabase connection test failed:', error);
            showToast('Database connection failed', 'error');
        } else {
            console.log('Supabase connection test successful');
        }
        
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        showToast('Failed to connect to database', 'error');
    }
    
    // Hide loading screen
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
    }, 1500);
    
    // Check if user is already logged in
    await checkUserSession();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load leaderboard
    await loadLeaderboard();
}

function setupEventListeners() {
    console.log('Setting up event listeners...'); // Debug log
    
    // Welcome section button
    const startJourneyBtn = document.getElementById('start-journey-btn');
    if (startJourneyBtn) {
        startJourneyBtn.addEventListener('click', handleStartJourney);
    }
    
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileMenuBtn && navMenu) {
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileMenuBtn.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                mobileMenuBtn.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
        // Close mobile menu when window is resized to desktop
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                mobileMenuBtn.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    }
    
    // Auth form switching
    document.getElementById('show-register').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.remove('hidden');
    });
    
    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('register-form').classList.add('hidden');
        document.getElementById('login-form').classList.remove('hidden');
    });
    
    // Avatar selection
    document.querySelectorAll('.avatar-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
    
    // Form submissions
    const loginForm = document.getElementById('login-form-element');
    const registerForm = document.getElementById('register-form-element');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        console.log('Login form event listener attached'); // Debug log
    } else {
        console.error('Login form not found!'); // Debug log
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
        console.log('Register form event listener attached'); // Debug log
    } else {
        console.error('Register form not found!'); // Debug log
    }
    
    // Game controls
    document.getElementById('start-game').addEventListener('click', startGame);
    document.getElementById('retry-btn').addEventListener('click', retryGame);
    document.getElementById('new-snippet-btn').addEventListener('click', newSnippet);
    document.getElementById('typing-input').addEventListener('input', handleTyping);
    
    // Modal controls
    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('continue-btn').addEventListener('click', closeModal);
    
    // Leaderboard toggle
    document.getElementById('toggle-leaderboard').addEventListener('click', toggleLeaderboard);
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Shop toggle
    document.getElementById('shop-btn').addEventListener('click', openShop);
    
    console.log('Event listeners setup completed'); // Debug log
}

// Handle start journey button click
async function handleStartJourney() {
    console.log('Start journey button clicked');
    
    // التحقق من تسجيل الدخول أولاً
    if (currentUser) {
        // المستخدم مسجل دخول، انتقل مباشرة للعبة
        await showGameSection();
    } else {
        // المستخدم غير مسجل دخول، اعرض صفحة تسجيل الدخول
        const welcomeSection = document.getElementById('welcome-section');
        const authSection = document.getElementById('auth-section');
        
        if (welcomeSection && authSection) {
            welcomeSection.classList.add('hidden');
            authSection.classList.remove('hidden');
            // إظهار شريط التنقل
            document.body.classList.remove('hide-navbar');
        }
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // Validate email domain
    if (!email.endsWith('@student.uobabylon.edu.iq')) {
        showToast('Email must end with @student.uobabylon.edu.iq', 'error');
        return;
    }
    
    try {
        // Hash password for comparison
        const hashedPassword = await hashPassword(password);
        
        // Check user credentials in database
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('password_hash', hashedPassword);
        
        if (error) {
            console.error('Login error:', error);
            showToast('Login failed. Please try again.', 'error');
            return;
        }        if (users && users.length > 0) {
            // Get user stats
            const userData = await getUserData(email);
            if (userData) {
                console.log('Login successful, user data:', userData);
                currentUser = userData;
                
                // حفظ بيانات المستخدم في localStorage
                localStorage.setItem('codeit_user', JSON.stringify(userData));
                localStorage.setItem('codeit_user_timestamp', new Date().toISOString());
                console.log('User logged in successfully, saved to localStorage');
                
                await showGameSection();
                showToast(`مرحباً ${userData.name}! لديك ${userData.total_coins} عملة`, 'success');
            } else {
                console.error('Failed to get user data after login');
                showToast('فشل في تحميل بيانات المستخدم', 'error');
            }
        } else {
            showToast('Invalid email or password', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Login failed. Please try again.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    console.log('Registration form submitted'); // Debug log
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const selectedAvatar = document.querySelector('.avatar-option.selected');
    
    console.log('Form data:', { name, email, password: '***', avatar: selectedAvatar?.dataset?.avatar }); // Debug log
    
    // Validate inputs
    if (!name || !email || !password) {
        showToast('All fields are required', 'error');
        return;
    }
    
    if (!email.endsWith('@student.uobabylon.edu.iq')) {
        showToast('Email must end with @student.uobabylon.edu.iq', 'error');
        return;
    }
    
    if (!selectedAvatar) {
        showToast('Please select an avatar', 'error');
        return;
    }
    
    console.log('Validation passed, starting registration...'); // Debug log
    
    try {
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating Account...';
        submitBtn.disabled = true;
        
        // Hash password
        const hashedPassword = await hashPassword(password);
        
        // Check if user already exists
        const { data: existingUsers, error: checkError } = await supabase
            .from('users')
            .select('email')
            .eq('email', email);
        
        if (checkError) {
            console.error('Error checking existing user:', checkError);
            showToast('Registration failed. Please try again.', 'error');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            return;
        }
        
        if (existingUsers && existingUsers.length > 0) {
            showToast('User already exists', 'error');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            return;
        }
        
        // Create new user
        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([
                {
                    name: name,
                    email: email,
                    password_hash: hashedPassword,
                    avatar: selectedAvatar.dataset.avatar,
                    total_coins: 0,
                    tests_completed: 0,
                    average_accuracy: 0,
                    best_time: null
                }
            ])
            .select()
            .single();
        
        if (insertError) {
            console.error('Registration error:', insertError);
            if (insertError.message.includes('check_email_domain')) {
                showToast('Email must end with @student.uobabylon.edu.iq', 'error');
            } else {
                showToast('Registration failed. Please try again.', 'error');
            }
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            return;
        }
        
        console.log('User created successfully:', newUser); // Debug log
          // Get user stats
        const userData = await getUserData(email);
        if (userData) {            currentUser = userData;
              // حفظ بيانات المستخدم في localStorage
            localStorage.setItem('codeit_user', JSON.stringify(userData));
            localStorage.setItem('codeit_user_timestamp', new Date().toISOString());
            console.log('User registered successfully, saved to localStorage');
            
            await showGameSection();
            showToast('Account created successfully!', 'success');
        } else {
            showToast('Account created but failed to load user data', 'error');
        }
        
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
    } catch (error) {
        console.error('Registration error:', error);
        showToast('Registration failed. Please try again.', 'error');
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Create Account';
            submitBtn.disabled = false;
        }
    }
}

async function showGameSection() {
    // التحقق من تسجيل الدخول
    if (!currentUser) {
        showToast('يجب تسجيل الدخول أولاً!', 'error');
        return;
    }
    
    console.log('Showing game section for user:', currentUser.email, 'coins:', currentUser.total_coins);
    
    // إخفاء جميع الأقسام الأخرى
    document.getElementById('welcome-section').classList.add('hidden');
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('game-section').classList.remove('hidden');
    document.getElementById('user-menu').classList.remove('hidden');
    
    // إظهار شريط التنقل
    document.body.classList.remove('hide-navbar');
    
    // Update user menu
    document.getElementById('nav-avatar').src = `/avatars/${currentUser.avatar}`;
    document.getElementById('nav-username').textContent = currentUser.name;
    updateUserCoinsDisplay();
    
    // Apply user theme and items
    await loadUserItems();
    await applyUserTheme();
    
    loadLeaderboard();
    
    console.log('Game section shown successfully, user coins display updated');
}

async function handleLogout() {
    try {
        // Sign out from Supabase if needed
        await supabase.auth.signOut();
        
        currentUser = null;
          // إزالة بيانات المستخدم من localStorage
        localStorage.removeItem('codeit_user');
        localStorage.removeItem('codeit_user_timestamp');
        console.log('User logged out, removed from localStorage');
        
        // إظهار صفحة الترحيب بدلاً من صفحة تسجيل الدخول
        document.getElementById('game-section').classList.add('hidden');
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('welcome-section').classList.remove('hidden');
        document.getElementById('user-menu').classList.add('hidden');
        
        // إخفاء شريط التنقل عند العودة لصفحة الترحيب
        document.body.classList.add('hide-navbar');
        
        // Close mobile menu if open
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const navMenu = document.getElementById('nav-menu');
        if (mobileMenuBtn && navMenu) {
            mobileMenuBtn.classList.remove('active');
            navMenu.classList.remove('active');
        }
        
        // Reset forms
        document.getElementById('login-form-element').reset();
        document.getElementById('register-form-element').reset();
        document.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));
        
        showToast('Logged out successfully', 'info');
    } catch (error) {
        console.error('Logout error:', error);
        // Still logout locally even if Supabase logout fails
        currentUser = null;
          // إزالة بيانات المستخدم من localStorage
        localStorage.removeItem('codeit_user');
        localStorage.removeItem('codeit_user_timestamp');
        console.log('User logged out (with error), removed from localStorage');
        
        document.getElementById('game-section').classList.add('hidden');
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('welcome-section').classList.remove('hidden');
        document.getElementById('user-menu').classList.add('hidden');
        
        // إخفاء شريط التنقل عند العودة لصفحة الترحيب
        document.body.classList.add('hide-navbar');
        
        // Close mobile menu if open
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const navMenu = document.getElementById('nav-menu');
        if (mobileMenuBtn && navMenu) {
            mobileMenuBtn.classList.remove('active');
            navMenu.classList.remove('active');
        }
        
        showToast('Logged out successfully', 'info');
    }
}

function startGame() {
    const language = document.getElementById('language-select').value;
    const difficulty = document.getElementById('difficulty-select').value;
    
    gameState.language = language;
    gameState.difficulty = difficulty;
    
    // Get random snippet
    const snippets = codeSnippets[language][difficulty];
    gameState.currentSnippet = snippets[Math.floor(Math.random() * snippets.length)];
    
    // Show game area
    document.getElementById('game-area').classList.remove('hidden');
    
    // Update display
    document.getElementById('code-language').textContent = language.toUpperCase();
    document.getElementById('code-difficulty').textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    document.getElementById('code-snippet').textContent = gameState.currentSnippet;
    
    // Reset game state
    gameState.isPlaying = false;
    gameState.startTime = null;
    gameState.totalCharacters = gameState.currentSnippet.length;
    gameState.correctCharacters = 0;
    
    // Reset input
    const input = document.getElementById('typing-input');
    input.value = '';
    input.disabled = false;
    input.focus();    // Reset timer display
    document.getElementById('timer').textContent = '0:00.00';
    document.getElementById('accuracy').textContent = '100%';
    document.getElementById('current-coins').textContent = '0';
    
    // Reset WPM display
    const wpmElement = document.getElementById('wpm');
    if (wpmElement) {
        wpmElement.textContent = '0 WPM';
    }
    
    // Reset progress bar
    updateProgressBar(0, gameState.currentSnippet.length);
    
    // Initialize code display with highlighting
    updateCodeDisplay('');
    
    showToast('Game started! Start typing to begin the timer.', 'info');
}

function handleTyping(e) {
    const input = e.target;
    const typedText = input.value;
    
    // Start timer on first keystroke
    if (!gameState.isPlaying && typedText.length > 0) {
        gameState.isPlaying = true;
        gameState.startTime = Date.now();
        startTimer();
    }
    
    // Real-time character-by-character validation
    updateCodeDisplay(typedText);
    
    // Calculate accuracy
    let correct = 0;
    const minLength = Math.min(typedText.length, gameState.currentSnippet.length);
    
    for (let i = 0; i < minLength; i++) {
        if (typedText[i] === gameState.currentSnippet[i]) {
            correct++;
        }
    }
    
    gameState.correctCharacters = correct;
    const accuracy = minLength > 0 ? Math.round((correct / minLength) * 100) : 100;
    
    // Update accuracy display with smooth animation
    updateAccuracyDisplay(accuracy);
    
    // Real-time input styling
    updateInputStyling(input, typedText, accuracy);
    
    // Update progress bar
    updateProgressBar(typedText.length, gameState.currentSnippet.length);
      // Update real-time coins calculation
    if (gameState.isPlaying && typedText.length > 0) {
        const currentTime = Date.now() - gameState.startTime;
        const projectedAccuracy = minLength > 0 ? Math.round((correct / minLength) * 100) : 100;
        const currentCoins = calculateAdvancedCoins(currentTime, projectedAccuracy, gameState.language, gameState.difficulty);
        document.getElementById('current-coins').textContent = currentCoins;
    }
    
    // Check if completed
    if (typedText === gameState.currentSnippet) {
        completeGame();
    }
}

function updateCodeDisplay(typedText) {
    const codeSnippet = document.getElementById('code-snippet');
    const originalText = gameState.currentSnippet;
    let highlightedHTML = '';
    
    for (let i = 0; i < originalText.length; i++) {
        const char = originalText[i];
        
        if (i < typedText.length) {
            // Character has been typed
            if (typedText[i] === char) {
                highlightedHTML += `<span class="correct-char">${char === ' ' ? '&nbsp;' : char}</span>`;
            } else {
                highlightedHTML += `<span class="error-char">${char === ' ' ? '&nbsp;' : char}</span>`;
            }
        } else if (i === typedText.length) {
            // Current character cursor
            highlightedHTML += `<span class="current-char">${char === ' ' ? '&nbsp;' : char}</span>`;
        } else {
            // Upcoming characters
            highlightedHTML += `<span class="pending-char">${char === ' ' ? '&nbsp;' : char}</span>`;
        }
    }
    
    codeSnippet.innerHTML = highlightedHTML;
}

function updateAccuracyDisplay(accuracy) {
    const accuracyElement = document.getElementById('accuracy');
    accuracyElement.textContent = `${accuracy}%`;
    
    // Add color coding for accuracy
    accuracyElement.className = 'accuracy-display';
    if (accuracy >= 95) {
        accuracyElement.classList.add('excellent');
    } else if (accuracy >= 80) {
        accuracyElement.classList.add('good');
    } else {
        accuracyElement.classList.add('poor');
    }
}

function updateInputStyling(input, typedText, accuracy) {
    // Remove all previous classes
    input.classList.remove('error', 'correct', 'perfect');
    
    if (typedText.length === 0) {
        return;
    }
    
    if (accuracy === 100) {
        input.classList.add('perfect');
    } else if (accuracy >= 80) {
        input.classList.add('correct');
    } else {
        input.classList.add('error');
    }
}

function updateProgressBar(typed, total) {
    const progressBar = document.getElementById('progress-bar');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    const percentage = total > 0 ? Math.round((typed / total) * 100) : 0;
    
    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
    }
    
    if (progressText) {
        progressText.textContent = `${typed}/${total} characters`;
    }
}

function startTimer() {
    // Clear any existing timer
    if (gameState.timer) {
        clearInterval(gameState.timer);
    }
    
    gameState.timer = setInterval(() => {
        if (!gameState.startTime || !gameState.isPlaying) {
            return;
        }
        
        const elapsed = Date.now() - gameState.startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        const milliseconds = Math.floor((elapsed % 1000) / 10); // Show centiseconds
        
        // Format time display
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
        document.getElementById('timer').textContent = timeString;
        
        // Update WPM (Words Per Minute) calculation
        updateWPM(elapsed);
    }, 10); // Update every 10ms for smooth timer
}

function updateWPM(elapsed) {
    const timeInMinutes = elapsed / 60000;
    const wordsTyped = gameState.correctCharacters / 5; // Standard: 5 chars = 1 word
    const wpm = timeInMinutes > 0 ? Math.round(wordsTyped / timeInMinutes) : 0;
    
    const wpmElement = document.getElementById('wpm');
    if (wpmElement) {
        wpmElement.textContent = `${wpm} WPM`;
    }
}

function completeGame() {
    gameState.isPlaying = false;
    clearInterval(gameState.timer);
    
    const endTime = Date.now();
    const totalTime = endTime - gameState.startTime;
    const accuracy = Math.round((gameState.correctCharacters / gameState.totalCharacters) * 100);
    
    // Advanced coins calculation system
    const coins = calculateAdvancedCoins(totalTime, accuracy, gameState.language, gameState.difficulty);
    
    console.log('Game completed:', {
        totalTime,
        accuracy,
        coins,
        correctCharacters: gameState.correctCharacters,
        totalCharacters: gameState.totalCharacters,
        language: gameState.language,
        difficulty: gameState.difficulty
    });
    
    // Update user stats
    updateUserStats(coins, accuracy, totalTime);
    
    // Show results
    showResults(totalTime, accuracy, coins);
    
    // Disable input
    document.getElementById('typing-input').disabled = true;
}

// Advanced coins calculation based on speed, accuracy, language difficulty, and level
function calculateAdvancedCoins(totalTime, accuracy, language, difficulty) {
    // Base coins for different difficulty levels
    const baseDifficultyCoins = {
        easy: 10,
        medium: 20,
        hard: 30
    };
    
    // Language multipliers based on complexity
    const languageMultipliers = {
        python: 1.0,    // Python is more readable (base multiplier)
        cpp: 1.3,       // C++ is more complex (30% bonus)
        java: 1.2       // Java is moderately complex (20% bonus)
    };
    
    // Speed bonus calculation
    const timeInSeconds = totalTime / 1000;
    const codeLength = gameState.currentSnippet.length;
    const charactersPerSecond = codeLength / timeInSeconds;
    
    // Speed bonus ranges (characters per second)
    let speedMultiplier = 1.0;
    if (charactersPerSecond >= 8) {
        speedMultiplier = 2.0;      // Super fast (100% bonus)
    } else if (charactersPerSecond >= 6) {
        speedMultiplier = 1.7;      // Very fast (70% bonus)
    } else if (charactersPerSecond >= 4) {
        speedMultiplier = 1.4;      // Fast (40% bonus)
    } else if (charactersPerSecond >= 2) {
        speedMultiplier = 1.2;      // Good (20% bonus)
    } else if (charactersPerSecond >= 1) {
        speedMultiplier = 1.0;      // Normal (no bonus)
    } else {
        speedMultiplier = 0.8;      // Slow (20% penalty)
    }
    
    // Accuracy bonus/penalty
    let accuracyMultiplier = accuracy / 100;
    if (accuracy >= 98) {
        accuracyMultiplier = 1.3;   // Perfect typing (30% bonus)
    } else if (accuracy >= 95) {
        accuracyMultiplier = 1.1;   // Excellent (10% bonus)
    } else if (accuracy >= 90) {
        accuracyMultiplier = 1.0;   // Good (no bonus/penalty)
    } else if (accuracy >= 80) {
        accuracyMultiplier = 0.8;   // Fair (20% penalty)
    } else {
        accuracyMultiplier = 0.5;   // Poor (50% penalty)
    }
      // Calculate final coins
    const baseCoins = baseDifficultyCoins[difficulty];
    const languageBonus = languageMultipliers[language];
    
    const finalCoins = Math.round(
        baseCoins * 
        languageBonus * 
        speedMultiplier * 
        accuracyMultiplier
    );
    
    // Ensure minimum coins (at least 1 coin for completing)
    return Math.max(1, finalCoins);
}

async function updateUserStats(coins, accuracy, time) {
    if (!currentUser) {
        console.error('No current user found');
        showToast('خطأ: لم يتم العثور على المستخدم', 'error');
        return;
    }

    console.log('Updating user stats:', { 
        coins, 
        accuracy, 
        time, 
        userEmail: currentUser.email,
        oldCoins: currentUser.total_coins
    });
    
    try {
        // Save test result
        const { error: testError } = await supabase
            .from('test_results')
            .insert([
                {
                    user_id: currentUser.id,
                    language: gameState.language,
                    difficulty: gameState.difficulty,
                    snippet_text: gameState.currentSnippet,
                    time_taken: time,
                    accuracy: accuracy,
                    coins_earned: coins
                }
            ]);
        
        if (testError) {
            console.error('Error saving test result:', testError);
            showToast('خطأ في حفظ النتائج', 'error');
            return;
        }
        
        console.log('Test result saved successfully');
          // Update user stats using the database function
        const { data, error: updateError } = await supabase
            .rpc('update_user_stats', {
                user_email: currentUser.email,
                coins_to_add: coins
            });
        
        if (updateError) {
            console.error('Error updating user stats:', updateError);
            showToast('خطأ في تحديث الإحصائيات', 'error');
            return;
        }
        
        console.log('User stats updated successfully, response:', data);
        
        // Small delay to ensure database update is complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Refresh user data
        const updatedUserData = await getUserData(currentUser.email);
        if (updatedUserData) {
            console.log('Coins update:', {
                oldCoins: currentUser.total_coins,
                newCoins: updatedUserData.total_coins,
                coinsAdded: coins,
                expectedCoins: currentUser.total_coins + coins
            });
            
            currentUser = updatedUserData;
            
            // Update coins display
            updateUserCoinsDisplay();
            
            // Update localStorage
            localStorage.setItem('codeit_user', JSON.stringify(updatedUserData));
            localStorage.setItem('codeit_user_timestamp', new Date().toISOString());
            console.log('User stats updated in localStorage');
              // Show success toast
            showToast(`تم كسب ${coins} عملة! العملات الإجمالية: ${updatedUserData.total_coins}`, 'success');
        } else {
            console.error('Failed to refresh user data');
            showToast('فشل في تحديث البيانات', 'error');
        }
        
        // Update leaderboard
        await loadLeaderboard();
        
    } catch (error) {
        console.error('Error updating user stats:', error);
        showToast('خطأ في تحديث الإحصائيات', 'error');
    }
}

function showResults(totalTime, accuracy, coins) {
    const minutes = Math.floor(totalTime / 60000);
    const seconds = Math.floor((totalTime % 60000) / 1000);
    const milliseconds = Math.floor((totalTime % 1000) / 10);
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    
    // Calculate WPM for results
    const timeInMinutes = totalTime / 60000;
    const wordsTyped = gameState.correctCharacters / 5;
    const wpm = timeInMinutes > 0 ? Math.round(wordsTyped / timeInMinutes) : 0;
    
    document.getElementById('result-time').textContent = timeString;
    document.getElementById('result-accuracy').textContent = `${accuracy}%`;
    document.getElementById('result-coins').textContent = coins;
    
    // Add WPM to results if element exists
    const resultWPM = document.getElementById('result-wpm');
    if (resultWPM) {
        resultWPM.textContent = `${wpm} WPM`;
    }
    
    // Determine rating
    let rating = 'needs-improvement';
    let ratingText = 'Needs Improvement';
    
    if (accuracy >= 95 && wpm >= 40) {
        rating = 'excellent';
        ratingText = 'Excellent';
    } else if (accuracy >= 80 && wpm >= 25) {
        rating = 'good';
        ratingText = 'Good';
    }
    
    const ratingBadge = document.getElementById('rating-badge');
    ratingBadge.className = `rating-badge ${rating}`;
    document.getElementById('rating-text').textContent = ratingText;
    
    // Update current coins display
    document.getElementById('current-coins').textContent = coins;
    
    // Log results for debugging
    console.log('Showing results:', {
        totalTime,
        accuracy,
        coins,
        wpm,
        rating,
        currentUserCoins: currentUser ? currentUser.total_coins : 'No user'
    });
    
    // Show modal
    document.getElementById('results-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('results-modal').classList.add('hidden');
}

function retryGame() {
    startGame();
}

function newSnippet() {
    const language = document.getElementById('language-select').value;
    const difficulty = document.getElementById('difficulty-select').value;
    
    // Get different snippet
    const snippets = codeSnippets[language][difficulty];
    let newSnippet;
    do {
        newSnippet = snippets[Math.floor(Math.random() * snippets.length)];
    } while (newSnippet === gameState.currentSnippet && snippets.length > 1);
    
    gameState.currentSnippet = newSnippet;
    document.getElementById('code-snippet').textContent = newSnippet;
    
    // Reset game state
    gameState.isPlaying = false;
    gameState.startTime = null;
    gameState.totalCharacters = newSnippet.length;
    gameState.correctCharacters = 0;
    
    // Reset input
    const input = document.getElementById('typing-input');
    input.value = '';
    input.disabled = false;
    input.classList.remove('error', 'correct');
    input.focus();
      // Reset displays
    document.getElementById('timer').textContent = '0:00';
    document.getElementById('accuracy').textContent = '100%';
    document.getElementById('current-coins').textContent = '0';
    
    // Clear timer if running
    if (gameState.timer) {
        clearInterval(gameState.timer);
        gameState.timer = null;
    }
    
    showToast('New snippet loaded!', 'info');
}

async function loadLeaderboard() {
    try {
        const { data: leaderboard, error } = await supabase
            .from('leaderboard')
            .select('*')
            .limit(50);
        
        if (error) {
            console.error('Error loading leaderboard:', error);
            return;
        }
        
        const leaderboardList = document.getElementById('leaderboard-list');
        leaderboardList.innerHTML = '';
        
        if (!leaderboard || leaderboard.length === 0) {
            leaderboardList.innerHTML = '<div class="no-data">No users on leaderboard yet</div>';
            return;
        }
        
        leaderboard.forEach((user, index) => {
            const entry = document.createElement('div');
            entry.className = 'leaderboard-entry';
            
            if (currentUser && user.id === currentUser.id) {
                entry.classList.add('current-user');
            }
            
            const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
            
            entry.innerHTML = `
                <div class="rank ${rankClass}">${user.rank}</div>
                <div class="user-info">
                    <img src="/avatars/${user.avatar}" alt="${user.name}">
                    <span class="name">${user.name}</span>
                </div>
                <div class="coins">${user.total_coins}</div>
            `;
            
            leaderboardList.appendChild(entry);
        });
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

function toggleLeaderboard() {
    const content = document.getElementById('leaderboard-content');
    const button = document.getElementById('toggle-leaderboard');
    
    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        button.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Leaderboard';
    } else {
        content.classList.add('hidden');
        button.innerHTML = '<i class="fas fa-eye"></i> Show Leaderboard';
    }
}

// Shop functionality
function openShop() {
    window.location.href = 'shop.html';
}

function updateUserCoinsDisplay() {
    if (!currentUser) {
        console.log('No current user for coins display');
        return;
    }
    
    // Update coins display in navigation
    const coinsDisplay = document.getElementById('user-coins');
    if (coinsDisplay) {
        coinsDisplay.textContent = currentUser.total_coins;
    }
    
    // Update coins display in shop if open
    updateShopCoinsDisplay();
    
    console.log('User coins display updated:', currentUser.total_coins);
}

function updateShopCoinsDisplay() {
    if (!currentUser) return;
    const shopCoinsDisplay = document.getElementById('shop-user-coins');
    if (shopCoinsDisplay) {
        shopCoinsDisplay.textContent = currentUser.total_coins;
    }
}

async function loadShop() {
    try {
        const { data: shopItems, error } = await supabase
            .from('shop_items')
            .select('*')
            .eq('is_active', true)
            .order('category', { ascending: true });
        
        if (error) {
            console.error('Error loading shop items:', error);
            return;
        }
        
        displayShopItems(shopItems);
        
        // Load user's purchased items
        if (currentUser) {
            await loadUserItems();
        }
    } catch (error) {
        console.error('Error loading shop:', error);
    }
}

function displayShopItems(shopItems) {
    const shopContainer = document.getElementById('shop-items');
    if (!shopContainer) return;

    // حفظ العناصر في متغير عام لسهولة التبديل بين التبويبات
    window._allShopItems = shopItems;

    // عرض القسم الافتراضي (إطارات الصور)
    renderShopTab('avatar_frame');

    // إضافة مستمعات للأزرار
    document.querySelectorAll('.shop-tab').forEach(tab => {
        tab.onclick = function() {
            document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            renderShopTab(this.dataset.tab);
        };
    });
}

function renderShopTab(tab) {
    const shopContainer = document.getElementById('shop-items');
    if (!shopContainer) return;

    // دعم كلا التسميتين للفئات
    const categories = {
        avatar_frame: { name: 'إطارات الصور', items: [] },
        profile_icon: { name: 'أيقونات الحالة', items: [] }
    };

    (window._allShopItems || []).forEach(item => {
        if ((tab === 'avatar_frame' && (item.category === 'avatar_frame' || item.category === 'frame')) ||
            (tab === 'profile_icon' && (item.category === 'profile_icon' || item.category === 'icon'))) {
            categories[tab].items.push(item);
        }
    });

    shopContainer.innerHTML = '';
    const category = categories[tab];
    if (category && category.items.length > 0) {
        const categorySection = document.createElement('div');
        categorySection.className = 'shop-category';
        categorySection.innerHTML = `
            <h3 class="category-title">${category.name}</h3>
            <div class="category-items">
                ${category.items.map(item => createShopItemHTML(item)).join('')}
            </div>
        `;
        shopContainer.appendChild(categorySection);
    } else {
        shopContainer.innerHTML = '<div style="text-align:center;color:#aaa;padding:2rem">لا توجد عناصر في هذا القسم حالياً.</div>';
    }
}

function createShopItemHTML(item) {
    const itemData = typeof item.item_data === 'string' ? JSON.parse(item.item_data) : item.item_data;
    const isOwned = currentUser?.ownedItems?.includes(item.id);
    const isEquipped = currentUser?.equippedItems?.includes(item.id);
    
    return `
        <div class="shop-item ${isOwned ? 'owned' : ''} ${isEquipped ? 'equipped' : ''}" data-item-id="${item.id}">
            <div class="item-preview ${itemData.css_class || ''}" style="${getItemPreviewStyle(item.category, itemData)}">
                ${getItemPreviewContent(item.category, itemData)}
            </div>
            <div class="item-info">
                <h4 class="item-name">${item.name}</h4>
                <p class="item-description">${item.description}</p>
                <div class="item-actions">
                    ${isOwned ? 
                        (isEquipped ? 
                            '<button class="equipped-btn" disabled>مُجهز</button>' : 
                            '<button class="equip-btn" onclick="equipItem(' + item.id + ')">تجهيز</button>'
                        ) : 
                        '<button class="purchase-btn" onclick="purchaseItem(' + item.id + ')">' + 
                        '<i class="fas fa-coins"></i> ' + item.price + '</button>'
                    }
                </div>
            </div>
        </div>
    `;
}

function getItemPreviewStyle(category, itemData) {
    let style = '';
    switch (category) {
        case 'avatar_frame':
            if (itemData.border) {
                style = `border: ${itemData.border};`;
            }
            if (itemData.shadow) {
                style += `box-shadow: ${itemData.shadow};`;
            }
            if (itemData.background) {
                style += `background: ${itemData.background};`;
            }
            break;
    }
    return style;
}

function getItemPreviewContent(category, itemData) {
    switch (category) {
        case 'avatar_frame':
            return '<div class="avatar-preview"><img src="/avatars/man.png" alt="Avatar"></div>';
        case 'profile_icon':
            return `<div class="icon-preview" style="color: ${itemData.color || '#333'}">${itemData.icon}</div>`;
        default:
            return '';
    }
}

async function purchaseItem(itemId) {
    if (!currentUser) {
        showToast('يجب تسجيل الدخول أولاً!', 'error');
        return;
    }
    
    console.log('Attempting to purchase item:', itemId, 'for user:', currentUser.email);
    
    try {
        const { data, error } = await supabase
            .rpc('purchase_item', {
                user_email: currentUser.email,
                item_id: itemId
            });
        
        if (error) {
            console.error('Error purchasing item:', error);
            showToast('حدث خطأ أثناء الشراء', 'error');
            return;
        }
        
        console.log('Purchase result:', data);
        const result = data;
        
        if (result.success) {
            showToast(result.message, 'success');
            
            // Update user coins locally
            currentUser.total_coins = result.remaining_coins;
            
            // Get fresh user data from database to ensure consistency
            const freshUserData = await getUserData(currentUser.email);
            if (freshUserData) {
                currentUser = freshUserData;
                console.log('Fresh user data loaded after purchase');
                
                // إذا كان الثيم المختار هو dark-theme أضف الكلاس صراحةً
                const equippedTheme = currentUser.equippedItemsByCategory?.theme;
                if (equippedTheme) {
                    const themeData = typeof equippedTheme.item_data === 'string' ? 
                        JSON.parse(equippedTheme.item_data) : equippedTheme.item_data;
                    
                    if (themeData.css_class === 'dark-theme') {
                        document.body.classList.add('dark-theme');
                    }
                }
                
                // Update coins display
                updateUserCoinsDisplay();
                
                // Update localStorage with fresh data
                localStorage.setItem('codeit_user', JSON.stringify(currentUser));
                localStorage.setItem('codeit_user_timestamp', new Date().toISOString());
                
                // Reload shop and user items
                await loadShop();
                await loadUserItems();
                
                console.log('Purchase completed successfully. New coins:', currentUser.total_coins);
            }
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error purchasing item:', error);
        showToast('حدث خطأ أثناء الشراء', 'error');
    }
}

async function equipItem(itemId) {
    if (!currentUser) {
        showToast('يجب تسجيل الدخول أولاً!', 'error');
        return;
    }
    
    try {
        const { data, error } = await supabase
            .rpc('equip_item', {
                user_email: currentUser.email,
                item_id: itemId
            });
        
        if (error) {
            console.error('Error equipping item:', error);
            showToast('حدث خطأ أثناء تجهيز العنصر', 'error');
            return;
        }
        
        const result = data;
        
        if (result.success) {
            showToast(result.message, 'success');
            
            // Reload shop and user items
            await loadShop();
            await loadUserItems();
            
            // Apply the item effect
            await applyUserTheme();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error equipping item:', error);
        showToast('حدث خطأ أثناء تجهيز العنصر', 'error');
    }
}

async function loadUserItems() {
    if (!currentUser) {
        console.log('No current user found for loading items');
        return;
    }
    
    console.log('Loading user items for:', currentUser.email);
    
    try {
        const { data, error } = await supabase
            .rpc('get_user_items', {
                user_email: currentUser.email
            });
        
        if (error) {
            console.error('Error loading user items:', error);
            return;
        }
        
        console.log('User items loaded:', data);
        
        // Update currentUser with owned and equipped items
        currentUser.ownedItems = data.map(item => item.item_id);
        currentUser.equippedItems = data.filter(item => item.is_equipped).map(item => item.item_id);
        
        // Store equipped items by category for easier access
        currentUser.equippedItemsByCategory = {};
        data.filter(item => item.is_equipped).forEach(item => {
            currentUser.equippedItemsByCategory[item.item_category] = item;
        });
        
        console.log('Updated currentUser with items:', {
            ownedItems: currentUser.ownedItems,
            equippedItems: currentUser.equippedItems,
            equippedItemsByCategory: currentUser.equippedItemsByCategory
        });
        
    } catch (error) {
        console.error('Error loading user items:', error);
    }
}

async function applyUserTheme() {
    if (!currentUser || !currentUser.equippedItemsByCategory) {
        console.log('No user or equipped items found for theme application');
        return;
    }
    
    console.log('Applying user theme. Equipped items:', currentUser.equippedItemsByCategory);
    
    // Remove existing theme classes
    const themeClasses = ['dark-theme', 'blue-theme', 'green-theme', 'purple-theme', 'gold-theme', 'dynamic-theme'];
    themeClasses.forEach(cls => {
        document.body.classList.remove(cls);
    });
    
    // Remove existing dynamic theme styles
    const existingStyle = document.getElementById('dynamic-theme-styles');
    if (existingStyle) {
        existingStyle.remove();
    }
    
    // Apply theme
    const equippedTheme = currentUser.equippedItemsByCategory.theme;
    if (equippedTheme) {
        console.log('Found equipped theme:', equippedTheme);
        
        const themeData = typeof equippedTheme.item_data === 'string' ? 
            JSON.parse(equippedTheme.item_data) : equippedTheme.item_data;
        
        console.log('Theme data:', themeData);
        
        if (themeData.css_class) {
            console.log('Applying theme class:', themeData.css_class);
            document.body.classList.add(themeData.css_class);
            
            // Verify the theme was applied
            setTimeout(() => {
                const hasTheme = document.body.classList.contains(themeData.css_class);
                console.log('Theme application verified:', hasTheme);
                if (hasTheme) {
                    showToast(`Theme applied: ${equippedTheme.name}`, 'success');
                }
            }, 100);
        } else if (themeData.colors) {
            // Handle old theme format - create dynamic styles
            console.log('Applying dynamic theme colors:', themeData.colors);
            applyDynamicTheme(themeData.colors);
            showToast(`Dynamic theme applied: ${equippedTheme.name}`, 'success');
        }
    } else {
        console.log('No equipped theme found');
    }
    
    // Apply avatar frame
    const equippedFrame = currentUser.equippedItemsByCategory.avatar_frame;
    const navAvatar = document.getElementById('nav-avatar');
    if (equippedFrame && navAvatar) {
        console.log('Found equipped frame:', equippedFrame);
        
        const frameData = typeof equippedFrame.item_data === 'string' ? 
            JSON.parse(equippedFrame.item_data) : equippedFrame.item_data;
        
        console.log('Frame data:', frameData);
        
        // Reset avatar styles
        navAvatar.className = '';
        navAvatar.style.border = '';
        navAvatar.style.boxShadow = '';
        navAvatar.style.background = '';
        
        // Apply frame styles
        if (frameData.css_class) {
            navAvatar.classList.add(frameData.css_class);
        }
        if (frameData.border) {
            navAvatar.style.border = frameData.border;
        }
        if (frameData.shadow) {
            navAvatar.style.boxShadow = frameData.shadow;
        }
        if (frameData.background) {
            navAvatar.style.background = frameData.background;
        }
        
        console.log('Avatar frame applied:', navAvatar.className, navAvatar.style.cssText);
        showToast(`Avatar frame applied: ${equippedFrame.name}`, 'success');
    } else {
        console.log('No equipped frame found or nav avatar not found');
    }
    
    // Apply profile icon
    const equippedIcon = currentUser.equippedItemsByCategory.profile_icon;
    const profileIcon = document.getElementById('profile-icon');
    if (equippedIcon && profileIcon) {
        const iconData = typeof equippedIcon.item_data === 'string' ? 
            JSON.parse(equippedIcon.item_data) : equippedIcon.item_data;
        
        profileIcon.innerHTML = iconData.icon || '';
        profileIcon.style.color = iconData.color || '#333';
    }
}

function applyDynamicTheme(colors) {
    // Remove existing dynamic theme styles
    const existingStyle = document.getElementById('dynamic-theme-styles');
    if (existingStyle) {
        existingStyle.remove();
    }
    
    // Create new dynamic theme styles
    const style = document.createElement('style');
    style.id = 'dynamic-theme-styles';
    style.textContent = `
        body.dynamic-theme {
            background: ${colors.background || colors.primary || '#000'};
        }
        
        .dynamic-theme .navbar {
            background: linear-gradient(135deg, ${colors.primary || '#000'} 0%, ${colors.secondary || '#111'} 100%);
            border-bottom: 1px solid ${colors.accent || '#333'};
        }
        
        .dynamic-theme .game-settings,
        .dynamic-theme .game-area,
        .dynamic-theme .results-card {
            background: linear-gradient(135deg, ${colors.primary || '#000'} 0%, ${colors.secondary || '#111'} 100%);
            border: 1px solid ${colors.accent || '#333'};
        }
        
        .dynamic-theme .primary-btn {
            background: linear-gradient(135deg, ${colors.primary || '#000'}, ${colors.secondary || '#111'});
            border: 1px solid ${colors.accent || '#333'};
        }
        
        .dynamic-theme .primary-btn:hover {
            background: linear-gradient(135deg, ${colors.secondary || '#111'}, ${colors.accent || '#333'});
        }
        
        .dynamic-theme .stat-item {
            background: linear-gradient(135deg, ${colors.primary || '#000'} 0%, ${colors.secondary || '#111'} 100%);
            border: 1px solid ${colors.accent || '#333'};
        }
        
        .dynamic-theme .code-display {
            background: linear-gradient(135deg, ${colors.background || colors.primary || '#000'} 0%, ${colors.primary || '#111'} 100%);
            border: 1px solid ${colors.accent || '#333'};
        }
        
        .dynamic-theme .user-input {
            background: linear-gradient(135deg, ${colors.background || colors.primary || '#000'} 0%, ${colors.primary || '#111'} 100%);
            border: 1px solid ${colors.accent || '#333'};
            color: #ffffff;
        }
        
        .dynamic-theme .shop-modal-content,
        .dynamic-theme .shop-item {
            background: linear-gradient(135deg, ${colors.primary || '#000'} 0%, ${colors.secondary || '#111'} 100%);
            border: 1px solid ${colors.accent || '#333'};
        }
    `;
    
    document.head.appendChild(style);
    document.body.classList.add('dynamic-theme');
}

// Authentication helper functions
async function checkUserSession() {
    try {
        console.log('Checking user session...');
        
        // أولاً، تحقق من localStorage
        if (isStoredUserValid()) {
            const storedUser = localStorage.getItem('codeit_user');
            const userData = JSON.parse(storedUser);
            console.log('Found stored user:', userData.email, 'coins:', userData.total_coins);
            
            // تحقق من أن بيانات المستخدم لا تزال صالحة في قاعدة البيانات
            const currentUserData = await getUserData(userData.email);
            if (currentUserData) {
                console.log('Updated user data from database:', currentUserData.email, 'coins:', currentUserData.total_coins);
                currentUser = currentUserData;
                
                // تحديث timestamp
                localStorage.setItem('codeit_user_timestamp', new Date().toISOString());
                console.log('User session restored from localStorage');
                
                // إخفاء صفحة الترحيب وإظهار اللعبة مباشرة
                document.getElementById('welcome-section').classList.add('hidden');
                document.body.classList.remove('hide-navbar');
                await showGameSection();
                return;
            } else {
                // إذا لم تعد بيانات المستخدم صالحة، امسح localStorage
                clearStoredUser();
                console.log('Stored user data is invalid, cleared localStorage');
            }
        }
        
        // إذا لم يتم العثور على مستخدم في localStorage، تحقق من Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            // Get user data from database
            const userData = await getUserData(session.user.email);
            if (userData) {
                currentUser = userData;
                
                // حفظ بيانات المستخدم في localStorage
                localStorage.setItem('codeit_user', JSON.stringify(userData));
                localStorage.setItem('codeit_user_timestamp', new Date().toISOString());
                console.log('User session found in Supabase, saved to localStorage');
                
                // إخفاء صفحة الترحيب وإظهار اللعبة مباشرة
                document.getElementById('welcome-section').classList.add('hidden');
                document.body.classList.remove('hide-navbar');
                await showGameSection();
            }
        } else {
            console.log('No user session found, showing welcome page');
            // إظهار صفحة الترحيب للمستخدمين غير المسجلين
            document.getElementById('welcome-section').classList.remove('hidden');
            document.getElementById('auth-section').classList.add('hidden');
            document.getElementById('game-section').classList.add('hidden');
            document.body.classList.add('hide-navbar');
        }
    } catch (error) {
        console.error('Error checking user session:', error);
        // في حالة خطأ، امسح البيانات المحفوظة واعرض صفحة الترحيب
        clearStoredUser();
        document.getElementById('welcome-section').classList.remove('hidden');
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('game-section').classList.add('hidden');
        document.body.classList.add('hide-navbar');
    }
}

async function getUserData(email) {
    console.log('Fetching user data for email:', email);
    
    try {
        const { data, error } = await supabase
            .rpc('get_user_stats', { user_email: email });
        
        if (error) {
            console.error('Error fetching user data:', error);
            return null;
        }
        
        console.log('User data fetched successfully:', data);
        
        return data && data.length > 0 ? data[0] : null;
    } catch (error) {
        console.error('Error in getUserData:', error);
        return null;
    }
}

async function hashPassword(password) {
    // Simple hash for demo - in production, use proper hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// دالة مساعدة للتحقق من صحة البيانات المحفوظة
function isStoredUserValid() {
    const storedUser = localStorage.getItem('codeit_user');
    const storedTimestamp = localStorage.getItem('codeit_user_timestamp');
    
    if (!storedUser || !storedTimestamp) {
        return false;
    }
    
    try {
        const userData = JSON.parse(storedUser);
        const lastLogin = new Date(storedTimestamp);
        const now = new Date();
        const daysSinceLastLogin = (now - lastLogin) / (1000 * 60 * 60 * 24);
        
        // التحقق من أن البيانات المحفوظة لا تزال صالحة (أقل من 30 يوم)
        if (daysSinceLastLogin > 30) {
            return false;
        }
        
        // التحقق من أن البيانات المحفوظة تحتوي على الحقول المطلوبة
        if (!userData.email || !userData.name || !userData.avatar) {
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Error validating stored user data:', error);
        return false;
    }
}

// دالة مساعدة لتنظيف البيانات المحفوظة
function clearStoredUser() {
    localStorage.removeItem('codeit_user');
    localStorage.removeItem('codeit_user_timestamp');
    console.log('Stored user data cleared');
}

// Utility functions
function formatTime(milliseconds) {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fas fa-check-circle' : 
                 type === 'error' ? 'fas fa-exclamation-circle' : 
                 'fas fa-info-circle';
    
    toast.innerHTML = `
        <i class="${icon}"></i>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
      // Remove toast after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
}

// Debug function to test theme application
window.debugTheme = function() {
    console.log('Current user:', currentUser);
    console.log('Current body classes:', document.body.classList.toString());
    
    if (currentUser && currentUser.equippedItemsByCategory) {
        console.log('Equipped items:', currentUser.equippedItemsByCategory);
        applyUserTheme();
    } else {
        console.log('No user or equipped items found');
    }
};

// Debug function to manually apply a theme
window.testTheme = function(themeClass) {
    const themeClasses = ['dark-theme', 'blue-theme', 'green-theme', 'purple-theme', 'gold-theme', 'dynamic-theme'];
    themeClasses.forEach(cls => {
        document.body.classList.remove(cls);
    });
    
    document.body.classList.add(themeClass);
    console.log('Applied theme:', themeClass);
    console.log('Body classes:', document.body.classList.toString());
};

if (typeof window !== 'undefined' && window.supabaseClient) {
  window.supabase = window.supabaseClient;
}

// --- منطق القائمة الجانبية للأجهزة المحمولة ---
document.addEventListener('DOMContentLoaded', function() {
  const logoutBtn = document.getElementById('logout-btn');
  const shopBtn = document.getElementById('shop-btn');

  // Main initialization code remains here
});

