/**
 * Conversation History Parser
 * Provides utilities for parsing conversation history and detecting conversation sections
 */

/**
 * Represents a conversation section with metadata
 * @typedef {Object} ConversationSection
 * @property {number} id - Unique section identifier
 * @property {string} title - Section title or heading
 * @property {Array<Object>} messages - Array of messages in this section
 * @property {Date} startTime - When the section started
 * @property {Date} endTime - When the section ended
 * @property {string} topic - Detected topic or theme
 * @property {Array<string>} participants - Users involved in the section
 */

/**
 * Detects conversation sections based on various heuristics
 * @param {Array<Object>} messages - Array of message objects
 * @param {Object} options - Configuration options
 * @param {number} options.timeGap - Time gap in minutes to mark new section (default: 30)
 * @param {Array<string>} options.sectionMarkers - Keywords that indicate new sections
 * @param {boolean} options.detectTopicChanges - Whether to detect topic changes (default: true)
 * @returns {Array<ConversationSection>} Array of detected sections
 */
function detectSections(messages, options = {}) {
  const {
    timeGap = 30,
    sectionMarkers = ['section:', 'topic:', 'discuss:', 'new topic', '---', '==='],
    detectTopicChanges = true,
  } = options;

  if (!Array.isArray(messages) || messages.length === 0) {
    return [];
  }

  const sections = [];
  let currentSection = null;
  let sectionId = 0;

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const timestamp = new Date(message.timestamp || Date.now());

    // Check if we should start a new section
    const shouldNewSection =
      !currentSection ||
      isTimedOut(currentSection.endTime, timestamp, timeGap) ||
      hasSectionMarker(message.content, sectionMarkers) ||
      (detectTopicChanges && i > 0 && hasTopicChange(messages[i - 1], message));

    if (shouldNewSection) {
      // Save previous section if exists
      if (currentSection) {
        sections.push(currentSection);
      }

      // Create new section
      currentSection = {
        id: sectionId++,
        title: extractTitle(message.content) || `Section ${sectionId}`,
        messages: [message],
        startTime: timestamp,
        endTime: timestamp,
        topic: detectTopic(message.content),
        participants: extractParticipants([message]),
      };
    } else {
      // Add message to current section
      currentSection.messages.push(message);
      currentSection.endTime = timestamp;
      currentSection.participants = extractParticipants(currentSection.messages);
    }
  }

  // Add the last section
  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Checks if there's a time gap between two timestamps
 * @private
 * @param {Date} lastTime - Previous message timestamp
 * @param {Date} currentTime - Current message timestamp
 * @param {number} gapMinutes - Gap threshold in minutes
 * @returns {boolean}
 */
function isTimedOut(lastTime, currentTime, gapMinutes) {
  const diffMinutes = (currentTime - lastTime) / (1000 * 60);
  return diffMinutes > gapMinutes;
}

/**
 * Checks if message content contains section markers
 * @private
 * @param {string} content - Message content
 * @param {Array<string>} markers - Section marker keywords
 * @returns {boolean}
 */
function hasSectionMarker(content, markers) {
  if (!content) return false;
  const lowerContent = content.toLowerCase();
  return markers.some((marker) => lowerContent.includes(marker.toLowerCase()));
}

/**
 * Detects if there's a topic change between two messages
 * @private
 * @param {Object} prevMessage - Previous message
 * @param {Object} currentMessage - Current message
 * @returns {boolean}
 */
function hasTopicChange(prevMessage, currentMessage) {
  const prevTopic = detectTopic(prevMessage.content || '');
  const currentTopic = detectTopic(currentMessage.content || '');
  return prevTopic !== currentTopic && prevTopic && currentTopic;
}

/**
 * Extracts a title from message content
 * @private
 * @param {string} content - Message content
 * @returns {string|null} Extracted title or null
 */
function extractTitle(content) {
  if (!content) return null;

  // Check for markdown headers
  const headerMatch = content.match(/^#+\s+(.+?)$/m);
  if (headerMatch) {
    return headerMatch[1].trim();
  }

  // Check for section markers
  const sectionMatch = content.match(/(?:section|topic|discuss)[\s:]+(.+?)$/im);
  if (sectionMatch) {
    return sectionMatch[1].trim();
  }

  // Return first line if it's short
  const firstLine = content.split('\n')[0].trim();
  if (firstLine.length < 100) {
    return firstLine;
  }

  return null;
}

/**
 * Detects the topic of a message based on keywords
 * @private
 * @param {string} content - Message content
 * @returns {string} Detected topic
 */
function detectTopic(content) {
  if (!content) return 'general';

  const topics = {
    technical: ['code', 'bug', 'error', 'function', 'variable', 'debug', 'implement', 'deploy'],
    question: ['what', 'how', 'why', 'when', 'where', '?'],
    discussion: ['think', 'opinion', 'discuss', 'consider', 'suggest', 'propose'],
    planning: ['plan', 'schedule', 'deadline', 'milestone', 'timeline', 'sprint'],
    feedback: ['feedback', 'review', 'comment', 'suggestion', 'improve', 'better'],
  };

  const lowerContent = content.toLowerCase();
  let maxScore = 0;
  let detectedTopic = 'general';

  for (const [topic, keywords] of Object.entries(topics)) {
    const score = keywords.filter((keyword) => lowerContent.includes(keyword)).length;
    if (score > maxScore) {
      maxScore = score;
      detectedTopic = topic;
    }
  }

  return detectedTopic;
}

/**
 * Extracts unique participant identifiers from messages
 * @private
 * @param {Array<Object>} messages - Array of messages
 * @returns {Array<string>} Unique participant identifiers
 */
function extractParticipants(messages) {
  const participants = new Set();
  messages.forEach((msg) => {
    if (msg.author) {
      participants.add(msg.author);
    }
    if (msg.user) {
      participants.add(msg.user);
    }
  });
  return Array.from(participants);
}

/**
 * Parses raw conversation text into structured message objects
 * @param {string} text - Raw conversation text
 * @param {Object} options - Parsing options
 * @param {string} options.delimiter - Message delimiter pattern (default: '\n\n')
 * @param {RegExp} options.authorPattern - Regex to extract author name
 * @param {boolean} options.preserveFormatting - Keep original formatting (default: true)
 * @returns {Array<Object>} Parsed messages
 */
function parseRawConversation(text, options = {}) {
  const {
    delimiter = '\n\n',
    authorPattern = /^([\w\s]+?):\s*/m,
    preserveFormatting = true,
  } = options;

  if (!text || typeof text !== 'string') {
    return [];
  }

  const messages = [];
  const segments = text.split(delimiter).filter((s) => s.trim());

  segments.forEach((segment, index) => {
    const authorMatch = segment.match(authorPattern);
    const message = {
      id: index,
      timestamp: new Date(),
      content: authorMatch ? segment.replace(authorPattern, '').trim() : segment.trim(),
      author: authorMatch ? authorMatch[1].trim() : 'Unknown',
      originalContent: preserveFormatting ? segment : null,
    };

    if (message.content) {
      messages.push(message);
    }
  });

  return messages;
}

/**
 * Merges adjacent sections with similar topics
 * @param {Array<ConversationSection>} sections - Array of sections
 * @param {number} threshold - Similarity threshold (0-1)
 * @returns {Array<ConversationSection>} Merged sections
 */
function mergeSimilarSections(sections, threshold = 0.7) {
  if (!Array.isArray(sections) || sections.length < 2) {
    return sections;
  }

  const merged = [sections[0]];

  for (let i = 1; i < sections.length; i++) {
    const lastSection = merged[merged.length - 1];
    const currentSection = sections[i];

    // Check if topics are similar
    const similarity =
      lastSection.topic === currentSection.topic ? 1 : 0;

    if (similarity >= threshold) {
      // Merge sections
      lastSection.messages.push(...currentSection.messages);
      lastSection.endTime = currentSection.endTime;
      lastSection.participants = Array.from(
        new Set([...lastSection.participants, ...currentSection.participants])
      );
    } else {
      merged.push(currentSection);
    }
  }

  return merged;
}

/**
 * Generates a summary of conversation sections
 * @param {Array<ConversationSection>} sections - Array of sections
 * @returns {Object} Summary statistics
 */
function generateSectionSummary(sections) {
  if (!Array.isArray(sections) || sections.length === 0) {
    return {
      totalSections: 0,
      totalMessages: 0,
      averageMessagesPerSection: 0,
      topics: [],
      participants: new Set(),
      duration: null,
    };
  }

  const allParticipants = new Set();
  const topicCounts = {};
  let totalMessages = 0;

  sections.forEach((section) => {
    totalMessages += section.messages.length;
    section.participants.forEach((p) => allParticipants.add(p));

    topicCounts[section.topic] = (topicCounts[section.topic] || 0) + 1;
  });

  const firstSection = sections[0];
  const lastSection = sections[sections.length - 1];
  const duration = lastSection.endTime - firstSection.startTime;

  return {
    totalSections: sections.length,
    totalMessages,
    averageMessagesPerSection: (totalMessages / sections.length).toFixed(2),
    topics: Object.entries(topicCounts)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count),
    participants: Array.from(allParticipants),
    duration: {
      milliseconds: duration,
      seconds: Math.round(duration / 1000),
      minutes: Math.round(duration / (1000 * 60)),
      hours: (duration / (1000 * 60 * 60)).toFixed(2),
    },
  };
}

module.exports = {
  detectSections,
  parseRawConversation,
  mergeSimilarSections,
  generateSectionSummary,
};
