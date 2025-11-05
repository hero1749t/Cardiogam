/* ============================================
   BLUETOOTH.JS - Hardware Integration
   Supports: nRF52840 + Heart BioAmp Candy
   ============================================ */

import CONFIG from './config.js';

class BluetoothManager {
    constructor() {
        this.device = null;
        this.server = null;
        this.ecgCharacteristic = null;
        this.batteryCharacteristic = null;
        this.isConnected = false;
        this.isDemoMode = false;
        this.demoInterval = null;
    }

    // ========== CHECK BROWSER SUPPORT ==========
    checkSupport() {
        if (!navigator.bluetooth) {
            console.error('❌ Web Bluetooth not supported');
            return false;
        }
        console.log('✅ Web Bluetooth supported');
        return true;
    }

    // ========== CONNECT TO REAL DEVICE ==========
    async connectDevice() {
        if (!this.checkSupport()) {
            throw new Error('Web Bluetooth not supported. Use Chrome/Edge/Opera.');
        }

        try {
            console.log('🔵 Opening device picker...');
            
            // Request device
            this.device = await navigator.bluetooth.requestDevice({
                filters: [
                    { services: [CONFIG.BLUETOOTH.HEART_RATE_SERVICE] },
                    { name: 'Cardiogam' }, // Your device name
                    { namePrefix: 'nRF' }  // nRF devices
                ],
                optionalServices: [
                    CONFIG.BLUETOOTH.HEART_RATE_SERVICE,
                    CONFIG.BLUETOOTH.BATTERY_SERVICE,
                    CONFIG.BLUETOOTH.CUSTOM_ECG_SERVICE // if using custom
                ]
            });

            console.log('✅ Device selected:', this.device.name);

            // Connect to GATT server
            console.log('🔌 Connecting to GATT server...');
            this.server = await this.device.gatt.connect();
            console.log('✅ GATT connected');

            // Setup services and characteristics
            await this.setupServices();

            // Setup disconnect handler
            this.device.addEventListener('gattserverdisconnected', () => {
                console.log('⚠️ Device disconnected');
                this.handleDisconnect();
            });

            this.isConnected = true;
            this.updateConnectionUI(true);

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

    // ========== SETUP BLUETOOTH SERVICES ==========
    async setupServices() {
        try {
            // Get Heart Rate Service
            const hrService = await this.server.getPrimaryService(
                CONFIG.BLUETOOTH.HEART_RATE_SERVICE
            );
            console.log('✅ Heart Rate Service found');

            // Get ECG characteristic
            this.ecgCharacteristic = await hrService.getCharacteristic(
                CONFIG.BLUETOOTH.HEART_RATE_CHAR
            );
            console.log('✅ ECG Characteristic found');

            // Start notifications
            await this.ecgCharacteristic.startNotifications();
            this.ecgCharacteristic.addEventListener(
                'characteristicvaluechanged',
                this.handleECGData.bind(this)
            );
            console.log('✅ ECG notifications enabled');

            // Optional: Battery service
            try {
                const batteryService = await this.server.getPrimaryService(
                    CONFIG.BLUETOOTH.BATTERY_SERVICE
                );
                this.batteryCharacteristic = await batteryService.getCharacteristic(
                    CONFIG.BLUETOOTH.BATTERY_LEVEL_CHAR
                );
                const batteryLevel = await this.batteryCharacteristic.readValue();
                console.log('🔋 Battery:', batteryLevel.getUint8(0) + '%');
            } catch (e) {
                console.log('ℹ️ Battery service not available');
            }

        } catch (error) {
            console.error('❌ Service setup error:', error);
            throw error;
        }
    }

    // ========== HANDLE INCOMING ECG DATA ==========
    handleECGData(event) {
        const value = event.target.value;
        
        // Parse based on your nRF firmware format
        // Adjust this based on how your device sends data
        
        // Standard Heart Rate format (assuming your device follows this)
        const flags = value.getUint8(0);
        const rate16Bits = flags & 0x1;
        
        let heartRate;
        if (rate16Bits) {
            heartRate = value.getUint16(1, true); // Little-endian
        } else {
            heartRate = value.getUint8(1);
        }

        // If your device sends raw ECG values, parse them here
        // Example: Multiple samples in one packet
        let ecgSamples = [];
        
        // Adjust byte positions based on your packet structure
        for (let i = 2; i < value.byteLength; i += 2) {
            try {
                // Assuming 16-bit signed integers for ECG values
                const sample = value.getInt16(i, true) / 1000; // Convert to mV
                ecgSamples.push(sample);
            } catch (e) {
                // End of data
                break;
            }
        }

        console.log('💓 HR:', heartRate, 'BPM | Samples:', ecgSamples.length);

        // Send data to ECG renderer
        if (ecgSamples.length > 0) {
            ecgSamples.forEach(sample => {
                this.notifyECGListeners({
                    value: sample,
                    timestamp: Date.now(),
                    heartRate: heartRate,
                    source: 'device'
                });
            });
        } else {
            // Fallback: Generate point from heart rate
            this.notifyECGListeners({
                value: 0, // Will be handled by ECG generator
                timestamp: Date.now(),
                heartRate: heartRate,
                source: 'device'
            });
        }

        // Update UI
        this.updateHeartRateDisplay(heartRate);
    }

    // ========== DEMO MODE ==========
    async enableDemoMode() {
        console.log('🎮 Demo mode enabled');
        
        this.isDemoMode = true;
        this.isConnected = true;
        
        this.updateConnectionUI(true, 'Demo Device');

        // Mark device connected in dashboard
        if (typeof window.setDeviceConnected === 'function') {
            window.setDeviceConnected(true);
        }

        // Switch ECG to simulated mode
        if (typeof window.switchToSimulated === 'function') {
            window.switchToSimulated();
        }

        // Start demo data stream
        this.startDemoStream();

        return {
            success: true,
            deviceName: 'Demo Device (Simulated)',
            deviceId: 'demo-' + Date.now()
        };
    }

    startDemoStream() {
        if (this.demoInterval) {
            clearInterval(this.demoInterval);
        }

        let time = 0;
        let baseHR = 72;

        this.demoInterval = setInterval(() => {
            time += 1 / 60;

            // Vary heart rate slightly
            if (Math.random() < 0.05) {
                baseHR += (Math.random() - 0.5) * 2;
                baseHR = Math.max(60, Math.min(90, baseHR));
            }

            // Generate realistic ECG point
            const ecgValue = this.generateRealisticECG(time, baseHR);

            this.notifyECGListeners({
                value: ecgValue,
                timestamp: Date.now(),
                heartRate: Math.round(baseHR),
                source: 'demo'
            });

        }, 1000 / 60); // 60 FPS
    }

    generateRealisticECG(time, heartRate) {
        const beatInterval = 60 / heartRate;
        const beatPosition = (time % beatInterval) / beatInterval;
        
        let value = 0;
        
        // P wave
        if (beatPosition >= 0.05 && beatPosition < 0.15) {
            const x = (beatPosition - 0.05) / 0.1;
            value += 0.15 * Math.sin(x * Math.PI);
        }
        
        // QRS complex
        if (beatPosition >= 0.25 && beatPosition < 0.35) {
            const center = 0.30;
            const sigma = 0.015;
            const gauss = Math.exp(-Math.pow((beatPosition - center), 2) / (2 * sigma * sigma));
            value += 1.0 * gauss;
        }
        
        // T wave
        if (beatPosition >= 0.46 && beatPosition < 0.72) {
            const x = (beatPosition - 0.46) / 0.26;
            value += 0.25 * Math.sin(x * Math.PI);
        }
        
        // Add noise
        value += (Math.random() - 0.5) * 0.02;
        
        return value;
    }

    // ========== DISCONNECT ==========
    async disconnect() {
        if (this.isDemoMode) {
            if (this.demoInterval) {
                clearInterval(this.demoInterval);
            }
        } else if (this.device && this.device.gatt.connected) {
            await this.device.gatt.disconnect();
        }

        this.isConnected = false;
        this.isDemoMode = false;
        this.updateConnectionUI(false);

        console.log('🔌 Disconnected');
    }

    handleDisconnect() {
        this.isConnected = false;
        this.updateConnectionUI(false);
        
        if (typeof window.setDeviceConnected === 'function') {
            window.setDeviceConnected(false);
        }

        alert('⚠️ Device disconnected! Please reconnect.');
    }

    // ========== EVENT LISTENERS ==========
    listeners = [];

    addListener(callback) {
        this.listeners.push(callback);
    }

    notifyECGListeners(data) {
        // Notify ECG renderer
        if (window.onDemoECGData) {
            window.onDemoECGData(data);
        }

        // Notify all listeners
        this.listeners.forEach(listener => {
            try {
                listener(data);
            } catch (e) {
                console.error('Listener error:', e);
            }
        });

        // Record data if test is running
        if (window.isRecording && window.patientData) {
            window.patientData.ecgData.push(data);
        }
    }

    // ========== UI UPDATES ==========
    updateConnectionUI(connected, deviceName = null) {
        const bleBtn = document.getElementById('bleBtn');
        if (bleBtn) {
            if (connected) {
                bleBtn.classList.add('connected');
            } else {
                bleBtn.classList.remove('connected');
            }
        }

        if (deviceName) {
            const nameEl = document.getElementById('deviceName');
            if (nameEl) nameEl.textContent = deviceName;
        }
    }

    updateHeartRateDisplay(heartRate) {
        const hrElement = document.getElementById('liveHeartRate');
        if (hrElement) {
            hrElement.textContent = heartRate;
        }
    }

    // ========== GET DEVICE INFO ==========
    getDeviceInfo() {
        if (this.isDemoMode) {
            return {
                name: 'Demo Device',
                id: 'demo',
                connected: true,
                type: 'demo'
            };
        }

        if (this.device) {
            return {
                name: this.device.name,
                id: this.device.id,
                connected: this.device.gatt.connected,
                type: 'bluetooth'
            };
        }

        return null;
    }
}

// Create global instance
const bluetoothManager = new BluetoothManager();

// Expose functions globally for HTML onclick handlers
window.quickConnectBLE = async () => {
    const statusBox = document.getElementById('connectionStatus');
    const connectedBox = document.getElementById('deviceConnected');
    
    try {
        statusBox.style.display = 'block';
        document.getElementById('statusMessage').textContent = 'Connecting to device...';
        
        const result = await bluetoothManager.connectDevice();
        
        statusBox.style.display = 'none';
        connectedBox.style.display = 'block';
        
        document.getElementById('deviceName').textContent = result.deviceName;
        
        console.log('✅ Connected:', result);
        
    } catch (error) {
        statusBox.style.display = 'none';
        
        if (error.name === 'NotFoundError') {
            console.log('User cancelled');
        } else {
            alert('Connection failed: ' + error.message);
        }
    }
};

window.useDemoMode = async () => {
    const statusBox = document.getElementById('connectionStatus');
    const connectedBox = document.getElementById('deviceConnected');
    
    statusBox.style.display = 'block';
    document.getElementById('statusMessage').textContent = 'Initializing demo mode...';
    
    setTimeout(async () => {
        const result = await bluetoothManager.enableDemoMode();
        
        statusBox.style.display = 'none';
        connectedBox.style.display = 'block';
        
        document.getElementById('deviceName').textContent = result.deviceName;
        
        console.log('✅ Demo mode active');
    }, 1000);
};

window.bluetoothManager = bluetoothManager;

export default bluetoothManager;