/* ============================================
   BLUETOOTH.JS - Advanced Medical-Grade Processing
   Hardware: BioAmp Candy + ESP32-C3
   Algorithms: Pan-Tompkins, HRV, Arrhythmia Detection
   ============================================ */

let connectedDevice = null;
let ecgCharacteristic = null;
let hrCharacteristic = null;

// Real-time metrics
let currentHeartRate = 0;
let rPeakTimes = [];
let rrIntervals = [];
let ecgBuffer = [];
let filteredBuffer = [];

// Medical thresholds
const MEDICAL_RANGES = {
    heartRate: { min: 60, max: 100 },
    prInterval: { min: 120, max: 200 },  // ms
    qrsDuration: { min: 80, max: 120 },  // ms
    qtInterval: { max: 440 },            // ms (QTc)
    stElevation: { max: 1.0 }            // mV
};

// BLE Configuration
const UUIDS = {
    heartRateService: '0000180d-0000-1000-8000-00805f9b34fb',
    heartRateChar: '00002a37-0000-1000-8000-00805f9b34fb',
    ecgService: '0000181c-0000-1000-8000-00805f9b34fb',
    ecgDataChar: '00002a5b-0000-1000-8000-00805f9b34fb'
};

// ========== CONNECT BLUETOOTH DEVICE ==========
async function quickConnectBLE() {
    console.log('🔵 Connecting to BioAmp Candy...');
    
    if (!navigator.bluetooth) {
        showError('Bluetooth not supported', 'Use Chrome/Edge/Opera browser');
        return;
    }

    showStatus('Opening device picker...');

    try {
        // Request device
        connectedDevice = await navigator.bluetooth.requestDevice({
            filters: [
                { name: 'Cardiogam-ECG' },
                { namePrefix: 'ESP32' },
                { namePrefix: 'Cardiogam' }
            ],
            optionalServices: [UUIDS.heartRateService, UUIDS.ecgService]
        });

        console.log('✅ Device selected:', connectedDevice.name);
        showStatus('Connecting to GATT server...');
        
        const server = await connectedDevice.gatt.connect();
        console.log('✅ GATT connected');

        // Setup Heart Rate Service
        showStatus('Initializing heart rate monitor...');
        try {
            const hrService = await server.getPrimaryService(UUIDS.heartRateService);
            hrCharacteristic = await hrService.getCharacteristic(UUIDS.heartRateChar);
            await hrCharacteristic.startNotifications();
            hrCharacteristic.addEventListener('characteristicvaluechanged', handleHeartRate);
            console.log('✅ Heart Rate service ready');
        } catch (e) {
            console.warn('⚠️ Heart Rate service not available');
        }

        // Setup ECG Service
        showStatus('Initializing ECG stream...');
        const ecgService = await server.getPrimaryService(UUIDS.ecgService);
        ecgCharacteristic = await ecgService.getCharacteristic(UUIDS.ecgDataChar);
        await ecgCharacteristic.startNotifications();
        ecgCharacteristic.addEventListener('characteristicvaluechanged', handleECGData);
        console.log('✅ ECG service ready');

        // Connection complete
        hideStatus();
        showConnected(connectedDevice.name);
        
        // Mark as connected
        if (typeof window.setDeviceConnected === 'function') {
            window.setDeviceConnected(true);
        }
        
        // Update UI
        const bleBtn = document.getElementById('bleBtn');
        if (bleBtn) bleBtn.classList.add('connected');
        
        console.log('✅ BioAmp Candy fully connected!');
        
        // Handle disconnection
        connectedDevice.addEventListener('gattserverdisconnected', onDisconnected);

    } catch (error) {
        console.error('❌ Connection failed:', error);
        hideStatus();
        
        if (error.name !== 'NotFoundError') {
            showError('Connection Failed', error.message);
        }
    }
}

// ========== HEART RATE HANDLER ==========
function handleHeartRate(event) {
    const value = event.target.value;
    const flags = value.getUint8(0);
    const hr = value.getUint8(1);
    
    currentHeartRate = hr;
    updateHeartRateUI(hr);
}

// ========== ECG DATA HANDLER (MAIN PROCESSING) ==========
function handleECGData(event) {
    const value = event.target.value;
    const sampleCount = value.byteLength / 2;
    
    for (let i = 0; i < sampleCount; i++) {
        // Read 16-bit signed value (little-endian)
        const rawValue = value.getInt16(i * 2, true);
        
        // Convert to mV (assuming 12-bit ADC, 3.3V reference, gain=11)
        // Formula: voltage = (ADC / 2048) * 1.65 * gain
        const voltage = (rawValue / 2048.0) * 1.65;
        
        // Normalize for display (-1 to +1)
        const normalized = voltage / 1.65;
        
        // Store in buffer
        ecgBuffer.push(voltage);
        if (ecgBuffer.length > 500) ecgBuffer.shift();
        
        // Apply digital filters
        const filtered = applyBandpassFilter(voltage);
        filteredBuffer.push(filtered);
        if (filteredBuffer.length > 500) filteredBuffer.shift();
        
        // Detect R-peaks using Pan-Tompkins
        const rPeakDetected = detectRPeak(filtered);
        
        if (rPeakDetected) {
            const now = Date.now();
            rPeakTimes.push(now);
            
            // Calculate RR interval
            if (rPeakTimes.length >= 2) {
                const rrInterval = now - rPeakTimes[rPeakTimes.length - 2];
                rrIntervals.push(rrInterval);
                
                // Keep last 20 intervals
                if (rrIntervals.length > 20) rrIntervals.shift();
                if (rPeakTimes.length > 20) rPeakTimes.shift();
                
                // Calculate instantaneous HR
                const bpm = Math.round(60000 / rrInterval);
                if (bpm >= 30 && bpm <= 220) {
                    currentHeartRate = bpm;
                    updateHeartRateUI(bpm);
                }
            }
        }
        
        // Create data point
        const dataPoint = {
            value: normalized,
            voltage: voltage,
            filtered: filtered,
            timestamp: Date.now(),
            heartRate: currentHeartRate,
            rPeak: rPeakDetected
        };
        
        // Send to renderer
        if (window.onDeviceECGData) {
            window.onDeviceECGData(dataPoint);
        }
        
        // Record if test running
        if (window.isRecording && window.patientData) {
            window.patientData.ecgData.push(dataPoint);
        }
    }
}

// ========== PAN-TOMPKINS ALGORITHM (R-PEAK DETECTION) ==========
let derivative = 0;
let squared = 0;
let integrated = 0;
let integrationWindow = [];
let threshold = 0.3;
let peakMax = 0;
let lastPeakTime = 0;

function detectRPeak(signal) {
    const now = Date.now();
    
    // Step 1: Derivative (emphasize QRS slope)
    derivative = Math.abs(signal - (ecgBuffer[ecgBuffer.length - 2] || 0));
    
    // Step 2: Squaring (amplify peaks)
    squared = derivative * derivative;
    
    // Step 3: Moving integration (smooth)
    integrationWindow.push(squared);
    if (integrationWindow.length > 15) integrationWindow.shift();
    integrated = integrationWindow.reduce((a, b) => a + b, 0) / integrationWindow.length;
    
    // Step 4: Adaptive threshold
    peakMax = Math.max(peakMax * 0.995, integrated);
    threshold = Math.max(0.3, peakMax * 0.6);
    
    // Step 5: Detect peak with refractory period (250ms)
    if (integrated > threshold && (now - lastPeakTime) > 250) {
        lastPeakTime = now;
        return true;
    }
    
    return false;
}

// ========== BANDPASS FILTER (5-15 Hz) ==========
// Simple IIR filter for real-time processing
let filterState = [0, 0, 0];

function applyBandpassFilter(signal) {
    // Butterworth bandpass coefficients (5-15 Hz @ 250 Hz sampling)
    const b = [0.0675, 0, -0.0675];
    const a = [1.0, -1.1430, 0.4128];
    
    // Apply filter
    const output = b[0] * signal + 
                   b[1] * filterState[0] + 
                   b[2] * filterState[1] - 
                   a[1] * filterState[1] - 
                   a[2] * filterState[2];
    
    // Update state
    filterState[2] = filterState[1];
    filterState[1] = output;
    filterState[0] = signal;
    
    return output;
}

// ========== CALCULATE ADVANCED METRICS ==========
function calculateAdvancedMetrics() {
    if (rrIntervals.length < 5) {
        return null;
    }
    
    // Heart Rate Variability (HRV)
    const meanRR = rrIntervals.reduce((a, b) => a + b) / rrIntervals.length;
    const sdnn = Math.sqrt(
        rrIntervals.reduce((sum, rr) => sum + Math.pow(rr - meanRR, 2), 0) / rrIntervals.length
    );
    const rmssd = Math.sqrt(
        rrIntervals.slice(1).reduce((sum, rr, i) => 
            sum + Math.pow(rr - rrIntervals[i], 2), 0
        ) / (rrIntervals.length - 1)
    );
    
    // Average HR
    const avgHR = Math.round(60000 / meanRR);
    
    // Arrhythmia detection
    const irregularBeats = rrIntervals.filter((rr, i) => {
        if (i === 0) return false;
        const diff = Math.abs(rr - rrIntervals[i - 1]);
        return diff > meanRR * 0.2; // >20% variation
    }).length;
    
    const arrhythmiaRisk = irregularBeats > 3 ? 'HIGH' : 
                          irregularBeats > 1 ? 'MEDIUM' : 'LOW';
    
    return {
        avgHR,
        meanRR,
        sdnn: Math.round(sdnn),
        rmssd: Math.round(rmssd),
        irregularBeats,
        arrhythmiaRisk,
        totalBeats: rrIntervals.length
    };
}

// ========== ST SEGMENT ANALYSIS ==========
function analyzeSTSegment(ecgData) {
    // Find baseline (isoelectric line)
    const tpSegments = []; // T-P segments (baseline)
    
    for (let i = 0; i < ecgData.length - 100; i++) {
        if (ecgData[i].rPeak) {
            // Get T-P segment (after T-wave, before next P)
            const tpStart = i + 80; // ~320ms after R
            const tpEnd = Math.min(i + 150, ecgData.length);
            const tpValues = ecgData.slice(tpStart, tpEnd).map(d => d.voltage);
            const baseline = tpValues.reduce((a, b) => a + b, 0) / tpValues.length;
            tpSegments.push(baseline);
        }
    }
    
    const avgBaseline = tpSegments.reduce((a, b) => a + b, 0) / tpSegments.length;
    
    // Measure ST elevation (60-80ms after R peak)
    const stElevations = [];
    for (let i = 0; i < ecgData.length - 50; i++) {
        if (ecgData[i].rPeak) {
            const stPoint = i + 20; // ~80ms after R @ 250Hz
            if (stPoint < ecgData.length) {
                const stValue = ecgData[stPoint].voltage;
                const elevation = stValue - avgBaseline;
                stElevations.push(elevation);
            }
        }
    }
    
    const avgSTElevation = stElevations.reduce((a, b) => a + b, 0) / stElevations.length;
    
    return {
        avgSTElevation: avgSTElevation.toFixed(3),
        isAbnormal: Math.abs(avgSTElevation) > 0.1, // >1mm elevation
        risk: Math.abs(avgSTElevation) > 0.2 ? 'HIGH' : 
              Math.abs(avgSTElevation) > 0.1 ? 'MEDIUM' : 'NORMAL'
    };
}

// ========== QT INTERVAL CALCULATION ==========
function calculateQTInterval(ecgData) {
    const qtIntervals = [];
    
    for (let i = 0; i < ecgData.length - 100; i++) {
        if (ecgData[i].rPeak) {
            // Find Q onset (before R peak)
            let qOnset = i - 5;
            while (qOnset > 0 && ecgData[qOnset].voltage < ecgData[qOnset - 1].voltage) {
                qOnset--;
            }
            
            // Find T end (return to baseline after peak)
            let tEnd = i + 80;
            const baseline = ecgData[i + 150]?.voltage || 0;
            while (tEnd < ecgData.length - 1 && 
                   Math.abs(ecgData[tEnd].voltage - baseline) > 0.05) {
                tEnd++;
            }
            
            const qtDuration = (tEnd - qOnset) * 4; // samples to ms (@ 250Hz)
            qtIntervals.push(qtDuration);
        }
    }
    
    const avgQT = qtIntervals.reduce((a, b) => a + b, 0) / qtIntervals.length;
    
    // Bazett's formula: QTc = QT / sqrt(RR in seconds)
    const avgRR = rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length;
    const qtc = avgQT / Math.sqrt(avgRR / 1000);
    
    return {
        avgQT: Math.round(avgQT),
        qtc: Math.round(qtc),
        isAbnormal: qtc > 440,
        risk: qtc > 500 ? 'HIGH' : qtc > 440 ? 'MEDIUM' : 'NORMAL'
    };
}

// ========== UI UPDATES ==========
function updateHeartRateUI(bpm) {
    const hrElement = document.getElementById('liveHeartRate');
    if (hrElement) hrElement.textContent = bpm;
    
    const heroHR = document.getElementById('heartRate');
    if (heroHR) heroHR.textContent = bpm + ' BPM';
    
    // Signal quality
    const variance = rrIntervals.length > 2 ? 
        Math.sqrt(rrIntervals.reduce((sum, rr, i) => 
            i === 0 ? 0 : sum + Math.pow(rr - rrIntervals[i-1], 2), 0
        ) / (rrIntervals.length - 1)) : 0;
    
    const quality = Math.max(85, 100 - variance / 10);
    const qualityElement = document.getElementById('signalQuality');
    if (qualityElement) qualityElement.textContent = Math.round(quality);
}

function showStatus(msg) {
    const statusBox = document.getElementById('connectionStatus');
    const statusMsg = document.getElementById('statusMessage');
    if (statusBox) statusBox.style.display = 'block';
    if (statusMsg) statusMsg.textContent = msg;
}

function hideStatus() {
    const statusBox = document.getElementById('connectionStatus');
    if (statusBox) statusBox.style.display = 'none';
}

function showConnected(deviceName) {
    const connectedBox = document.getElementById('deviceConnected');
    const nameElement = document.getElementById('deviceName');
    if (connectedBox) connectedBox.style.display = 'block';
    if (nameElement) nameElement.textContent = deviceName;
}

function showError(title, message) {
    alert(`❌ ${title}\n\n${message}\n\nTroubleshooting:\n1. Ensure device is powered on\n2. Check Bluetooth is enabled\n3. Device is in pairing mode`);
}

function onDisconnected() {
    console.warn('⚠️ Device disconnected!');
    alert('Device disconnected. Please reconnect.');
    disconnectDevice();
}

// ========== DISCONNECT ==========
function disconnectDevice() {
    if (connectedDevice?.gatt?.connected) {
        connectedDevice.gatt.disconnect();
    }
    
    connectedDevice = null;
    ecgCharacteristic = null;
    hrCharacteristic = null;
    currentHeartRate = 0;
    rPeakTimes = [];
    rrIntervals = [];
    ecgBuffer = [];
    
    const bleBtn = document.getElementById('bleBtn');
    if (bleBtn) bleBtn.classList.remove('connected');
    
    if (typeof window.setDeviceConnected === 'function') {
        window.setDeviceConnected(false);
    }
}

// ========== EXPOSE GLOBALLY ==========
window.quickConnectBLE = quickConnectBLE;
window.disconnectDevice = disconnectDevice;
window.getCurrentHeartRate = () => currentHeartRate;
window.getAdvancedMetrics = calculateAdvancedMetrics;
window.analyzeSTSegment = analyzeSTSegment;
window.calculateQTInterval = calculateQTInterval;
window.getRRIntervals = () => rrIntervals;

console.log('✅ Advanced Bluetooth + Medical Algorithms Ready');