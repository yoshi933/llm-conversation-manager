/**
 * Content Script for LLM Conversation Manager
 * 
 * This script runs in the context of LLM service pages (ChatGPT, Claude, etc.)
 * and handles:
 * - Parsing conversations from the DOM
 * - Injecting the manager UI
 * - Managing conversation data
 * - Handling user interactions
 */

// Configuration for supported LLM services
const LLM_SERVICES = {
  chatgpt: {
    name: 'ChatGPT',
    domains: ['chat.openai.com'],
    conversationSelector: '[data-testid="conversation"]',
    messageSelector: '[data-testid="message"]',
    userMessageSelector: '[data-testid="user-message"]'
  },
  claude: {
    name: 'Claude',
    domains: ['claude.ai'],
    conversationSelector: '.conversation',
    messageSelector: '.message',
    userMessageSelector: '.user-message'
  },
  gemini: {
    name: 'Google Gemini',
    domains: ['gemini.google.com'],
    conversationSelector: '[role="main"]',
    messageSelector: '[data-message-id]',
    userMessageSelector: '[data-message-author="user"]'
  }
};

/**
 * Detect which LLM service is currently active
 * @returns {Object|null} Service configuration or null if not supported
 */
function detectLLMService() {
  const hostname = window.location.hostname;
  
  for (const [key, config] of Object.entries(LLM_SERVICES)) {
    if (config.domains.some(domain => hostname.includes(domain))) {
      return { ...config, key };
    }
  }
  
  return null;
}

/**
 * Parse messages from the conversation
 * @param {Object} service - Service configuration
 * @returns {Array} Array of parsed messages
 */
function parseConversation(service) {
  const messages = [];
  const messageElements = document.querySelectorAll(service.messageSelector);
  
  messageElements.forEach((element, index) => {
    const message = {
      id: `msg-${index}`,
      timestamp: new Date().toISOString(),
      content: element.innerText || element.textContent || '',
      role: element.classList.contains('user-message') ? 'user' : 'assistant',
      service: service.key
    };
    
    // Clean up the content
    message.content = message.content.trim();
    
    if (message.content) {
      messages.push(message);
    }
  });
  
  return messages;
}

/**
 * Create and inject the manager UI into the page
 */
function injectManagerUI() {
  // Check if UI already exists
  if (document.getElementById('llm-conversation-manager-ui')) {
    return;
  }
  
  // Create container
  const container = document.createElement('div');
  container.id = 'llm-conversation-manager-ui';
  container.className = 'llm-manager-container';
  
  // Create UI HTML
  container.innerHTML = `
    <div class="llm-manager-panel">
      <div class="llm-manager-header">
        <h3>Conversation Manager</h3>
        <button class="llm-manager-close" aria-label="Close">×</button>
      </div>
      <div class="llm-manager-content">
        <div class="llm-manager-stats">
          <div class="stat">
            <span class="stat-label">Messages:</span>
            <span class="stat-value" id="message-count">0</span>
          </div>
          <div class="stat">
            <span class="stat-label">Service:</span>
            <span class="stat-value" id="service-name">Unknown</span>
          </div>
        </div>
        <div class="llm-manager-actions">
          <button class="llm-btn llm-btn-primary" id="save-conversation-btn">
            Save Conversation
          </button>
          <button class="llm-btn llm-btn-secondary" id="export-conversation-btn">
            Export
          </button>
          <button class="llm-btn llm-btn-secondary" id="copy-conversation-btn">
            Copy Text
          </button>
        </div>
        <div class="llm-manager-info">
          <p id="status-message">Ready to save conversations</p>
        </div>
      </div>
    </div>
  `;
  
  // Add styles
  injectStyles();
  
  // Append to body
  document.body.appendChild(container);
  
  // Attach event listeners
  attachEventListeners();
}

/**
 * Inject CSS styles for the manager UI
 */
function injectStyles() {
  if (document.getElementById('llm-manager-styles')) {
    return;
  }
  
  const style = document.createElement('style');
  style.id = 'llm-manager-styles';
  style.textContent = `
    .llm-manager-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .llm-manager-panel {
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      width: 300px;
      max-height: 500px;
      display: flex;
      flex-direction: column;
    }
    
    .llm-manager-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .llm-manager-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
    
    .llm-manager-close {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background-color 0.2s;
    }
    
    .llm-manager-close:hover {
      background-color: rgba(255, 255, 255, 0.2);
    }
    
    .llm-manager-content {
      padding: 16px;
      overflow-y: auto;
      flex: 1;
    }
    
    .llm-manager-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .stat {
      background: #f5f5f5;
      padding: 12px;
      border-radius: 6px;
      font-size: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .stat-label {
      color: #666;
      font-weight: 500;
    }
    
    .stat-value {
      color: #333;
      font-weight: 600;
      font-size: 14px;
    }
    
    .llm-manager-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
    }
    
    .llm-btn {
      padding: 10px 12px;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .llm-btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .llm-btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
    }
    
    .llm-btn-secondary {
      background: #f0f0f0;
      color: #333;
      border: 1px solid #e0e0e0;
    }
    
    .llm-btn-secondary:hover {
      background: #e8e8e8;
    }
    
    .llm-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .llm-manager-info {
      font-size: 12px;
      color: #666;
      background: #f9f9f9;
      padding: 10px;
      border-radius: 4px;
      border-left: 3px solid #667eea;
    }
    
    #status-message {
      margin: 0;
    }
    
    @media (max-width: 600px) {
      .llm-manager-container {
        bottom: 10px;
        right: 10px;
      }
      
      .llm-manager-panel {
        width: 280px;
      }
    }
  `;
  
  document.head.appendChild(style);
}

/**
 * Attach event listeners to UI buttons
 */
function attachEventListeners() {
  const closeBtn = document.querySelector('.llm-manager-close');
  const saveBtn = document.getElementById('save-conversation-btn');
  const exportBtn = document.getElementById('export-conversation-btn');
  const copyBtn = document.getElementById('copy-conversation-btn');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      const container = document.getElementById('llm-conversation-manager-ui');
      if (container) {
        container.style.display = 'none';
      }
    });
  }
  
  if (saveBtn) {
    saveBtn.addEventListener('click', handleSaveConversation);
  }
  
  if (exportBtn) {
    exportBtn.addEventListener('click', handleExportConversation);
  }
  
  if (copyBtn) {
    copyBtn.addEventListener('click', handleCopyConversation);
  }
}

/**
 * Handle saving conversation to storage
 */
function handleSaveConversation() {
  const service = detectLLMService();
  if (!service) {
    updateStatus('Service not supported', 'error');
    return;
  }
  
  const messages = parseConversation(service);
  if (messages.length === 0) {
    updateStatus('No messages found to save', 'warning');
    return;
  }
  
  const conversation = {
    id: `conv-${Date.now()}`,
    title: `${service.name} Conversation`,
    service: service.key,
    timestamp: new Date().toISOString(),
    messages,
    url: window.location.href
  };
  
  // Send to background script for storage
  chrome.runtime.sendMessage(
    { type: 'SAVE_CONVERSATION', data: conversation },
    (response) => {
      if (response?.success) {
        updateStatus(`Saved ${messages.length} messages`, 'success');
      } else {
        updateStatus('Failed to save conversation', 'error');
      }
    }
  );
}

/**
 * Handle exporting conversation
 */
function handleExportConversation() {
  const service = detectLLMService();
  if (!service) {
    updateStatus('Service not supported', 'error');
    return;
  }
  
  const messages = parseConversation(service);
  if (messages.length === 0) {
    updateStatus('No messages to export', 'warning');
    return;
  }
  
  // Request export format options from background
  chrome.runtime.sendMessage(
    { type: 'EXPORT_CONVERSATION', data: messages },
    (response) => {
      if (response?.success) {
        updateStatus('Conversation exported', 'success');
      }
    }
  );
}

/**
 * Handle copying conversation text
 */
function handleCopyConversation() {
  const service = detectLLMService();
  if (!service) {
    updateStatus('Service not supported', 'error');
    return;
  }
  
  const messages = parseConversation(service);
  if (messages.length === 0) {
    updateStatus('No messages to copy', 'warning');
    return;
  }
  
  const text = messages
    .map(msg => `[${msg.role.toUpperCase()}]\n${msg.content}`)
    .join('\n\n');
  
  navigator.clipboard.writeText(text)
    .then(() => {
      updateStatus('Copied to clipboard', 'success');
    })
    .catch(() => {
      updateStatus('Failed to copy', 'error');
    });
}

/**
 * Update status message in UI
 * @param {string} message - Status message
 * @param {string} type - Message type: 'success', 'error', 'warning', 'info'
 */
function updateStatus(message, type = 'info') {
  const statusEl = document.getElementById('status-message');
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `status-${type}`;
    statusEl.parentElement.style.borderLeftColor = {
      success: '#4caf50',
      error: '#f44336',
      warning: '#ff9800',
      info: '#667eea'
    }[type] || '#667eea';
  }
}

/**
 * Update UI with conversation statistics
 */
function updateUIStats() {
  const service = detectLLMService();
  if (!service) return;
  
  const messages = parseConversation(service);
  const messageCountEl = document.getElementById('message-count');
  const serviceNameEl = document.getElementById('service-name');
  
  if (messageCountEl) {
    messageCountEl.textContent = messages.length;
  }
  
  if (serviceNameEl) {
    serviceNameEl.textContent = service.name;
  }
}

/**
 * Set up mutation observer to update stats when DOM changes
 */
function observeConversationChanges() {
  const observer = new MutationObserver(() => {
    updateUIStats();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: false
  });
}

/**
 * Initialize the content script
 */
function init() {
  // Check if service is supported
  const service = detectLLMService();
  if (!service) {
    console.log('LLM Conversation Manager: Service not detected');
    return;
  }
  
  console.log(`LLM Conversation Manager: Detected ${service.name}`);
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      injectManagerUI();
      updateUIStats();
      observeConversationChanges();
    });
  } else {
    injectManagerUI();
    updateUIStats();
    observeConversationChanges();
  }
}

// Start the script
init();
