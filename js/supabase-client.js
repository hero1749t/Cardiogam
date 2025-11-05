/* ============================================
   SUPABASE-CLIENT.JS - Supabase Connection
   ============================================ */

import CONFIG from './config.js';

// For CDN import (browser)
const { createClient } = window.supabase || {};

// Initialize Supabase client
let supabase;

try {
    if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
        throw new Error('Supabase credentials missing in config.js');
    }

    supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    
    console.log('✅ Supabase client initialized');
    console.log('📍 Connected to:', CONFIG.SUPABASE_URL);
    
} catch (error) {
    console.error('❌ Supabase initialization failed:', error);
    alert('Database connection failed. Please check configuration.');
}

// Database helper functions
export const db = {
    // Save ECG session
    async saveECGSession(sessionData) {
        try {
            const { data, error } = await supabase
                .from('ecg_sessions')
                .insert([sessionData])
                .select();

            if (error) throw error;
            
            console.log('✅ ECG session saved:', data);
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ Save session error:', error);
            return { success: false, error: error.message };
        }
    },

    // Get user's ECG history
    async getECGHistory(userId, limit = 10) {
        try {
            const { data, error } = await supabase
                .from('ecg_sessions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            
            return { success: true, data };
        } catch (error) {
            console.error('❌ Get history error:', error);
            return { success: false, error: error.message };
        }
    },

    // Update user profile
    async updateUserProfile(userId, updates) {
        try {
            const { data, error } = await supabase
                .from('users')
                .update(updates)
                .eq('id', userId)
                .select();

            if (error) throw error;
            
            console.log('✅ Profile updated:', data);
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ Update profile error:', error);
            return { success: false, error: error.message };
        }
    },

    // Get user profile
    async getUserProfile(userId) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            
            return { success: true, data };
        } catch (error) {
            console.error('❌ Get profile error:', error);
            return { success: false, error: error.message };
        }
    },

    // Log device data
    async logDeviceData(sessionId, deviceLog) {
        try {
            const { data, error } = await supabase
                .from('device_logs')
                .insert([{
                    session_id: sessionId,
                    ...deviceLog
                }]);

            if (error) throw error;
            
            return { success: true, data };
        } catch (error) {
            console.error('❌ Log device error:', error);
            return { success: false, error: error.message };
        }
    }
};

// Make supabase and db globally available
if (typeof window !== 'undefined') {
    window.supabase = supabase;
    window.db = db;
}

export { supabase };
export default supabase;