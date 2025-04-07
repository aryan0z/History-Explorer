// Gemini API configuration
const GEMINI_API_KEY = 'AIzaSyCnbq_H7SFpjZEs4nDydlfWnf7AP2rAIg4';

// Function to clean markdown characters from text
function cleanMarkdown(text) {
    return text
        .replace(/#/g, '') // Remove # characters
        .replace(/\*/g, '') // Remove * characters
        .replace(/\n\s*\n/g, '\n') // Remove extra blank lines
        .trim(); // Remove leading/trailing whitespace
}

// Text-to-speech functionality
let currentSpeech = null;
let isPaused = false;

function speakText(text) {
    try {
        if ('speechSynthesis' in window) {
            // If speech is paused, resume it
            if (isPaused && currentSpeech) {
                window.speechSynthesis.resume();
                isPaused = false;
                return;
            }
            
            // Cancel any ongoing speech
            window.speechSynthesis.cancel();
            
            // Create new speech
            currentSpeech = new SpeechSynthesisUtterance();
            
            // Clean the text and handle special characters
            const cleanText = text
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/\\n/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            
            currentSpeech.text = cleanText;
            currentSpeech.volume = 1;
            currentSpeech.rate = 0.9; // Slightly slower for better comprehension
            currentSpeech.pitch = 1;
            
            // Add error handling
            currentSpeech.onerror = function(event) {
                console.error('Speech synthesis error:', event);
                alert('Error: Could not speak the text. Please try again.');
            };
            
            // Speak the text
            window.speechSynthesis.speak(currentSpeech);
        } else {
            alert('Text-to-speech is not supported in your browser.');
        }
    } catch (error) {
        console.error('Error in speakText:', error);
        alert('Error: Could not speak the text. Please try again.');
    }
}

function toggleSpeech() {
    if (currentSpeech) {
        if (isPaused) {
            window.speechSynthesis.resume();
            isPaused = false;
        } else {
            window.speechSynthesis.pause();
            isPaused = true;
        }
    }
}

// Quiz state management
let currentQuiz = null;
let userAnswers = {};

function handleOptionClick(questionIndex, optionIndex) {
    if (currentQuiz && currentQuiz.questions[questionIndex]) {
        const questionElement = document.querySelector(`[data-question-index="${questionIndex}"]`);
        const options = questionElement.querySelectorAll('.quiz-option');
        
        // Remove selected class from all options in this question
        options.forEach(opt => {
            opt.classList.remove('selected');
            opt.style.backgroundColor = '';
        });
        
        // Add selected class to clicked option
        const selectedOption = options[optionIndex];
        selectedOption.classList.add('selected');
        selectedOption.style.backgroundColor = '#e3f2fd';
        
        // Store user's answer
        userAnswers[questionIndex] = optionIndex;
        
        // Enable submit button if all questions are answered
        const submitButton = document.querySelector('.quiz-submit-btn');
        if (submitButton && Object.keys(userAnswers).length === currentQuiz.questions.length) {
            submitButton.disabled = false;
            submitButton.classList.add('active');
        }
    }
}

function showQuizFeedback() {
    let score = 0;
    const questions = currentQuiz.questions;
    
    questions.forEach((question, index) => {
        const questionElement = document.querySelector(`[data-question-index="${index}"]`);
        const selectedOption = questionElement.querySelector('.quiz-option.selected');
        const userAnswer = userAnswers[index];
        
        if (userAnswer !== undefined) {
            const isCorrect = String.fromCharCode(65 + userAnswer) === question.correctAnswer;
            if (isCorrect) {
                score++;
                selectedOption.classList.add('correct');
            } else {
                selectedOption.classList.add('incorrect');
                const correctOption = questionElement.querySelector(`[data-option-index="${question.correctAnswer.charCodeAt(0) - 65}"]`);
                correctOption.classList.add('correct');
            }
        }
    });
    
    const scorePercentage = Math.round((score / questions.length) * 100);
    const scoreContainer = document.createElement('div');
    scoreContainer.className = 'quiz-score';
    scoreContainer.innerHTML = `
        <h4>Quiz Results</h4>
        <p>Your Score: ${score}/${questions.length} (${scorePercentage}%)</p>
        ${scorePercentage >= 70 ? 
            '<p class="quiz-feedback correct">Great job! You have a good understanding of this topic!</p>' :
            '<p class="quiz-feedback incorrect">Keep learning! You can do better next time!</p>'
        }
    `;
    
    const quizContainer = document.querySelector('.quiz-content');
    quizContainer.appendChild(scoreContainer);
    
    // Disable all options and submit button
    const submitButton = document.querySelector('.quiz-submit-btn');
    submitButton.disabled = true;
    document.querySelectorAll('.quiz-option').forEach(option => {
        option.style.cursor = 'default';
        option.onclick = null;
    });
}

async function getFactualOverview(query) {
    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Provide a concise factual overview about "${query}". Include:
1. Key dates and events
2. Important figures involved
3. Main locations
4. Basic historical context
5. Significance in history

Format as clear, bullet-pointed facts without markdown characters.`
                    }]
                }]
            })
        });

        const data = await response.json();
        return cleanMarkdown(data.candidates[0].content.parts[0].text);
    } catch (error) {
        console.error('Error getting factual overview:', error);
        return 'Unable to retrieve factual information at this time.';
    }
}

async function getHistoricalStory(query, perspective = 'first-person') {
    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Create an engaging historical narrative about "${query}" that:
1. Tells a compelling story with vivid details
2. Uses ${perspective} perspective to immerse the reader
3. Includes interesting facts and context
4. Makes historical figures come alive
5. Explains the significance of events
6. Uses simple, engaging language
7. Avoids markdown characters (# or *)
8. Ends with a thought-provoking question or interesting fact
9. Includes sensory details (sights, sounds, smells) to make the story more immersive

Format the response as a story that would captivate a student's interest.`
                    }]
                }]
            })
        });

        const data = await response.json();
        return cleanMarkdown(data.candidates[0].content.parts[0].text);
    } catch (error) {
        console.error('Error getting historical story:', error);
        return 'Unable to retrieve the historical story at this time.';
    }
}

async function getAlternativeScenario(query) {
    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Create an alternative historical scenario for "${query}". Consider:
1. What if a key event had a different outcome?
2. How might history have changed?
3. What would be the potential consequences?
4. How would it affect the world today?

Format as an engaging narrative that explores these possibilities.`
                    }]
                }]
            })
        });

        const data = await response.json();
        return cleanMarkdown(data.candidates[0].content.parts[0].text);
    } catch (error) {
        console.error('Error getting alternative scenario:', error);
        return 'Unable to retrieve alternative scenario at this time.';
    }
}

async function getQuizQuestions(query) {
    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Create 3 multiple-choice quiz questions about "${query}". Format each question as:
Question: [question text]
A) [option A]
B) [option B]
C) [option C]
D) [option D]
Correct Answer: [letter of correct answer]

Make the questions challenging but fair, based on the historical facts.`
                    }]
                }]
            })
        });

        const data = await response.json();
        const quizText = cleanMarkdown(data.candidates[0].content.parts[0].text);
        return parseQuizQuestions(quizText);
    } catch (error) {
        console.error('Error getting quiz questions:', error);
        return null;
    }
}

function parseQuizQuestions(quizText) {
    const questions = [];
    const lines = quizText.split('\n');
    let currentQuestion = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('Question:')) {
            if (currentQuestion) {
                questions.push(currentQuestion);
            }
            currentQuestion = {
                text: line.replace('Question:', '').trim(),
                options: [],
                correctAnswer: null
            };
        } else if (line.match(/^[A-D]\)/)) {
            if (currentQuestion) {
                const option = line.substring(2).trim();
                currentQuestion.options.push(option);
            }
        } else if (line.startsWith('Correct Answer:')) {
            if (currentQuestion) {
                currentQuestion.correctAnswer = line.replace('Correct Answer:', '').trim();
                questions.push(currentQuestion);
                currentQuestion = null;
            }
        }
    }

    return { questions };
}

function createInteractiveQuiz(quizData) {
    currentQuiz = quizData;
    userAnswers = {};
    const quizContainer = document.createElement('div');
    quizContainer.className = 'quiz-content';

    quizData.questions.forEach((question, index) => {
        const questionElement = document.createElement('div');
        questionElement.className = 'quiz-question';
        questionElement.dataset.questionIndex = index;

        const questionText = document.createElement('div');
        questionText.className = 'quiz-question-text';
        questionText.textContent = `${index + 1}. ${question.text}`;
        questionElement.appendChild(questionText);

        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'quiz-options';

        question.options.forEach((option, optionIndex) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'quiz-option';
            optionElement.dataset.optionIndex = optionIndex;
            optionElement.style.cursor = 'pointer';
            optionElement.style.padding = '10px';
            optionElement.style.margin = '5px 0';
            optionElement.style.border = '1px solid #ddd';
            optionElement.style.borderRadius = '4px';
            optionElement.style.transition = 'all 0.3s ease';

            const optionLabel = document.createElement('span');
            optionLabel.className = 'quiz-option-label';
            optionLabel.textContent = String.fromCharCode(65 + optionIndex) + ') ';
            optionLabel.style.fontWeight = 'bold';
            optionLabel.style.marginRight = '10px';
            optionElement.appendChild(optionLabel);

            const optionText = document.createElement('span');
            optionText.textContent = option;
            optionElement.appendChild(optionText);

            // Add hover effect
            optionElement.addEventListener('mouseover', () => {
                if (!optionElement.classList.contains('selected')) {
                    optionElement.style.backgroundColor = '#f5f5f5';
                }
            });

            optionElement.addEventListener('mouseout', () => {
                if (!optionElement.classList.contains('selected')) {
                    optionElement.style.backgroundColor = '';
                }
            });

            // Add click handler
            optionElement.addEventListener('click', () => {
                handleOptionClick(index, optionIndex);
            });

            optionsContainer.appendChild(optionElement);
        });

        questionElement.appendChild(optionsContainer);
        quizContainer.appendChild(questionElement);
    });

    const submitButton = document.createElement('button');
    submitButton.className = 'quiz-submit-btn';
    submitButton.textContent = 'Submit Answers';
    submitButton.disabled = true;
    submitButton.style.marginTop = '20px';
    submitButton.style.padding = '10px 20px';
    submitButton.style.backgroundColor = '#4CAF50';
    submitButton.style.color = 'white';
    submitButton.style.border = 'none';
    submitButton.style.borderRadius = '4px';
    submitButton.style.cursor = 'pointer';
    submitButton.addEventListener('click', showQuizFeedback);
    quizContainer.appendChild(submitButton);

    return quizContainer;
}

// Search functionality
document.addEventListener('DOMContentLoaded', function() {
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('history-search');
    
    async function performSearch() {
        const query = searchInput.value.trim();
        if (query) {
            console.log('Performing search for:', query);
            
            // Show loading state
            const resultsContainer = document.createElement('div');
            resultsContainer.className = 'search-results';
            resultsContainer.innerHTML = '<p class="loading">Gathering historical insights...</p>';
            
            // Remove any existing results
            const existingResults = document.querySelector('.search-results');
            if (existingResults) {
                existingResults.remove();
            }
            
            // Insert results container after the search box
            const searchContainer = document.querySelector('.search-container');
            if (searchContainer) {
                searchContainer.appendChild(resultsContainer);
            } else {
                console.error('Search container not found');
                return;
            }
            
            try {
                // Get factual overview, story, alternative scenario, and quiz questions
                const [overview, story, alternative, quiz] = await Promise.all([
                    getFactualOverview(query),
                    getHistoricalStory(query, 'first-person'),
                    getAlternativeScenario(query),
                    getQuizQuestions(query)
                ]);

                resultsContainer.innerHTML = `
                    <div class="result-content">
                        <div class="factual-overview">
                            <h3>Key Facts</h3>
                            <div class="overview-content">
                                <p>${overview}</p>
                                <div class="speech-controls">
                                    <button class="speak-btn" onclick="speakText('${overview.replace(/'/g, "\\'").replace(/\n/g, ' ')}')">
                                        <i class="fas fa-volume-up"></i> Listen
                                    </button>
                                    <button class="pause-btn" onclick="toggleSpeech()">
                                        <i class="fas fa-pause"></i> Pause/Resume
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="story-section">
                            <h3>Historical Story</h3>
                            <div class="story-content">
                                <p>${story}</p>
                                <div class="speech-controls">
                                    <button class="speak-btn" onclick="speakText('${story.replace(/'/g, "\\'").replace(/\n/g, ' ')}')">
                                        <i class="fas fa-volume-up"></i> Listen
                                    </button>
                                    <button class="pause-btn" onclick="toggleSpeech()">
                                        <i class="fas fa-pause"></i> Pause/Resume
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="alternative-scenario">
                            <h3>Alternative History</h3>
                            <div class="scenario-content">
                                <p>${alternative}</p>
                                <div class="speech-controls">
                                    <button class="speak-btn" onclick="speakText('${alternative.replace(/'/g, "\\'").replace(/\n/g, ' ')}')">
                                        <i class="fas fa-volume-up"></i> Listen
                                    </button>
                                    <button class="pause-btn" onclick="toggleSpeech()">
                                        <i class="fas fa-pause"></i> Pause/Resume
                                    </button>
                                </div>
                            </div>
                        </div>

                        ${quiz ? `
                        <div class="quiz-section">
                            <h3>Test Your Knowledge</h3>
                            ${createInteractiveQuiz(quiz).outerHTML}
                        </div>
                        ` : ''}
                        
                        <div class="related-topics">
                            <h4>Want to explore more?</h4>
                            <p>Try searching for related topics or ask follow-up questions!</p>
                        </div>
                    </div>
                `;
            } catch (error) {
                console.error('Search error:', error);
                resultsContainer.innerHTML = `
                    <div class="error-message">
                        <p>Sorry, we encountered an error while searching. Please try again later.</p>
                        <p>Error details: ${error.message}</p>
                    </div>
                `;
            }
        } else {
            alert('Please enter a search query');
        }
    }
    
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    } else {
        console.error('Search elements not found');
    }
}); 