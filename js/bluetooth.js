/* ============================================
   BLUETOOTH.JS - Real Device Integration
   Supports: ESP32 + BioAmp Heart Candy
   ============================================ */

let connectedDevice = null;
let ecgCharacteristic = null;
let hrCharacteristic = null;
let currentHeartRate = 72;

// BLE UUIDs (matching Arduino code)
const UUIDS = {
    heartRateService: '0000180d-0000-1000-8000-00805f9b34fb',
    heartRateChar: '00002a37-0000-1000-8000-00805f9b34fb',
    ecgService: '0000181c-0000-1000-8000-00805f9b34fb',
    ecgDataChar: '00002a5b-0000-1000-8000-00805f9b34fb'
};

// ========== QUICK CONNECT (REAL DEVICE) ==========
async function quickConnectBLE() {
    console.log('🔵 Real Device Connection Starting...');
    
    if (!navigator.bluetooth) {
        alert('❌ Web Bluetooth not supported!\n\nUse Chrome, Edge, or Opera.\n\nEnable at: chrome://flags/#enable-web-bluetooth');
        return;
    }

    const statusBox = document.getElementById('connectionStatus');
    const connectedBox = document.getElementById('deviceConnected');
    
    statusBox.style.display = 'block';
    document.getElementById('statusMessage').textContent = 'Opening device picker...';

    try {
        // Request device
        console.log('📱 Opening device picker...');
        connectedDevice = await navigator.bluetooth.requestDevice({
            filters: [
                { name: 'Cardiogram-ECG' },      // Exact name from Arduino
                { namePrefix: 'Cardiogram' },    // Any device starting with "Cardiogram"
                { services: [UUIDS.heartRateService] }
            ],
            optionalServices: [
                UUIDS.heartRateService,
                UUIDS.ecgService
            ]
        });

        console.log('✅ Device selected:', connectedDevice.name);
        
        // Connect to GATT
        document.getElementById('statusMessage').textContent = 'Connecting to device...';
        const server = await connectedDevice.gatt.connect();
        console.log('✅ GATT connected');

        // Get Heart Rate Service
        document.getElementById('statusMessage').textContent = 'Reading services...';
        const hrService = await server.getPrimaryService(UUIDS.heartRateService);
        hrCharacteristic = await hrService.getCharacteristic(UUIDS.heartRateChar);
        
        // Start heart rate notifications
        await hrCharacteristic.startNotifications();
        hrCharacteristic.addEventListener('characteristicvaluechanged', handleHeartRateData);
        console.log('✅ Heart Rate notifications enabled');

        // Get ECG Service
        try {
            const ecgService = await server.getPrimaryService(UUIDS.ecgService);
            ecgCharacteristic = await ecgService.getCharacteristic(UUIDS.ecgDataChar);
            
            // Start ECG notifications
            await ecgCharacteristic.startNotifications();
            ecgCharacteristic.addEventListener('characteristicvaluechanged', handleECGData);
            console.log('✅ ECG notifications enabled');
        } catch (e) {
            console.warn('⚠️ ECG service not found, using HR only');
        }

        // Success!
        statusBox.style.display = 'none';
        connectedBox.style.display = 'block';
        
        document.getElementById('deviceName').textContent = connectedDevice.name || 'Cardiogram-ECG';
        
        // Mark connected
        if (typeof window.setDeviceConnected === 'function') {
            window.setDeviceConnected(true);
        }
        
        // Update navbar
        const bleBtn = document.getElementById('bleBtn');
        if (bleBtn) bleBtn.classList.add('connected');
        
        // Switch to real device mode
        if (typeof window.switchToRealDevice === 'function') {
            window.switchToRealDevice();
        }
        
        console.log('✅ Real device connected!');

    } catch (error) {
        console.error('❌ Connection error:', error);
        statusBox.style.display = 'none';
        
        if (error.name === 'NotFoundError') {
            console.log('User cancelled');
        } else {
            alert('❌ Connection failed!\n\n' + error.message + '\n\nMake sure:\n1. ESP32 is powered on\n2. Bluetooth is enabled\n3. Device is advertising');
        }
    }
}

// ========== HANDLE HEART RATE DATA ==========
function handleHeartRateData(event) {
    const value = event.target.value;
    
    // Standard Heart Rate format:
    // Byte 0: Flags
    // Byte 1: Heart rate (BPM)
    const flags = value.getUint8(0);
    const heartRate = value.getUint8(1);
    
    currentHeartRate = heartRate;
    
    console.log('💓 Heart Rate:', heartRate, 'BPM');
    
    // Update UI
    const hrElement = document.getElementById('liveHeartRate');
    if (hrElement) {
        hrElement.textContent = heartRate;
    }
}

// ========== HANDLE ECG DATA ==========
function handleECGData(event) {
    const value = event.target.value;
    
    // Parse packet: 10 samples × 2 bytes each (20 bytes total)
    const sampleCount = value.byteLength / 2;
    
    for (let i = 0; i < sampleCount; i++) {
        // Read 16-bit signed integer (little-endian)
        const rawValue = value.getInt16(i * 2, true); // true = little-endian
        
        // Convert to millivolts (assuming 3.3V reference, 12-bit ADC)
        // Adjust this formula based on your BioAmp calibration
        const voltage = (rawValue / 2048.0) * 1.65; // -1.65V to +1.65V range
        
        // Normalize for display (typical ECG range: -1 to +1)
        const normalizedValue = rawValue / 2048.0;
        
        // Send to ECG renderer
        const dataPoint = {
            value: normalizedValue,
            timestamp: Date.now(),
            heartRate: currentHeartRate,
            source: 'device'
        };
        
        // Notify ECG renderer
        if (window.onDemoECGData) {
            window.onDemoECGData(dataPoint);
        }
        
        // Record if test is running
        if (window.isRecording && window.patientData) {
            window.patientData.ecgData.push(dataPoint);
        }
    }
}

// ========== DEMO MODE ==========
function useDemoMode() {
    console.log('🎮 Demo Mode Activated');
    
    const statusBox = document.getElementById('connectionStatus');
    const connectedBox = document.getElementById('deviceConnected');
    
    statusBox.style.display = 'block';
    document.getElementById('statusMessage').textContent = 'Initializing demo mode...';
    
    setTimeout(() => {
        statusBox.style.display = 'none';
        connectedBox.style.display = 'block';
        
        document.getElementById('deviceName').textContent = 'Demo Device (Simulated)';
        
        // Mark connected
        if (typeof window.setDeviceConnected === 'function') {
            window.setDeviceConnected(true);
        }
        
        // Update navbar
        const bleBtn = document.getElementById('bleBtn');
        if (bleBtn) bleBtn.classList.add('connected');
        
        // Switch to simulated mode
        if (typeof window.switchToSimulated === 'function') {
            window.switchToSimulated();
        }
        
        console.log('✅ Demo mode ready!');
    }, 1000);
}

// ========== DISCONNECT ==========
async function disconnectDevice() {
    if (connectedDevice && connectedDevice.gatt.connected) {
        await connectedDevice.gatt.disconnect();
        console.log('🔌 Device disconnected');
        
        if (typeof window.setDeviceConnected === 'function') {
            window.setDeviceConnected(false);
        }
        
        const bleBtn = document.getElementById('bleBtn');
        if (bleBtn) bleBtn.classList.remove('connected');
    }
}

// ========== EXPOSE GLOBALLY ==========
window.quickConnectBLE = quickConnectBLE;
window.useDemoMode = useDemoMode;
window.disconnectDevice = disconnectDevice;

console.log('📶 Bluetooth module ready (Real Device Support)');