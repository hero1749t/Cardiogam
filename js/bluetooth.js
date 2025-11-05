/* ============================================
   BLUETOOTH.JS - Complete Real Device Integration
   Fixed and Working Version for Cardiogam
   ============================================ */

// ========== GLOBAL STATE ==========
let connectedDevice = null;
let gattServer = null;
let ecgCharacteristic = null;
let hrCharacteristic = null;
let batteryCharacteristic = null;
let currentHeartRate = 60;
let isDeviceConnected = false;

// ========== BLE UUIDs (MATCHING ESP32 FIRMWARE) ==========
const UUIDS = {
    // Standard Heart Rate Service
    heartRateService: '0000180d-0000-1000-8000-00805f9b34fb',
    heartRateChar: '00002a37-0000-1000-8000-00805f9b34fb',
    
    // Custom ECG Service
    ecgService: '0000181c-0000-1000-8000-00805f9b34fb',
    ecgDataChar: '00002a5b-0000-1000-8000-00805f9b34fb',
    
    // Battery Service (Optional)
    batteryService: '0000180f-0000-1000-8000-00805f9b34fb',
    batteryLevelChar: '00002a19-0000-1000-8000-00805f9b34fb'
};

// ========== BLUETOOTH MANAGER CLASS ==========
class BluetoothManager {
    constructor() {
        this.device = null;
        this.server = null;
        this.characteristics = {};
        this.isConnected = false;
    }

    // Check browser support
    isSupported() {
        return !!navigator.bluetooth;
    }

    // Connect to device
    async connect() {
        if (!this.isSupported()) {
            throw new Error('Web Bluetooth not supported in this browser');
        }

        console.log('🔵 Starting Bluetooth connection...');

        try {
            // Request device
            this.device = await navigator.bluetooth.requestDevice({
                filters: [
                    { name: 'Cardiogam-ECG' },
                    { namePrefix: 'Cardiogam' },
                    { services: [UUIDS.heartRateService] }
                ],
                optionalServices: [
                    UUIDS.heartRateService,
                    UUIDS.ecgService,
                    UUIDS.batteryService
                ]
            });

            console.log('✅ Device selected:', this.device.name);

            // Handle disconnect event
            this.device.addEventListener('gattserverdisconnected', () => {
                console.log('🔌 Device disconnected');
                this.handleDisconnect();
            });

            // Connect to GATT server
            this.server = await this.device.gatt.connect();
            console.log('✅ GATT server connected');

            // Setup services
            await this.setupServices();

            this.isConnected = true;
            return {
                success: true,
                deviceName: this.device.name,
                deviceId: this.device.id
            };

        } catch (error) {
            console.error('❌ Connection error:', error);
            throw error;
        }
    }

    // Setup all BLE services
    async setupServices() {
        try {
            // Heart Rate Service
            await this.setupHeartRateService();
            
            // ECG Service
            await this.setupECGService();
            
            // Battery Service (optional)
            await this.setupBatteryService();
            
            console.log('✅ All services configured');
        } catch (error) {
            console.error('⚠ Service setup error:', error);
        }
    }

    // Setup Heart Rate Service
    async setupHeartRateService() {
        try {
            const service = await this.server.getPrimaryService(UUIDS.heartRateService);
            const characteristic = await service.getCharacteristic(UUIDS.heartRateChar);
            
            await characteristic.startNotifications();
            characteristic.addEventListener('characteristicvaluechanged', (event) => {
                this.handleHeartRateData(event);
            });
            
            this.characteristics.heartRate = characteristic;
            console.log('✅ Heart Rate service ready');
        } catch (error) {
            console.warn('⚠ Heart Rate service not available:', error.message);
        }
    }

    // Setup ECG Service
    async setupECGService() {
        try {
            const service = await this.server.getPrimaryService(UUIDS.ecgService);
            const characteristic = await service.getCharacteristic(UUIDS.ecgDataChar);
            
            await characteristic.startNotifications();
            characteristic.addEventListener('characteristicvaluechanged', (event) => {
                this.handleECGData(event);
            });
            
            this.characteristics.ecg = characteristic;
            console.log('✅ ECG service ready');
        } catch (error) {
            console.warn('⚠ ECG service not available:', error.message);
        }
    }

    // Setup Battery Service
    async setupBatteryService() {
        try {
            const service = await this.server.getPrimaryService(UUIDS.batteryService);
            const characteristic = await service.getCharacteristic(UUIDS.batteryLevelChar);
            
            await characteristic.startNotifications();
            characteristic.addEventListener('characteristicvaluechanged', (event) => {
                this.handleBatteryData(event);
            });
            
            this.characteristics.battery = characteristic;
            console.log('✅ Battery service ready');
        } catch (error) {
            console.warn('⚠ Battery service not available');
        }
    }

    // Handle Heart Rate data
    handleHeartRateData(event) {
        const value = event.target.value;
        
        // Standard Heart Rate format: Byte 0 = flags, Byte 1 = BPM
        const flags = value.getUint8(0);
        const heartRate = value.getUint8(1);
        
        currentHeartRate = heartRate;
        console.log('💓 Heart Rate:', heartRate, 'BPM');
        
        // Update UI
        this.updateHeartRateUI(heartRate);
    }

    // Handle ECG data
    handleECGData(event) {
        const value = event.target.value;
        const sampleCount = value.byteLength / 2;
        
        for (let i = 0; i < sampleCount; i++) {
            // Read 16-bit signed integer (little-endian)
            const rawADC = value.getInt16(i * 2, true);
            
            // ESP32 12-bit ADC: range 0-4095, center ~2048
            // Normalize to -1.0 to +1.0 for ECG renderer
            const normalized = (rawADC - 2048) / 2048.0;
            
            // Create data point
            const dataPoint = {
                value: normalized,
                timestamp: Date.now(),
                heartRate: currentHeartRate,
                source: 'device',
                rawADC: rawADC
            };
            
            // Send to ECG renderer
            this.sendToRenderer(dataPoint);
            
            // Record if test is running
            this.recordECGSample(dataPoint);
        }
    }

    // Handle Battery data
    handleBatteryData(event) {
        const batteryLevel = event.target.value.getUint8(0);
        console.log('🔋 Battery:', batteryLevel + '%');
        
        const batteryElement = document.getElementById('batteryLevel');
        if (batteryElement) {
            batteryElement.textContent = batteryLevel + '%';
        }
    }

    // Send data to ECG renderer
    sendToRenderer(dataPoint) {
        if (typeof window.onDemoECGData === 'function') {
            window.onDemoECGData(dataPoint);
        }
    }

    // Record ECG sample during test
    recordECGSample(dataPoint) {
        if (window.isRecording && window.patientData) {
            window.patientData.ecgData.push(dataPoint);
        }
    }

    // Update Heart Rate UI
    updateHeartRateUI(heartRate) {
        const hrElement = document.getElementById('liveHeartRate');
        if (hrElement) {
            hrElement.textContent = heartRate;
        }
        
        const heroHrElement = document.getElementById('heartRate');
        if (heroHrElement) {
            heroHrElement.textContent = heartRate + ' BPM';
        }
    }

    // Handle disconnect
    handleDisconnect() {
        this.isConnected = false;
        this.device = null;
        this.server = null;
        this.characteristics = {};
        
        // Update UI
        if (typeof window.setDeviceConnected === 'function') {
            window.setDeviceConnected(false);
        }
        
        const bleBtn = document.getElementById('bleBtn');
        if (bleBtn) {
            bleBtn.classList.remove('connected');
        }
    }

    // Disconnect device
    async disconnect() {
        if (this.device && this.device.gatt.connected) {
            await this.device.gatt.disconnect();
            console.log('🔌 Device disconnected');
        }
        this.handleDisconnect();
    }

    // Get device info
    getDeviceInfo() {
        if (!this.device) return null;
        
        return {
            name: this.device.name,
            id: this.device.id,
            type: 'bluetooth',
            connected: this.isConnected
        };
    }
}

// ========== CREATE GLOBAL INSTANCE ==========
const bluetoothManager = new BluetoothManager();
window.bluetoothManager = bluetoothManager;

// ========== UI HELPER FUNCTIONS ==========
function showConnectionStatus(message) {
    const statusBox = document.getElementById('connectionStatus');
    const statusMessage = document.getElementById('statusMessage');
    
    if (statusBox && statusMessage) {
        statusBox.style.display = 'block';
        statusMessage.textContent = message;
    }
}

function hideConnectionStatus() {
    const statusBox = document.getElementById('connectionStatus');
    if (statusBox) {
        statusBox.style.display = 'none';
    }
}

function showDeviceConnected(deviceName) {
    hideConnectionStatus();
    
    const connectedBox = document.getElementById('deviceConnected');
    const deviceNameElement = document.getElementById('deviceName');
    
    if (connectedBox) {
        connectedBox.style.display = 'block';
    }
    
    if (deviceNameElement) {
        deviceNameElement.textContent = deviceName || 'Cardiogam-ECG';
    }
}

function updateNavbarBluetooth(connected) {
    const bleBtn = document.getElementById('bleBtn');
    if (bleBtn) {
        if (connected) {
            bleBtn.classList.add('connected');
        } else {
            bleBtn.classList.remove('connected');
        }
    }
}

// ========== MAIN CONNECTION FUNCTION (CALLED FROM HTML) ==========
async function quickConnectBLE() {
    console.log('🔵 Quick Connect BLE Started');
    
    // Check browser support
    if (!bluetoothManager.isSupported()) {
        alert('❌ Web Bluetooth not supported!\n\nPlease use:\n• Chrome 56+\n• Edge 79+\n• Opera 43+\n\nAnd enable: chrome://flags/#enable-web-bluetooth');
        return;
    }

    try {
        // Show loading status
        showConnectionStatus('Opening device picker...');
        
        // Connect to device
        const result = await bluetoothManager.connect();
        
        console.log('✅ Connection successful:', result);
        
        // Update UI
        showDeviceConnected(result.deviceName);
        updateNavbarBluetooth(true);
        
        // Mark device connected in global state
        if (typeof window.setDeviceConnected === 'function') {
            window.setDeviceConnected(true);
        }
        
        // Switch to real device mode
        if (typeof window.switchToRealDevice === 'function') {
            window.switchToRealDevice();
        }
        
    } catch (error) {
        console.error('❌ Connection failed:', error);
        hideConnectionStatus();
        
        // User cancelled
        if (error.name === 'NotFoundError') {
            console.log('User cancelled device selection');
            return;
        }
        
        // Show error
        let errorMessage = 'Connection failed: ' + error.message;
        
        if (error.message.includes('not found') || error.message.includes('no device')) {
            errorMessage += '\n\n✅ Checklist:\n' +
                           '1. ESP32 is powered ON\n' +
                           '2. Arduino code uploaded\n' +
                           '3. Device name is "Cardiogam-ECG"\n' +
                           '4. Bluetooth enabled on your computer';
        }
        
        alert('❌ ' + errorMessage);
    }
}

// ========== DEMO MODE FUNCTION ==========
function useDemoMode() {
    console.log('🎮 Demo Mode Activated');
    
    showConnectionStatus('Initializing demo mode...');
    
    setTimeout(() => {
        // Update UI
        showDeviceConnected('Demo Device (Simulated)');
        updateNavbarBluetooth(true);
        
        // Mark connected
        if (typeof window.setDeviceConnected === 'function') {
            window.setDeviceConnected(true);
        }
        
        // Switch to simulated ECG mode
        if (typeof window.switchToSimulated === 'function') {
            window.switchToSimulated();
        }
        
        console.log('✅ Demo mode ready');
    }, 1000);
}

// ========== DISCONNECT FUNCTION ==========
async function disconnectDevice() {
    console.log('🔌 Disconnecting device...');
    
    await bluetoothManager.disconnect();
    
    // Update UI
    const connectedBox = document.getElementById('deviceConnected');
    if (connectedBox) {
        connectedBox.style.display = 'none';
    }
    
    updateNavbarBluetooth(false);
}

// ========== EXPOSE FUNCTIONS GLOBALLY ==========
window.quickConnectBLE = quickConnectBLE;
window.useDemoMode = useDemoMode;
window.disconnectDevice = disconnectDevice;

// ========== INITIALIZATION ==========
console.log('📶 Bluetooth module loaded successfully');
console.log('🔵 Device support:', bluetoothManager.isSupported() ? 'YES' : 'NO');

// Log available features
if (bluetoothManager.isSupported()) {
    console.log('✅ Features available:');
    console.log('   • Real device connection');
    console.log('   • Heart rate monitoring');
    console.log('   • ECG data streaming');
    console.log('   • Battery level monitoring');
    console.log('   • Demo mode fallback');
}