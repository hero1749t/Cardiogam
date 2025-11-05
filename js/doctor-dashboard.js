/* ============================================
   DOCTOR DASHBOARD JS - Professional Logic
   ============================================ */

// ========== SAMPLE DATA ==========
const samplePatients = [
    {
        id: 1,
        name: 'Rajesh Kumar',
        age: 45,
        lastTest: '2 hours ago',
        heartRate: 78,
        status: 'normal',
        avatar: 'RK'
    },
    {
        id: 2,
        name: 'Priya Sharma',
        age: 32,
        lastTest: '5 hours ago',
        heartRate: 95,
        status: 'warning',
        avatar: 'PS'
    },
    {
        id: 3,
        name: 'Amit Singh',
        age: 58,
        lastTest: '1 day ago',
        heartRate: 125,
        status: 'critical',
        avatar: 'AS'
    },
    {
        id: 4,
        name: 'Sneha Patel',
        age: 28,
        lastTest: '3 hours ago',
        heartRate: 72,
        status: 'normal',
        avatar: 'SP'
    },
    {
        id: 5,
        name: 'Vikram Desai',
        age: 52,
        lastTest: '6 hours ago',
        heartRate: 88,
        status: 'normal',
        avatar: 'VD'
    }
];

const criticalAlerts = [
    {
        id: 1,
        patient: 'Amit Singh',
        message: 'Irregular heartbeat detected - 125 BPM',
        time: '5 min ago'
    },
    {
        id: 2,
        patient: 'Priya Sharma',
        message: 'Elevated heart rate - 95 BPM during rest',
        time: '15 min ago'
    }
];

// ========== INITIALIZE DASHBOARD ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏥 Doctor Dashboard Initialized');
    
    // Load data
    loadCriticalAlerts();
    loadPatientsTable();
    initChart();
    
    // Setup event listeners
    setupEventListeners();
});

// ========== LOAD CRITICAL ALERTS ==========
function loadCriticalAlerts() {
    const container = document.getElementById('criticalAlerts');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (criticalAlerts.length === 0) {
        container.innerHTML = '<p style="color: #94a3b8; text-align: center;">No critical alerts at the moment</p>';
        return;
    }
    
    criticalAlerts.forEach(alert => {
        const alertCard = document.createElement('div');
        alertCard.className = 'alert-card';
        alertCard.innerHTML = `
            <div class="alert-info">
                <div class="alert-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="alert-details">
                    <h4>${alert.patient}</h4>
                    <p>${alert.message}</p>
                </div>
            </div>
            <div class="alert-time">${alert.time}</div>
        `;
        container.appendChild(alertCard);
    });
}

// ========== LOAD PATIENTS TABLE ==========
function loadPatientsTable() {
    const tbody = document.getElementById('patientsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    samplePatients.forEach(patient => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="patient-name">
                    <div class="patient-avatar">${patient.avatar}</div>
                    <span>${patient.name}</span>
                </div>
            </td>
            <td>${patient.age} years</td>
            <td>${patient.lastTest}</td>
            <td>${patient.heartRate} BPM</td>
            <td>
                <span class="status-badge ${patient.status}">
                    ${patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn" onclick="viewPatient(${patient.id})" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn" onclick="downloadReport(${patient.id})" title="Download Report">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="action-btn" onclick="sendMessage(${patient.id})" title="Send Message">
                        <i class="fas fa-envelope"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// ========== INITIALIZE CHART ==========
function initChart() {
    const canvas = document.getElementById('testsChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Sample data for last 7 days
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = [12, 19, 15, 25, 22, 18, 23];
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'ECG Tests',
                data: data,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#6366f1',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#1a1d2e',
                    titleColor: '#fff',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(99, 102, 241, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y + ' tests';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#94a3b8',
                        font: {
                            size: 12
                        }
                    }
                },
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: '#94a3b8',
                        font: {
                            size: 12
                        }
                    }
                }
            }
        }
    });
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    // Search functionality
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            filterPatients(searchTerm);
        });
    }
    
    // Sidebar menu items
    const menuItems = document.querySelectorAll('.sidebar-menu li');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            menuItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// ========== FILTER PATIENTS ==========
function filterPatients(searchTerm) {
    const rows = document.querySelectorAll('.patients-table tbody tr');
    
    rows.forEach(row => {
        const patientName = row.querySelector('.patient-name span').textContent.toLowerCase();
        
        if (patientName.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// ========== VIEW PATIENT DETAILS ==========
function viewPatient(patientId) {
    const patient = samplePatients.find(p => p.id === patientId);
    if (!patient) return;
    
    const modal = document.getElementById('patientModal');
    const content = document.getElementById('patientDetailContent');
    
    content.innerHTML = `
        <div style="text-align: center; margin-bottom: 2rem;">
            <div class="patient-avatar" style="width: 80px; height: 80px; font-size: 2rem; margin: 0 auto 1rem;">${patient.avatar}</div>
            <h2 style="color: #fff; margin-bottom: 0.5rem;">${patient.name}</h2>
            <p style="color: #94a3b8;">${patient.age} years old</p>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
            <div style="background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 12px;">
                <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 0.5rem;">Last Test</p>
                <p style="color: #fff; font-size: 1.2rem; font-weight: 600;">${patient.lastTest}</p>
            </div>
            <div style="background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 12px;">
                <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 0.5rem;">Heart Rate</p>
                <p style="color: #fff; font-size: 1.2rem; font-weight: 600;">${patient.heartRate} BPM</p>
            </div>
            <div style="background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 12px;">
                <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 0.5rem;">Status</p>
                <span class="status-badge ${patient.status}">${patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}</span>
            </div>
        </div>
        
        <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 2rem;">
            <button class="btn-primary-small" onclick="downloadReport(${patient.id})">
                <i class="fas fa-download"></i> Download Report
            </button>
            <button class="btn-secondary-small" onclick="sendMessage(${patient.id})">
                <i class="fas fa-envelope"></i> Send Message
            </button>
        </div>
    `;
    
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
}

// ========== CLOSE MODAL ==========
function closePatientModal() {
    const modal = document.getElementById('patientModal');
    modal.style.visibility = 'hidden';
    modal.style.opacity = '0';
}

// ========== DOWNLOAD REPORT ==========
function downloadReport(patientId) {
    const patient = samplePatients.find(p => p.id === patientId);
    if (!patient) return;
    
    console.log('📥 Downloading report for:', patient.name);
    alert(`Downloading ECG report for ${patient.name}`);
}

// ========== SEND MESSAGE ==========
function sendMessage(patientId) {
    const patient = samplePatients.find(p => p.id === patientId);
    if (!patient) return;
    
    console.log('📧 Sending message to:', patient.name);
    alert(`Opening message composer for ${patient.name}`);
}

// ========== EXPOSE GLOBALLY ==========
window.viewPatient = viewPatient;
window.closePatientModal = closePatientModal;
window.downloadReport = downloadReport;
window.sendMessage = sendMessage;

console.log('✅ Doctor Dashboard Module Ready');