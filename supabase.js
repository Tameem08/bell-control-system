// إعدادات Supabase
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // استبدل بـ URL الخاص بمشروعك
const SUPABASE_KEY = 'YOUR_SUPABASE_KEY'; // استبدل بـ API Key الخاص بمشروعك

// إنشاء عميل Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// دالة للتحقق من حالة الاتصال
async function checkConnection() {
    try {
        const { data, error } = await supabase.from('devices').select('id').limit(1);
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('خطأ في الاتصال بقاعدة البيانات:', error);
        return false;
    }
}

// دالة لجلب جميع الأجهزة
async function fetchDevices() {
    try {
        const { data, error } = await supabase
            .from('devices')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('خطأ في جلب الأجهزة:', error);
        return [];
    }
}

// دالة لجلب جداول التشغيل لجهاز معين
async function fetchSchedules(deviceId) {
    try {
        const { data, error } = await supabase
            .from('schedules')
            .select('*')
            .eq('device_id', deviceId)
            .order('day_of_week', { ascending: true })
            .order('hour', { ascending: true })
            .order('minute', { ascending: true });
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('خطأ في جلب جداول التشغيل:', error);
        return [];
    }
}

// دالة لجلب سجلات التشغيل
async function fetchLogs() {
    try {
        const { data, error } = await supabase
            .from('logs')
            .select(`
                *,
                devices (name)
            `)
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('خطأ في جلب السجلات:', error);
        return [];
    }
}

// دالة لإضافة جهاز جديد
async function addDevice(deviceData) {
    try {
        const { data, error } = await supabase
            .from('devices')
            .insert([deviceData])
            .select();
        
        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('خطأ في إضافة الجهاز:', error);
        throw error;
    }
}

// دالة لتحديث جهاز
async function updateDevice(deviceId, deviceData) {
    try {
        const { data, error } = await supabase
            .from('devices')
            .update(deviceData)
            .eq('id', deviceId)
            .select();
        
        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('خطأ في تحديث الجهاز:', error);
        throw error;
    }
}

// دالة لحذف جهاز
async function deleteDevice(deviceId) {
    try {
        // حذف جداول التشغيل المرتبطة بالجهاز أولاً
        const { error: schedulesError } = await supabase
            .from('schedules')
            .delete()
            .eq('device_id', deviceId);
        
        if (schedulesError) throw schedulesError;
        
        // ثم حذف الجهاز
        const { error } = await supabase
            .from('devices')
            .delete()
            .eq('id', deviceId);
        
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('خطأ في حذف الجهاز:', error);
        throw error;
    }
}

// دالة لإضافة جدول تشغيل جديد
async function addSchedule(scheduleData) {
    try {
        const { data, error } = await supabase
            .from('schedules')
            .insert([scheduleData])
            .select();
        
        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('خطأ في إضافة جدول التشغيل:', error);
        throw error;
    }
}

// دالة لتحديث جدول تشغيل
async function updateSchedule(scheduleId, scheduleData) {
    try {
        const { data, error } = await supabase
            .from('schedules')
            .update(scheduleData)
            .eq('id', scheduleId)
            .select();
        
        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('خطأ في تحديث جدول التشغيل:', error);
        throw error;
    }
}

// دالة لحذف جدول تشغيل
async function deleteSchedule(scheduleId) {
    try {
        const { error } = await supabase
            .from('schedules')
            .delete()
            .eq('id', scheduleId);
        
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('خطأ في حذف جدول التشغيل:', error);
        throw error;
    }
}

// دالة لإضافة سجل تشغيل جديد
async function addLog(logData) {
    try {
        const { data, error } = await supabase
            .from('logs')
            .insert([logData])
            .select();
        
        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('خطأ في إضافة سجل التشغيل:', error);
        throw error;
    }
}

// دالة لتشغيل الجرس يدوياً
async function ringBell(deviceId, duration) {
    try {
        // إضافة سجل للتشغيل اليدوي
        const logData = {
            device_id: deviceId,
            event_type: 'manual',
            duration: duration,
            status: 'pending'
        };
        
        const log = await addLog(logData);
        
        // في الحالة الحقيقية، هنا سنقوم بإرسال طلب إلى ESP32 لتشغيل الجرس
        // لكن في هذا المثال، سنقوم بتحديث حالة السجل بعد ثانيتين لمحاكاة الاستجابة
        
        setTimeout(async () => {
            await supabase
                .from('logs')
                .update({ status: 'success' })
                .eq('id', log.id);
        }, 2000);
        
        return true;
    } catch (error) {
        console.error('خطأ في تشغيل الجرس:', error);
        throw error;
    }
}
