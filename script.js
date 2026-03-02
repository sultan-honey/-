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
    } else { alert("خطأ في بيانات الدخول"); }
}

function logout() { localStorage.clear(); location.reload(); }

function showApp() { 
    document.getElementById('loginScreen').style.display = 'none'; 
    document.getElementById('appBody').style.display = 'block'; 
    document.getElementById('userWelcome').innerText = `مرحباً ${currentUser}`;
    loadData(); 
}

function processSmartPaste() {
    const text = document.getElementById('smartInput').value;
    if (!text) return alert("الخانة فارغة!");
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
        snap.forEach(child => {
            const o = child.val();
            if (userRole === "staff" && o.emp !== currentUser) return;

            // شرط عدم إظهار البوليصة إذا كان مندوب
            const trackingDisplay = o.delivery === "توصيل مندوب" ? "---" : (o.trackingID || '---');
            
            const card = `
                <div class="order-card" id="${child.key}" data-user="${o.emp}">
                    <div class="card-tools" style="position:absolute; left:10px; top:10px;">
                        <button onclick="smartDelete('${child.key}')">🗑️</button>
                        <button onclick="editOrder('${child.key}')">📝</button>
                        <button onclick="printSingleOrder('${child.key}')">⎙</button>
                    </div>
                    <small>📅 ${o.dateKey}</small><br>
                    <strong>👤 ${o.name}</strong>
                    <div class="card-details">
                        <span>🏷️ الموظف: ${o.emp}</span> | 👨‍🍳 تجهيز: ${o.prepEmp}<br>
                        <span>🔢 طلب: ${o.id}</span> | 💰 ${o.price} ر.س<br>
                        <span>📦 ${o.delivery}</span> | 📄 بوليصة: ${trackingDisplay}
                    </div>
                </div>`;
            o.type === "سلة" ? sList.insertAdjacentHTML('afterbegin', card) : wList.insertAdjacentHTML('afterbegin', card);
        });
        filterOrders();
    });
}

// دالة الطباعة الملونة الجديدة (المربع الذهبي)
function formatOrderForPrint(o) {
    const userColor = o.emp === "عمر" ? "var(--color-omar)" : (o.emp === "مريم" ? "var(--color-maryam)" : "black");
    const trackingDisplay = o.delivery === "توصيل مندوب" ? "---" : (o.trackingID || '---');
    
    return `
        <div style="width: 350px; height: 350px; border: 4px solid var(--gold); padding: 20px; margin: 15px; border-radius: 20px; direction: rtl; float: right; box-sizing: border-box; overflow: hidden; position: relative;">
            <div style="text-align: center; border-bottom: 2px solid #eee; margin-bottom: 10px; padding-bottom: 5px;">
                <h3 style="margin:0; color: var(--gold);">سلطان العسل</h3>
                <small>${o.dateKey} | ${o.time}</small>
            </div>
            <div style="font-size: 16px; line-height: 1.8; color: ${userColor}; font-weight: bold;">
                👤 العميل: ${o.name}<br>
                🔢 الطلب: ${o.id}<br>
                💰 المبلغ: ${o.price} ريال<br>
                📦 التوصيل: ${o.delivery}<br>
                📄 البوليصة: ${trackingDisplay}<br>
                🏷️ الموظف: ${o.emp}
            </div>
            <div style="position:absolute; bottom:10px; right:20px; font-size:12px; color:#555;">
                👨‍🍳 تجهيز: ${o.prepEmp}
            </div>
        </div>`;
}

function printSingleOrder(key) {
    db.ref('orders/' + key).once('value', s => {
        const o = s.val();
        const win = window.open('', '', 'width=800,height=600');
        win.document.write(`<html><body style="display:flex; flex-wrap:wrap; justify-content:center;">${formatOrderForPrint(o)}</body></html>`);
        win.document.close(); win.print();
    });
}

function printAllToday() {
    db.ref('orders').once('value', snap => {
        let content = "";
        snap.forEach(child => {
            const o = child.val();
            if(o.dateKey === today) {
                content += formatOrderForPrint(o);
            }
        });
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
        db.ref('orders/' + editKey).update(data).then(() => { alert("تم التحديث ✅"); resetForm(); });
    } else {
        db.ref('orders').push(data).then(() => { alert("تم الحفظ ✅"); resetForm(); });
    }
}

function editOrder(key) {
    db.ref('orders/' + key).once('value', s => {
        const o = s.val(); editKey = key;
        document.getElementById('custName').value = o.name;
        document.getElementById('orderID').value = o.id;
        document.getElementById('orderPrice').value = o.price;
        document.getElementById('prepEmp').value = o.prepEmp;
        document.getElementById('trackingID').value = o.trackingID;
        document.getElementById('branchName').value = o.branch;
        document.getElementById('deliveryType').value = o.delivery;
        document.getElementById('orderType').value = o.type;
        document.querySelector('.btn-primary').innerText = "تحديث الطلب الآن 🔄";
        window.scrollTo(0,0);
    });
}

function smartDelete(key) { if (confirm("حذف الطلب؟")) db.ref('orders/' + key).remove(); }
function resetForm() { editKey = null; location.reload(); }
function filterOrders() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    document.querySelectorAll('.order-card').forEach(c => {
        c.style.display = c.innerText.toLowerCase().includes(term) ? "block" : "none";
    });
}
