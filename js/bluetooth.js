/* ============================================
   BLUETOOTH.JS - Device Connection Handler
   ============================================ */

// ========== MODE CONFIGURATION ==========
const DEVICE_MODE = {
    DUMMY: 'dummy',      // Random data
    REAL: 'real'         // Actual device
};

let CURRENT_DEVICE_MODE = DEVICE_MODE.DUMMY; // Default: Dummy

// ========== BLUETOOTH CONNECTION (REAL DEVICE) ==========
class RealBluetoothDevice {
    constructor() {
        this.device = null;
        this.characteristic = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            console.log('🔌 Connecting to Real Bluetooth Device...');
            
            // Request Bluetooth device
            this.device = await navigator.bluetooth.requestDevice({
                filters: [
                    { name: 'ECG_MONITOR' },  // ← Tumhare device ka naam
                    { services: ['heart_rate'] }
                ],
                optionalServices: ['heart_rate']
            });

            const server = await this.device.gatt.connect();
            const service = await server.getPrimaryService('heart_rate');
            this.characteristic = await service.getCharacteristic('heart_rate_measurement');

            // Listen to notifications
            await this.characteristic.startNotifications();
            this.characteristic.addEventListener('characteristicvaluechanged', 
                this.onDataReceived.bind(this));

            this.isConnected = true;
            console.log('✅ Real Device Connected!');
            
            return true;
        } catch (error) {
            console.error('❌ Bluetooth Connection Failed:', error);
            return false;
        }
    }

    onDataReceived(event) {
        const value = event.target.value;
        
        // Parse byte array (depends on your device's data format)
        // Example: First byte is heart rate
        const heartRate = value.getUint8(0);
        
        console.log('📊 Received Heart Rate:', heartRate);
        
        // Trigger event for ECG renderer
        if (window.onDeviceData) {
            window.onDeviceData(heartRate);
        }
    }

    disconnect() {
        if (this.device && this.device.gatt.connected) {
            this.device.gatt.disconnect();
            this.isConnected = false;
            console.log('🔌 Device Disconnected');
        }
    }
}

// ========== DUMMY DATA GENERATOR ==========
class DummyBluetoothDevice {
    constructor() {
        this.interval = null;
        this.isConnected = false;
    }

    async connect() {
        console.log('🎮 Connecting to Dummy Device (Random Data)...');
        
        return new Promise((resolve) => {
            setTimeout(() => {
                this.isConnected = true;
                console.log('✅ Dummy Device Connected!');
                
                // Start sending random data
                this.startDataStream();
                resolve(true);
            }, 1000);
        });
    }

    startDataStream() {
        // Send random heart rate every second
        this.interval = setInterval(() => {
            const randomHR = 65 + Math.floor(Math.random() * 20);
            
            if (window.onDeviceData) {
                window.onDeviceData(randomHR);
            }
        }, 1000);
    }

    disconnect() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isConnected = false;
        console.log('🎮 Dummy Device Disconnected');
    }
}

// ========== DEVICE MANAGER (SMART SWITCHER) ==========
class DeviceManager {
    constructor() {
        this.device = null;
        this.mode = CURRENT_DEVICE_MODE;
        this.init();
    }

    init() {
        if (this.mode === DEVICE_MODE.DUMMY) {
            this.device = new DummyBluetoothDevice();
        } else {
            this.device = new RealBluetoothDevice();
        }
    }

    async connect() {
        return await this.device.connect();
    }

    disconnect() {
        this.device.disconnect();
    }

    switchMode(newMode) {
        console.log(`🔄 Switching from ${this.mode} to ${newMode}`);
        
        this.disconnect();
        this.mode = newMode;
        this.init();
    }

    isConnected() {
        return this.device.isConnected;
    }
}

// ========== GLOBAL INSTANCE ==========
let deviceManager = new DeviceManager();

// ========== API FUNCTIONS ==========
window.connectBluetoothDevice = async function() {
    const success = await deviceManager.connect();
    return success;
};

window.disconnectBluetoothDevice = function() {
    deviceManager.disconnect();
};

window.switchToRealDevice = function() {
    CURRENT_DEVICE_MODE = DEVICE_MODE.REAL;
    deviceManager.switchMode(DEVICE_MODE.REAL);
};

window.switchToDummyDevice = function() {
    CURRENT_DEVICE_MODE = DEVICE_MODE.DUMMY;
    deviceManager.switchMode(DEVICE_MODE.DUMMY);
};

// ========== DATA CALLBACK (ECG.JS will use this) ==========
window.onDeviceData = null; // ECG.js will set this

console.log('📶 Bluetooth Module Loaded');
console.log(`Current Mode: ${CURRENT_DEVICE_MODE}`);