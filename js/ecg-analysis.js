// js/ecg-analysis.js - New file
class ECGAnalyzer {
    constructor(ecgData, sampleRate = 250) {
        this.data = ecgData
        this.sampleRate = sampleRate
    }
    
    // Pan-Tompkins QRS Detection
    detectQRS() {
        const filtered = this.bandpassFilter()
        const derivative = this.derivative(filtered)
        const squared = derivative.map(x => x * x)
        const integrated = this.movingAverage(squared, 30)
        
        return this.findPeaks(integrated, 0.6)
    }
    
    // Heart Rate Variability
    calculateHRV() {
        const rPeaks = this.detectQRS()
        const rrIntervals = []
        
        for (let i = 1; i < rPeaks.length; i++) {
            rrIntervals.push(rPeaks[i] - rPeaks[i-1])
        }
        
        const meanRR = rrIntervals.reduce((a,b) => a+b) / rrIntervals.length
        const sdnn = Math.sqrt(
            rrIntervals.reduce((sum, rr) => sum + Math.pow(rr - meanRR, 2), 0) / rrIntervals.length
        )
        
        return { meanRR, sdnn, rrIntervals }
    }
    
    // Arrhythmia Detection
    detectArrhythmia() {
        const hrv = this.calculateHRV()
        const qrs = this.detectQRS()
        
        let abnormalities = []
        
        // Bradycardia (< 60 BPM)
        if (hrv.meanRR > 1000) {
            abnormalities.push({
                type: 'Bradycardia',
                severity: 'warning',
                message: 'Heart rate below 60 BPM'
            })
        }
        
        // Tachycardia (> 100 BPM)
        if (hrv.meanRR < 600) {
            abnormalities.push({
                type: 'Tachycardia',
                severity: 'warning',
                message: 'Heart rate above 100 BPM'
            })
        }
        
        // Irregular rhythm (high SDNN)
        if (hrv.sdnn > 50) {
            abnormalities.push({
                type: 'Irregular Rhythm',
                severity: 'danger',
                message: 'Possible atrial fibrillation'
            })
        }
        
        return abnormalities
    }
    
    // Helper: Bandpass filter (5-15 Hz)
    bandpassFilter() {
        // Implement digital filter
        // Use Web Audio API or DSP.js library
    }
    
    // Helper: Derivative
    derivative(signal) {
        return signal.map((val, i) => 
            i > 0 ? val - signal[i-1] : 0
        )
    }
    
    // Helper: Moving average
    movingAverage(signal, windowSize) {
        let result = []
        for (let i = 0; i < signal.length; i++) {
            let sum = 0
            let count = 0
            for (let j = Math.max(0, i - windowSize); j <= i; j++) {
                sum += signal[j]
                count++
            }
            result.push(sum / count)
        }
        return result
    }
    
    // Helper: Peak detection
    findPeaks(signal, threshold) {
        let peaks = []
        let maxVal = Math.max(...signal)
        
        for (let i = 1; i < signal.length - 1; i++) {
            if (signal[i] > signal[i-1] && 
                signal[i] > signal[i+1] && 
                signal[i] > maxVal * threshold) {
                peaks.push(i)
            }
        }
        return peaks
    }
}

// Usage in dashboard.js
function generateReport() {
    const analyzer = new ECGAnalyzer(patientData.ecgData, 250)
    const qrs = analyzer.detectQRS()
    const hrv = analyzer.calculateHRV()
    const arrhythmias = analyzer.detectArrhythmia()
    
    // Update UI with advanced metrics
    document.getElementById('hrvSDNN').textContent = hrv.sdnn.toFixed(2) + ' ms'
    document.getElementById('qrsCount').textContent = qrs.length
    
    // Show warnings
    if (arrhythmias.length > 0) {
        displayArrhythmiaWarnings(arrhythmias)
    }
}