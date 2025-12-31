/**
 * Background Service Worker
 * Handles background tasks, API calls, and message passing for the LLM Conversation Manager extension
 */

// Service Worker lifecycle events
console.log('Background Service Worker loaded');

/**
 * Listen for messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in background:', request);

  // Handle different message types
  switch (request.type) {
    case 'API_CALL':
      handleApiCall(request, sendResponse);
      break;

    case 'FETCH_CONVERSATIONS':
      fetchConversations(sendResponse);
      break;

    case 'SAVE_CONVERSATION':
      saveConversation(request.data, sendResponse);
      break;

    case 'DELETE_CONVERSATION':
      deleteConversation(request.conversationId, sendResponse);
      break;

    case 'UPDATE_CONVERSATION':
      updateConversation(request.conversationId, request.data, sendResponse);
      break;

    case 'EXPORT_CONVERSATION':
      exportConversation(request.conversationId, sendResponse);
      break;

    case 'IMPORT_CONVERSATION':
      importConversation(request.data, sendResponse);
      break;

    default:
      sendResponse({ error: 'Unknown message type' });
  }

  // Return true to keep the channel open for async responses
  return true;
});

/**
 * Handle API calls with proper error handling
 * @param {Object} request - Request object containing API details
 * @param {Function} sendResponse - Callback to send response
 */
async function handleApiCall(request, sendResponse) {
  try {
    const { url, method = 'GET', headers = {}, body = null } = request;

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      sendResponse({
        success: false,
        error: data.message || 'API call failed',
        status: response.status,
      });
      return;
    }

    sendResponse({
      success: true,
      data,
      status: response.status,
    });
  } catch (error) {
    console.error('API call error:', error);
    sendResponse({
      success: false,
      error: error.message || 'Failed to complete API call',
    });
  }
}

/**
 * Fetch all conversations from storage
 * @param {Function} sendResponse - Callback to send response
 */
async function fetchConversations(sendResponse) {
  try {
    const result = await chrome.storage.local.get(['conversations']);
    const conversations = result.conversations || [];

    sendResponse({
      success: true,
      conversations,
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    sendResponse({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Save a new conversation to storage
 * @param {Object} data - Conversation data
 * @param {Function} sendResponse - Callback to send response
 */
async function saveConversation(data, sendResponse) {
  try {
    const result = await chrome.storage.local.get(['conversations']);
    const conversations = result.conversations || [];

    const newConversation = {
      id: generateUUID(),
      title: data.title || 'Untitled Conversation',
      messages: data.messages || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: data.metadata || {},
    };

    conversations.push(newConversation);
    await chrome.storage.local.set({ conversations });

    sendResponse({
      success: true,
      conversation: newConversation,
    });
  } catch (error) {
    console.error('Error saving conversation:', error);
    sendResponse({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Delete a conversation from storage
 * @param {string} conversationId - ID of conversation to delete
 * @param {Function} sendResponse - Callback to send response
 */
async function deleteConversation(conversationId, sendResponse) {
  try {
    const result = await chrome.storage.local.get(['conversations']);
    const conversations = result.conversations || [];

    const filteredConversations = conversations.filter(
      (conv) => conv.id !== conversationId
    );

    await chrome.storage.local.set({ conversations: filteredConversations });

    sendResponse({
      success: true,
      message: 'Conversation deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    sendResponse({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Update an existing conversation
 * @param {string} conversationId - ID of conversation to update
 * @param {Object} data - Updated conversation data
 * @param {Function} sendResponse - Callback to send response
 */
async function updateConversation(conversationId, data, sendResponse) {
  try {
    const result = await chrome.storage.local.get(['conversations']);
    const conversations = result.conversations || [];

    const conversationIndex = conversations.findIndex(
      (conv) => conv.id === conversationId
    );

    if (conversationIndex === -1) {
      sendResponse({
        success: false,
        error: 'Conversation not found',
      });
      return;
    }

    conversations[conversationIndex] = {
      ...conversations[conversationIndex],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    await chrome.storage.local.set({ conversations });

    sendResponse({
      success: true,
      conversation: conversations[conversationIndex],
    });
  } catch (error) {
    console.error('Error updating conversation:', error);
    sendResponse({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Export a conversation as JSON
 * @param {string} conversationId - ID of conversation to export
 * @param {Function} sendResponse - Callback to send response
 */
async function exportConversation(conversationId, sendResponse) {
  try {
    const result = await chrome.storage.local.get(['conversations']);
    const conversations = result.conversations || [];

    const conversation = conversations.find((conv) => conv.id === conversationId);

    if (!conversation) {
      sendResponse({
        success: false,
        error: 'Conversation not found',
      });
      return;
    }

    sendResponse({
      success: true,
      data: JSON.stringify(conversation, null, 2),
    });
  } catch (error) {
    console.error('Error exporting conversation:', error);
    sendResponse({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Import a conversation from JSON data
 * @param {Object} data - Conversation data to import
 * @param {Function} sendResponse - Callback to send response
 */
async function importConversation(data, sendResponse) {
  try {
    const result = await chrome.storage.local.get(['conversations']);
    const conversations = result.conversations || [];

    const importedConversation = {
      ...data,
      id: generateUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    conversations.push(importedConversation);
    await chrome.storage.local.set({ conversations });

    sendResponse({
      success: true,
      conversation: importedConversation,
    });
  } catch (error) {
    console.error('Error importing conversation:', error);
    sendResponse({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Generate a UUID
 * @returns {string} Generated UUID
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Handle periodic background tasks
 */
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('Alarm triggered:', alarm.name);

  switch (alarm.name) {
    case 'auto_sync':
      performAutoSync();
      break;

    case 'cleanup':
      performCleanup();
      break;

    default:
      console.log('Unknown alarm:', alarm.name);
  }
});

/**
 * Perform automatic sync of conversations
 */
async function performAutoSync() {
  try {
    console.log('Performing auto sync at', new Date().toISOString());
    // Implement your sync logic here
    // This could involve syncing with a remote server, etc.
  } catch (error) {
    console.error('Auto sync error:', error);
  }
}

/**
 * Perform cleanup tasks
 */
async function performCleanup() {
  try {
    console.log('Performing cleanup at', new Date().toISOString());
    // Implement cleanup logic here
    // This could involve removing old conversations, clearing cache, etc.
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

/**
 * Install event - runs once when extension is installed or updated
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated:', details.reason);

  if (details.reason === 'install') {
    // Initialize default settings
    chrome.storage.local.set({
      conversations: [],
      settings: {
        autoSync: true,
        syncInterval: 300000, // 5 minutes
        maxStorageSize: 50 * 1024 * 1024, // 50MB
      },
    });
  }
});

// Set up periodic alarms
chrome.alarms.create('auto_sync', { periodInMinutes: 5 });
chrome.alarms.create('cleanup', { periodInMinutes: 60 });

console.log('Background Service Worker initialized');
