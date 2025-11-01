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
    
    // Stop ECG rendering
    if (typeof stopLiveECG === 'function') {
        stopLiveECG();
    }
    
    // Generate report
    generateReport();
    
    // Show results
    setTimeout(() => {
        showStep(STEPS.RESULTS);
        
        // Initialize report ECG canvas
        if (typeof initReportECG === 'function') {
            initReportECG();
        }
    }, 500);
}

// ========== STEP 4: GENERATE REPORT ==========
function generateReport() {
    // Calculate average heart rate
    const avgHR = 68 + Math.floor(Math.random() * 15);
    
    // Fill in summary data
    document.getElementById('avgHeartRate').textContent = avgHR + ' BPM';
    document.getElementById('rhythmStatus').textContent = 'Regular Sinus';
    document.getElementById('finalSignalQuality').textContent = 'Excellent';
    
    // Patient info
    document.getElementById('summaryName').textContent = patientData.name;
    document.getElementById('summaryAge').textContent = patientData.age + ' years';
    document.getElementById('summaryGender').textContent = patientData.gender;
    document.getElementById('testDate').textContent = patientData.testDate;
    
    console.log('📊 Report Generated');
}

// ========== REPORT ACTIONS ==========
function printReport() {
    console.log('🖨️ Print Report');
    window.print();
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