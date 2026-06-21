import React, { useState, useRef, useEffect } from 'react';
import './GuideAssistant.css';

const GuideAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'Hello! 👋 I\'m your Smart Traffic Guide. I can answer any question about the system or traffic management. What would you like to know?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [aiProvider, setAiProvider] = useState('gemini'); // 'gemini' or 'openai'
  const messagesEndRef = useRef(null);

  // System context for AI
  const systemContext = `You are an expert assistant for a Smart Traffic Management System. You help users understand and navigate all features including:

Dashboard, Live Video Feed, Vehicle Detection (cars, bikes, buses, trucks, ambulances, pedestrians), Lane Analysis, Signal Control, Analytics, Traffic Maps, Route Planning, AI Traffic Predictions, Emergency Features, and Settings.

Provide clear, helpful answers with emojis and formatting. Keep responses concise but informative. Include practical tips when relevant.

System Features:
- Real-time vehicle detection and counting
- Lane-by-lane traffic analysis
- AI-powered traffic predictions (15-60 min ahead)
- Interactive traffic maps
- Route optimization
- Emergency priority mode
- Signal timing optimization
- Historical analytics and reporting`;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Google Gemini API Call
  const callGeminiAPI = async (userMessage) => {
    try {
      const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Google Gemini API key not configured');
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `${systemContext}\n\nUser question: ${userMessage}`
                  }
                ]
              }
            ]
          })
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Gemini API Error:', error);
      return null;
    }
  };

  // OpenAI API Call (for Copilot)
  const callOpenAIAPI = async (userMessage) => {
    try {
      const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: systemContext
            },
            {
              role: 'user',
              content: userMessage
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API Error:', error);
      return null;
    }
  };

  // Fallback local knowledge base
  const fallbackKnowledgeBase = {
    'dashboard': 'The Dashboard is your main hub showing live video feed, vehicle detection, lane analysis, and signal status.',
    'video': 'Video Feed shows real-time MJPEG streams. Click the camera toggle button to turn it ON/OFF.',
    'vehicle detection': 'Detects and counts cars, bikes, buses, trucks, ambulances, and pedestrians in real-time.',
    'lane analysis': 'Analyzes each lane (A, B, C, D) showing vehicle count, density %, traffic level, and green signal time.',
    'analytics': 'Historical traffic data, trends, peak hours, and congestion patterns.',
    'emergency': 'Emergency Priority Mode activates green lights for ambulances and emergency vehicles.',
    'predictions': 'AI forecasts traffic 15-60 minutes ahead using machine learning and pattern recognition.',
    'maps': 'Interactive map showing all junctions with real-time traffic visualization.',
    'routes': 'Route Planner suggests optimal paths considering real-time traffic conditions.',
    'help': 'I can help with Dashboard, Vehicle Detection, Lane Analysis, Signals, Analytics, Maps, Route Planning, Predictions, and Emergency features.'
  };

  // Get fallback response from knowledge base
  const getFallbackResponse = (userInput) => {
    const input = userInput.toLowerCase();
    
    for (const [key, value] of Object.entries(fallbackKnowledgeBase)) {
      if (input.includes(key)) {
        return value;
      }
    }

    if (input.includes('what') || input.includes('how')) {
      return 'I can answer questions about the Smart Traffic Management System. Ask me about dashboard, vehicle detection, lane analysis, signals, analytics, maps, route planning, predictions, or emergency features!';
    }

    if (input.includes('thank')) {
      return 'You\'re welcome! Feel free to ask me anything else about the system!';
    }

    return 'That\'s a great question! I\'m still learning. Try asking me about specific dashboard features, or use Google Gemini/OpenAI API for more detailed answers. Configure API keys in your .env file.';
  };

  // Main function to get AI response
  const generateBotResponse = async (userInput) => {
    let response = null;

    try {
      // Try primary AI provider
      if (aiProvider === 'gemini') {
        response = await callGeminiAPI(userInput);
        if (!response) {
          // Fallback to OpenAI
          response = await callOpenAIAPI(userInput);
        }
      } else {
        response = await callOpenAIAPI(userInput);
        if (!response) {
          // Fallback to Gemini
          response = await callGeminiAPI(userInput);
        }
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
    }

    // If both APIs fail or are not configured, use fallback
    if (!response) {
      response = getFallbackResponse(userInput);
    }

    return response;
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() === '') return;

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Get AI response
    const botResponse = await generateBotResponse(inputValue);
    
    const botMessage = {
      id: messages.length + 2,
      text: botResponse,
      sender: 'bot',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, botMessage]);
    setIsTyping(false);
  };

  const handleQuickQuestion = async (question) => {
    const userMessage = {
      id: messages.length + 1,
      text: question,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    const botResponse = await generateBotResponse(question);
    
    const botMessage = {
      id: messages.length + 2,
      text: botResponse,
      sender: 'bot',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, botMessage]);
    setIsTyping(false);
  };

  const quickQuestions = [
    'What is the Dashboard?',
    'How does Vehicle Detection work?',
    'Explain Lane Analysis',
    'Emergency Features Overview',
    'Traffic Predictions Explained',
    'How to use Route Planner?'
  ];

  return (
    <div className="guide-assistant">
      {/* Floating Button */}
      <button
        className={`assistant-button ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Open Guide Assistant"
      >
        <span className="assistant-icon">🤖</span>
        <span className="assistant-label">Guide</span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="assistant-window">
          <div className="assistant-header">
            <h3>🤖 Smart Traffic Guide</h3>
            <div className="header-controls">
              <select 
                className="ai-provider-select"
                value={aiProvider}
                onChange={(e) => setAiProvider(e.target.value)}
                title="Select AI Provider"
              >
                <option value="gemini">Gemini</option>
                <option value="openai">OpenAI</option>
              </select>
              <button
                className="close-button"
                onClick={() => setIsOpen(false)}
              >
                ✕
              </button>
            </div>
          </div>

          <div className="assistant-messages">
            {messages.map(message => (
              <div
                key={message.id}
                className={`message message-${message.sender}`}
              >
                <div className="message-content">
                  {message.text.split('\n').map((line, idx) => (
                    <p key={idx}>{line}</p>
                  ))}
                </div>
                <span className="message-time">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            ))}

            {isTyping && (
              <div className="message message-bot">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          {messages.length <= 2 && (
            <div className="quick-questions">
              <p>Quick questions:</p>
              <div className="questions-grid">
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    className="quick-question-btn"
                    onClick={() => handleQuickQuestion(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="assistant-input">
            <input
              type="text"
              placeholder="Ask me anything..."
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              className="send-button"
              onClick={handleSendMessage}
              disabled={inputValue.trim() === '' || isTyping}
            >
              ➤
            </button>
          </div>

          <div className="api-status">
            <small>
              {process.env.REACT_APP_GEMINI_API_KEY || process.env.REACT_APP_OPENAI_API_KEY
                ? '✅ AI APIs Configured'
                : '⚠️ Set API keys in .env file'}
            </small>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuideAssistant;
