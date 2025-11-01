/* ============================================
   ECG.JS - Flexible ECG Rendering Engine
   Supports both SIMULATED and REAL DEVICE data
   ============================================ */

// ========== GLOBAL CONFIG (EASY SWITCHING) ==========
const ECG_MODE = {
  SIMULATED: 'simulated', // Random/generated data
  REAL_DEVICE: 'real_device' // Actual Bluetooth device data
};

// 🎯 CHANGE THIS TO SWITCH MODES
let CURRENT_MODE = ECG_MODE.SIMULATED; // Default: Simulated

// ========== ECG CONFIGURATION ==========
const ECG_CONFIG = {
  sampleRate: 250, // 250 Hz sampling rate (medical standard)
  gridSize: 5, // 5mm grid (standard ECG paper)
  speed: 25, // 25 mm/s (standard ECG speed)
  amplitude: 10, // mV scaling
  colors: {
    background: '#1a1c2d',
    grid: 'rgba(99, 102, 241, 0.15)',
    gridMajor: 'rgba(99, 102, 241, 0.3)',
    waveform: '#10b981',
    waveformGlow: 'rgba(16, 185, 129, 0.5)'
  }
};

// ========== DATA SOURCE INTERFACE ==========
// This is the key: Abstract data source
class ECGDataSource {
  constructor() {
    this.listeners = [];
  }

  // Subscribe to data updates
  subscribe(callback) {
    this.listeners.push(callback);
  }

  // Notify all listeners with new data
  notify(dataPoint) {
    this.listeners.forEach(callback => callback(dataPoint));
  }

  // Override in subclasses
  start() {
    throw new Error('start() must be implemented');
  }

  stop() {
    throw new Error('stop() must be implemented');
  }

  getHeartRate() {
    return 72; // Default
  }
}

// ========== SIMULATED DATA SOURCE ==========
class SimulatedECGSource extends ECGDataSource {
  constructor() {
    super();
    this.time = 0;
    this.heartRate = 72;
    this.beatInterval = 60 / this.heartRate;
    this.interval = null;
    this.dataBuffer = [];
    this.maxBufferSize = 1000;
  }

  // Generate realistic ECG waveform (P-QRS-T complex)
  generatePoint(t) {
    const beatPosition = (t % this.beatInterval) / this.beatInterval;
    let value = 0;

    // P wave (atrial depolarization)
    if (beatPosition >= 0.05 && beatPosition < 0.15) {
      const pWavePos = (beatPosition - 0.05) / 0.1;
      value = 0.15 * Math.sin(pWavePos * Math.PI);
    }
    // PR segment
    else if (beatPosition >= 0.15 && beatPosition < 0.25) {
      value = 0;
    }
    // QRS complex
    else if (beatPosition >= 0.25 && beatPosition < 0.35) {
      const qrsPos = (beatPosition - 0.25) / 0.1;
      if (qrsPos < 0.2) {
        value = -0.1 * (qrsPos / 0.2);
      } else if (qrsPos < 0.5) {
        value = 1.2 * Math.sin((qrsPos - 0.2) / 0.3 * Math.PI);
      } else {
        value = -0.3 * Math.sin((qrsPos - 0.5) / 0.5 * Math.PI);
      }
    }
    // ST segment
    else if (beatPosition >= 0.35 && beatPosition < 0.45) {
      value = 0.05;
    }
    // T wave
    else if (beatPosition >= 0.45 && beatPosition < 0.70) {
      const tWavePos = (beatPosition - 0.45) / 0.25;
      value = 0.25 * Math.sin(tWavePos * Math.PI);
    }

    // Add realistic artifacts
    value += Math.sin(t * 0.5) * 0.02; // Respiratory
    value += (Math.random() - 0.5) * 0.01; // Noise

    return value;
  }

  start() {
    console.log('📊 Simulated ECG Source Started');
    
    // Generate data at ~60 FPS
    this.interval = setInterval(() => {
      const value = this.generatePoint(this.time);
      this.time += 1 / ECG_CONFIG.sampleRate;
      
      this.dataBuffer.push(value);
      if (this.dataBuffer.length > this.maxBufferSize) {
        this.dataBuffer.shift();
      }
      
      // Notify listeners
      this.notify({
        value: value,
        timestamp: Date.now(),
        heartRate: this.heartRate
      });
    }, 1000 / 60); // 60 FPS
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      console.log('📊 Simulated ECG Source Stopped');
    }
  }

  setHeartRate(bpm) {
    this.heartRate = Math.max(40, Math.min(200, bpm));
    this.beatInterval = 60 / this.heartRate;
  }

  getHeartRate() {
    return this.heartRate;
  }
}

// ========== REAL DEVICE DATA SOURCE ==========
class RealDeviceECGSource extends ECGDataSource {
  constructor() {
    super();
    this.device = null;
    this.characteristic = null;
    this.heartRate = 72;
    this.isConnected = false;
  }

  async start() {
    console.log('🔌 Real Device ECG Source Starting...');
    
    // TODO: Implement actual Bluetooth connection
    // This will be filled when you have the device
    
    // For now, just log that real device mode is active
    console.log('⚠️ Real device mode active but no device connected yet');
    console.log('💡 Falling back to simulated data for now');
    
    // Temporary fallback to simulated (remove when device is ready)
    const simulatedFallback = new SimulatedECGSource();
    simulatedFallback.subscribe((data) => this.notify(data));
    simulatedFallback.start();
    
    return simulatedFallback;
  }

  stop() {
    if (this.device) {
      // Disconnect device
      this.device.gatt.disconnect();
      console.log('🔌 Real Device Disconnected');
    }
  }

  // This will receive data from Bluetooth device
  onDataReceived(value) {
    // Parse the incoming byte array to ECG value
    // Format depends on your nRF52840 firmware
    
    this.notify({
      value: value,
      timestamp: Date.now(),
      heartRate: this.heartRate
    });
  }

  getHeartRate() {
    return this.heartRate;
  }
}

// ========== ECG DATA MANAGER (SMART SWITCHER) ==========
class ECGDataManager {
  constructor(mode = CURRENT_MODE) {
    this.mode = mode;
    this.source = null;
    this.initSource();
  }

  initSource() {
    if (this.mode === ECG_MODE.SIMULATED) {
      console.log('🎮 Mode: SIMULATED DATA');
      this.source = new SimulatedECGSource();
    } else {
      console.log('🔌 Mode: REAL DEVICE');
      this.source = new RealDeviceECGSource();
    }
  }

  start() {
    return this.source.start();
  }

  stop() {
    this.source.stop();
  }

  subscribe(callback) {
    this.source.subscribe(callback);
  }

  setHeartRate(bpm) {
    if (this.source.setHeartRate) {
      this.source.setHeartRate(bpm);
    }
  }

  getHeartRate() {
    return this.source.getHeartRate();
  }

  // Switch between modes dynamically
  switchMode(newMode) {
    console.log(`🔄 Switching from ${this.mode} to ${newMode}`);
    
    this.stop();
    this.mode = newMode;
    this.initSource();
    this.start();
  }
}

// ========== ECG CANVAS RENDERER ==========
class ECGRenderer {
  constructor(canvasId, dataManager) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error(`Canvas ${canvasId} not found`);
      return;
    }
    
    this.ctx = this.canvas.getContext('2d');
    this.dataManager = dataManager || new ECGDataManager();
    this.xPosition = 0;
    this.yScale = 50;
    this.xSpeed = 2;
    this.isRunning = false;
    
    this.initCanvas();
    
    // Subscribe to data updates
    this.dataManager.subscribe((data) => this.onDataReceived(data));
  }

  initCanvas() {
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
    this.drawGrid();
  }

  drawGrid() {
    const { width, height } = this.canvas;
    const gridSize = 20;
    
    this.ctx.fillStyle = ECG_CONFIG.colors.background;
    this.ctx.fillRect(0, 0, width, height);
    
    // Minor grid
    this.ctx.strokeStyle = ECG_CONFIG.colors.grid;
    this.ctx.lineWidth = 0.5;
    
    for (let x = 0; x < width; x += gridSize / 5) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }
    
    for (let y = 0; y < height; y += gridSize / 5) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }
    
    // Major grid
    this.ctx.strokeStyle = ECG_CONFIG.colors.gridMajor;
    this.ctx.lineWidth = 1;
    
    for (let x = 0; x < width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }
    
    for (let y = 0; y < height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }
  }

  onDataReceived(data) {
    if (!this.isRunning) return;
    
    const { width, height } = this.canvas;
    const centerY = height / 2;
    
    // Fade effect
    this.ctx.fillStyle = 'rgba(26, 28, 45, 0.1)';
    this.ctx.fillRect(0, 0, width, height);
    
    // Redraw grid periodically
    if (this.xPosition % 20 === 0) {
      this.drawGrid();
    }
    
    // Draw waveform
    const y = centerY - (data.value * this.yScale);
    
    this.ctx.shadowBlur = 8;
    this.ctx.shadowColor = ECG_CONFIG.colors.waveformGlow;
    this.ctx.strokeStyle = ECG_CONFIG.colors.waveform;
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    
    this.ctx.beginPath();
    this.ctx.moveTo(this.xPosition - this.xSpeed, centerY);
    this.ctx.lineTo(this.xPosition, y);
    this.ctx.stroke();
    
    this.ctx.shadowBlur = 0;
    
    this.xPosition += this.xSpeed;
    
    if (this.xPosition > width) {
      this.xPosition = 0;
      this.drawGrid();
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.dataManager.start();
    console.log('▶️ ECG Renderer Started');
  }

  stop() {
    this.isRunning = false;
    this.dataManager.stop();
    console.log('⏸️ ECG Renderer Stopped');
  }

  reset() {
    this.xPosition = 0;
    this.drawGrid();
  }
}

// ========== LIVE ECG MONITOR (WITH METRICS) ==========
class LiveECGMonitor extends ECGRenderer {
  constructor(canvasId, dataManager) {
    super(canvasId, dataManager);
    this.heartRateHistory = [];
    this.lastRPeakTime = 0;
    this.currentBPM = 72;
  }

  onDataReceived(data) {
    super.onDataReceived(data);
    
    // Update heart rate from data
    if (data.heartRate) {
      this.currentBPM = data.heartRate;
      this.updateUI();
    }
    
    // Detect R-peaks for real-time BPM
    if (data.value > 0.9) {
      const currentTime = Date.now();
      
      if (this.lastRPeakTime > 0) {
        const interval = (currentTime - this.lastRPeakTime) / 1000;
        const bpm = Math.round(60 / interval);
        
        if (bpm >= 40 && bpm <= 200) {
          this.currentBPM = bpm;
          this.heartRateHistory.push(bpm);
          
          if (this.heartRateHistory.length > 10) {
            this.heartRateHistory.shift();
          }
          
          this.updateUI();
        }
      }
      
      this.lastRPeakTime = currentTime;
    }
  }

  updateUI() {
    const hrElement = document.getElementById('liveHeartRate');
    if (hrElement) {
      hrElement.textContent = this.currentBPM;
    }
    
    // Signal quality
    const avgHR = this.heartRateHistory.reduce((a, b) => a + b, 0) / this.heartRateHistory.length || 72;
    const variance = this.heartRateHistory.reduce((sum, val) => sum + Math.pow(val - avgHR, 2), 0) / this.heartRateHistory.length;
    const quality = Math.max(85, 100 - variance);
    
    const qualityElement = document.getElementById('signalQuality');
    if (qualityElement) {
      qualityElement.textContent = Math.round(quality);
    }
  }
}

// ========== GLOBAL INSTANCES ==========
let heroECG = null;
let liveECG = null;
let reportECG = null;

// ========== INITIALIZATION FUNCTIONS ==========
function initHeroECG() {
  const canvas = document.getElementById('heroEcgCanvas');
  if (!canvas) return;
  
  const dataManager = new ECGDataManager(CURRENT_MODE);
  heroECG = new ECGRenderer('heroEcgCanvas', dataManager);
  heroECG.start();
  
  // Vary heart rate (only in simulated mode)
  if (CURRENT_MODE === ECG_MODE.SIMULATED) {
    setInterval(() => {
      const randomHR = 68 + Math.floor(Math.random() * 10);
      dataManager.setHeartRate(randomHR);
      
      const hrElement = document.getElementById('heartRate');
      if (hrElement) {
        hrElement.textContent = randomHR + ' BPM';
      }
    }, 3000);
  }
}

function initLiveECG() {
  const canvas = document.getElementById('liveEcgCanvas');
  if (!canvas) return;
  
  const dataManager = new ECGDataManager(CURRENT_MODE);
  liveECG = new LiveECGMonitor('liveEcgCanvas', dataManager);
  liveECG.start();
}

function stopLiveECG() {
  if (liveECG) {
    liveECG.stop();
  }
}

function initReportECG() {
  const canvas = document.getElementById('reportEcgCanvas');
  if (!canvas) return;
  
  const dataManager = new ECGDataManager(CURRENT_MODE);
  reportECG = new ECGRenderer('reportEcgCanvas', dataManager);
  reportECG.start();
  
  // Stop after 5 seconds (static capture)
  setTimeout(() => {
    if (reportECG) {
      reportECG.stop();
    }
  }, 5000);
}

// ========== MODE SWITCHING API ==========
function switchToRealDevice() {
  CURRENT_MODE = ECG_MODE.REAL_DEVICE;
  console.log('🔌 Switched to REAL DEVICE mode');
  
  // Restart all active renderers
  if (heroECG) {
    heroECG.dataManager.switchMode(CURRENT_MODE);
  }
  if (liveECG) {
    liveECG.dataManager.switchMode(CURRENT_MODE);
  }
}

function switchToSimulated() {
  CURRENT_MODE = ECG_MODE.SIMULATED;
  console.log('🎮 Switched to SIMULATED mode');
  
  if (heroECG) {
    heroECG.dataManager.switchMode(CURRENT_MODE);
  }
  if (liveECG) {
    liveECG.dataManager.switchMode(CURRENT_MODE);
  }
}

// ========== WINDOW RESIZE HANDLER ==========
window.addEventListener('resize', () => {
  if (heroECG) heroECG.initCanvas();
  if (liveECG) liveECG.initCanvas();
  if (reportECG) reportECG.initCanvas();
});

// ========== EXPORTS ==========
window.ECGRenderer = ECGRenderer;
window.LiveECGMonitor = LiveECGMonitor;
window.ECGDataManager = ECGDataManager;
window.ECG_MODE = ECG_MODE;
window.initHeroECG = initHeroECG;
window.initLiveECG = initLiveECG;
window.stopLiveECG = stopLiveECG;
window.initReportECG = initReportECG;
window.switchToRealDevice = switchToRealDevice;
window.switchToSimulated = switchToSimulated;
// ========== DEMO MODE DATA HANDLER ==========
window.onDemoECGData = function(data) {
    // Send demo data to active ECG renderers
    if (liveECG && liveECG.isRunning) {
        liveECG.dataManager.source.notify(data);
    }
    
    if (heroECG && heroECG.isRunning) {
        heroECG.dataManager.source.notify(data);
    }
};

console.log('✅ Demo mode handler registered');