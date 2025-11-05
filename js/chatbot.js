/* ============================================
   CHATBOT.JS - Gemini AI Integration
   ============================================ */

// ========== CONFIGURATION ==========
const GEMINI_API_KEY = 'AIzaSyBmumparhxjJHfXRzuDW39kVM9G-mKJMX4';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// ========== CHAT STATE ==========
let chatHistory = [];
let isChatOpen = false;

// ========== TOGGLE CHAT WINDOW ==========
function toggleChat() {
    const chatWindow = document.getElementById('chatWindow');
    const toggleBtn = document.getElementById('chatToggleBtn');
    
    isChatOpen = !isChatOpen;
    
    if (isChatOpen) {
        chatWindow.classList.add('active');
        toggleBtn.innerHTML = '<i class="fas fa-times"></i>';
        
        // Focus input
        document.getElementById('chatInput').focus();
    } else {
        chatWindow.classList.remove('active');
        toggleBtn.innerHTML = '<i class="fas fa-comments"></i><span class="chat-badge">AI</span>';
    }
}

// ========== SEND MESSAGE ==========
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Clear input
    input.value = '';
    
    // Add user message to chat
    addMessage(message, 'user');
    
    // Show typing indicator
    showTyping();
    
    // Get AI response
    try {
        const response = await getGeminiResponse(message);
        hideTyping();
        addMessage(response, 'bot');
    } catch (error) {
        hideTyping();
        addMessage('Sorry, I encountered an error. Please try again.', 'bot');
        console.error('Chatbot error:', error);
    }
}

// ========== QUICK QUESTION ==========
function askQuickQuestion(question) {
    document.getElementById('chatInput').value = question;
    sendMessage();
}

// ========== ADD MESSAGE TO CHAT ==========
function addMessage(text, sender) {
    const messagesContainer = document.getElementById('chatMessages');
    const time = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    const messageHTML = `
        <div class="message ${sender}-message">
            <div class="message-avatar">
                <i class="fas fa-${sender === 'user' ? 'user' : 'robot'}"></i>
            </div>
            <div class="message-content">
                <p>${text}</p>
                <span class="message-time">${time}</span>
            </div>
        </div>
    `;
    
    messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Save to history
    chatHistory.push({ role: sender, text: text });
}

// ========== TYPING INDICATOR ==========
function showTyping() {
    document.getElementById('typingIndicator').style.display = 'flex';
    const messagesContainer = document.getElementById('chatMessages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function hideTyping() {
    document.getElementById('typingIndicator').style.display = 'none';
}

// ========== GEMINI AI API CALL ==========
async function getGeminiResponse(userMessage) {
    // Create context for medical chatbot
    const systemPrompt = `You are a helpful medical AI assistant for an ECG monitoring website called CardioCheck. 
Your role is to:
- Answer questions about heart health, ECG, and cardiovascular conditions
- Provide general health advice (always remind users to consult doctors for serious concerns)
- Explain how the ECG monitoring device works
- Be friendly, professional, and concise
- Use simple language that non-medical users can understand

User question: ${userMessage}`;

    const requestBody = {
        contents: [{
            parts: [{
                text: systemPrompt
            }]
        }]
    };

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        
        // Extract text from response
        const aiResponse = data.candidates[0].content.parts[0].text;
        
        return aiResponse;

    } catch (error) {
        console.error('Gemini API Error:', error);
        throw error;
    }
}

// ========== INITIALIZE CHATBOT ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🤖 AI Chatbot initialized');
    
    // Add Enter key support
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
});

// ========== EXPOSE FUNCTIONS GLOBALLY ==========
window.toggleChat = toggleChat;
window.sendMessage = sendMessage;
window.askQuickQuestion = askQuickQuestion;