// إعدادات Firebase
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

// متغيرات النظام
let currentUser = localStorage.getItem('loggedUser');
let userRole = localStorage.getItem('userRole');
let archiveMode = false;
let editKey = null; // لتخزين مفتاح الطلب عند التعديل

// تشغيل النظام
if (currentUser) { showApp(); }

// دوال الدخول والخروج
function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    if (users[user] === pass) {
        currentUser = user;
        userRole = (user === "إبراهيم") ? "admin" : "staff";
        localStorage.setItem('loggedUser', user);
        localStorage.setItem('userRole', userRole);
        location.reload();
    } else { alert("خطأ في بيانات الدخول يا سلطان"); }
}
function logout() { localStorage.clear(); location.reload(); }

function showApp() { 
    document.getElementById('loginScreen').style.display = 'none'; 
    document.getElementById('appBody').style.display = 'block'; 
    document.getElementById('userWelcome').innerText = `مرحباً بسلطاننا: ${currentUser}`;
    loadData(); 
}

// ✨ استخراج البيانات الذكي (المطور لالتقاط كل شيء) ✨
function processSmartPaste() {
    const text = document.getElementById('smartInput').value;
    if (!text) return;

    // 1. استخراج رقم الطلب (#12345678)
    const idMatch = text.match(/#(\d+)/);
    if (idMatch) document.getElementById('orderID').value = idMatch[1];

    // 2. استخراج السعر الإجمالي (يبحث عن رقم يليه SAR)
    const priceMatch = text.match(/([\d.]+)\s*SAR/);
    if (priceMatch) document.getElementById('orderPrice').value = priceMatch[1];

    // 3. استخراج اسم العميل (يبحث عن سطر يحتوي على كلمة العميل وقبل رقم الجوال)
    const lines = text.split('\n').map(line => line.trim());
    let clientName = "";
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("العميل") || lines[i].includes("بواسطة")) {
            // تنظيف السطر من الكلمات الزائدة
            clientName = lines[i].replace(/العميل|:|بواسطة/g, "").trim();
            break;
        }
        // محاولة أخرى: إذا كان السطر الذي قبله يحتوي على رقم الجوال، فالاسم هو السطر الحالي
        if (lines[i].match(/^\+966/)) {
            clientName = lines[i-1] || "";
            break;
        }
    }
    if (clientName) document.getElementById('custName').value = clientName;

    // 4. استخراج رقم البوليصة (يبحث عن كلمة شحنة أو تتبع ويأخذ الرقم الطويل)
    const trackMatch = text.match(/بوليصة الشحن\s*(\d+)/) || text.match(/رقم الشحنة\s*(\d+)/) || text.match(/(\d{10,14})/);
    if (trackMatch) document.getElementById('trackingID').value = trackMatch[1] || trackMatch[0];

    document.getElementById('orderType').value = "سلة";
    alert("تم الاستخراج الذكي! راجع البيانات ثم اضغط حفظ الملكي ✅");
}

// دوال قاعدة البيانات
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
    
    // إذا كان تعديل، نحدث، وإلا نضيف جديد
    if (editKey) {
        db.ref('orders/' + editKey).update(data)
            .then(() => { alert("تم تحديث الطلب بنجاح يا سلطان ✅"); resetForm(); })
            .catch((e) => alert("خطأ في التحديث: " + e));
    } else {
        db.ref('orders').push(data)
            .then(() => { alert("تم حفظ الطلب الملكي بنجاح ✅"); resetForm(); })
            .catch((e) => alert("خطأ في الحفظ: " + e));
    }
}

function loadData() {
    db.ref('orders').on('value', (snap) => {
        const sList = document.getElementById('sallaList');
        const wList = document.getElementById('whatsappList');
        sList.innerHTML = ""; wList.innerHTML = "";
        snap.forEach(child => {
            const o = child.val();
            if (userRole === "staff" && o.emp !== currentUser) return;
            if (!archiveMode && o.dateKey !== today) return;

            const card = `
                <div class="order-card" id="${child.key}">
                    <div class="card-tools">
                        <button class="btn-print" onclick="printOrderTemplate('${child.key}')">⎙</button>
                        <button class="btn-edit" onclick="editOrder('${child.key}')">📝 تعديل</button>
                        <button class="btn-delete" onclick="smartDeleteWithPass('${child.key}')">🗑️ حذف</button>
                    </div>
                    <div class="card-content">
                        <strong>👤 ${o.name}</strong><br>
                        <div style="margin-top:10px; font-size:13px; color:#aaa;">
                            <span>🔢 طلب: ${o.id}</span> | 💰 الإجمالي: ${o.price} ر.س<br>
                            <span>📄 بوليصة: ${o.trackingID || 'قيد الانتظار'}</span><br>
                            <span>🏷️ المصدر: ${o.type} | الموظف: ${o.emp} | 🕒 ${o.time || ''}</span>
                        </div>
                    </div>
                </div>`;
            o.type === "سلة" ? sList.insertAdjacentHTML('afterbegin', card) : wList.insertAdjacentHTML('afterbegin', card);
        });
    });
}

// دوال التعديل والحذف
function editOrder(key) {
    db.ref('orders/' + key).once('value', s => {
        const o = s.val();
        editKey = key; // تعيين المفتاح للتعديل
        document.getElementById('custName').value = o.name;
        document.getElementById('orderID').value = o.id;
        document.getElementById('orderPrice').value = o.price;
        document.getElementById('trackingID').value = o.trackingID;
        document.getElementById('prepEmp').value = o.prepEmp;
        document.getElementById('branchName').value = o.branch;
        document.getElementById('deliveryType').value = o.delivery;
        document.getElementById('orderType').value = o.type;
        
        document.getElementById('saveBtn').innerText = "تحديث الطلب الملكي 🔄";
        document.getElementById('saveBtn').style.background = "#d4af37";
        window.scrollTo(0,0);
    });
}

// 🔐 الحذف بكلمة سر 🔐
function smartDeleteWithPass(key) {
    const pass = prompt("الرجاء إدخال كلمة السر الملكية لإتمام الحذف:");
    if (pass === "حذف123") { // كلمة السر الافتراضية
        if (confirm("هل أنت متأكد تماماً من حذف هذا الطلب؟ لا يمكن التراجع.")) {
            db.ref('orders/' + key).remove()
                .then(() => alert("تم حذف الطلب بنجاح يا سلطان."))
                .catch((e) => alert("خطأ في الحذف: " + e));
        }
    } else if (pass !== null) {
        alert("كلمة السر خاطئة! لا تملك الصلاحية للحذف.");
    }
}

// إعادة تعيين الفورم
function resetForm() {
    editKey = null;
    document.getElementById('custName').value = "";
    document.getElementById('orderID').value = "";
    document.getElementById('orderPrice').value = "";
    document.getElementById('trackingID').value = "";
    document.getElementById('smartInput').value = "";
    document.getElementById('saveBtn').innerText = "حفظ الطلب في القاعدة ✅";
    document.getElementById('saveBtn').style.background = "#27ae60";
}

// دوال البحث والأرشيف والطباعة تبقى كما هي
function toggleArchive() { archiveMode = !archiveMode; loadData(); }
function filterOrders() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    document.querySelectorAll('.order-card').forEach(c => {
        c.style.display = c.innerText.toLowerCase().includes(term) ? "block" : "none";
    });
}

// ⎙ طباعة الكشف الكامل ⎙
function printAllToday() {
    db.ref('orders').once('value', snap => {
        let printContent = `
            <div dir="rtl" style="font-family:Tahoma; padding:20px;">
                <h1 style="text-align:center; color:#d4af37;">كشف طلبات اليوم: ${today}</h1>
                <table border="1" style="width:100%; text-align:right; border-collapse:collapse;">
                    <tr style="background:#eee;"> <th>العميل</th> <th>الطلب</th> <th>الإجمالي</th> <th>البوليصة</th> <th>الموظف</th> </tr>
        `;
        snap.forEach(child => {
            const o = child.val();
            if(o.dateKey === today) {
                printContent += `
                    <tr> <td>${o.name}</td> <td>${o.id}</td> <td>${o.price} ر.س</td> <td>${o.trackingID}</td> <td>${o.emp}</td> </tr>
                `;
            }
        });
        printContent += `</table></div>`;
        const win = window.open('', '', 'width=900,height=800');
        win.document.write(printContent);
        win.document.close(); win.print();
    });
}

// ⎙ طباعة كرت واحد فخم (تيمبليت جاهز) ⎙
function printOrderTemplate(key) {
    db.ref('orders/' + key).once('value', s => {
        const o = s.val();
        const win = window.open('', '', 'width=800,height=700');
        win.document.write(`
            <html>
            <head> <link rel="stylesheet" href="style.css"> </head>
            <body>
                <div class="print-container">
                    <div class="print-header">
                        <img src="logo.png" class="print-logo">
                        <div style="font-size:24px; font-weight:bold;">سلطان العسل</div>
                        <div>جودة ملكية تليق بك</div>
                    </div>
                    <div class="print-body glass">
                        <div class="print-title">بوليصة تجهيز طلب الملكي</div>
                        <div class="print-row"><span class="print-label">اسم السلطان العميل:</span> <span class="print-value">${o.name}</span></div>
                        <div class="print-row"><span class="print-label">رقم الطلب الملكي:</span> <span class="print-value">#${o.id}</span></div>
                        <div class="print-row"><span class="print-label">إجمالي المبلغ:</span> <span class="print-value">${o.price} ريال سعودي</span></div>
                        <div class="print-row"><span class="print-label">رقم البوليصة:</span> <span class="print-value">${o.trackingID || 'قيد الانتظار'}</span></div>
                        <div class="print-row"><span class="print-label">مصدر الطلب:</span> <span class="print-value">${o.type}</span></div>
                        <div class="print-row"><span class="print-label">تاريخ الطلب:</span> <span class="print-value">${o.dateKey} | ${o.time || ''}</span></div>
                    </div>
                    <div class="print-footer">شكرًا لثقتكم بنا. سلطان العسل - الجودة هدفنا.</div>
                </div>
            </body>
            </html>
        `);
        win.document.close(); win.print();
    });
}
