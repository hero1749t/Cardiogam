/* ============================================
   BLUETOOTH.JS - Professional Quick Connect
   ============================================ */

let connectedDevice = null;
let deviceCharacteristic = null;

// ========== QUICK BLUETOOTH CONNECT (ONE-CLICK) ==========
async function quickConnectBLE() {
    console.log('🔵 Quick Connect initiated...');
    
    // Check browser support
    if (!navigator.bluetooth) {
        showError('Bluetooth not supported', 
            'Please use Chrome, Edge, or Opera browser.\n\nOr enable Experimental Web Platform features.');
        return;
    }

    // Show connecting status
    showConnecting('Opening Bluetooth picker...');

    try {
        // Request device (Browser shows popup automatically)
        console.log('📱 Opening device picker...');
        const device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [
                'heart_rate',           // Standard Heart Rate Service
                'battery_service',      // Battery info
                'device_information'    // Device details
            ]
        });

        console.log('✅ Device selected:', device.name);
        
        // Update status
        showConnecting(`Connecting to ${device.name || 'device'}...`);

        // Connect to device
        await connectAndSetup(device);

    } catch (error) {
        console.error('❌ Connection error:', error);
        
        if (error.name === 'NotFoundError') {
            // User cancelled
            hideConnecting();
            console.log('User cancelled device selection');
        } else {
            showError('Connection Failed', error.message);
        }
    }
}

// ========== CONNECT & SETUP DEVICE ==========
async function connectAndSetup(device) {
    try {
        // Store device reference
        connectedDevice = device;

        // Connect to GATT Server
        console.log('🔌 Connecting to GATT...');
        const server = await device.gatt.connect();
        console.log('✅ GATT connected');

        // Get Heart Rate Service
        showConnecting('Reading device services...');
        const service = await server.getPrimaryService('heart_rate');
        console.log('✅ Heart Rate Service found');

        // Get Characteristic
        deviceCharacteristic = await service.getCharacteristic('heart_rate_measurement');
        console.log('✅ Heart Rate Characteristic found');

        // Start notifications
        await deviceCharacteristic.startNotifications();
        deviceCharacteristic.addEventListener('characteristicvaluechanged', handleHeartRateData);
        console.log('✅ Notifications enabled');

        // Connection complete!
        showSuccess(device.name || 'ECG Monitor');

        // Update navbar
        updateNavbarStatus(true);

    } catch (error) {
        console.error('❌ Setup error:', error);
        showError('Setup Failed', 
            'Could not connect to device services.\n\nMake sure your device supports Heart Rate Profile.');
    }
}

// ========== HANDLE INCOMING DATA ==========
function handleHeartRateData(event) {
    const value = event.target.value;
    const flags = value.getUint8(0);
    const heartRateFormat = flags & 0x01;
    
    let heartRate;
    if (heartRateFormat === 0) {
        heartRate = value.getUint8(1);
    } else {
        heartRate = value.getUint16(1, true);
    }

    console.log('💓 Heart Rate:', heartRate, 'BPM');

    // Update live display
    const hrElement = document.getElementById('liveHeartRate');
    if (hrElement) {
        hrElement.textContent = heartRate;
    }

    // Trigger ECG callback
    if (window.onDeviceData) {
        window.onDeviceData(heartRate);
    }
}

// ========== UI FUNCTIONS ==========
function showConnecting(message) {
    const statusBox = document.getElementById('connectionStatus');
    const messageEl = document.getElementById('statusMessage');
    
    if (statusBox) {
        statusBox.style.display = 'block';
        if (messageEl) messageEl.textContent = message;
    }
}

function hideConnecting() {
    const statusBox = document.getElementById('connectionStatus');
    if (statusBox) {
        statusBox.style.display = 'none';
    }
}

function showSuccess(deviceName) {
    hideConnecting();
    
    const successBox = document.getElementById('deviceConnected');
    const deviceNameEl = document.getElementById('deviceName');
    
    if (successBox) {
        successBox.style.display = 'block';
        if (deviceNameEl) {
            deviceNameEl.textContent = deviceName;
        }
    }
}

function showError(title, message) {
    hideConnecting();
    alert(`❌ ${title}\n\n${message}`);
}

function updateNavbarStatus(connected) {
    const bleBtn = document.getElementById('bleBtn');
    if (bleBtn) {
        if (connected) {
            bleBtn.classList.add('connected');
        } else {
            bleBtn.classList.remove('connected');
        }
    }
}

// ========== DEMO MODE (NO DEVICE NEEDED) ==========
// ========== DEMO MODE (WITH RANDOM ECG DATA) ==========
function useDemoMode() {
    console.log('🎮 Demo mode activated');
    
    showConnecting('Initializing demo mode...');
    
    setTimeout(() => {
        showSuccess('Demo Device (Simulated)');
        updateNavbarStatus(true);

        // Mark device connected in dashboard state (if available)
        if (typeof window.setDeviceConnected === 'function') {
            window.setDeviceConnected(true);
        }

        // Ensure ECG renderer is in simulated (advanced) mode so waveform matches demo
        if (typeof window.switchToSimulated === 'function') {
            window.switchToSimulated();
        }

        // Start sending random heart rate data
        startDemoDataStream();
    }, 1000);
}

// ========== DEMO DATA GENERATOR ==========
// ========== ADVANCED DEMO DATA GENERATOR ==========
let demoDataInterval = null;
let demoTime = 0;
let demoHeartRate = 72;

function startDemoDataStream() {
    console.log('📊 Starting advanced demo data stream...');
    
    // Stop any existing stream
    if (demoDataInterval) {
        clearInterval(demoDataInterval);
    }
    
    // Reset time
    demoTime = 0;
    
    // Vary heart rate slowly over time
    setInterval(() => {
        // Slowly change heart rate (simulate breathing, movement)
        const change = (Math.random() - 0.5) * 2; // ±1 BPM change
        demoHeartRate = Math.max(60, Math.min(90, demoHeartRate + change));
    }, 5000); // Update every 5 seconds
    
    // Send data at 60 FPS (like real device)
    demoDataInterval = setInterval(() => {
        demoTime += 1 / 60; // Increment time
        
        // Generate ECG data point
        const ecgValue = generateRealisticECG(demoTime, demoHeartRate);
        
        // Update live heart rate display
        const hrElement = document.getElementById('liveHeartRate');
        if (hrElement) {
            hrElement.textContent = Math.round(demoHeartRate);
        }
        
        // Send to ECG renderer (if exists)
        if (window.onDemoECGData) {
            window.onDemoECGData({
                value: ecgValue,
                timestamp: Date.now(),
                heartRate: Math.round(demoHeartRate)
            });
        }
        
    }, 1000 / 60); // 60 FPS
    
    console.log('✅ Advanced demo data streaming at 60 FPS');
}

// Generate realistic ECG waveform (P-QRS-T complex)
function generateRealisticECG(time, heartRate) {
    const beatInterval = 60 / heartRate; // Time between beats
    const beatPosition = (time % beatInterval) / beatInterval;
    
    let value = 0;
    
    // P wave (atrial depolarization)
    if (beatPosition >= 0.05 && beatPosition < 0.15) {
        const pos = (beatPosition - 0.05) / 0.1;
        value = 0.15 * Math.sin(pos * Math.PI);
    }
    // QRS complex (ventricular depolarization)
    else if (beatPosition >= 0.25 && beatPosition < 0.35) {
        const pos = (beatPosition - 0.25) / 0.1;
        if (pos < 0.2) {
            value = -0.1 * (pos / 0.2); // Q wave
        } else if (pos < 0.5) {
            value = 1.2 * Math.sin((pos - 0.2) / 0.3 * Math.PI); // R peak
        } else {
            value = -0.3 * Math.sin((pos - 0.5) / 0.5 * Math.PI); // S wave
        }
    }
    // T wave (ventricular repolarization)
    else if (beatPosition >= 0.45 && beatPosition < 0.70) {
        const pos = (beatPosition - 0.45) / 0.25;
        value = 0.25 * Math.sin(pos * Math.PI);
    }
    
    // Add realistic noise
    value += Math.sin(time * 0.5) * 0.02; // Respiratory artifact
    value += (Math.random() - 0.5) * 0.01; // Electrical noise
    
    return value;
}

function stopDemoDataStream() {
    if (demoDataInterval) {
        clearInterval(demoDataInterval);
        demoDataInterval = null;
        demoTime = 0;
        console.log('⏹️ Demo data stream stopped');
    }
    // Mark device disconnected in dashboard state (if available)
    if (typeof window.setDeviceConnected === 'function') {
        window.setDeviceConnected(false);
    }
}
    // Send random heart rate every 1 second
    demoDataInterval = setInterval(() => {
        // Generate realistic heart rate (60-90 BPM)
        const baseHeartRate = 72;
        const variation = Math.floor(Math.random() * 20) - 10; // ±10 BPM
        const heartRate = baseHeartRate + variation;
        
        console.log('💓 Demo Heart Rate:', heartRate, 'BPM');
        
        // Update live display (if on ECG test page)
        const hrElement = document.getElementById('liveHeartRate');
        if (hrElement) {
            hrElement.textContent = heartRate;
        }
        
        // Trigger ECG callback for graph
        if (window.onDeviceData) {
            window.onDeviceData(heartRate);
        }
        
        // Simulate ECG data point for realistic waveform
        if (window.ECGDataManager) {
            // ECG.js will handle this automatically
        }
    }, 1000); // Every 1 second
    
    console.log('✅ Demo data streaming started');

// ========== DISCONNECT ==========
function disconnectDevice() {
    if (connectedDevice && connectedDevice.gatt.connected) {
        connectedDevice.gatt.disconnect();
        console.log('🔌 Device disconnected');
        updateNavbarStatus(false);
    }
}

// ========== EXPOSE GLOBALLY ==========
window.quickConnectBLE = quickConnectBLE;
window.useDemoMode = useDemoMode;
window.disconnectDevice = disconnectDevice;
window.onDeviceData = null; // ECG.js will set this

console.log('📶 Bluetooth module ready');
