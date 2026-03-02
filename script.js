// إعدادات Firebase (نفس إعداداتك)
const firebaseConfig = {
    apiKey: "AIzaSyCcgQj8bk5Me1g80EHLY7heukjUvH_GSKs",
    authDomain: "sultan-honey.firebaseapp.com",
    databaseURL: "https://sultan-honey-default-rtdb.firebaseio.com",
    projectId: "sultan-honey",
    storageBucket: "sultan-honey.firebasestorage.app",
    messagingSenderId: "701835618498",
    appId: "1:701835618498:web:701e310cf1c2c0dad6b35b"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
const users = { "عمر": "111", "مريم": "222", "إبراهيم": "6410" };

let currentUser = localStorage.getItem('loggedUser');
let userRole = localStorage.getItem('userRole');
let editKey = null;

if (currentUser) { showApp(); }

function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    if (users[user] === pass) {
        currentUser = user;
        userRole = (user === "إبراهيم") ? "admin" : "staff";
        localStorage.setItem('loggedUser', user);
        localStorage.setItem('userRole', userRole);
        location.reload();
    } else { alert("خطأ في الدخول"); }
}

function showApp() { 
    document.getElementById('loginScreen').style.display = 'none'; 
    document.getElementById('appBody').style.display = 'block'; 
    document.getElementById('userWelcome').innerText = `مرحباً ${currentUser}`;
    loadData(); 
}

// دالة الاستخراج الذكي (المحدثة لطلبك)
function processSmartPaste() {
    const text = document.getElementById('smartInput').value;
    if (!text) return;
    const customerMatch = text.match(/العميل\s*\n\s*(.+)/);
    if (customerMatch) document.getElementById('custName').value = customerMatch[1].trim();
    const idMatch = text.match(/طلب\s*#(\d{7,15})/);
    if (idMatch) document.getElementById('orderID').value = idMatch[1];
    const priceMatch = text.match(/إجمالي الطلب\s*[\n\r]*.*?\s*(\d+(?:\.\d+)?)\s*SAR/);
    if (priceMatch) document.getElementById('orderPrice').value = priceMatch[1];
    const trackingMatch = text.match(/(?:شحنة برقم|بوليصة)\s*(\d{12})/);
    if (trackingMatch) document.getElementById('trackingID').value = trackingMatch[1];
    document.getElementById('orderType').value = "سلة";
    if (text.includes("سمسا") || text.includes("أوتو")) document.getElementById('deliveryType').value = "شحن سمسا";
    alert("تم الاستخراج ✅");
    document.getElementById('smartInput').value = "";
}

function loadData() {
    db.ref('orders').on('value', (snap) => {
        const sList = document.getElementById('sallaList');
        const wList = document.getElementById('whatsappList');
        sList.innerHTML = ""; wList.innerHTML = "";
        
        // متغيرات الإحصائيات
        let stats = { totalOrders: 0, totalSales: 0, omarOrders: 0, omarSales: 0, maryamOrders: 0, maryamSales: 0 };

        snap.forEach(child => {
            const o = child.val();
            const isToday = o.dateKey === today;
            
            // حساب الإحصائيات لليوم الحالي فقط
            if (isToday) {
                stats.totalOrders++;
                stats.totalSales += parseFloat(o.price || 0);
                if (o.emp === "عمر") { stats.omarOrders++; stats.omarSales += parseFloat(o.price || 0); }
                if (o.emp === "مريم") { stats.maryamOrders++; stats.maryamSales += parseFloat(o.price || 0); }
            }

            // عرض الطلبات (في البحث يظهر الكل، في العادي يظهر اليوم فقط)
            const card = `
                <div class="order-card" data-user="${o.emp}" style="${!isToday ? 'display:none' : ''}">
                    <div style="position:absolute; left:10px; top:10px;">
                        <button onclick="smartDelete('${child.key}')">🗑️</button>
                        <button onclick="editOrder('${child.key}')">📝</button>
                        <button onclick="printSingleOrder('${child.key}')">⎙</button>
                    </div>
                    <small>${o.dateKey}</small><br>
                    <strong>👤 ${o.name}</strong>
                    <div class="card-details">
                        <span>🏷️ الموظف: ${o.emp}</span> | 👨‍🍳 تجهيز: ${o.prepEmp}<br>
                        <span>🔢 طلب: ${o.id}</span> | 💰 ${o.price} ر.س<br>
                        <span>📦 ${o.delivery}</span> 
                        ${o.delivery !== "توصيل مندوب" ? `| 📄 بوليصة: ${o.trackingID || '---'}` : ''}
                    </div>
                </div>`;
            o.type === "سلة" ? sList.insertAdjacentHTML('afterbegin', card) : wList.insertAdjacentHTML('afterbegin', card);
        });
        updateStatsUI(stats);
    });
}

function updateStatsUI(s) {
    document.getElementById('statTotalOrders').innerText = s.totalOrders;
    document.getElementById('statTotalSales').innerText = s.totalSales.toFixed(2) + " ر.س";
    document.getElementById('statOmar').innerText = `${s.omarOrders} طلب | ${s.omarSales.toFixed(2)} ر.س`;
    document.getElementById('statMaryam').innerText = `${s.maryamOrders} طلب | ${s.maryamSales.toFixed(2)} ر.س`;
}

function formatOrderForPrint(o) {
    const userColor = o.emp === "عمر" ? "var(--color-omar)" : (o.emp === "مريم" ? "var(--color-maryam)" : "black");
    return `
        <div style="width: 350px; height: 350px; border: 5px solid var(--gold); padding: 20px; margin: 15px; border-radius: 20px; direction: rtl; float: right; box-sizing: border-box; position: relative;">
            <h3 style="text-align:center; color: var(--gold); margin-bottom:10px;">سلطان العسل</h3>
            <div style="font-size: 16px; line-height: 1.8; color: ${userColor};">
                <b>العميل:</b> ${o.name}<br>
                <b>رقم الطلب:</b> ${o.id}<br>
                <b>السعر:</b> ${o.price} ر.س<br>
                <b>التوصيل:</b> ${o.delivery}<br>
                ${o.delivery !== "توصيل مندوب" ? `<b>البوليصة:</b> ${o.trackingID || '---'}<br>` : ''}
                <b>الموظف:</b> ${o.emp}
            </div>
            <div style="position:absolute; bottom:15px; left:20px; font-size:12px;">📅 ${o.dateKey} | 🕒 ${o.time}</div>
        </div>`;
}

function printSingleOrder(key) {
    db.ref('orders/' + key).once('value', s => {
        const o = s.val();
        const win = window.open('', '', 'width=800,height=600');
        win.document.write(`<html><body style="display:flex; justify-content:center; font-family:Tahoma;">${formatOrderForPrint(o)}</body></html>`);
        win.document.close(); win.print();
    });
}

function printAllToday() {
    const targetDate = document.getElementById('printDateSelector').value || today;
    db.ref('orders').once('value', snap => {
        let content = "";
        snap.forEach(child => {
            const o = child.val();
            if(o.dateKey === targetDate) content += formatOrderForPrint(o);
        });
        if(!content) return alert("لا توجد طلبات لهذا التاريخ");
        const win = window.open('', '', 'width=900,height=800');
        win.document.write(`<html><body style="display:flex; flex-wrap:wrap; justify-content:center;">${content}</body></html>`);
        win.document.close(); win.print();
    });
}

function saveOrder() {
    const data = {
        name: document.getElementById('custName').value,
        emp: currentUser,
        prepEmp: document.getElementById('prepEmp').value || "غير محدد",
        id: document.getElementById('orderID').value || "---",
        trackingID: document.getElementById('trackingID').value || "",
        price: document.getElementById('orderPrice').value || "0",
        branch: document.getElementById('branchName').value,
        delivery: document.getElementById('deliveryType').value,
        type: document.getElementById('orderType').value,
        dateKey: today,
        time: new Date().toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit'})
    };
    if (editKey) {
        db.ref('orders/' + editKey).update(data).then(() => { alert("تم التحديث ✅"); location.reload(); });
    } else {
        db.ref('orders').push(data).then(() => { alert("تم الحفظ ✅"); location.reload(); });
    }
}

function filterOrders() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    document.querySelectorAll('.order-card').forEach(c => {
        const isMatch = c.innerText.toLowerCase().includes(term);
        // إذا كان هناك بحث، أظهر المطابق حتى لو كان قديماً. إذا لا، أظهر اليوم فقط.
        if (term.length > 0) {
            c.style.display = isMatch ? "block" : "none";
        } else {
            const cardDate = c.querySelector('small').innerText;
            c.style.display = (cardDate === today) ? "block" : "none";
        }
    });
}

function editOrder(key) {
    db.ref('orders/' + key).once('value', s => {
        const o = s.val(); editKey = key;
        document.getElementById('custName').value = o.name;
        document.getElementById('orderID').value = o.id;
        document.getElementById('orderPrice').value = o.price;
        document.getElementById('trackingID').value = o.trackingID;
        document.getElementById('saveBtn').innerText = "تحديث الآن 🔄";
        window.scrollTo(0,0);
    });
}
function smartDelete(key) { if(confirm("حذف؟")) db.ref('orders/' + key).remove(); }
function logout() { localStorage.clear(); location.reload(); }
