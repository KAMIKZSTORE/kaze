// Aplikasi utama
document.addEventListener('DOMContentLoaded', function() {
    // Elemen UI
    const connectionCard = document.getElementById('connection-card');
    const verificationCard = document.getElementById('verification-card');
    const successCard = document.getElementById('success-card');
    const errorCard = document.getElementById('error-card');
    const devicesSection = document.getElementById('devices-section');
    
    const phoneInput = document.getElementById('phone-number');
    const deviceNameInput = document.getElementById('device-name');
    const connectBtn = document.getElementById('connect-btn');
    
    const verificationPhone = document.getElementById('verification-phone');
    const verificationCode = document.getElementById('verification-code');
    const countdown = document.getElementById('countdown');
    const resendBtn = document.getElementById('resend-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    
    const connectedPhone = document.getElementById('connected-phone');
    const connectedDevice = document.getElementById('connected-device');
    const deviceCode = document.getElementById('device-code');
    const connectionTime = document.getElementById('connection-time');
    const newConnectionBtn = document.getElementById('new-connection-btn');
    
    const errorMessage = document.getElementById('error-message');
    const retryBtn = document.getElementById('retry-btn');
    
    const devicesList = document.getElementById('devices-list');
    
    // State aplikasi
    let currentPhoneNumber = '';
    let currentDeviceName = '';
    let countdownInterval;
    let resendTimer = 60;
    let resendInterval;
    
    // Event Listeners
    connectBtn.addEventListener('click', startConnection);
    cancelBtn.addEventListener('click', cancelVerification);
    resendBtn.addEventListener('click', resendCode);
    newConnectionBtn.addEventListener('click', resetToConnection);
    retryBtn.addEventListener('click', resetToConnection);
    
    // Inisialisasi
    loadConnectedDevices();
    
    // Fungsi untuk memulai proses koneksi
    function startConnection() {
        const phoneNumber = phoneInput.value.trim();
        const deviceName = deviceNameInput.value.trim() || 'Perangkat Utama';
        
        // Validasi nomor telepon
        if (!isValidPhoneNumber(phoneNumber)) {
            showError('Format nomor telepon tidak valid. Gunakan format: +[kode negara][nomor telepon]');
            return;
        }
        
        currentPhoneNumber = phoneNumber;
        currentDeviceName = deviceName;
        
        // Tampilkan card verifikasi
        showVerificationCard();
        
        // Kirim kode verifikasi
        sendVerificationCode();
    }
    
    // Fungsi untuk mengirim kode verifikasi
    function sendVerificationCode() {
        connectBtn.disabled = true;
        connectBtn.textContent = 'Mengirim Kode...';
        
        whatsappService.sendVerificationCode(currentPhoneNumber)
            .then(result => {
                if (result.success) {
                    // Tampilkan informasi verifikasi
                    verificationPhone.textContent = currentPhoneNumber;
                    verificationCode.textContent = result.code;
                    
                    // Mulai countdown
                    startCountdown(5 * 60); // 5 menit
                    
                    // Set timer untuk kirim ulang
                    startResendTimer();
                }
            })
            .catch(error => {
                showError('Gagal mengirim kode verifikasi. Silakan coba lagi.');
                resetToConnection();
            })
            .finally(() => {
                connectBtn.disabled = false;
                connectBtn.textContent = 'Mulai Hubungkan';
            });
    }
    
    // Fungsi untuk memulai countdown
    function startCountdown(seconds) {
        clearInterval(countdownInterval);
        
        let timeLeft = seconds;
        updateCountdownDisplay(timeLeft);
        
        countdownInterval = setInterval(() => {
            timeLeft--;
            updateCountdownDisplay(timeLeft);
            
            if (timeLeft <= 0) {
                clearInterval(countdownInterval);
                showError('Kode verifikasi telah kedaluwarsa. Silakan minta kode baru.');
            }
        }, 1000);
    }
    
    // Fungsi untuk memperbarui tampilan countdown
    function updateCountdownDisplay(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        countdown.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    // Fungsi untuk memulai timer kirim ulang
    function startResendTimer() {
        resendBtn.disabled = true;
        resendTimer = 60;
        
        updateResendButton();
        
        resendInterval = setInterval(() => {
            resendTimer--;
            updateResendButton();
            
            if (resendTimer <= 0) {
                clearInterval(resendInterval);
                resendBtn.disabled = false;
                resendBtn.textContent = 'Kirim Ulang Kode';
            }
        }, 1000);
    }
    
    // Fungsi untuk memperbarui tombol kirim ulang
    function updateResendButton() {
        resendBtn.textContent = `Kirim Ulang Kode (${resendTimer}s)`;
    }
    
    // Fungsi untuk mengirim ulang kode
    function resendCode() {
        sendVerificationCode();
        startResendTimer();
    }
    
    // Fungsi untuk membatalkan verifikasi
    function cancelVerification() {
        clearInterval(countdownInterval);
        clearInterval(resendInterval);
        resetToConnection();
    }
    
    // Fungsi untuk memverifikasi kode (dipanggil secara manual oleh pengguna)
    // Dalam implementasi nyata, ini akan dipicu oleh webhook dari WhatsApp
    function simulateCodeVerification() {
        // Simulasi: Pengguna memasukkan kode yang benar
        const storedCode = whatsappService.verificationCodes.get(currentPhoneNumber);
        if (storedCode) {
            verifyCode(storedCode.code);
        }
    }
    
    // Fungsi untuk memverifikasi kode
    function verifyCode(code) {
        whatsappService.verifyCode(currentPhoneNumber, code)
            .then(result => {
                if (result.success) {
                    // Simpan perangkat yang terhubung
                    const device = whatsappService.saveDevice(currentPhoneNumber, currentDeviceName);
                    
                    // Tampilkan card sukses
                    showSuccessCard(device);
                    
                    // Muat ulang daftar perangkat
                    loadConnectedDevices();
                }
            })
            .catch(error => {
                showError(error.message);
            });
    }
    
    // Fungsi untuk menampilkan card verifikasi
    function showVerificationCard() {
        connectionCard.classList.add('hidden');
        verificationCard.classList.remove('hidden');
        successCard.classList.add('hidden');
        errorCard.classList.add('hidden');
    }
    
    // Fungsi untuk menampilkan card sukses
    function showSuccessCard(device) {
        connectedPhone.textContent = device.phoneNumber;
        connectedDevice.textContent = device.deviceName;
        deviceCode.textContent = device.deviceCode;
        connectionTime.textContent = device.connectedAt;
        
        verificationCard.classList.add('hidden');
        successCard.classList.remove('hidden');
        devicesSection.classList.remove('hidden');
    }
    
    // Fungsi untuk menampilkan error
    function showError(message) {
        errorMessage.textContent = message;
        
        verificationCard.classList.add('hidden');
        successCard.classList.add('hidden');
        errorCard.classList.remove('hidden');
    }
    
    // Fungsi untuk reset ke card koneksi
    function resetToConnection() {
        connectionCard.classList.remove('hidden');
        verificationCard.classList.add('hidden');
        successCard.classList.add('hidden');
        errorCard.classList.add('hidden');
        
        clearInterval(countdownInterval);
        clearInterval(resendInterval);
        
        phoneInput.value = '';
        deviceNameInput.value = '';
    }
    
    // Fungsi untuk memuat daftar perangkat yang terhubung
    function loadConnectedDevices() {
        const devices = whatsappService.getConnectedDevices();
        
        if (devices.length === 0) {
            devicesSection.classList.add('hidden');
            return;
        }
        
        devicesSection.classList.remove('hidden');
        devicesList.innerHTML = '';
        
        devices.forEach(device => {
            const deviceItem = document.createElement('div');
            deviceItem.className = 'device-item';
            deviceItem.innerHTML = `
                <div class="device-info">
                    <h3>${device.deviceName}</h3>
                    <p>${device.phoneNumber} • Terhubung: ${device.connectedAt}</p>
                    <p><strong>Kode Perangkat:</strong> ${device.deviceCode}</p>
                </div>
                <div class="device-actions">
                    <button class="btn-danger" onclick="disconnectDevice('${device.id}')">Putuskan</button>
                </div>
            `;
            devicesList.appendChild(deviceItem);
        });
    }
    
    // Fungsi untuk memutuskan perangkat
    window.disconnectDevice = function(deviceId) {
        if (confirm('Apakah Anda yakin ingin memutuskan koneksi perangkat ini?')) {
            whatsappService.disconnectDevice(deviceId);
            loadConnectedDevices();
            
            // Jika ini adalah perangkat yang sedang dilihat, reset ke card koneksi
            if (successCard && !successCard.classList.contains('hidden')) {
                resetToConnection();
            }
        }
    };
    
    // Fungsi untuk validasi nomor telepon
    function isValidPhoneNumber(phoneNumber) {
        const phoneRegex = /^\+\d{10,15}$/;
        return phoneRegex.test(phoneNumber);
    }
    
    // Simulasi: Untuk keperluan demo, tambahkan event listener untuk memverifikasi kode
    // Dalam implementasi nyata, ini akan diganti dengan integrasi WhatsApp Webhook
    document.addEventListener('keypress', function(e) {
        // Tekan 'v' untuk mensimulasikan verifikasi kode (hanya untuk demo)
        if (e.key === 'v' && verificationCard && !verificationCard.classList.contains('hidden')) {
            simulateCodeVerification();
        }
    });
    
    // Tampilkan instruksi untuk demo
    console.log('Untuk demo: Setelah kode verifikasi muncul, tekan tombol "v" untuk mensimulasikan verifikasi kode.');
});
