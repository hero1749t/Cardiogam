/* ============================================
   AUTH.JS - Authentication Module
   ============================================ */

// Import supabase client
import { supabase } from './supabase-client.js';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        // Check if user is already logged in
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
            this.currentUser = session.user;
            this.updateNavbarUI();
        }

        // Listen for auth changes
        supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth event:', event);
            
            if (event === 'SIGNED_IN') {
                this.currentUser = session.user;
                this.updateNavbarUI();
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                this.updateNavbarUI();
            }
        });
    }

    // ========== SIGN UP ==========
    async signUp(email, password, fullName) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: fullName
                    }
                }
            });

            if (error) throw error;

            // Create user profile in public.users table
            if (data.user) {
                const { error: profileError } = await supabase
                    .from('users')
                    .insert([{
                        id: data.user.id,
                        email: email,
                        full_name: fullName,
                        role: 'patient'
                    }]);

                if (profileError) {
                    console.error('Profile creation error:', profileError);
                }
            }

            return { success: true, data };
        } catch (error) {
            console.error('Sign up error:', error);
            return { success: false, error: error.message };
        }
    }

    // ========== SIGN IN ==========
    async signIn(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            this.currentUser = data.user;
            return { success: true, data };
        } catch (error) {
            console.error('Sign in error:', error);
            return { success: false, error: error.message };
        }
    }

    // ========== SIGN OUT ==========
    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            this.currentUser = null;
            window.location.href = 'index.html';
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return { success: false, error: error.message };
        }
    }

    // ========== GET CURRENT USER ==========
    async getCurrentUser() {
        if (this.currentUser) return this.currentUser;

        const { data: { user } } = await supabase.auth.getUser();
        this.currentUser = user;
        return user;
    }

    // ========== CHECK IF LOGGED IN ==========
    isLoggedIn() {
        return this.currentUser !== null;
    }

    // ========== REQUIRE AUTH (for protected pages) ==========
    async requireAuth() {
        const user = await this.getCurrentUser();
        
        if (!user) {
            alert('⚠️ Please login first!');
            window.location.href = 'login.html';
            return false;
        }
        
        return true;
    }

    // ========== UPDATE NAVBAR UI ==========
    updateNavbarUI() {
        const signInBtn = document.querySelector('.btn-signin');
        
        if (!signInBtn) return;

        if (this.currentUser) {
            // User is logged in
            signInBtn.innerHTML = `
                <i class="fas fa-user-circle"></i>
                ${this.currentUser.user_metadata?.full_name || 'Profile'}
            `;
            signInBtn.href = '#';
            signInBtn.onclick = (e) => {
                e.preventDefault();
                this.showUserMenu();
            };
        } else {
            // User is logged out
            signInBtn.innerHTML = `
                <i class="fas fa-user"></i>
                Sign In
            `;
            signInBtn.href = 'login.html';
            signInBtn.onclick = null;
        }
    }

    // ========== USER MENU DROPDOWN ==========
    showUserMenu() {
        const menu = document.createElement('div');
        menu.className = 'user-menu-dropdown';
        menu.innerHTML = `
            <div class="user-menu-item" onclick="window.location.href='dashboard.html'">
                <i class="fas fa-tachometer-alt"></i> Dashboard
            </div>
            <div class="user-menu-item" onclick="window.location.href='history.html'">
                <i class="fas fa-history"></i> History
            </div>
            <div class="user-menu-item" onclick="authManager.signOut()">
                <i class="fas fa-sign-out-alt"></i> Sign Out
            </div>
        `;
        
        document.body.appendChild(menu);
        
        // Close on click outside
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 100);
    }

    // ========== PASSWORD RESET ==========
    async resetPassword(email) {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password.html'
            });

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Password reset error:', error);
            return { success: false, error: error.message };
        }
    }
}

// Initialize auth manager globally
const authManager = new AuthManager();
window.authManager = authManager;

console.log('✅ Auth module loaded');

export default authManager;