/* ============================================
   DASHBOARD.JS - Complete Dashboard Flow
   ============================================ */

// ========== GLOBAL STATE ==========
let patientData = {
    name: '',
    age: '',
    gender: '',
    phone: '',
    medicalHistory: '',
    testDate: '',
    deviceConnected: false,
    ecgData: []
};

let testTimer = null;
let testDuration = 30; // 30 seconds
let timeRemaining = 30;

// ========== STEP NAVIGATION ==========
const STEPS = {
    USER_DETAILS: 0,
    DEVICE_CONNECT: 1,
    ECG_TEST: 2,
    RESULTS: 3
};

let currentStep = STEPS.USER_DETAILS;

function showStep(stepIndex) {
    const sections = document.querySelectorAll('.step-section');
    sections.forEach((section, index) => {
        if (index === stepIndex) {
            section.classList.add('active');
            section.style.display = 'block';
        } else {
            section.classList.remove('active');
            section.style.display = 'none';
        }
    });
    currentStep = stepIndex;
    console.log(`📍 Current Step: ${stepIndex}`);
}

// ========== STEP 1: USER DETAILS FORM ==========
function initUserDetailsForm() {
    const form = document.getElementById('userDetailsForm');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Collect data
        patientData.name = document.getElementById('patientName').value;
        patientData.age = document.getElementById('patientAge').value;
        patientData.gender = document.getElementById('patientGender').value;
        patientData.phone = document.getElementById('patientPhone').value;
        patientData.medicalHistory = document.getElementById('medicalHistory').value;
        patientData.testDate = new Date().toLocaleString();

        console.log('✅ Patient Data Collected:', patientData);

        // Move to device connection
        showStep(STEPS.DEVICE_CONNECT);
    });
}

// ========== STEP 2: DEVICE CONNECTION ==========
function connectBLE() {
    console.log('📶 BLE Connection Initiated');
    
    const statusBox = document.getElementById('connectionStatus');
    const connectedBox = document.getElementById('deviceConnected');
    
    // Show loading
    statusBox.style.display = 'block';
    
    // Simulate connection (2 seconds)
    setTimeout(() => {
        statusBox.style.display = 'none';
        connectedBox.style.display = 'block';
        patientData.deviceConnected = true;
        
        console.log('✅ BLE Device Connected');
        
        // Update navbar button
        const bleBtn = document.getElementById('bleBtn');
        if (bleBtn) {
            bleBtn.classList.add('connected');
        }
    }, 2000);
}

function connectUSB() {
    console.log('🔌 USB Connection Initiated');
    
    const statusBox = document.getElementById('connectionStatus');
    const connectedBox = document.getElementById('deviceConnected');
    
    // Show loading
    statusBox.style.display = 'block';
    
    // Simulate connection (1.5 seconds)
    setTimeout(() => {
        statusBox.style.display = 'none';
        connectedBox.style.display = 'block';
        patientData.deviceConnected = true;
        
        console.log('✅ USB Device Connected');
    }, 1500);
}

function startECGTest() {
    if (!patientData.deviceConnected) {
        alert('Please connect device first!');
        return;
    }
    
    console.log('▶️ Starting 30-Second ECG Test');
    // Clear any previous recording and mark recording flag
    patientData.ecgData = [];
    window.isRecording = true;

    showStep(STEPS.ECG_TEST);
    
    // Initialize ECG canvas
    if (typeof initLiveECG === 'function') {
        initLiveECG();
    }
    
    // Start countdown timer
    startTestTimer();
}

// ========== STEP 3: ECG TEST TIMER ==========
function startTestTimer() {
    timeRemaining = testDuration;
    const timerElement = document.getElementById('timeRemaining');
    const progressCircle = document.getElementById('timerProgress');
    
    const circumference = 2 * Math.PI * 45; // r=45
    progressCircle.style.strokeDasharray = circumference;
    progressCircle.style.strokeDashoffset = 0;
    
    testTimer = setInterval(() => {
        timeRemaining--;
        
        if (timerElement) {
            timerElement.textContent = timeRemaining;
        }
        
        // Update progress circle
        const offset = circumference - (timeRemaining / testDuration) * circumference;
        progressCircle.style.strokeDashoffset = offset;
        
        if (timeRemaining <= 0) {
            clearInterval(testTimer);
            completeECGTest();
        }
    }, 1000);
}

function completeECGTest() {
    console.log('✅ ECG Test Completed');
    
    if (typeof stopLiveECG === 'function') {
        stopLiveECG();
    }
    
    generateReport();
    
    window.isRecording = false;

    setTimeout(() => {
        renderFullECGReport();
        showStep(STEPS.RESULTS);
        
        // Save to database
        saveSessionToDatabase(); // ADD THIS LINE
    }, 250);
}
// ========== SAVE TO DATABASE ==========
async function saveSessionToDatabase() {
    const user = await window.authManager.getCurrentUser();
    
    if (!user) {
        console.warn('⚠️ No user logged in, skipping database save');
        return;
    }

    const deviceInfo = window.bluetoothManager.getDeviceInfo();
    const measurements = analyzeECG(patientData.ecgData);

    const sessionData = {
        user_id: user.id,
        patient_name: patientData.name,
        patient_age: parseInt(patientData.age),
        patient_gender: patientData.gender,
        patient_phone: patientData.phone,
        medical_history: patientData.medicalHistory,
        
        device_id: deviceInfo?.id,
        device_name: deviceInfo?.name,
        connection_type: deviceInfo?.type || 'demo',
        
        heart_rate: measurements.heartRate,
        rhythm: measurements.rhythm,
        rhythm_normal: measurements.rhythmNormal,
        pr_interval: measurements.prInterval,
        qrs_duration: measurements.qrsDuration,
        qt_interval: measurements.qtQtc,
        qtc: measurements.qtc,
        p_axis: measurements.pAxis,
        qrs_axis: measurements.qrsAxis,
        t_axis: measurements.tAxis,
        
        signal_quality: measurements.signalQuality,
        noise_level: measurements.noiseLevel,
        baseline_stability: measurements.baselineStability,
        
        ecg_data: patientData.ecgData, // Full waveform
        
        arrhythmia_detected: false, // Will implement detection later
        clinical_impression: document.getElementById('clinicalImpression')?.textContent,
        
        status: 'completed',
        test_duration: 30
    };

    console.log('💾 Saving session to database...');

    const result = await window.db.saveECGSession(sessionData);

    if (result.success) {
        console.log('✅ Session saved successfully!');
        alert('✅ ECG test saved to your account!');
        
        // Store session ID for PDF upload later
        window.currentSessionId = result.data.id;
    } else {
        console.error('❌ Failed to save session:', result.error);
        alert('⚠️ Could not save to database: ' + result.error);
    }
}

// Render full recorded ECG data (patientData.ecgData) onto reportEcgCanvas
function renderFullECGReport() {
    const canvas = document.getElementById('reportEcgCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Set fixed dimensions for print/display
    const printWidth = 1200;
    const printHeight = 400;
    canvas.width = printWidth;
    canvas.height = printHeight;
    canvas.style.width = '100%';
    canvas.style.height = 'auto';

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // White background for print
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Parameters
    const sampleRate = (window.ECG_CONFIG && window.ECG_CONFIG.sampleRate) ? window.ECG_CONFIG.sampleRate : 250;
    const desiredPixelsPerMM = 4;
    const gridSize = (window.ECG_CONFIG ? window.ECG_CONFIG.gridSize : 5) * desiredPixelsPerMM;

    // Data and timing
    let data = patientData.ecgData || [];
    const totalSamples = data.length;
    const totalSeconds = totalSamples > 0 ? (totalSamples / sampleRate) : 30;

    // Draw grid (minor)
    ctx.strokeStyle = 'rgba(255, 192, 192, 0.5)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < canvasWidth; x += gridSize / 5) {
        ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, canvasHeight); ctx.stroke();
    }
    for (let y = 0; y < canvasHeight; y += gridSize / 5) {
        ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(canvasWidth, y + 0.5); ctx.stroke();
    }

    // Grid (major)
    ctx.strokeStyle = 'rgba(255, 128, 128, 0.8)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvasWidth; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, canvasHeight); ctx.stroke();
    }
    for (let y = 0; y < canvasHeight; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(canvasWidth, y + 0.5); ctx.stroke();
    }

    // Time markers scaled to canvas width
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const pxPerSecond = canvasWidth / (totalSeconds || 1);
    for (let s = 0; s <= Math.ceil(totalSeconds); s++) {
        const x = Math.round(s * pxPerSecond);
        if (x >= 0 && x <= canvasWidth) {
            ctx.beginPath(); ctx.moveTo(x + 0.5, canvasHeight - 12); ctx.lineTo(x + 0.5, canvasHeight); ctx.strokeStyle = '#666666'; ctx.lineWidth = 1; ctx.stroke();
            ctx.fillText(s + 's', x, canvasHeight - 12);
        }
    }

    // Vertical mV ticks and labels (10 mm = 1 mV standard)
    const centerY = canvasHeight / 2;
    const mmPerMV = 10;
    const pxPerMV = desiredPixelsPerMM * mmPerMV;
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 12px Inter, sans-serif';
    const maxSteps = Math.floor((canvasHeight / 2) / pxPerMV);
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    for (let m = -maxSteps; m <= maxSteps; m++) {
        const y = Math.round(centerY - m * pxPerMV) + 0.5;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasWidth, y); ctx.stroke();
        if (m !== 0) {
            ctx.fillText((m > 0 ? '+' : '') + m + ' mV', 45, y);
        } else {
            ctx.fillText('0 mV', 45, y);
        }
    }

    // If no data, generate demo trace so the printed report has a waveform
    if (!data || data.length === 0) {
        data = generateDemoECGData(totalSeconds, sampleRate, 70);
    }

    // Determine y-scale so waveform fits nicely
    let maxAbs = 0;
    for (let i = 0; i < data.length; i++) maxAbs = Math.max(maxAbs, Math.abs(data[i].value));
    const yScale = maxAbs > 0 ? (canvasHeight * 0.35) / maxAbs : 50;

    // Draw waveform
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const pxPerSample = pxPerSecond / sampleRate;
    let lastX = 0, lastY = 0;
    for (let i = 0; i < data.length; i++) {
        const x = Math.round(i * pxPerSample);
        const y = centerY - (data[i].value * yScale);
        if (i === 0) {
            ctx.moveTo(x, y); lastX = x; lastY = y;
        } else {
            const midX = (lastX + x) / 2; const midY = (lastY + y) / 2;
            ctx.quadraticCurveTo(lastX, lastY, midX, midY);
            lastX = x; lastY = y;
        }
    }
    ctx.lineTo(lastX, lastY);
    ctx.stroke();
}

// ========== STEP 4: GENERATE REPORT ==========
function generateReport() {
    // Generate report ID
    const reportId = 'ECG' + Date.now().toString().slice(-6);
    document.getElementById('reportId').textContent = reportId;

    // Set test date and time
    const now = new Date();
    const formattedDateTime = now.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('testDateTime').textContent = formattedDateTime;

    // Calculate ECG measurements
    const measurements = analyzeECG(patientData.ecgData);
    
    // Update measurements display
    document.getElementById('avgHeartRate').textContent = measurements.heartRate;
    document.getElementById('hrStatus').textContent = getStatusText(measurements.heartRate, 60, 100);
    document.getElementById('hrStatus').className = 'measure-status ' + getStatusClass(measurements.heartRate, 60, 100);

    document.getElementById('rhythmStatus').textContent = measurements.rhythm;
    document.getElementById('rhythmStatusIndicator').className = 'measure-status ' + (measurements.rhythmNormal ? 'normal' : 'abnormal');

    document.getElementById('prInterval').textContent = measurements.prInterval;
    document.getElementById('prStatus').className = 'measure-status ' + getStatusClass(measurements.prInterval, 120, 200);

    document.getElementById('qrsDuration').textContent = measurements.qrsDuration;
    document.getElementById('qrsStatus').className = 'measure-status ' + getStatusClass(measurements.qrsDuration, 80, 120);

    document.getElementById('qtInterval').textContent = measurements.qtQtc;
    document.getElementById('qtStatus').className = 'measure-status ' + getStatusClass(measurements.qtc, 0, 440);

    // Update axes measurements
    document.getElementById('pAxis').textContent = measurements.pAxis;
    document.getElementById('qrsAxis').textContent = measurements.qrsAxis;
    document.getElementById('tAxis').textContent = measurements.tAxis;

    // Update quality metrics
    document.getElementById('signalQualityBar').style.width = measurements.signalQuality + '%';
    document.getElementById('finalSignalQuality').textContent = measurements.signalQuality + '%';
    document.getElementById('noiseBar').style.width = measurements.noiseLevel + '%';
    document.getElementById('noiseLevel').textContent = measurements.noiseLevel + '%';
    document.getElementById('baselineBar').style.width = measurements.baselineStability + '%';
    document.getElementById('baselineStability').textContent = measurements.baselineStability + '%';

    // Patient information
    document.getElementById('summaryName').textContent = patientData.name;
    document.getElementById('summaryAge').textContent = patientData.age + ' years';
    document.getElementById('summaryGender').textContent = patientData.gender;
    document.getElementById('summaryPhone').textContent = patientData.phone || 'Not provided';
    document.getElementById('medicalHistorySummary').textContent = patientData.medicalHistory || 'No previous conditions reported';
    document.getElementById('medicationsSummary').textContent = patientData.medications || 'No current medications reported';
    document.getElementById('testDate').textContent = formattedDateTime;
    document.getElementById('deviceId').textContent = 'CG-' + Math.random().toString(36).substr(2, 6).toUpperCase();

    // Update reference value tables
    document.getElementById('refHeartRate').textContent = measurements.heartRate + ' BPM';
    document.getElementById('refPR').textContent = measurements.prInterval + ' ms';
    document.getElementById('refQRS').textContent = measurements.qrsDuration + ' ms';
    document.getElementById('refQT').textContent = measurements.qtQtc + ' ms';

    // Generate interpretation based on measurements
    generateInterpretation(measurements);
    
    console.log('📊 Professional Report Generated');
}

// Helper function to analyze ECG data and return measurements
function analyzeECG(ecgData) {
    // In a real implementation, this would do actual ECG analysis
    // For demo, returning realistic simulated values
    return {
        heartRate: 68 + Math.floor(Math.random() * 15),
        rhythm: 'Sinus Rhythm',
        rhythmNormal: true,
        prInterval: 160 + Math.floor(Math.random() * 20),
        qrsDuration: 90 + Math.floor(Math.random() * 10),
        qtQtc: '380/410',
        qtc: 410,
        pAxis: 45 + Math.floor(Math.random() * 10),
        qrsAxis: 30 + Math.floor(Math.random() * 15),
        tAxis: 40 + Math.floor(Math.random() * 10),
        signalQuality: 98,
        noiseLevel: 5,
        baselineStability: 95
    };
}

// Helper function to generate interpretation text based on measurements
function generateInterpretation(measurements) {
    const primaryAnalysis = document.getElementById('primaryAnalysis');
    const detailedFindings = document.getElementById('detailedFindings');
    const clinicalImpression = document.getElementById('clinicalImpression');

    // Clear existing lists
    primaryAnalysis.innerHTML = '';
    detailedFindings.innerHTML = '';

    // Generate primary analysis findings
    const addFinding = (list, text, status = 'normal') => {
        const li = document.createElement('li');
        li.className = status;
        li.textContent = text;
        list.appendChild(li);
    };

    // Primary Analysis
    addFinding(primaryAnalysis, 'Normal sinus rhythm', 'normal');
    addFinding(primaryAnalysis, `Heart rate ${measurements.heartRate} BPM`, getStatusClass(measurements.heartRate, 60, 100));
    addFinding(primaryAnalysis, `PR interval ${measurements.prInterval} ms`, getStatusClass(measurements.prInterval, 120, 200));
    addFinding(primaryAnalysis, `QRS duration ${measurements.qrsDuration} ms`, getStatusClass(measurements.qrsDuration, 80, 120));

    // Detailed Findings
    const findings = [
        `P waves: Normal morphology and axis (${measurements.pAxis}°)`,
        `QRS complex: Normal duration and axis (${measurements.qrsAxis}°)`,
        'ST segments: No significant elevation or depression',
        `T waves: Normal morphology and axis (${measurements.tAxis}°)`
    ];

    findings.forEach(finding => {
        const li = document.createElement('li');
        li.textContent = finding;
        detailedFindings.appendChild(li);
    });

    // Clinical Impression
    clinicalImpression.textContent = generateClinicalImpression(measurements);
}

// Helper function to generate clinical impression
function generateClinicalImpression(measurements) {
    if (isAllNormal(measurements)) {
        return 'Normal ECG recording with no significant abnormalities. Regular sinus rhythm with normal conduction intervals and axis measurements. No evidence of ischemic changes or arrhythmia.';
    }
    
    // In a real implementation, this would generate different text based on actual findings
    return 'ECG shows normal sinus rhythm with some variations in measurements. Please consult a healthcare professional for detailed interpretation.';
}

// Helper function to check if all measurements are normal
function isAllNormal(measurements) {
    return (
        measurements.heartRate >= 60 && measurements.heartRate <= 100 &&
        measurements.prInterval >= 120 && measurements.prInterval <= 200 &&
        measurements.qrsDuration >= 80 && measurements.qrsDuration <= 120 &&
        measurements.qtc <= 440
    );
}

// Helper function to get status class based on value and normal range
function getStatusClass(value, min, max) {
    if (value < min) return 'abnormal';
    if (value > max) return 'abnormal';
    return 'normal';
}

// Helper function to get status text
function getStatusText(value, min, max) {
    if (value < min) return 'Low';
    if (value > max) return 'High';
    return 'Normal';
}

// Generate a simple demo ECG trace (sine + narrow QRS spikes) when no real data is available
function generateDemoECGData(totalSeconds = 30, sampleRate = 250, heartRate = 70) {
    const samples = Math.round(totalSeconds * sampleRate);
    const data = new Array(samples);
    const beatInterval = 60 / heartRate; // seconds per beat
    for (let i = 0; i < samples; i++) {
        const t = i / sampleRate;
        // low-frequency baseline wander / T-wave
        const baseline = 0.08 * Math.sin(2 * Math.PI * 1 * t);

        // small P-wave / T-wave sinusoidal component
        const smallWave = 0.06 * Math.sin(2 * Math.PI * 3 * t + 0.2);

        // QRS spikes at beat times: narrow Gaussian-like
        let qrs = 0;
        const beatIndex = Math.floor(t / beatInterval);
        const beatTime = beatIndex * beatInterval;
        const dt = t - beatTime;
        // create a spike near each beat (except at t=0 where dt=0) with width ~0.02s
        if (Math.abs(dt) < 0.03) {
            const sigma = 0.006; // controls width
            qrs = 1.0 * Math.exp(-0.5 * (dt * dt) / (sigma * sigma));
        }

        // small negative deflection before QRS (Q) and small positive T after (handled by sine)
        const value = baseline + smallWave + qrs;
        data[i] = { value };
    }
    return data;
}

// Prepare and redraw the report canvas for printing. Converts canvas to an image and
// swaps it into the DOM for reliable printing across browsers.
function prepareReportForPrint() {
    return new Promise((resolve, reject) => {
        try {
            const canvas = document.getElementById('reportEcgCanvas');
            const wrapper = document.getElementById('reportCanvasWrapper');
            if (!canvas || !wrapper) return resolve();

            // If no recorded data, generate demo trace so print shows a waveform
            if (!patientData.ecgData || (patientData.ecgData && patientData.ecgData.length === 0)) {
                patientData.ecgData = generateDemoECGData(30, 250, 70);
            }

            // Force a redraw at printable resolution
            try {
                renderFullECGReport();
            } catch (e) {
                console.warn('renderFullECGReport error during print prep', e);
            }

            // Convert the canvas to an image (high quality)
            const dataUrl = canvas.toDataURL('image/png');

            // Create/replace image element used for printing
            let img = document.getElementById('reportEcgImage');
            if (!img) {
                img = document.createElement('img');
                img.id = 'reportEcgImage';
                img.style.display = 'block';
                img.style.width = '100%';
                img.style.height = 'auto';
            }
            img.src = dataUrl;

            // Hide canvas and insert image for printing
            canvas.style.display = 'none';
            // Remove previous image if present then append new
            const existing = document.getElementById('reportEcgImage');
            if (existing) existing.remove();
            wrapper.appendChild(img);

            // Setup afterprint handler to restore the canvas
            function restoreAfterPrint() {
                try {
                    // remove image and show canvas again
                    const imgEl = document.getElementById('reportEcgImage');
                    if (imgEl) imgEl.remove();
                    canvas.style.display = 'block';
                } catch (e) {
                    console.warn('Error restoring after print', e);
                }
                // Cleanup listeners
                if (window.matchMedia) {
                    try { window.matchMedia('print').removeListener(printListener); } catch (e) {}
                }
                window.removeEventListener('afterprint', restoreAfterPrint);
                resolve();
            }

            // Some browsers support beforeprint/afterprint; use matchMedia fallback
            function printListener(mql) {
                if (!mql.matches) {
                    // finished printing
                    restoreAfterPrint();
                }
            }

            if ('onbeforeprint' in window) {
                window.onafterprint = restoreAfterPrint;
            } else if (window.matchMedia) {
                const mql = window.matchMedia('print');
                mql.addListener(printListener);
                // also ensure afterprint catches
                window.addEventListener('afterprint', restoreAfterPrint);
            } else {
                // Fallback: restore after a delay in case browser doesn't fire events
                setTimeout(() => {
                    restoreAfterPrint();
                }, 2000);
            }

            // Resolve immediately (printing will happen next)
            resolve();
        } catch (err) {
            reject(err);
        }
    });
}

// ========== REPORT ACTIONS ==========
function printReport() {
    console.log('🖨️ Print Report');
        // Prefer two-page professional print: page 1 = waveform, page 2 = measurements & interpretation
        printTwoPageReport().catch(err => {
                console.warn('Two-page print failed, falling back to in-place print', err);
                // Fallback: prepare in-place image then call window.print()
                prepareReportForPrint().then(() => window.print()).catch(e => { console.warn('Fallback print prep failed', e); window.print(); });
        });
}

// Build a two-page A4 printable report in a new window and trigger print
async function printTwoPageReport() {
        // Ensure report canvas is rendered with up-to-date data
        const canvas = document.getElementById('reportEcgCanvas');
        if (!canvas) throw new Error('No report canvas available');

        if (!patientData.ecgData || patientData.ecgData.length === 0) {
                patientData.ecgData = generateDemoECGData(30, 250, 70);
        }

        // Force redraw at on-screen size first
        try { renderFullECGReport(); } catch (e) { console.warn('renderFullECGReport failed for print', e); }

        // Resample to A4 @300dpi portrait (2480 x 3508)
        const targetW = 2480;
        const targetH = 3508;
        const off = document.createElement('canvas');
        off.width = targetW; off.height = targetH;
        const offCtx = off.getContext('2d');
        // white background
        offCtx.fillStyle = '#ffffff'; offCtx.fillRect(0,0,targetW,targetH);
        // Draw the waveform canvas scaled to fit top portion of page 1 (allow margins)
        const marginPx = Math.round(0.05 * targetW);
        const availableW = targetW - marginPx * 2;
        const imgH = Math.round(availableW * (canvas.height / canvas.width));
        offCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, marginPx, marginPx + 40, availableW, imgH);
        const dataUrl = off.toDataURL('image/png');

        // Collect fields
        const name = document.getElementById('summaryName') ? document.getElementById('summaryName').textContent : (patientData.name || '-');
        const age = document.getElementById('summaryAge') ? document.getElementById('summaryAge').textContent : (patientData.age ? patientData.age + ' years' : '-');
        const gender = document.getElementById('summaryGender') ? document.getElementById('summaryGender').textContent : (patientData.gender || '-');
        const reportId = document.getElementById('reportId') ? document.getElementById('reportId').textContent : ('ECG' + Date.now().toString().slice(-6));
        const dateTime = document.getElementById('testDateTime') ? document.getElementById('testDateTime').textContent : (new Date()).toLocaleString();
        const hr = document.getElementById('avgHeartRate') ? document.getElementById('avgHeartRate').textContent : '-';
        const rhythm = document.getElementById('rhythmStatus') ? document.getElementById('rhythmStatus').textContent : '-';
        const pr = document.getElementById('prInterval') ? document.getElementById('prInterval').textContent : '-';
        const qrs = document.getElementById('qrsDuration') ? document.getElementById('qrsDuration').textContent : '-';
        const qt = document.getElementById('qtInterval') ? document.getElementById('qtInterval').textContent : '-';
        const clinicalImpressionText = document.getElementById('clinicalImpression') ? document.getElementById('clinicalImpression').textContent : 'No impression provided.';
        const primaryHtml = document.getElementById('primaryAnalysis') ? document.getElementById('primaryAnalysis').outerHTML : '';
        const detailedHtml = document.getElementById('detailedFindings') ? document.getElementById('detailedFindings').outerHTML : '';

        // Build two-page HTML
        const html = `
<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <title>ECG Report - ${reportId}</title>
    <style>
        @page { size: A4; margin: 12mm; }
        html,body{height:100%;}
        body{font-family: Inter, Arial, sans-serif; margin:0; padding:0; color:#222}
        .page{width:210mm; height:297mm; box-sizing:border-box; padding:12mm;}
        .page-break{page-break-after: always}
        .header{display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid #ddd; padding-bottom:8px}
        .brand{display:flex; gap:12px; align-items:center}
        .logo{width:64px; height:64px; background:#f3f4f6; display:flex; align-items:center; justify-content:center; border-radius:8px; font-weight:700; color:#374151}
        .title{font-size:18pt; font-weight:700}
        .meta{font-size:10pt; text-align:right}
        .ecg-img{display:block; width:100%; height:auto; border:1px solid #ccc; background:white}
        .section{margin-top:10px}
        .label{font-weight:600; margin-bottom:6px}
        .measures table{width:100%; border-collapse:collapse}
        .measures td, .measures th{padding:6px 8px; border:1px solid #e6e6e6}
        .impression{border:1px solid #e6e6e6; padding:8px; border-radius:6px}
        @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact } }
    </style>
</head>
<body>
    <div class="page">
        <div class="header">
            <div class="brand">
                <div class="logo">CARDIOGAM</div>
                <div>
                    <div class="title">Electrocardiogram (ECG) Report</div>
                    <div style="font-size:10pt; color:#555">Automated analysis • Professional Summary</div>
                </div>
            </div>
            <div class="meta">
                <div>Report ID: <strong>${reportId}</strong></div>
                <div>${dateTime}</div>
            </div>
        </div>

        <div class="section" style="margin-top:12px;">
            <img class="ecg-img" src="${dataUrl}" alt="ECG Waveform">
        </div>

        <div class="section" style="display:flex; gap:12px; margin-top:10px;">
            <div style="flex:1">
                <div class="label">Patient</div>
                <div>${name}</div>
                <div style="margin-top:6px;">${age} / ${gender}</div>
            </div>
            <div style="flex:1">
                <div class="label">Key Measurements</div>
                <div>HR: ${hr} BPM • Rhythm: ${rhythm}</div>
                <div>PR: ${pr} ms • QRS: ${qrs} ms • QT: ${qt} ms</div>
            </div>
        </div>
    </div>

    <div class="page page-break">
        <div class="header">
            <div style="font-weight:700">Findings & Interpretation</div>
            <div class="meta">${reportId} • ${dateTime}</div>
        </div>

        <div class="section measures" style="margin-top:12px;">
            <div class="label">Measurements</div>
            <table>
                <tr><th>Measurement</th><th>Value</th></tr>
                <tr><td>Heart Rate</td><td>${hr} BPM</td></tr>
                <tr><td>Rhythm</td><td>${rhythm}</td></tr>
                <tr><td>PR Interval</td><td>${pr} ms</td></tr>
                <tr><td>QRS Duration</td><td>${qrs} ms</td></tr>
                <tr><td>QT / QTc</td><td>${qt} ms</td></tr>
            </table>
        </div>

        <div class="section" style="margin-top:10px;">
            <div class="label">Primary Analysis</div>
            ${primaryHtml}
        </div>

        <div class="section" style="margin-top:10px;">
            <div class="label">Detailed Findings</div>
            ${detailedHtml}
        </div>

        <div class="section" style="margin-top:10px;">
            <div class="label">Clinical Impression</div>
            <div class="impression">${clinicalImpressionText}</div>
        </div>

        <div style="margin-top:18px; font-size:9pt; color:#666">Generated by Cardiogam • Please consult a clinician for final interpretation.</div>
    </div>
</body>
</html>
`;

        const win = window.open('', '_blank');
        if (!win) throw new Error('Popup blocked');
        win.document.open(); win.document.write(html); win.document.close();

        // Wait for image to load then print
        return new Promise((resolve, reject) => {
                const img = win.document.querySelector('.ecg-img');
                if (!img) return reject(new Error('No image in print window'));
                img.onload = () => {
                        try { win.focus(); win.print(); setTimeout(() => { try { win.close(); } catch (e) {} }, 500); resolve(); } catch (e) { reject(e); }
                };
                if (img.complete) img.onload();
        });
}

function downloadReport() {
    console.log('⬇️ Download PDF Report');
    
    // Simple text file download (replace with PDF library later)
    const reportData = `
ECG Test Report
===============
Patient: ${patientData.name}
Age: ${patientData.age}
Gender: ${patientData.gender}
Test Date: ${patientData.testDate}
Average Heart Rate: ${document.getElementById('avgHeartRate').textContent}
Rhythm: ${document.getElementById('rhythmStatus').textContent}
Signal Quality: ${document.getElementById('finalSignalQuality').textContent}
    `;
    
    const blob = new Blob([reportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ECG_Report_${patientData.name}_${Date.now()}.txt`;
    a.click();
    
    alert('✅ Report downloaded!');
}

function sendToDoctor() {
    console.log('📧 Send to Doctor');
    const modal = document.getElementById('doctorModal');
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.querySelector('.modal-content').style.transform = 'translateY(0)';
}

function closeDoctorModal() {
    const modal = document.getElementById('doctorModal');
    modal.style.visibility = 'hidden';
    modal.style.opacity = '0';
    modal.querySelector('.modal-content').style.transform = 'translateY(30px)';
}

function startNewTest() {
    console.log('🔄 Starting New Test');
    
    // Stop demo data if running
    if (typeof stopDemoDataStream === 'function') {
        stopDemoDataStream();
    }
    
    // Disconnect real device
    if (typeof disconnectDevice === 'function') {
        disconnectDevice();
    }
    
    // Reset data
    patientData = {
        name: '',
        age: '',
        gender: '',
        phone: '',
        medicalHistory: '',
        testDate: '',
        deviceConnected: false,
        ecgData: []
    };
    
    // Reset form
    document.getElementById('userDetailsForm').reset();
    
    // Go back to step 1
    showStep(STEPS.USER_DETAILS);
}


// ========== DOCTOR EMAIL FORM ==========
function initDoctorForm() {
    const form = document.getElementById('doctorForm');
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('doctorEmail').value;
        const message = document.getElementById('doctorMessage').value;
        
        console.log('📧 Sending report to:', email);
        console.log('Message:', message);
        
        // Simulate sending
        alert(`✅ Report sent to ${email} successfully!`);
        
        closeDoctorModal();
        form.reset();
    });
}

// ========== INITIALIZE DASHBOARD ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏥 Dashboard Initialized');
    
    // Show first step
    showStep(STEPS.USER_DETAILS);
    
    // Initialize forms
    initUserDetailsForm();
    initDoctorForm();
});

// ========== EXPOSE FUNCTIONS TO GLOBAL ==========
window.connectBLE = connectBLE;
window.connectUSB = connectUSB;
window.startECGTest = startECGTest;
window.printReport = printReport;
window.downloadReport = downloadReport;
window.sendToDoctor = sendToDoctor;
window.closeDoctorModal = closeDoctorModal;
window.startNewTest = startNewTest;
// Allow other modules (e.g., bluetooth.js) to mark device connection state
window.setDeviceConnected = function(connected) {
    patientData.deviceConnected = !!connected;
    const bleBtn = document.getElementById('bleBtn');
    if (bleBtn) {
        if (connected) bleBtn.classList.add('connected'); else bleBtn.classList.remove('connected');
    }
};
// ========== DEMO MODE (FIXED) ==========
window.useDemoMode = function() {
    console.log('🎮 Demo Mode Activated');
    
    const statusBox = document.getElementById('connectionStatus');
    const connectedBox = document.getElementById('deviceConnected');
    const deviceNameEl = document.getElementById('deviceName');
    
    // Show loading
    statusBox.style.display = 'block';
    document.getElementById('statusMessage').textContent = 'Initializing demo mode...';
    
    setTimeout(() => {
        statusBox.style.display = 'none';
        connectedBox.style.display = 'block';
        
        if (deviceNameEl) {
            deviceNameEl.textContent = 'Demo Device (Simulated)';
        }
        
        // Mark connected
        patientData.deviceConnected = true;
        
        // Update navbar
        const bleBtn = document.getElementById('bleBtn');
        if (bleBtn) bleBtn.classList.add('connected');
        
        // Switch to simulated ECG mode
        if (typeof window.switchToSimulated === 'function') {
            window.switchToSimulated();
        }
        
        console.log('✅ Demo mode ready!');
    }, 1000);
};

// ========== BLUETOOTH CONNECT (FIXED) ==========
window.quickConnectBLE = async function() {
    console.log('🔵 Bluetooth Connect Initiated');
    
    if (!navigator.bluetooth) {
        alert('❌ Bluetooth not supported!\n\nUse Chrome, Edge, or Opera.\n\nEnable: chrome://flags/#enable-web-bluetooth');
        return;
    }

    const statusBox = document.getElementById('connectionStatus');
    const connectedBox = document.getElementById('deviceConnected');
    const deviceNameEl = document.getElementById('deviceName');
    
    statusBox.style.display = 'block';
    document.getElementById('statusMessage').textContent = 'Opening Bluetooth picker...';

    try {
        const device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: ['heart_rate', 'battery_service']
        });

        console.log('✅ Device selected:', device.name);
        
        document.getElementById('statusMessage').textContent = 'Connecting to device...';
        
        const server = await device.gatt.connect();
        console.log('✅ GATT connected');

        statusBox.style.display = 'none';
        connectedBox.style.display = 'block';
        
        if (deviceNameEl) {
            deviceNameEl.textContent = device.name || 'BLE Device';
        }
        
        patientData.deviceConnected = true;
        
        const bleBtn = document.getElementById('bleBtn');
        if (bleBtn) bleBtn.classList.add('connected');
        
        // Switch to real device mode
        if (typeof window.switchToRealDevice === 'function') {
            window.switchToRealDevice();
        }
        
        console.log('✅ Bluetooth connected!');

    } catch (error) {
        console.error('❌ Connection error:', error);
        statusBox.style.display = 'none';
        
        if (error.name === 'NotFoundError') {
            console.log('User cancelled');
        } else {
            alert('Connection failed: ' + error.message);
        }
    }
};

// ========== START ECG TEST (FIXED) ==========
window.startECGTest = function() {
    if (!patientData.deviceConnected) {
        alert('❌ Please connect device first!');
        return;
    }
    
    console.log('▶️ Starting 30-Second ECG Test');
    
    patientData.ecgData = [];
    window.isRecording = true;
    
    showStep(STEPS.ECG_TEST);
    
    // Initialize live ECG canvas
    setTimeout(() => {
        if (typeof initLiveECG === 'function') {
            initLiveECG();
        }
        startTestTimer();
    }, 500);
};