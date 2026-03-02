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
let archiveMode = false;
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
    setTimeout(activateAdminDashboard, 1000); // تفعيل لوحة المدير إن كان المستخدم إبراهيم
}

// --- دالة استخراج البيانات الذكية المطورة ---
function processSmartPaste() {
    const text = document.getElementById('smartInput').value;
    if (!text) return alert("الخانة فارغة! الصق نص الطلب أولاً.");

    const customerMatch = text.match(/العميل\s*\n\s*(.+)/);
    if (customerMatch) {
        document.getElementById('custName').value = customerMatch[1].trim();
    }

    const idMatch = text.match(/طلب\s*#(\d{7,15})/);
    if (idMatch) {
        document.getElementById('orderID').value = idMatch[1];
    }

    const priceMatch = text.match(/إجمالي الطلب\s*[\n\r]*.*?\s*(\d+(?:\.\d+)?)\s*SAR/);
    if (priceMatch) {
        document.getElementById('orderPrice').value = priceMatch[1];
    }

    const trackingMatch = text.match(/(?:شحنة برقم|بوليصة)\s*(\d{12})/);
    if (trackingMatch) {
        document.getElementById('trackingID').value = trackingMatch[1];
    }

    document.getElementById('orderType').value = "سلة";
    if (text.includes("سمسا") || text.includes("أوتو")) {
        document.getElementById('deliveryType').value = "شحن سمسا";
    }

    alert("تم استخراج البيانات بنجاح ✅");
    document.getElementById('smartInput').value = ""; 
}

function loadData() {
    db.ref('orders').on('value', (snap) => {
        const sList = document.getElementById('sallaList');
        const wList = document.getElementById('whatsappList');
        sList.innerHTML = ""; wList.innerHTML = "";
        
        let totalOrders = 0;
        let totalSales = 0;

        snap.forEach(child => {
            const o = child.val();
            if (userRole === "staff" && o.emp !== currentUser) return;
            if (!archiveMode && o.dateKey !== today) return;

            if (o.dateKey === today) {
                totalOrders++;
                totalSales += parseFloat(o.price) || 0;
            }

            const card = `
                <div class="order-card" id="${child.key}">
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
                        <span>📄 بوليصة: ${o.trackingID || '---'}</span>
                    </div>
                </div>`;
            o.type === "سلة" ? sList.insertAdjacentHTML('afterbegin', card) : wList.insertAdjacentHTML('afterbegin', card);
        });

        document.getElementById('totalOrders').innerText = totalOrders;
        document.getElementById('totalSales').innerText = totalSales.toFixed(2) + " ر.س";
    });
}

function printAllToday() {
    db.ref('orders').once('value', snap => {
        let content = `<h2 style="text-align:center;">كشف طلبات اليوم: ${today}</h2>`;
        snap.forEach(child => {
            const o = child.val();
            if(o.dateKey === today) {
                content += `<div style="border-bottom:1px solid #ccc; padding:10px; direction:rtl;">
                    <b>الاسم:</b> ${o.name} | <b>الطلب:</b> ${o.id} | <b>السعر:</b> ${o.price} ر.س | <b>الموظف:</b> ${o.emp}
                </div>`;
            }
        });
        const win = window.open('', '', 'width=900,height=800');
        win.document.write(`<div dir="rtl" style="font-family:Tahoma;">${content}</div>`);
        win.document.close();
        setTimeout(() => { win.print(); win.close(); }, 500);
    });
}

function printSingleOrder(key) {
    db.ref('orders/' + key).once('value', s => {
        const o = s.val();
        const paymentStatus = o.paymentStatus || "غير محدد";
        
        const win = window.open('', '', 'width=800,height=700');
        win.document.write(`
            <body dir="rtl" style="font-family:Tahoma; padding:40px; display:flex; justify-content:center;">
                <div style="width:500px; border:12px double #b48608; padding:30px; border-radius:15px; text-align:center;">
                    <h2 style="color:#b48608;">سلطان العسل - فاتورة</h2>
                    <hr>
                    <div style="text-align:right; font-size:18px; line-height:2.2;">
                        <b>العميل:</b> ${o.name}<br>
                        <b>رقم الطلب:</b> ${o.id}<br>
                        <b>الإجمالي:</b> ${o.price} ريال<br>
                        <b>البوليصة:</b> ${o.trackingID || '---'}<br>
                        <b>الحالة:</b> ${paymentStatus}<br>
                        <b>التاريخ:</b> ${o.dateKey}
                    </div>
                </div>
            </body>`);
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
        time: new Date().toLocaleTimeString('ar-SA'),
        paymentStatus: document.getElementById('smartInput').value.includes("تم الدفع") ? "✅ مدفوع" : "💵 دفع عند الاستلام"
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
        document.getElementById('saveBtn').innerText = "تحديث الطلب الآن 🔄";
        window.scrollTo(0,0);
    });
}

function smartDelete(key) { if (confirm("حذف الطلب؟")) db.ref('orders/' + key).remove(); }
function toggleArchive() { archiveMode = !archiveMode; loadData(); }
function resetForm() { editKey = null; location.reload(); }
function filterOrders() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    document.querySelectorAll('.order-card').forEach(c => {
        c.style.display = c.innerText.toLowerCase().includes(term) ? "block" : "none";
    });
}

// ================= الإضافة البرمجية الخاصة بالمدير (إبراهيم) =================
function activateAdminDashboard() {
    if (userRole === "admin") {
        document.getElementById('adminDashboard').style.display = 'block';

        db.ref('orders').on('value', (snap) => {
            let totalAll = 0, totalOmar = 0, totalMaryam = 0;
            const omarContainer = document.getElementById('omarList');
            const maryamContainer = document.getElementById('maryamList');
            
            omarContainer.innerHTML = "";
            maryamContainer.innerHTML = "";

            snap.forEach(child => {
                const o = child.val();
                
                if (!archiveMode && o.dateKey !== today) return;

                totalAll++;
                if (o.emp === "عمر") totalOmar++;
                if (o.emp === "مريم") totalMaryam++;

                const miniCard = `
                    <div style="background: white; padding: 10px; border-radius: 8px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-right: 4px solid ${o.emp === 'عمر' ? '#1976d2' : '#c2185b'}; font-size: 13px;">
                        <strong style="font-size: 14px;">👤 ${o.name}</strong> <span style="color:#888;">(${o.type})</span><br>
                        <span>🔢 ${o.id}</span> | 💰 ${o.price} ر.س<br>
                        <span style="color: #666;">📄 ${o.trackingID || 'بدون بوليصة'}</span><br>
                        <small style="color: #999;">📅 ${o.dateKey} - ${o.time || ''}</small>
                    </div>
                `;

                if (o.emp === "عمر") omarContainer.insertAdjacentHTML('afterbegin', miniCard);
                if (o.emp === "مريم") maryamContainer.insertAdjacentHTML('afterbegin', miniCard);
            });

            document.getElementById('countAll').innerText = totalAll;
            document.getElementById('countOmar').innerText = totalOmar;
            document.getElementById('countMaryam').innerText = totalMaryam;
        });
    }
}

function printCustomDate() {
    const datePicker = document.getElementById('customPrintDate').value;
    if (!datePicker) return alert("الرجاء اختيار تاريخ من التقويم أولاً!");

    const dateParts = datePicker.split('-');
    const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`; // تحويل لـ DD-MM-YYYY

    db.ref('orders').once('value', snap => {
        let printHtml = `<h2 style="text-align:center; color: #b48608;">سلطان العسل - كشف طلبات يوم: ${formattedDate}</h2><hr>`;
        let hasOrders = false;

        snap.forEach(child => {
            const o = child.val();
            if(o.dateKey === formattedDate) {
                hasOrders = true;
                printHtml += `<div style="border-bottom:1px solid #ddd; padding:12px; direction:rtl; font-family: Tahoma; font-size: 14px;">
                    <b style="color:#b48608;">العميل:</b> ${o.name} | 
                    <b style="color:#b48608;">الطلب:</b> ${o.id} | 
                    <b style="color:#b48608;">الإجمالي:</b> ${o.price} ر.س | 
                    <b style="color:#b48608;">البوليصة:</b> ${o.trackingID || '---'} | 
                    <b style="color:#b48608;">الموظف:</b> ${o.emp}
                </div>`;
            }
        });

        if (!hasOrders) return alert(`لا توجد أي طلبات مسجلة في يوم ${formattedDate}`);

        const win = window.open('', '', 'width=900,height=800');
        win.document.write(`<div dir="rtl">${printHtml}</div>`);
        win.document.close();
        setTimeout(() => { win.print(); win.close(); }, 500);
    });
}
// ================= نهاية الإضافة البرمجية =================
