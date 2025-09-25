// Simulasi WhatsApp API Service
class WhatsAppService {
    constructor() {
        this.connectedDevices = JSON.parse(localStorage.getItem('whatsappDevices')) || [];
        this.verificationCodes = new Map();
    }

    // Simulasi mengirim kode verifikasi ke WhatsApp
    sendVerificationCode(phoneNumber) {
        return new Promise((resolve, reject) => {
            // Simulasi delay pengiriman
            setTimeout(() => {
                // Generate kode verifikasi 6 digit
                const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
                const expiresAt = Date.now() + 5 * 60 * 1000; // 5 menit
                
                // Simpan kode untuk verifikasi nanti
                this.verificationCodes.set(phoneNumber, {
                    code: verificationCode,
                    expiresAt: expiresAt
                });
                
                // Simulasi: "Mengirim" kode ke WhatsApp
                console.log(`[SIMULASI] Mengirim kode ${verificationCode} ke ${phoneNumber}`);
                
                // Dalam implementasi nyata, ini akan memanggil API WhatsApp
                resolve({
                    success: true,
                    code: verificationCode,
                    message: `Kode verifikasi telah dikirim ke ${phoneNumber}`
                });
            }, 2000);
        });
    }

    // Verifikasi kode yang diterima
    verifyCode(phoneNumber, code) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const storedCode = this.verificationCodes.get(phoneNumber);
                
                if (!storedCode) {
                    reject({ success: false, message: 'Kode verifikasi tidak ditemukan' });
                    return;
                }
                
                if (Date.now() > storedCode.expiresAt) {
                    this.verificationCodes.delete(phoneNumber);
                    reject({ success: false, message: 'Kode verifikasi telah kedaluwarsa' });
                    return;
                }
                
                if (storedCode.code !== code) {
                    reject({ success: false, message: 'Kode verifikasi tidak valid' });
                    return;
                }
                
                // Kode valid, hapus dari penyimpanan sementara
                this.verificationCodes.delete(phoneNumber);
                
                resolve({ success: true, message: 'Verifikasi berhasil' });
            }, 1000);
        });
    }

    // Menyimpan perangkat yang terhubung
    saveDevice(phoneNumber, deviceName = 'Perangkat Utama') {
        const deviceCode = this.generateDeviceCode();
        const device = {
            id: Date.now().toString(),
            phoneNumber,
            deviceName,
            deviceCode,
            connectedAt: new Date().toLocaleString('id-ID'),
            status: 'connected'
        };
        
        this.connectedDevices.push(device);
        this.saveToLocalStorage();
        
        return device;
    }

    // Generate kode perangkat unik
    generateDeviceCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 12; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
            if (i === 3 || i === 7) result += '-';
        }
        return result;
    }

    // Mendapatkan daftar perangkat yang terhubung
    getConnectedDevices() {
        return this.connectedDevices;
    }

    // Memutuskan koneksi perangkat
    disconnectDevice(deviceId) {
        this.connectedDevices = this.connectedDevices.filter(device => device.id !== deviceId);
        this.saveToLocalStorage();
    }

    // Menyimpan data ke localStorage
    saveToLocalStorage() {
        localStorage.setItem('whatsappDevices', JSON.stringify(this.connectedDevices));
    }
}

// Buat instance global untuk digunakan di seluruh aplikasi
const whatsappService = new WhatsAppService();
