/**
 * AI-powered utilities for title generation and content summarization
 * Uses external APIs for intelligent text processing
 */

const axios = require('axios');

// Configuration for external AI APIs
const AI_CONFIG = {
  openai: {
    baseURL: process.env.OPENAI_API_URL || 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
  },
  anthropic: {
    baseURL: process.env.ANTHROPIC_API_URL || 'https://api.anthropic.com',
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL || 'claude-2',
  },
};

/**
 * Generate an intelligent title from conversation content
 * @param {string} content - The conversation content to generate title from
 * @param {string} provider - AI provider to use ('openai' or 'anthropic')
 * @param {object} options - Additional options for title generation
 * @returns {Promise<string>} - Generated title
 */
async function generateTitle(content, provider = 'openai', options = {}) {
  if (!content || typeof content !== 'string') {
    throw new Error('Content must be a non-empty string');
  }

  const maxLength = options.maxLength || 100;
  const tone = options.tone || 'professional';

  try {
    if (provider === 'openai') {
      return await generateTitleOpenAI(content, maxLength, tone);
    } else if (provider === 'anthropic') {
      return await generateTitleAnthropic(content, maxLength, tone);
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (error) {
    console.error('Error generating title:', error.message);
    throw new Error(`Failed to generate title: ${error.message}`);
  }
}

/**
 * Generate title using OpenAI API
 * @private
 */
async function generateTitleOpenAI(content, maxLength, tone) {
  if (!AI_CONFIG.openai.apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `Generate a concise and ${tone} title for the following conversation content. 
The title should be no longer than ${maxLength} characters and capture the main topic.
Content: "${content.substring(0, 500)}"
Title:`;

  const response = await axios.post(
    `${AI_CONFIG.openai.baseURL}/chat/completions`,
    {
      model: AI_CONFIG.openai.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 50,
      temperature: 0.7,
    },
    {
      headers: {
        'Authorization': `Bearer ${AI_CONFIG.openai.apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const title = response.data.choices[0].message.content.trim();
  return title.length > maxLength ? title.substring(0, maxLength) : title;
}

/**
 * Generate title using Anthropic API
 * @private
 */
async function generateTitleAnthropic(content, maxLength, tone) {
  if (!AI_CONFIG.anthropic.apiKey) {
    throw new Error('Anthropic API key not configured');
  }

  const prompt = `Generate a concise and ${tone} title for the following conversation content. 
The title should be no longer than ${maxLength} characters and capture the main topic.
Content: "${content.substring(0, 500)}"
Title:`;

  const response = await axios.post(
    `${AI_CONFIG.anthropic.baseURL}/v1/messages`,
    {
      model: AI_CONFIG.anthropic.model,
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    },
    {
      headers: {
        'x-api-key': AI_CONFIG.anthropic.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
    }
  );

  const title = response.data.content[0].text.trim();
  return title.length > maxLength ? title.substring(0, maxLength) : title;
}

/**
 * Summarize conversation content intelligently
 * @param {string} content - The conversation content to summarize
 * @param {string} provider - AI provider to use ('openai' or 'anthropic')
 * @param {object} options - Additional options for summarization
 * @returns {Promise<object>} - Summary object with summary and key points
 */
async function summarizeContent(content, provider = 'openai', options = {}) {
  if (!content || typeof content !== 'string') {
    throw new Error('Content must be a non-empty string');
  }

  const summaryLength = options.summaryLength || 'medium'; // short, medium, long
  const includeKeyPoints = options.includeKeyPoints !== false;

  try {
    if (provider === 'openai') {
      return await summarizeContentOpenAI(content, summaryLength, includeKeyPoints);
    } else if (provider === 'anthropic') {
      return await summarizeContentAnthropic(content, summaryLength, includeKeyPoints);
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (error) {
    console.error('Error summarizing content:', error.message);
    throw new Error(`Failed to summarize content: ${error.message}`);
  }
}

/**
 * Summarize content using OpenAI API
 * @private
 */
async function summarizeContentOpenAI(content, summaryLength, includeKeyPoints) {
  if (!AI_CONFIG.openai.apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const lengthGuide = {
    short: '2-3 sentences',
    medium: '3-5 sentences',
    long: '5-8 sentences',
  };

  let prompt = `Summarize the following conversation content in ${lengthGuide[summaryLength]}:\n\n"${content}"\n\nSummary:`;

  if (includeKeyPoints) {
    prompt += '\n\nAlso provide 3-5 key points from the conversation.';
  }

  const response = await axios.post(
    `${AI_CONFIG.openai.baseURL}/chat/completions`,
    {
      model: AI_CONFIG.openai.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.5,
    },
    {
      headers: {
        'Authorization': `Bearer ${AI_CONFIG.openai.apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const result = response.data.choices[0].message.content.trim();
  return parseAISummary(result, includeKeyPoints);
}

/**
 * Summarize content using Anthropic API
 * @private
 */
async function summarizeContentAnthropic(content, summaryLength, includeKeyPoints) {
  if (!AI_CONFIG.anthropic.apiKey) {
    throw new Error('Anthropic API key not configured');
  }

  const lengthGuide = {
    short: '2-3 sentences',
    medium: '3-5 sentences',
    long: '5-8 sentences',
  };

  let prompt = `Summarize the following conversation content in ${lengthGuide[summaryLength]}:\n\n"${content}"\n\nSummary:`;

  if (includeKeyPoints) {
    prompt += '\n\nAlso provide 3-5 key points from the conversation.';
  }

  const response = await axios.post(
    `${AI_CONFIG.anthropic.baseURL}/v1/messages`,
    {
      model: AI_CONFIG.anthropic.model,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    },
    {
      headers: {
        'x-api-key': AI_CONFIG.anthropic.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
    }
  );

  const result = response.data.content[0].text.trim();
  return parseAISummary(result, includeKeyPoints);
}

/**
 * Parse AI summary response into structured format
 * @private
 */
function parseAISummary(text, includeKeyPoints) {
  const summary = {
    summary: '',
    keyPoints: [],
    timestamp: new Date().toISOString(),
  };

  if (!includeKeyPoints) {
    summary.summary = text;
    return summary;
  }

  // Split summary and key points if they exist
  const parts = text.split(/Key Points?:/i);
  summary.summary = parts[0].trim();

  if (parts.length > 1) {
    const keyPointsText = parts[1].trim();
    summary.keyPoints = keyPointsText
      .split(/\n[-•*]\s+/)
      .map(point => point.trim())
      .filter(point => point.length > 0);
  }

  return summary;
}

/**
 * Batch process multiple contents for title generation
 * @param {Array<string>} contents - Array of content strings
 * @param {string} provider - AI provider to use
 * @param {object} options - Additional options
 * @returns {Promise<Array<string>>} - Array of generated titles
 */
async function generateTitlesBatch(contents, provider = 'openai', options = {}) {
  if (!Array.isArray(contents)) {
    throw new Error('Contents must be an array');
  }

  try {
    const titles = await Promise.all(
      contents.map(content => generateTitle(content, provider, options))
    );
    return titles;
  } catch (error) {
    console.error('Error in batch title generation:', error.message);
    throw error;
  }
}

/**
 * Validate API configuration
 * @param {string} provider - AI provider to validate
 * @returns {object} - Validation result
 */
function validateAPIConfig(provider = 'openai') {
  const config = AI_CONFIG[provider];
  
  if (!config) {
    return {
      valid: false,
      provider,
      message: `Unknown provider: ${provider}`,
    };
  }

  const isConfigured = !!config.apiKey;
  
  return {
    valid: isConfigured,
    provider,
    configured: isConfigured,
    model: config.model,
    message: isConfigured ? 'API is properly configured' : 'API key not configured',
  };
}

module.exports = {
  generateTitle,
  summarizeContent,
  generateTitlesBatch,
  validateAPIConfig,
  // Export for testing
  parseAISummary,
};
