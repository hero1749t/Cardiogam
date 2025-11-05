/* ============================================
   CONFIG.JS - App Configuration
   ============================================ */

const CONFIG = {
    // Supabase Configuration
    SUPABASE_URL: 'https://tqadaivbsnqwbpchdsir.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxYWRhaXZic25xd2JwY2hkc2lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMjE0ODcsImV4cCI6MjA3NzU5NzQ4N30.osdSGIZHejRnvRptYy10bhIZpm1p4cPv1hPSD3Hfd1g',
    
    // ECG Settings
    ECG: {
        SAMPLE_RATE: 250, // Hz
        TEST_DURATION: 30, // seconds
        GRID_SIZE: 5, // mm
        SPEED: 25, // mm/s
        BUFFER_SIZE: 1000 // samples to keep in memory
    },
    
    // Bluetooth Device Settings (for your nRF52840)
    BLUETOOTH: {
        // Standard Heart Rate Service
        HEART_RATE_SERVICE: '0000180d-0000-1000-8000-00805f9b34fb',
        HEART_RATE_CHAR: '00002a37-0000-1000-8000-00805f9b34fb',
        
        // Custom ECG Service (if you're using custom UUIDs)
        // Update these based on your nRF firmware
        CUSTOM_ECG_SERVICE: '0000181c-0000-1000-8000-00805f9b34fb',
        CUSTOM_ECG_CHAR: '00002a5b-0000-1000-8000-00805f9b34fb',
        
        // Battery Service
        BATTERY_SERVICE: '0000180f-0000-1000-8000-00805f9b34fb',
        BATTERY_LEVEL_CHAR: '00002a19-0000-1000-8000-00805f9b34fb'
    },
    
    // App Settings
    APP: {
        NAME: 'Cardiogam',
        VERSION: '1.0.0',
        ENVIRONMENT: 'development'
    },
    
    // API Endpoints (for future use)
    API: {
        BASE_URL: window.location.origin
    }
};

// Export for ES6 modules
export default CONFIG;

// Also make it globally available for non-module scripts
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}

console.log('✅ Config loaded:', CONFIG.APP.NAME, CONFIG.APP.VERSION);