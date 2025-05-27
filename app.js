// المتغيرات العامة
let devices = [];
let schedules = {};
let logs = [];
let currentDeviceId = null;
let currentScheduleId = null;
let deleteType = null;
let deleteId = null;

// عناصر DOM
const devicesContainer = document.getElementById('devices-container');
const noDevicesMessage = document.getElementById('no-devices-message');
const logsContainer = document.getElementById('logs-container');
const noLogsMessage = document.getElementById('no-logs-message');
const currentDateElement = document.getElementById('current-date');
const currentTimeElement = document.getElementById('current-time');

// النماذج
const deviceModal = new bootstrap.Modal(document.getElementById('device-modal'));
const scheduleModal = new bootstrap.Modal(document.getElementById('schedule-modal'));
const confirmModal = new bootstrap.Modal(document.getElementById('confirm-modal'));
const notificationToast = new bootstrap.Toast(document.getElementById('notification-toast'));

// الأحداث
document.getElementById('add-device-btn').addEventListener('click', () => openDeviceModal());
document.getElementById('save-device-btn').addEventListener('click', saveDevice);
document.getElementById('save-schedule-btn').addEventListener('click', saveSchedule);
document.getElementById('confirm-delete-btn').addEventListener('click', confirmDelete);
document.getElementById('set-time-btn').addEventListener('click', setTime);

// تحميل البيانات عند تحميل الصفحة
window.addEventListener('load', async () => {
    // التحقق من الاتصال بقاعدة البيانات
    const isConnected = await checkConnection();
    if (!isConnected) {
        showNotification('خطأ في الاتصال بقاعدة البيانات', 'error');
        return;
    }
    
    // تحميل البيانات
    await loadData();
    
    // تحديث الوقت الحالي
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
});

// دالة لتحميل البيانات
async function loadData() {
    try {
        // جلب الأجهزة
        devices = await fetchDevices();
        
        // جلب جداول التشغيل لكل جهاز
        for (const device of devices) {
            schedules[device.id] = await fetchSchedules(device.id);
        }
        
        // جلب سجلات التشغيل
        logs = await fetchLogs();
        
        // عرض البيانات
        renderDevices();
        renderLogs();
    } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
        showNotification('خطأ في تحميل البيانات', 'error');
    }
}

// دالة لتحديث الوقت الحالي
function updateCurrentTime() {
    const now = new Date();
    
    // تنسيق التاريخ
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateElement.textContent = now.toLocaleDateString('ar-SA', dateOptions);
    
    // تنسيق الوقت
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    currentTimeElement.textContent = now.toLocaleTimeString('ar-SA', timeOptions);
    
    // تحديث حقول ضبط الوقت إذا كانت فارغة
    const dateInput = document.getElementById('set-date');
    const timeInput = document.getElementById('set-time');
    
    if (!dateInput.value) {
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        dateInput.value = `${year}-${month}-${day}`;
    }
    
    if (!timeInput.value) {
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        timeInput.value = `${hours}:${minutes}`;
    }
}

// دالة لعرض الأجهزة
function renderDevices() {
    // إخفاء أو إظهار رسالة "لا توجد أجهزة"
    if (devices.length === 0) {
        devicesContainer.innerHTML = '';
        noDevicesMessage.style.display = 'block';
        return;
    }
    
    noDevicesMessage.style.display = 'none';
    devicesContainer.innerHTML = '';
    
    // إنشاء بطاقة لكل جهاز
    devices.forEach(device => {
        const deviceSchedules = schedules[device.id] || [];
        const deviceCard = document.createElement('div');
        deviceCard.className = `col-md-6 col-lg-4 device-card ${device.is_active ? '' : 'inactive'}`;
        
        // تحويل أيام الأسبوع إلى نص
        const daysOfWeek = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        
        // إنشاء قائمة المواعيد
        let scheduleItems = '';
        deviceSchedules.forEach(schedule => {
            const day = daysOfWeek[schedule.day_of_week];
            const hour = String(schedule.hour).padStart(2, '0');
            const minute = String(schedule.minute).padStart(2, '0');
            const active = schedule.is_active ? '' : 'text-muted';
            
            scheduleItems += `
                <div class="schedule-item ${active}">
                    ${day} ${hour}:${minute} (${schedule.duration} ثانية)
                    <button class="btn btn-sm btn-link p-0 ms-1 edit-schedule-btn" data-id="${schedule.id}">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    <button class="btn btn-sm btn-link p-0 ms-1 delete-schedule-btn" data-id="${schedule.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
        });
        
        if (scheduleItems === '') {
            scheduleItems = '<p class="text-muted">لا توجد مواعيد مضافة.</p>';
        }
        
        deviceCard.innerHTML = `
            <div class="card h-100">
                <div class="card-header">
                    <div class="card-title">
                        <h5 class="mb-0">${device.name}</h5>
                        <span class="badge ${device.is_active ? 'bg-success' : 'bg-danger'}">
                            ${device.is_active ? 'مفعل' : 'غير مفعل'}
                        </span>
                    </div>
                </div>
                <div class="card-body">
                    <div class="device-info">
                        <p><strong>المعرف:</strong> ${device.device_id}</p>
                        <p><strong>الموقع:</strong> ${device.location || 'غير محدد'}</p>
                    </div>
                    
                    <div class="device-schedules">
                        <h6>مواعيد التشغيل:</h6>
                        <div class="schedule-list">
                            ${scheduleItems}
                        </div>
                        <button class="btn btn-sm btn-outline-primary mt-2 add-schedule-btn" data-id="${device.id}">
                            إضافة موعد
                        </button>
                    </div>
                    
                    <div class="control-buttons">
                        <button class="btn btn-primary ring-bell-btn" data-id="${device.id}">
                            تشغيل الجرس
                        </button>
                        <button class="btn btn-secondary edit-device-btn" data-id="${device.id}">
                            تعديل
                        </button>
                        <button class="btn btn-danger delete-device-btn" data-id="${device.id}">
                            حذف
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        devicesContainer.appendChild(deviceCard);
    });
    
    // إضافة أحداث للأزرار
    document.querySelectorAll('.edit-device-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const deviceId = btn.getAttribute('data-id');
            openDeviceModal(deviceId);
        });
    });
    
    document.querySelectorAll('.delete-device-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const deviceId = btn.getAttribute('data-id');
            openConfirmModal('device', deviceId);
        });
    });
    
    document.querySelectorAll('.add-schedule-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const deviceId = btn.getAttribute('data-id');
            openScheduleModal(deviceId);
        });
    });
    
    document.querySelectorAll('.edit-schedule-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const scheduleId = btn.getAttribute('data-id');
            openScheduleModal(null, scheduleId);
        });
    });
    
    document.querySelectorAll('.delete-schedule-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const scheduleId = btn.getAttribute('data-id');
            openConfirmModal('schedule', scheduleId);
        });
    });
    
    document.querySelectorAll('.ring-bell-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const deviceId = btn.getAttribute('data-id');
            await ringBellManually(deviceId);
        });
    });
}

// دالة لعرض سجلات التشغيل
function renderLogs() {
    // إخفاء أو إظهار رسالة "لا توجد سجلات"
    if (logs.length === 0) {
        logsContainer.innerHTML = '';
        noLogsMessage.style.display = 'block';
        return;
    }
    
    noLogsMessage.style.display = 'none';
    logsContainer.innerHTML = '';
    
    // إنشاء صف لكل سجل
    logs.forEach(log => {
        const date = new Date(log.created_at);
        const formattedDate = date.toLocaleString('ar-SA');
        
        const eventTypes = {
            'scheduled': 'مجدول',
            'manual': 'يدوي'
        };
        
        const statuses = {
            'pending': 'قيد التنفيذ',
            'success': 'تم بنجاح',
            'failed': 'فشل'
        };
        
        const statusClasses = {
            'pending': 'text-warning',
            'success': 'text-success',
            'failed': 'text-danger'
        };
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${log.devices?.name || 'غير معروف'}</td>
            <td>${eventTypes[log.event_type] || log.event_type}</td>
            <td>${log.duration} ثانية</td>
            <td class="${statusClasses[log.status] || ''}">${statuses[log.status] || log.status}</td>
        `;
        
        logsContainer.appendChild(row);
    });
}

// دالة لفتح نموذج الجهاز
function openDeviceModal(deviceId = null) {
    // إعادة تعيين النموذج
    document.getElementById('device-form').reset();
    
    // تعيين العنوان
    document.getElementById('modal-title').textContent = deviceId ? 'تعديل الجهاز' : 'إضافة جهاز جديد';
    
    // إذا كان تعديل، املأ البيانات
    if (deviceId) {
        const device = devices.find(d => d.id === deviceId);
        if (device) {
            document.getElementById('device-uuid').value = device.id;
            document.getElementById('device-id').value = device.device_id;
            document.getElementById('device-name').value = device.name;
            document.getElementById('device-location').value = device.location || '';
            document.getElementById('device-active').checked = device.is_active;
        }
    } else {
        document.getElementById('device-uuid').value = '';
    }
    
    currentDeviceId = deviceId;
    deviceModal.show();
}

// دالة لفتح نموذج جدول التشغيل
function openScheduleModal(deviceId = null, scheduleId = null) {
    // إعادة تعيين النموذج
    document.getElementById('schedule-form').reset();
    
    // تعيين العنوان
    document.getElementById('schedule-modal-title').textContent = scheduleId ? 'تعديل جدول التشغيل' : 'إضافة جدول تشغيل جديد';
    
    // إذا كان تعديل، املأ البيانات
    if (scheduleId) {
        // البحث عن الجدول في جميع الأجهزة
        let schedule = null;
        for (const deviceSchedules of Object.values(schedules)) {
            schedule = deviceSchedules.find(s => s.id === scheduleId);
            if (schedule) {
                deviceId = schedule.device_id;
                break;
            }
        }
        
        if (schedule) {
            document.getElementById('schedule-id').value = schedule.id;
            document.getElementById('schedule-device-id').value = schedule.device_id;
            document.getElementById('day-of-week').value = schedule.day_of_week;
            
            const hour = String(schedule.hour).padStart(2, '0');
            const minute = String(schedule.minute).padStart(2, '0');
            document.getElementById('schedule-time').value = `${hour}:${minute}`;
            
            document.getElementById('schedule-duration').value = schedule.duration;
            document.getElementById('schedule-active').checked = schedule.is_active;
        }
    } else {
        document.getElementById('schedule-id').value = '';
        document.getElementById('schedule-device-id').value = deviceId;
    }
    
    currentScheduleId = scheduleId;
    scheduleModal.show();
}

// دالة لفتح نموذج تأكيد الحذف
function openConfirmModal(type, id) {
    let message = '';
    
    if (type === 'device') {
        const device = devices.find(d => d.id === id);
        message = `هل أنت متأكد من رغبتك في حذف الجهاز "${device.name}"؟ سيتم حذف جميع جداول التشغيل المرتبطة به.`;
    } else if (type === 'schedule') {
        message = 'هل أنت متأكد من رغبتك في حذف جدول التشغيل هذا؟';
    }
    
    document.getElementById('confirm-message').textContent = message;
    deleteType = type;
    deleteId = id;
    confirmModal.show();
}

// دالة لحفظ الجهاز
async function saveDevice() {
    try {
        const deviceUuid = document.getElementById('device-uuid').value;
        const deviceId = document.getElementById('device-id').value;
        const name = document.getElementById('device-name').value;
        const location = document.getElementById('device-location').value;
        const isActive = document.getElementById('device-active').checked;
        
        if (!deviceId || !name) {
            showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
            return;
        }
        
        const deviceData = {
            device_id: deviceId,
            name,
            location,
            is_active: isActive
        };
        
        let device;
        
        if (deviceUuid) {
            // تحديث جهاز موجود
            device = await updateDevice(deviceUuid, deviceData);
            showNotification('تم تحديث الجهاز بنجاح');
        } else {
            // إضافة جهاز جديد
            device = await addDevice(deviceData);
            showNotification('تمت إضافة الجهاز بنجاح');
        }
        
        // تحديث قائمة الأجهزة
        await loadData();
        
        // إغلاق النموذج
        deviceModal.hide();
    } catch (error) {
        console.error('خطأ في حفظ الجهاز:', error);
        showNotification('خطأ في حفظ الجهاز', 'error');
    }
}

// دالة لحفظ جدول التشغيل
async function saveSchedule() {
    try {
        const scheduleId = document.getElementById('schedule-id').value;
        const deviceId = document.getElementById('schedule-device-id').value;
        const dayOfWeek = parseInt(document.getElementById('day-of-week').value);
        const timeValue = document.getElementById('schedule-time').value;
        const duration = parseInt(document.getElementById('schedule-duration').value);
        const isActive = document.getElementById('schedule-active').checked;
        
        if (!deviceId || !timeValue || isNaN(duration)) {
            showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
            return;
        }
        
        const [hour, minute] = timeValue.split(':').map(Number);
        
        const scheduleData = {
            device_id: deviceId,
            day_of_week: dayOfWeek,
            hour,
            minute,
            duration,
            is_active: isActive
        };
        
        let schedule;
        
        if (scheduleId) {
            // تحديث جدول موجود
            schedule = await updateSchedule(scheduleId, scheduleData);
            showNotification('تم تحديث جدول التشغيل بنجاح');
        } else {
            // إضافة جدول جديد
            schedule = await addSchedule(scheduleData);
            showNotification('تمت إضافة جدول التشغيل بنجاح');
        }
        
        // تحديث قائمة الجداول
        await loadData();
        
        // إغلاق النموذج
        scheduleModal.hide();
    } catch (error) {
        console.error('خطأ في حفظ جدول التشغيل:', error);
        showNotification('خطأ في حفظ جدول التشغيل', 'error');
    }
}

// دالة لتأكيد الحذف
async function confirmDelete() {
    try {
        if (deleteType === 'device') {
            await deleteDevice(deleteId);
            showNotification('تم حذف الجهاز بنجاح');
        } else if (deleteType === 'schedule') {
            await deleteSchedule(deleteId);
            showNotification('تم حذف جدول التشغيل بنجاح');
        }
        
        // تحديث البيانات
        await loadData();
        
        // إغلاق النموذج
        confirmModal.hide();
    } catch (error) {
        console.error('خطأ في الحذف:', error);
        showNotification('خطأ في الحذف', 'error');
    }
}

// دالة لتشغيل الجرس يدوياً
async function ringBellManually(deviceId) {
    try {
        // تشغيل الجرس لمدة 5 ثواني
        await ringBell(deviceId, 5);
        showNotification('تم إرسال أمر تشغيل الجرس بنجاح');
        
        // تحديث السجلات بعد ثانيتين
        setTimeout(async () => {
            await loadData();
        }, 2000);
    } catch (error) {
        console.error('خطأ في تشغيل الجرس:', error);
        showNotification('خطأ في تشغيل الجرس', 'error');
    }
}

// دالة لضبط الوقت
async function setTime() {
    try {
        const dateInput = document.getElementById('set-date');
        const timeInput = document.getElementById('set-time');
        
        if (!dateInput.value || !timeInput.value) {
            showNotification('يرجى إدخال التاريخ والوقت', 'error');
            return;
        }
        
        const [year, month, day] = dateInput.value.split('-').map(Number);
        const [hour, minute] = timeInput.value.split(':').map(Number);
        
        // في الحالة الحقيقية، هنا سنقوم بإرسال طلب إلى ESP32 لضبط الوقت
        // لكن في هذا المثال، سنقوم بعرض إشعار فقط
        
        showNotification('تم إرسال أمر ضبط الوقت بنجاح');
    } catch (error) {
        console.error('خطأ في ضبط الوقت:', error);
        showNotification('خطأ في ضبط الوقت', 'error');
    }
}

// دالة لعرض الإشعارات
function showNotification(message, type = 'success') {
    const title = type === 'error' ? 'خطأ' : 'نجاح';
    const titleElement = document.getElementById('notification-title');
    const messageElement = document.getElementById('notification-message');
    
    titleElement.textContent = title;
    messageElement.textContent = message;
    
    const toastElement = document.getElementById('notification-toast');
    toastElement.classList.remove('bg-success', 'bg-danger');
    toastElement.classList.add(type === 'error' ? 'bg-danger' : 'bg-success');
    
    notificationToast.show();
}
