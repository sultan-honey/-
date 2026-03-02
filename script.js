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

// التواريخ الافتراضية
const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
let selectedDate = today;

let currentUser = localStorage.getItem('loggedUser');
let userRole = localStorage.getItem('userRole');
let editKey = null;

if (currentUser) { showApp(); }

function login() {
    const users = { "عمر": "111", "مريم": "222", "إبراهيم": "6410" };
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    if (users[user] === pass) {
        currentUser = user;
        userRole = (user === "إبراهيم") ? "admin" : "staff";
        localStorage.setItem('loggedUser', user);
        localStorage.setItem('userRole', userRole);
        location.reload();
    } else { alert("خطأ في البيانات"); }
}

function showApp() { 
    document.getElementById('loginScreen').style.display = 'none'; 
    document.getElementById('appBody').style.display = 'block'; 
    document.getElementById('userWelcome').innerText = `مرحباً ${currentUser}`;
    // تعيين قيمة التقويم لليوم
    const dateInput = document.getElementById('calendarFilter');
    const now = new Date();
    dateInput.value = now.toISOString().split('T')[0];
    loadData(); 
}

function processSmartPaste() {
    const text = document.getElementById('smartInput').value;
    if (!text) return;
    const nameMatch = text.match(/العميل\s*\n\s*(.+)/);
    if (nameMatch) document.getElementById('custName').value = nameMatch[1].trim();
    const idMatch = text.match(/طلب\s*#(\d+)/);
    if (idMatch) document.getElementById('orderID').value = idMatch[1];
    const priceMatch = text.match(/إجمالي الطلب\s*[\n\r]*.*?\s*(\d+(?:\.\d+)?)\s*SAR/);
    if (priceMatch) document.getElementById('orderPrice').value = priceMatch[1];
    const trackMatch = text.match(/(?:شحنة برقم|بوليصة)\s*(\d{10,15})/);
    if (trackMatch) document.getElementById('trackingID').value = trackMatch[1];
    document.getElementById('orderType').value = "سلة";
    if (text.includes("سمسا") || text.includes("أوتو")) document.getElementById('deliveryType').value = "شحن سمسا";
}

function loadData() {
    db.ref('orders').on('value', (snap) => {
        const sList = document.getElementById('sallaList');
        const wList = document.getElementById('whatsappList');
        sList.innerHTML = ""; wList.innerHTML = "";
        
        let stats = { totalO: 0, totalS: 0, omarO: 0, omarS: 0, maryamO: 0, maryamS: 0 };
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        // تحويل تاريخ التقويم لصيغة DD-MM-YYYY
        const calVal = document.getElementById('calendarFilter').value;
        const formattedCal = calVal.split('-').reverse().join('-');

        snap.forEach(child => {
            const o = child.val();
            const matchesSearch = o.name.toLowerCase().includes(searchTerm) || o.id.includes(searchTerm);
            const matchesDate = o.dateKey === formattedCal;

            // حساب الإحصائيات لليوم المختار في التقويم
            if (matchesDate) {
                stats.totalO++;
                stats.totalS += parseFloat(o.price || 0);
                if (o.emp === "عمر") { stats.omarO++; stats.omarS += parseFloat(o.price || 0); }
                if (o.emp === "مريم") { stats.maryamO++; stats.maryamS += parseFloat(o.price || 0); }
            }

            // العرض: يظهر إذا طابق التاريخ أو إذا كان هناك بحث نصي (للبحث في الأرشيف)
            if (matchesDate || (searchTerm.length > 0 && matchesSearch)) {
                const card = `
                <div class="order-card" data-user="${o.emp}">
                    <div class="card-tools">
                        <button onclick="smartDelete('${child.key}')">🗑️</button>
                        <button onclick="editOrder('${child.key}')">📝</button>
                        <button onclick="printSingleOrder('${child.key}')">⎙</button>
                    </div>
                    <small>📅 ${o.dateKey}</small><br>
                    <strong>👤 ${o.name}</strong>
                    <div style="font-size:13px; margin-top:5px;">
                        🔢 الطلب: ${o.id} | 💰 ${o.price} ر.س<br>
                        📦 ${o.delivery} | 🏷️ ${o.emp}<br>
                        ${o.delivery !== 'توصيل مندوب' ? `📄 بوليصة: ${o.trackingID || '---'}` : ''}
                    </div>
                </div>`;
                o.type === "سلة" ? sList.insertAdjacentHTML('afterbegin', card) : wList.insertAdjacentHTML('afterbegin', card);
            }
        });
        updateStatsUI(stats);
    });
}

function updateStatsUI(s) {
    document.getElementById('statTotalOrders').innerText = s.totalO;
    document.getElementById('statTotalSales').innerText = s.totalS.toFixed(2) + " ر.س";
    document.getElementById('statOmar').innerText = `${s.omarO} طلب | ${s.omarS.toFixed(2)} ر.س`;
    document.getElementById('statMaryam').innerText = `${s.maryamO} طلب | ${s.maryamS.toFixed(2)} ر.س`;
}

// ديكور الطباعة المربع المذهب الملون
function getPrintDecor(o) {
    const color = o.emp === "عمر" ? "#007bff" : (o.emp === "مريم" ? "#e83e8c" : "#000");
    const trackLine = o.delivery !== "توصيل مندوب" ? `<b>البوليصة:</b> ${o.trackingID || '---'}<br>` : "";
    
    return `
    <div style="width:350px; height:350px; border:10px double #b48608; padding:20px; border-radius:15px; direction:rtl; font-family:Tahoma; position:relative; box-sizing:border-box; margin:10px; float:right;">
        <h2 style="text-align:center; color:#b48608; margin-bottom:10px;">سلطان العسل</h2>
        <div style="font-size:17px; line-height:1.8; color:${color}; font-weight:bold;">
            👤 العميل: ${o.name}<br>
            🔢 رقم الطلب: ${o.id}<br>
            💰 الإجمالي: ${o.price} ريال<br>
            📦 التوصيل: ${o.delivery}<br>
            ${trackLine}
            🏷️ الموظف: ${o.emp}
        </div>
        <div style="position:absolute; bottom:15px; left:15px; font-size:12px; color:#666;">
            📅 ${o.dateKey} | 👨‍🍳 ${o.prepEmp}
        </div>
    </div>`;
}

function printSingleOrder(key) {
    db.ref('orders/' + key).once('value', s => {
        const win = window.open('', '', 'width=800,height=600');
        win.document.write(`<html><body>${getPrintDecor(s.val())}</body></html>`);
        win.document.close(); win.print();
    });
}

function printAllVisible() {
    const calVal = document.getElementById('calendarFilter').value;
    const formattedCal = calVal.split('-').reverse().join('-');
    db.ref('orders').once('value', snap => {
        let content = "";
        snap.forEach(c => { if(c.val().dateKey === formattedCal) content += getPrintDecor(c.val()); });
        if(!content) return alert("لا توجد طلبات لهذا اليوم");
        const win = window.open('', '', 'width=900,height=800');
        win.document.write(`<html><body style="display:flex; flex-wrap:wrap;">${content}</body></html>`);
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
        time: new Date().toLocaleTimeString('ar-SA')
    };
    if (editKey) {
        db.ref('orders/' + editKey).update(data).then(() => { alert("تم التحديث"); location.reload(); });
    } else {
        db.ref('orders').push(data).then(() => { alert("تم الحفظ"); location.reload(); });
    }
}

function editOrder(key) {
    db.ref('orders/' + key).once('value', s => {
        const o = s.val(); editKey = key;
        document.getElementById('custName').value = o.name;
        document.getElementById('orderID').value = o.id;
        document.getElementById('orderPrice').value = o.price;
        document.getElementById('trackingID').value = o.trackingID;
        document.getElementById('saveBtn').innerText = "تحديث الطلب الآن 🔄";
        window.scrollTo(0,0);
    });
}
function smartDelete(key) { if(confirm("حذف الطلب؟")) db.ref('orders/' + key).remove(); }
function logout() { localStorage.clear(); location.reload(); }
