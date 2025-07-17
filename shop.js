history.replaceState({}, '', '/');
// shop.js - متجر CODEIT مستقل

// --- إعداد متغيرات المستخدم ---
let currentUser = null;

// --- دوال مساعدة ---
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fas fa-check-circle' : type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-info-circle';
    toast.innerHTML = `<i class="${icon}"></i><span class="toast-message">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 5000);
}

// --- جلب بيانات المستخدم ---
async function getUserData(email) {
    try {
        const { data, error } = await window.supabase.rpc('get_user_stats', { user_email: email });
        if (error) { console.error('Error fetching user data:', error); return null; }
        return data && data.length > 0 ? data[0] : null;
    } catch (error) {
        console.error('Error in getUserData:', error); return null;
    }
}

// --- تحديث عرض العملات ---
function updateShopCoinsDisplay() {
    const shopCoinsDisplay = document.getElementById('shop-user-coins');
    if (shopCoinsDisplay && currentUser) {
        shopCoinsDisplay.textContent = currentUser.total_coins;
    } else if (shopCoinsDisplay) {
        shopCoinsDisplay.textContent = 'يرجى تسجيل الدخول';
    }
}

// --- تحميل عناصر المتجر ---
async function loadShop() {
    try {
        const { data: shopItems, error } = await window.supabase
            .from('shop_items')
            .select('*')
            .eq('is_active', true)
            .order('category', { ascending: true });
        if (error) { console.error('Error loading shop items:', error); return; }
        displayShopItems(shopItems);
        if (currentUser) await loadUserItems();
    } catch (error) {
        console.error('Error loading shop:', error);
    }
}

function displayShopItems(shopItems) {
    const shopContainer = document.getElementById('shop-items');
    if (!shopContainer) return;
    window._allShopItems = shopItems;
    renderShopTab('avatar_frame');
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
                            `<button class="equip-btn" onclick="equipItem(${item.id})">تجهيز</button>`
                        ) : 
                        `<button class="purchase-btn" onclick="purchaseItem(${item.id})"><i class='fas fa-coins'></i> ${item.price}</button>`
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
        case 'frame':
            if (itemData.border) style = `border: ${itemData.border};`;
            if (itemData.shadow) style += `box-shadow: ${itemData.shadow};`;
            if (itemData.background) style += `background: ${itemData.background};`;
            break;
    }
    return style;
}

function getItemPreviewContent(category, itemData) {
    switch (category) {
        case 'avatar_frame':
        case 'frame':
            return '<div class="avatar-preview"><img src="avatars/man.png" alt="Avatar"></div>';
        case 'profile_icon':
        case 'icon':
            return `<div class="icon-preview" style="color: ${itemData.color || '#333'}">${itemData.icon}</div>`;
        default:
            return '';
    }
}

// --- شراء وتجهيز العناصر ---
async function purchaseItem(itemId) {
    if (!currentUser) { showToast('يجب تسجيل الدخول أولاً!', 'error'); return; }
    try {
        const { data, error } = await window.supabase.rpc('purchase_item', { user_email: currentUser.email, item_id: itemId });
        if (error) { showToast('حدث خطأ أثناء الشراء', 'error'); return; }
        const result = data;
        if (result.success) {
            showToast(result.message, 'success');
            currentUser.total_coins = result.remaining_coins;
            const freshUserData = await getUserData(currentUser.email);
            if (freshUserData) currentUser = freshUserData;
            updateShopCoinsDisplay();
            await loadUserItems();
            loadShop();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        showToast('حدث خطأ أثناء الشراء', 'error');
    }
}

async function equipItem(itemId) {
    if (!currentUser) { showToast('يجب تسجيل الدخول أولاً!', 'error'); return; }
    try {
        const { data, error } = await window.supabase.rpc('equip_item', { user_email: currentUser.email, item_id: itemId });
        if (error) { showToast('حدث خطأ أثناء تجهيز العنصر', 'error'); return; }
        const result = data;
        if (result.success) {
            showToast(result.message, 'success');
            await loadShop();
            await loadUserItems();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        showToast('حدث خطأ أثناء تجهيز العنصر', 'error');
    }
}

async function loadUserItems() {
    if (!currentUser) return;
    try {
        const { data, error } = await window.supabase.rpc('get_user_items', { user_email: currentUser.email });
        if (error) { console.error('Error loading user items:', error); return; }
        currentUser.ownedItems = data.map(item => item.item_id);
        currentUser.equippedItems = data.filter(item => item.is_equipped).map(item => item.item_id);
        currentUser.equippedItemsByCategory = {};
        data.filter(item => item.is_equipped).forEach(item => {
            currentUser.equippedItemsByCategory[item.item_category] = item;
        });
    } catch (error) {
        console.error('Error loading user items:', error);
    }
}

// --- بدء تحميل المتجر عند تهيئة الصفحة ---
(function initShopPage() {
    // جلب بيانات المستخدم من localStorage
    const userStr = localStorage.getItem('codeit_user');
    if (userStr) {
        try {
            currentUser = JSON.parse(userStr);
        } catch { currentUser = null; }
    }
    if (!currentUser) {
        updateShopCoinsDisplay();
        return;
    }
    // تحديث بيانات المستخدم من القاعدة
    getUserData(currentUser.email).then(user => {
        if (user) {
            currentUser = user;
            localStorage.setItem('codeit_user', JSON.stringify(currentUser));
        }
        updateShopCoinsDisplay();
        loadUserItems().then(loadShop);    }).catch(() => {
        updateShopCoinsDisplay();
        loadShop();
    });
})();

// --- إعداد القائمة الجانبية للأجهزة المحمولة ---
document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu initialization code removed
});