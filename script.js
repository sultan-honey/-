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
    } else { alert("بيانات خاطئة!"); }
}

function showApp() { 
    document.getElementById('loginPage').style.display = 'none'; 
    document.getElementById('appBody').style.display = 'block'; 
    document.getElementById('displayName').innerText = currentUser;
    document.getElementById('calendarFilter').value = new Date().toISOString().split('T')[0];
    loadData(); 
}

function processSmartPaste() {
    const text = document.getElementById('smartInput').value;
    if (!text) return;
    const nMatch = text.match(/العميل\s*\n\s*(.+)/);
    if (nMatch) document.getElementById('custName').value = nMatch[1].trim();
    const idMatch = text.match(/طلب\s*#(\d+)/);
    if (idMatch) document.getElementById('orderID').value = idMatch[1];
    const pMatch = text.match(/إجمالي الطلب\s*[\n\r]*.*?\s*(\d+(?:\.\d+)?)\s*SAR/);
    if (pMatch) document.getElementById('orderPrice').value = pMatch[1];
    const tMatch = text.match(/(?:شحنة برقم|بوليصة)\s*(\d{10,15})/);
    if (tMatch) document.getElementById('trackingID').value = tMatch[1];
    document.getElementById('orderType').value = "سلة";
}

function loadData() {
    db.ref('orders').on('value', (snap) => {
        const sList = document.getElementById('sallaList');
        const wList = document.getElementById('whatsappList');
        sList.innerHTML = ""; wList.innerHTML = "";
        let stats = { totalO: 0, totalS: 0, omarO: 0, omarS: 0, maryamO: 0, maryamS: 0 };
        const term = document.getElementById('searchInput').value.toLowerCase();
        const cal = document.getElementById('calendarFilter').value.split('-').reverse().join('-');

        snap.forEach(child => {
            const o = child.val();
            if (userRole === "staff" && o.emp !== currentUser) return;

            const isMatch = o.name.toLowerCase().includes(term) || o.id.includes(term);
            const isDate = o.dateKey === cal;

            if (isDate) {
                stats.totalO++; stats.totalS += parseFloat(o.price || 0);
                if (o.emp === "عمر") { stats.omarO++; stats.omarS += parseFloat(o.price || 0); }
                if (o.emp === "مريم") { stats.maryamO++; stats.maryamS += parseFloat(o.price || 0); }
            }

            if (isDate || (term.length > 0 && isMatch)) {
                const card = `
                <div class="order-card" data-user="${o.emp}">
                    <div style="position:absolute; left:10px; top:10px;">
                        <button onclick="smartDelete('${child.key}')">🗑️</button>
                        <button onclick="editOrder('${child.key}')">📝</button>
                        <button onclick="printSingleOrder('${child.key}')">⎙</button>
                    </div>
                    <strong>👤 ${o.name}</strong><br>
                    <small>🔢 ${o.id} | 💰 ${o.price} ر.س | 🏷️ ${o.emp}</small><br>
                    <small>📦 ${o.delivery} ${o.delivery !== 'توصيل مندوب' ? `| 📄 ${o.trackingID || '---'}` : ''}</small>
                </div>`;
                o.type === "سلة" ? sList.insertAdjacentHTML('afterbegin', card) : wList.insertAdjacentHTML('afterbegin', card);
            }
        });
        updateStatsUI(stats);
    });
}

function updateStatsUI(s) {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = (userRole === 'admin' ? 'block' : 'none'));
    document.getElementById('statOmar').parentElement.style.display = (userRole === 'admin' || currentUser === 'عمر') ? 'block' : 'none';
    document.getElementById('statMaryam').parentElement.style.display = (userRole === 'admin' || currentUser === 'مريم') ? 'block' : 'none';
    
    document.getElementById('statTotalOrders').innerText = s.totalO;
    document.getElementById('statTotalSales').innerText = s.totalS.toFixed(2);
    document.getElementById('statOmar').innerText = `${s.omarO} طلب | ${s.omarS.toFixed(2)} ر.س`;
    document.getElementById('statMaryam').innerText = `${s.maryamO} طلب | ${s.maryamS.toFixed(2)} ر.س`;
}

function getPrintDecor(o) {
    const color = o.emp === "عمر" ? "#007bff" : (o.emp === "مريم" ? "#e83e8c" : "#000");
    return `
    <div style="width:350px; height:350px; border:10px double #b48608; padding:20px; border-radius:15px; direction:rtl; font-family:Tahoma; position:relative; box-sizing:border-box; margin:10px;">
        <h2 style="text-align:center; color:#b48608;">سلطان العسل</h2>
        <div style="font-size:17px; line-height:1.8; color:${color}; font-weight:bold;">
            👤 العميل: ${o.name}<br>🔢 الطلب: ${o.id}<br>💰 المبلغ: ${o.price} ريال<br>📦 التوصيل: ${o.delivery}<br>
            ${o.delivery !== "توصيل مندوب" ? `📄 البوليصة: ${o.trackingID || '---'}<br>` : ""}
            🏷️ الموظف: ${o.emp}
        </div>
        <div style="position:absolute; bottom:15px; left:15px; font-size:12px;">📅 ${o.dateKey}</div>
    </div>`;
}

function printSingleOrder(key) {
    db.ref('orders/' + key).once('value', s => {
        const win = window.open('', '', 'width=500,height=500');
        win.document.write(`<html><body style="display:flex; justify-content:center; padding:20px;">${getPrintDecor(s.val())}</body></html>`);
        win.document.close(); win.print();
    });
}

function saveOrder() {
    const data = {
        name: document.getElementById('custName').value, emp: currentUser,
        prepEmp: document.getElementById('prepEmp').value || "---", id: document.getElementById('orderID').value || "---",
        trackingID: document.getElementById('trackingID').value || "", price: document.getElementById('orderPrice').value || "0",
        delivery: document.getElementById('deliveryType').value, type: document.getElementById('orderType').value,
        dateKey: today, time: new Date().toLocaleTimeString('ar-SA')
    };
    if (editKey) { db.ref('orders/' + editKey).update(data).then(() => location.reload()); }
    else { db.ref('orders').push(data).then(() => location.reload()); }
}

function smartDelete(key) { 
    if (prompt("كلمة سر الحذف:") === "6410") { db.ref('orders/' + key).remove(); alert("تم الحذف"); }
    else { alert("خطأ!"); }
}

function editOrder(key) {
    db.ref('orders/' + key).once('value', s => {
        const o = s.val(); editKey = key;
        document.getElementById('custName').value = o.name; document.getElementById('orderID').value = o.id;
        document.getElementById('orderPrice').value = o.price; document.getElementById('trackingID').value = o.trackingID;
        document.getElementById('saveBtn').innerText = "تحديث الطلب 🔄";
        window.scrollTo(0,0);
    });
}
function logout() { localStorage.clear(); location.reload(); }
