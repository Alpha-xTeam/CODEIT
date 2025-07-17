// Supabase إعداد
const SUPABASE_URL = 'https://xspzacvpizjjaosrebgz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcHphY3ZwaXpqamFvc3JlYmd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MTA4MDQsImV4cCI6MjA2ODA4NjgwNH0.pq-YKgKTY38hiqpJaivv8m79hhr_jYRkDg9Idon-TRY';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

window.onload = async function() {
    // تحقق من الجلسة
    const storedUser = localStorage.getItem('currentUser') || localStorage.getItem('codeit_user');
    if (!storedUser) return showNotAllowed();
    currentUser = JSON.parse(storedUser);
    console.log('CURRENT USER FROM STORAGE:', currentUser);
    // جلب بيانات المستخدم من قاعدة البيانات
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    console.log('USER FROM DB:', user);
    if (error || !user || user.role !== 'owner') return showNotAllowed();
    document.getElementById('not-allowed').classList.add('hidden');
    document.getElementById('admin-content').classList.remove('hidden');
    loadStats();
    loadUsers();
    loadShop();
};

function showNotAllowed() {
    document.getElementById('not-allowed').classList.remove('hidden');
    document.getElementById('admin-content').classList.add('hidden');
}

async function loadStats() {
    try {
        // جلب إحصائيات عامة
        const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
        const { count: testsCount } = await supabase.from('test_results').select('*', { count: 'exact', head: true });
        const { count: itemsCount } = await supabase.from('shop_items').select('*', { count: 'exact', head: true });
        
        // حساب عدد الزوار من localStorage
        const visitorsCount = localStorage.getItem('total_visitors') || 0;
        
        // حساب عدد المستخدمين المسجلين حديثاً (آخر 7 أيام)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        let newUsersCount = 0;
        try {
            const { count } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', sevenDaysAgo.toISOString());
            newUsersCount = count;
        } catch (error) {
            console.log('Could not fetch new users count:', error);
        }
        
        // حساب متوسط الدقة للمستخدمين
        let averageAccuracy = 0;
        try {
            const { data } = await supabase
                .from('test_results')
                .select('accuracy')
                .not('accuracy', 'is', null);
            
            if (data && data.length > 0) {
                const totalAccuracy = data.reduce((sum, test) => sum + test.accuracy, 0);
                averageAccuracy = Math.round(totalAccuracy / data.length);
            }
        } catch (error) {
            console.log('Could not fetch average accuracy:', error);
        }
        
        const statsGrid = document.getElementById('stats-grid');
        statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-eye"></i></div>
                <div class="stat-value">${visitorsCount ?? '-'}</div>
                <div class="stat-label">زوار الموقع</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-users"></i></div>
                <div class="stat-value">${usersCount ?? '-'}</div>
                <div class="stat-label">إجمالي المستخدمين</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-user-plus"></i></div>
                <div class="stat-value">${newUsersCount ?? '-'}</div>
                <div class="stat-label">مستخدمون جدد (7 أيام)</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-keyboard"></i></div>
                <div class="stat-value">${testsCount ?? '-'}</div>
                <div class="stat-label">الاختبارات المنجزة</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-percentage"></i></div>
                <div class="stat-value">${averageAccuracy ? averageAccuracy + '%' : '-'}</div>
                <div class="stat-label">متوسط الدقة</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-box"></i></div>
                <div class="stat-value">${itemsCount ?? '-'}</div>
                <div class="stat-label">عناصر المتجر</div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading stats:', error);
        const statsGrid = document.getElementById('stats-grid');
        statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-exclamation-triangle"></i></div>
                <div class="stat-value">خطأ</div>
                <div class="stat-label">فشل في تحميل الإحصائيات</div>
            </div>
        `;
    }
}

async function loadUsers() {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('id, name, email, role, created_at')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error loading users:', error);
            return;
        }
        
        const tbody = document.querySelector('#users-table tbody');
        tbody.innerHTML = '';
        
        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #ccc;">لا يوجد مستخدمون</td></tr>';
            return;
        }
        
        users.forEach(user => {
            const isOwner = user.role === 'owner';
            const deleteButton = isOwner ? 
                '<span style="color: #666; font-size: 0.8rem;">مالك</span>' : 
                `<button class="btn danger" onclick="deleteUser('${user.id}')">حذف</button>`;
            
            tbody.innerHTML += `
                <tr>
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td style="color: ${isOwner ? '#ffd700' : '#fff'}">${user.role}</td>
                    <td>${deleteButton}</td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error in loadUsers:', error);
    }
}

async function loadShop() {
    try {
        const { data: items, error } = await supabase
            .from('shop_items')
            .select('id, name, category, price, is_active')
            .order('category', { ascending: true });
        
        if (error) {
            console.error('Error loading shop items:', error);
            return;
        }
        
        const tbody = document.querySelector('#shop-table tbody');
        tbody.innerHTML = '';
        
        if (!items || items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #ccc;">لا يوجد عناصر في المتجر</td></tr>';
            return;
        }
        
        items.forEach(item => {
            tbody.innerHTML += `
                <tr style="opacity: ${item.is_active ? '1' : '0.5'}">
                    <td>${item.name}${!item.is_active ? ' <span style="color: #ff4444; font-size: 0.8rem;">(معطل)</span>' : ''}</td>
                    <td>${item.category}</td>
                    <td>${item.price} عملة</td>
                    <td>
                        <button class="btn danger" onclick="deleteItem(${item.id})">حذف</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error in loadShop:', error);
    }
}

async function deleteUser(userId) {
    if (userId === currentUser.id) {
        alert('لا يمكنك حذف نفسك (المالك)!');
        return;
    }
    
    // رسالة تحذير أكثر تفصيلاً
    const confirmMessage = 'هل أنت متأكد من حذف هذا المستخدم؟\n\nسيتم حذف جميع البيانات المرتبطة بالمستخدم:\n- نتائج الاختبارات\n- العناصر المشتراة\n- الإعدادات الشخصية\n\nهذا الإجراء لا يمكن التراجع عنه!';
    
    if (!confirm(confirmMessage)) return;
    
    try {
        const btn = document.querySelector(`button[onclick="deleteUser('${userId}')"]`);
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'جاري الحذف...';
            btn.style.opacity = '0.7';
        }
        
        const { data, error } = await supabase
            .rpc('delete_user_by_owner', {
                user_id_to_delete: userId,
                current_user_email: currentUser.email
            });
        
        console.log('Delete response:', { data, error });
        
        if (error) {
            console.error('Delete error:', error);
            alert(`حدث خطأ أثناء الحذف: ${error.message}`);
        } else if (data.success) {
            alert(data.message);
            await loadUsers();
            await loadStats(); // تحديث الإحصائيات
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error in deleteUser:', error);
        alert('حدث خطأ أثناء الحذف!');
    } finally {
        const btn = document.querySelector(`button[onclick="deleteUser('${userId}')"]`);
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'حذف';
            btn.style.opacity = '1';
        }
    }
}

async function deleteItem(itemId) {
    const confirmMessage = 'هل أنت متأكد من حذف هذا العنصر؟\n\nسيتم حذف العنصر من جميع المستخدمين الذين يملكونه.\n\nهذا الإجراء لا يمكن التراجع عنه!';
    
    if (!confirm(confirmMessage)) return;
    
    try {
        const btn = document.querySelector(`button[onclick="deleteItem(${itemId})"]`);
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'جاري الحذف...';
            btn.style.opacity = '0.7';
        }
        
        const { data, error } = await supabase
            .rpc('delete_shop_item_by_owner', {
                item_id_to_delete: itemId,
                current_user_email: currentUser.email
            });
        
        console.log('Delete item response:', { data, error });
        
        if (error) {
            console.error('Delete item error:', error);
            alert(`حدث خطأ أثناء الحذف: ${error.message}`);
        } else if (data.success) {
            alert(data.message);
            await loadShop();
            await loadStats(); // تحديث الإحصائيات
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error in deleteItem:', error);
        alert('حدث خطأ أثناء الحذف!');
    } finally {
        const btn = document.querySelector(`button[onclick="deleteItem(${itemId})"]`);
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'حذف';
            btn.style.opacity = '1';
        }
    }
}