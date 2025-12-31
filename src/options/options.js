/**
 * Options Page Logic
 * Handles user preferences and settings management
 */

// Default preferences
const DEFAULT_PREFERENCES = {
  theme: 'light',
  autoSave: true,
  autoSaveInterval: 5, // minutes
  conversationLayout: 'vertical',
  fontSize: 'medium',
  enableNotifications: true,
  enableHistoryTracking: true,
  maxHistoryDays: 30,
  enableDataExport: true,
  llmProvider: 'openai',
  apiKeyStorageLocation: 'local', // 'local' or 'cloud'
  enableDarkMode: false,
  language: 'en',
  conversationPreview: true,
  previewLength: 100,
};

/**
 * Load preferences from storage
 * @returns {Promise<Object>} User preferences
 */
async function loadPreferences() {
  try {
    const result = await chrome.storage.sync.get(null);
    return { ...DEFAULT_PREFERENCES, ...result };
  } catch (error) {
    console.error('Error loading preferences:', error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Save preferences to storage
 * @param {Object} preferences - Preferences to save
 * @returns {Promise<void>}
 */
async function savePreferences(preferences) {
  try {
    await chrome.storage.sync.set(preferences);
    console.log('Preferences saved successfully:', preferences);
  } catch (error) {
    console.error('Error saving preferences:', error);
    throw error;
  }
}

/**
 * Reset preferences to defaults
 * @returns {Promise<void>}
 */
async function resetPreferences() {
  try {
    await chrome.storage.sync.clear();
    await savePreferences(DEFAULT_PREFERENCES);
    console.log('Preferences reset to defaults');
  } catch (error) {
    console.error('Error resetting preferences:', error);
    throw error;
  }
}

/**
 * Initialize the options page
 */
async function initializeOptionsPage() {
  try {
    const preferences = await loadPreferences();
    populateOptionsForm(preferences);
    attachEventListeners();
  } catch (error) {
    console.error('Error initializing options page:', error);
    showError('Failed to load preferences. Please refresh the page.');
  }
}

/**
 * Populate the options form with current preferences
 * @param {Object} preferences - User preferences
 */
function populateOptionsForm(preferences) {
  // Theme selector
  const themeSelect = document.getElementById('theme');
  if (themeSelect) {
    themeSelect.value = preferences.theme;
  }

  // Auto-save toggle
  const autoSaveCheckbox = document.getElementById('autoSave');
  if (autoSaveCheckbox) {
    autoSaveCheckbox.checked = preferences.autoSave;
  }

  // Auto-save interval
  const autoSaveInterval = document.getElementById('autoSaveInterval');
  if (autoSaveInterval) {
    autoSaveInterval.value = preferences.autoSaveInterval;
    autoSaveInterval.disabled = !preferences.autoSave;
  }

  // Conversation layout
  const layoutSelect = document.getElementById('conversationLayout');
  if (layoutSelect) {
    layoutSelect.value = preferences.conversationLayout;
  }

  // Font size
  const fontSizeSelect = document.getElementById('fontSize');
  if (fontSizeSelect) {
    fontSizeSelect.value = preferences.fontSize;
  }

  // Notifications toggle
  const notificationsCheckbox = document.getElementById('enableNotifications');
  if (notificationsCheckbox) {
    notificationsCheckbox.checked = preferences.enableNotifications;
  }

  // History tracking toggle
  const historyCheckbox = document.getElementById('enableHistoryTracking');
  if (historyCheckbox) {
    historyCheckbox.checked = preferences.enableHistoryTracking;
  }

  // Max history days
  const maxHistoryDays = document.getElementById('maxHistoryDays');
  if (maxHistoryDays) {
    maxHistoryDays.value = preferences.maxHistoryDays;
    maxHistoryDays.disabled = !preferences.enableHistoryTracking;
  }

  // Data export toggle
  const exportCheckbox = document.getElementById('enableDataExport');
  if (exportCheckbox) {
    exportCheckbox.checked = preferences.enableDataExport;
  }

  // LLM Provider
  const providerSelect = document.getElementById('llmProvider');
  if (providerSelect) {
    providerSelect.value = preferences.llmProvider;
  }

  // API key storage location
  const apiKeyLocation = document.getElementById('apiKeyStorageLocation');
  if (apiKeyLocation) {
    apiKeyLocation.value = preferences.apiKeyStorageLocation;
  }

  // Dark mode toggle
  const darkModeCheckbox = document.getElementById('enableDarkMode');
  if (darkModeCheckbox) {
    darkModeCheckbox.checked = preferences.enableDarkMode;
  }

  // Language selector
  const languageSelect = document.getElementById('language');
  if (languageSelect) {
    languageSelect.value = preferences.language;
  }

  // Conversation preview toggle
  const previewCheckbox = document.getElementById('conversationPreview');
  if (previewCheckbox) {
    previewCheckbox.checked = preferences.conversationPreview;
  }

  // Preview length
  const previewLength = document.getElementById('previewLength');
  if (previewLength) {
    previewLength.value = preferences.previewLength;
    previewLength.disabled = !preferences.conversationPreview;
  }

  // Apply theme
  applyTheme(preferences.theme);
  applyDarkMode(preferences.enableDarkMode);
}

/**
 * Attach event listeners to form elements
 */
function attachEventListeners() {
  // Theme change
  const themeSelect = document.getElementById('theme');
  if (themeSelect) {
    themeSelect.addEventListener('change', handleThemeChange);
  }

  // Auto-save toggle
  const autoSaveCheckbox = document.getElementById('autoSave');
  if (autoSaveCheckbox) {
    autoSaveCheckbox.addEventListener('change', handleAutoSaveToggle);
  }

  // Auto-save interval
  const autoSaveInterval = document.getElementById('autoSaveInterval');
  if (autoSaveInterval) {
    autoSaveInterval.addEventListener('change', handleAutoSaveIntervalChange);
  }

  // Conversation layout
  const layoutSelect = document.getElementById('conversationLayout');
  if (layoutSelect) {
    layoutSelect.addEventListener('change', handleLayoutChange);
  }

  // Font size
  const fontSizeSelect = document.getElementById('fontSize');
  if (fontSizeSelect) {
    fontSizeSelect.addEventListener('change', handleFontSizeChange);
  }

  // Notifications toggle
  const notificationsCheckbox = document.getElementById('enableNotifications');
  if (notificationsCheckbox) {
    notificationsCheckbox.addEventListener('change', handleNotificationsToggle);
  }

  // History tracking toggle
  const historyCheckbox = document.getElementById('enableHistoryTracking');
  if (historyCheckbox) {
    historyCheckbox.addEventListener('change', handleHistoryTrackingToggle);
  }

  // Max history days
  const maxHistoryDays = document.getElementById('maxHistoryDays');
  if (maxHistoryDays) {
    maxHistoryDays.addEventListener('change', handleMaxHistoryDaysChange);
  }

  // Data export toggle
  const exportCheckbox = document.getElementById('enableDataExport');
  if (exportCheckbox) {
    exportCheckbox.addEventListener('change', handleDataExportToggle);
  }

  // LLM Provider
  const providerSelect = document.getElementById('llmProvider');
  if (providerSelect) {
    providerSelect.addEventListener('change', handleProviderChange);
  }

  // API key storage location
  const apiKeyLocation = document.getElementById('apiKeyStorageLocation');
  if (apiKeyLocation) {
    apiKeyLocation.addEventListener('change', handleApiKeyLocationChange);
  }

  // Dark mode toggle
  const darkModeCheckbox = document.getElementById('enableDarkMode');
  if (darkModeCheckbox) {
    darkModeCheckbox.addEventListener('change', handleDarkModeToggle);
  }

  // Language selector
  const languageSelect = document.getElementById('language');
  if (languageSelect) {
    languageSelect.addEventListener('change', handleLanguageChange);
  }

  // Conversation preview toggle
  const previewCheckbox = document.getElementById('conversationPreview');
  if (previewCheckbox) {
    previewCheckbox.addEventListener('change', handleConversationPreviewToggle);
  }

  // Preview length
  const previewLength = document.getElementById('previewLength');
  if (previewLength) {
    previewLength.addEventListener('change', handlePreviewLengthChange);
  }

  // Save button
  const saveButton = document.getElementById('saveButton');
  if (saveButton) {
    saveButton.addEventListener('click', handleSaveAll);
  }

  // Reset button
  const resetButton = document.getElementById('resetButton');
  if (resetButton) {
    resetButton.addEventListener('click', handleResetPreferences);
  }

  // Export data button
  const exportButton = document.getElementById('exportButton');
  if (exportButton) {
    exportButton.addEventListener('click', handleExportData);
  }

  // Import data button
  const importButton = document.getElementById('importButton');
  if (importButton) {
    importButton.addEventListener('click', handleImportData);
  }
}

/**
 * Handle theme change
 */
async function handleThemeChange(event) {
  const theme = event.target.value;
  applyTheme(theme);
  await savePreferences({ theme });
  showSuccess('Theme updated');
}

/**
 * Handle auto-save toggle
 */
async function handleAutoSaveToggle(event) {
  const autoSave = event.target.checked;
  const autoSaveInterval = document.getElementById('autoSaveInterval');
  if (autoSaveInterval) {
    autoSaveInterval.disabled = !autoSave;
  }
  await savePreferences({ autoSave });
  showSuccess('Auto-save preference updated');
}

/**
 * Handle auto-save interval change
 */
async function handleAutoSaveIntervalChange(event) {
  const autoSaveInterval = parseInt(event.target.value, 10);
  await savePreferences({ autoSaveInterval });
  showSuccess('Auto-save interval updated');
}

/**
 * Handle layout change
 */
async function handleLayoutChange(event) {
  const conversationLayout = event.target.value;
  await savePreferences({ conversationLayout });
  showSuccess('Layout preference updated');
}

/**
 * Handle font size change
 */
async function handleFontSizeChange(event) {
  const fontSize = event.target.value;
  applyFontSize(fontSize);
  await savePreferences({ fontSize });
  showSuccess('Font size updated');
}

/**
 * Handle notifications toggle
 */
async function handleNotificationsToggle(event) {
  const enableNotifications = event.target.checked;
  await savePreferences({ enableNotifications });
  showSuccess('Notification preference updated');
}

/**
 * Handle history tracking toggle
 */
async function handleHistoryTrackingToggle(event) {
  const enableHistoryTracking = event.target.checked;
  const maxHistoryDays = document.getElementById('maxHistoryDays');
  if (maxHistoryDays) {
    maxHistoryDays.disabled = !enableHistoryTracking;
  }
  await savePreferences({ enableHistoryTracking });
  showSuccess('History tracking preference updated');
}

/**
 * Handle max history days change
 */
async function handleMaxHistoryDaysChange(event) {
  const maxHistoryDays = parseInt(event.target.value, 10);
  await savePreferences({ maxHistoryDays });
  showSuccess('Max history days updated');
}

/**
 * Handle data export toggle
 */
async function handleDataExportToggle(event) {
  const enableDataExport = event.target.checked;
  await savePreferences({ enableDataExport });
  showSuccess('Data export preference updated');
}

/**
 * Handle LLM provider change
 */
async function handleProviderChange(event) {
  const llmProvider = event.target.value;
  await savePreferences({ llmProvider });
  showSuccess('LLM provider updated');
}

/**
 * Handle API key storage location change
 */
async function handleApiKeyLocationChange(event) {
  const apiKeyStorageLocation = event.target.value;
  await savePreferences({ apiKeyStorageLocation });
  showSuccess('API key storage location updated');
}

/**
 * Handle dark mode toggle
 */
async function handleDarkModeToggle(event) {
  const enableDarkMode = event.target.checked;
  applyDarkMode(enableDarkMode);
  await savePreferences({ enableDarkMode });
  showSuccess('Dark mode preference updated');
}

/**
 * Handle language change
 */
async function handleLanguageChange(event) {
  const language = event.target.value;
  await savePreferences({ language });
  showSuccess('Language preference updated');
}

/**
 * Handle conversation preview toggle
 */
async function handleConversationPreviewToggle(event) {
  const conversationPreview = event.target.checked;
  const previewLength = document.getElementById('previewLength');
  if (previewLength) {
    previewLength.disabled = !conversationPreview;
  }
  await savePreferences({ conversationPreview });
  showSuccess('Conversation preview preference updated');
}

/**
 * Handle preview length change
 */
async function handlePreviewLengthChange(event) {
  const previewLength = parseInt(event.target.value, 10);
  await savePreferences({ previewLength });
  showSuccess('Preview length updated');
}

/**
 * Save all preferences
 */
async function handleSaveAll() {
  try {
    const preferences = {
      theme: document.getElementById('theme')?.value || DEFAULT_PREFERENCES.theme,
      autoSave: document.getElementById('autoSave')?.checked ?? DEFAULT_PREFERENCES.autoSave,
      autoSaveInterval: parseInt(document.getElementById('autoSaveInterval')?.value || DEFAULT_PREFERENCES.autoSaveInterval, 10),
      conversationLayout: document.getElementById('conversationLayout')?.value || DEFAULT_PREFERENCES.conversationLayout,
      fontSize: document.getElementById('fontSize')?.value || DEFAULT_PREFERENCES.fontSize,
      enableNotifications: document.getElementById('enableNotifications')?.checked ?? DEFAULT_PREFERENCES.enableNotifications,
      enableHistoryTracking: document.getElementById('enableHistoryTracking')?.checked ?? DEFAULT_PREFERENCES.enableHistoryTracking,
      maxHistoryDays: parseInt(document.getElementById('maxHistoryDays')?.value || DEFAULT_PREFERENCES.maxHistoryDays, 10),
      enableDataExport: document.getElementById('enableDataExport')?.checked ?? DEFAULT_PREFERENCES.enableDataExport,
      llmProvider: document.getElementById('llmProvider')?.value || DEFAULT_PREFERENCES.llmProvider,
      apiKeyStorageLocation: document.getElementById('apiKeyStorageLocation')?.value || DEFAULT_PREFERENCES.apiKeyStorageLocation,
      enableDarkMode: document.getElementById('enableDarkMode')?.checked ?? DEFAULT_PREFERENCES.enableDarkMode,
      language: document.getElementById('language')?.value || DEFAULT_PREFERENCES.language,
      conversationPreview: document.getElementById('conversationPreview')?.checked ?? DEFAULT_PREFERENCES.conversationPreview,
      previewLength: parseInt(document.getElementById('previewLength')?.value || DEFAULT_PREFERENCES.previewLength, 10),
    };

    await savePreferences(preferences);
    showSuccess('All preferences saved successfully!');
  } catch (error) {
    console.error('Error saving all preferences:', error);
    showError('Failed to save preferences');
  }
}

/**
 * Reset preferences to defaults
 */
async function handleResetPreferences() {
  const confirmed = confirm('Are you sure you want to reset all preferences to defaults? This cannot be undone.');
  if (confirmed) {
    try {
      await resetPreferences();
      const preferences = await loadPreferences();
      populateOptionsForm(preferences);
      showSuccess('Preferences reset to defaults');
    } catch (error) {
      console.error('Error resetting preferences:', error);
      showError('Failed to reset preferences');
    }
  }
}

/**
 * Export user data
 */
async function handleExportData() {
  try {
    const preferences = await loadPreferences();
    const dataStr = JSON.stringify(preferences, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `llm-conversation-manager-preferences-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    showSuccess('Preferences exported successfully');
  } catch (error) {
    console.error('Error exporting data:', error);
    showError('Failed to export preferences');
  }
}

/**
 * Import user data
 */
function handleImportData() {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json';

  fileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const fileContent = await file.text();
      const importedPreferences = JSON.parse(fileContent);

      // Validate imported preferences
      const validatedPreferences = { ...DEFAULT_PREFERENCES, ...importedPreferences };
      await savePreferences(validatedPreferences);
      populateOptionsForm(validatedPreferences);

      showSuccess('Preferences imported successfully');
    } catch (error) {
      console.error('Error importing data:', error);
      showError('Failed to import preferences. Please ensure the file is valid JSON.');
    }
  });

  fileInput.click();
}

/**
 * Apply theme
 * @param {string} theme - Theme name
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

/**
 * Apply dark mode
 * @param {boolean} enable - Whether to enable dark mode
 */
function applyDarkMode(enable) {
  if (enable) {
    document.documentElement.classList.add('dark-mode');
  } else {
    document.documentElement.classList.remove('dark-mode');
  }
  localStorage.setItem('darkMode', enable);
}

/**
 * Apply font size
 * @param {string} size - Font size (small, medium, large)
 */
function applyFontSize(size) {
  document.documentElement.setAttribute('data-font-size', size);
  localStorage.setItem('fontSize', size);
}

/**
 * Show success message
 * @param {string} message - Success message
 */
function showSuccess(message) {
  const messageElement = document.getElementById('message');
  if (messageElement) {
    messageElement.textContent = message;
    messageElement.className = 'message success';
    messageElement.style.display = 'block';

    setTimeout(() => {
      messageElement.style.display = 'none';
    }, 3000);
  }
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showError(message) {
  const messageElement = document.getElementById('message');
  if (messageElement) {
    messageElement.textContent = message;
    messageElement.className = 'message error';
    messageElement.style.display = 'block';

    setTimeout(() => {
      messageElement.style.display = 'none';
    }, 5000);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeOptionsPage);
} else {
  initializeOptionsPage();
}
