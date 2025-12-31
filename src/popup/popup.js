/**
 * Popup UI Logic and Interaction Handler
 * Manages all popup window interactions and state management
 */

class PopupUI {
  constructor() {
    this.conversations = [];
    this.currentConversation = null;
    this.isLoading = false;
    this.messageInput = null;
    this.sendButton = null;
    this.conversationList = null;
    this.conversationDetails = null;
    this.messageHistory = null;
    
    this.init();
  }

  /**
   * Initialize popup UI and attach event listeners
   */
  init() {
    this.cacheElements();
    this.attachEventListeners();
    this.loadConversations();
    this.setupMessageInput();
  }

  /**
   * Cache DOM elements for efficient access
   */
  cacheElements() {
    this.messageInput = document.getElementById('message-input');
    this.sendButton = document.getElementById('send-button');
    this.conversationList = document.getElementById('conversation-list');
    this.conversationDetails = document.getElementById('conversation-details');
    this.messageHistory = document.getElementById('message-history');
    this.newConversationBtn = document.getElementById('new-conversation-btn');
    this.deleteConversationBtn = document.getElementById('delete-conversation-btn');
    this.exportButton = document.getElementById('export-button');
    this.settingsButton = document.getElementById('settings-button');
    this.loadingIndicator = document.getElementById('loading-indicator');
    this.errorContainer = document.getElementById('error-container');
    this.searchInput = document.getElementById('search-input');
  }

  /**
   * Attach event listeners to UI elements
   */
  attachEventListeners() {
    // Message sending
    if (this.sendButton) {
      this.sendButton.addEventListener('click', () => this.handleSendMessage());
    }

    if (this.messageInput) {
      this.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSendMessage();
        }
      });
      this.messageInput.addEventListener('input', () => this.updateSendButtonState());
    }

    // Conversation management
    if (this.newConversationBtn) {
      this.newConversationBtn.addEventListener('click', () => this.createNewConversation());
    }

    if (this.deleteConversationBtn) {
      this.deleteConversationBtn.addEventListener('click', () => this.deleteCurrentConversation());
    }

    // Export and settings
    if (this.exportButton) {
      this.exportButton.addEventListener('click', () => this.exportConversation());
    }

    if (this.settingsButton) {
      this.settingsButton.addEventListener('click', () => this.openSettings());
    }

    // Search functionality
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => this.searchConversations(e.target.value));
    }

    // Receive messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleBackgroundMessage(request, sender, sendResponse);
    });
  }

  /**
   * Load all conversations from storage
   */
  loadConversations() {
    this.showLoading(true);
    
    chrome.storage.local.get(['conversations'], (result) => {
      if (result.conversations) {
        this.conversations = result.conversations;
        this.renderConversationList();
        
        // Load first conversation if available
        if (this.conversations.length > 0) {
          this.selectConversation(this.conversations[0].id);
        }
      }
      this.showLoading(false);
    });
  }

  /**
   * Render conversation list in the sidebar
   */
  renderConversationList() {
    if (!this.conversationList) return;

    this.conversationList.innerHTML = '';

    this.conversations.forEach((conversation) => {
      const element = this.createConversationElement(conversation);
      this.conversationList.appendChild(element);
    });
  }

  /**
   * Create a conversation list element
   */
  createConversationElement(conversation) {
    const div = document.createElement('div');
    div.className = 'conversation-item';
    div.dataset.conversationId = conversation.id;
    
    if (this.currentConversation?.id === conversation.id) {
      div.classList.add('active');
    }

    const title = document.createElement('div');
    title.className = 'conversation-title';
    title.textContent = conversation.title || 'Untitled Conversation';

    const timestamp = document.createElement('div');
    timestamp.className = 'conversation-timestamp';
    timestamp.textContent = this.formatDate(conversation.updatedAt);

    div.appendChild(title);
    div.appendChild(timestamp);

    div.addEventListener('click', () => this.selectConversation(conversation.id));

    return div;
  }

  /**
   * Select a conversation and display its details
   */
  selectConversation(conversationId) {
    this.currentConversation = this.conversations.find(c => c.id === conversationId);
    
    if (!this.currentConversation) return;

    // Update active state in list
    document.querySelectorAll('.conversation-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.conversationId === conversationId) {
        item.classList.add('active');
      }
    });

    this.renderMessageHistory();
    this.updateDeleteButtonState();
  }

  /**
   * Render message history for current conversation
   */
  renderMessageHistory() {
    if (!this.messageHistory || !this.currentConversation) return;

    this.messageHistory.innerHTML = '';

    this.currentConversation.messages.forEach((message, index) => {
      const messageElement = this.createMessageElement(message, index);
      this.messageHistory.appendChild(messageElement);
    });

    // Scroll to bottom
    this.messageHistory.scrollTop = this.messageHistory.scrollHeight;
  }

  /**
   * Create a message element
   */
  createMessageElement(message, index) {
    const div = document.createElement('div');
    div.className = `message message-${message.role}`;
    div.dataset.messageIndex = index;

    const roleLabel = document.createElement('div');
    roleLabel.className = 'message-role';
    roleLabel.textContent = message.role.charAt(0).toUpperCase() + message.role.slice(1);

    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = message.content;

    const timestamp = document.createElement('div');
    timestamp.className = 'message-timestamp';
    timestamp.textContent = this.formatDate(message.timestamp);

    div.appendChild(roleLabel);
    div.appendChild(content);
    div.appendChild(timestamp);

    // Add copy button
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-button';
    copyButton.textContent = 'Copy';
    copyButton.addEventListener('click', () => this.copyToClipboard(message.content));
    div.appendChild(copyButton);

    return div;
  }

  /**
   * Handle sending a new message
   */
  handleSendMessage() {
    const messageText = this.messageInput.value.trim();
    
    if (!messageText || !this.currentConversation) {
      return;
    }

    this.showLoading(true);
    this.sendButton.disabled = true;

    // Add user message to history immediately
    const userMessage = {
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    };

    this.currentConversation.messages.push(userMessage);
    this.renderMessageHistory();
    this.messageInput.value = '';
    this.updateSendButtonState();

    // Send message to background script for processing
    chrome.runtime.sendMessage(
      {
        action: 'sendMessage',
        conversationId: this.currentConversation.id,
        message: messageText
      },
      (response) => {
        if (response && response.success) {
          // Add AI response to history
          const aiMessage = {
            role: 'assistant',
            content: response.message,
            timestamp: new Date().toISOString()
          };
          this.currentConversation.messages.push(aiMessage);
          this.renderMessageHistory();
          this.saveConversation();
        } else {
          this.showError(response?.error || 'Failed to send message');
        }
        this.showLoading(false);
        this.sendButton.disabled = false;
      }
    );
  }

  /**
   * Create a new conversation
   */
  createNewConversation() {
    const timestamp = new Date().toISOString();
    const newConversation = {
      id: `conv_${Date.now()}`,
      title: `Conversation ${this.conversations.length + 1}`,
      messages: [],
      createdAt: timestamp,
      updatedAt: timestamp
    };

    this.conversations.unshift(newConversation);
    this.renderConversationList();
    this.selectConversation(newConversation.id);
    this.saveConversations();
  }

  /**
   * Delete current conversation
   */
  deleteCurrentConversation() {
    if (!this.currentConversation) return;

    const confirmed = confirm(
      `Delete "${this.currentConversation.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    this.conversations = this.conversations.filter(
      c => c.id !== this.currentConversation.id
    );

    this.currentConversation = null;
    this.renderConversationList();
    this.messageHistory.innerHTML = '';
    this.messageInput.value = '';
    this.updateDeleteButtonState();
    this.saveConversations();
  }

  /**
   * Save current conversation to storage
   */
  saveConversation() {
    if (!this.currentConversation) return;

    this.currentConversation.updatedAt = new Date().toISOString();
    this.saveConversations();
  }

  /**
   * Save all conversations to storage
   */
  saveConversations() {
    chrome.storage.local.set({ conversations: this.conversations }, () => {
      if (chrome.runtime.lastError) {
        console.error('Failed to save conversations:', chrome.runtime.lastError);
      }
    });
  }

  /**
   * Export current conversation
   */
  exportConversation() {
    if (!this.currentConversation) return;

    const content = this.currentConversation.messages
      .map(msg => `${msg.role.toUpperCase()}:\n${msg.content}\n`)
      .join('\n---\n\n');

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', `${this.currentConversation.title}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    this.showNotification('Conversation exported successfully');
  }

  /**
   * Search conversations by title
   */
  searchConversations(query) {
    const filtered = this.conversations.filter(conv =>
      conv.title.toLowerCase().includes(query.toLowerCase())
    );

    this.conversationList.innerHTML = '';
    filtered.forEach(conversation => {
      const element = this.createConversationElement(conversation);
      this.conversationList.appendChild(element);
    });
  }

  /**
   * Open settings dialog
   */
  openSettings() {
    // Emit event for settings modal to open
    const event = new CustomEvent('openSettings');
    document.dispatchEvent(event);
  }

  /**
   * Handle messages from background script
   */
  handleBackgroundMessage(request, sender, sendResponse) {
    switch (request.action) {
      case 'updateConversation':
        this.loadConversations();
        sendResponse({ success: true });
        break;
      case 'notifyError':
        this.showError(request.message);
        sendResponse({ success: true });
        break;
      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  }

  /**
   * Update send button state based on input
   */
  updateSendButtonState() {
    if (this.sendButton && this.messageInput) {
      this.sendButton.disabled = 
        !this.messageInput.value.trim() || 
        this.isLoading || 
        !this.currentConversation;
    }
  }

  /**
   * Update delete button state
   */
  updateDeleteButtonState() {
    if (this.deleteConversationBtn) {
      this.deleteConversationBtn.disabled = !this.currentConversation;
    }
  }

  /**
   * Setup message input auto-resize
   */
  setupMessageInput() {
    if (!this.messageInput) return;

    this.messageInput.addEventListener('input', () => {
      this.messageInput.style.height = 'auto';
      this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    });
  }

  /**
   * Copy text to clipboard
   */
  copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      this.showNotification('Copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy:', err);
      this.showError('Failed to copy to clipboard');
    });
  }

  /**
   * Show/hide loading indicator
   */
  showLoading(show) {
    this.isLoading = show;
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = show ? 'flex' : 'none';
    }
    this.updateSendButtonState();
  }

  /**
   * Show error message
   */
  showError(message) {
    if (!this.errorContainer) return;

    this.errorContainer.textContent = message;
    this.errorContainer.style.display = 'block';

    setTimeout(() => {
      this.errorContainer.style.display = 'none';
    }, 5000);
  }

  /**
   * Show notification
   */
  showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  /**
   * Format date to readable string
   */
  formatDate(isoDate) {
    const date = new Date(isoDate);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }
}

// Initialize popup UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupUI();
});
