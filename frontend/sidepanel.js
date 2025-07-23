document.addEventListener('DOMContentLoaded', () => {
    // This script now assumes that sketch.js has already created the p5 instance
    // and exposed it as window.p5SketchInstance.

    // We'll periodically check if the instance is ready before setting everything up.
    const waitForP5Instance = setInterval(() => {
        if (window.p5SketchInstance) {
            clearInterval(waitForP5Instance);
            initializeSidePanelLogic();
        }
    }, 100);

    function initializeSidePanelLogic() {
        // Guard for sidepanel.js specific logic
        if (!window.location.pathname.endsWith('visualization.html')) {
            return;
        }

        const sidePanel = document.getElementById('conversationSidePanel');
        const panelTabs = document.querySelectorAll('#conversationSidePanel .panel-tab');
        const panelTabContents = document.querySelectorAll('#conversationSidePanel .panel-tab-content');

        if (!sidePanel) return;

        // Initialize the side panel with conversation data
        window.initializeSidePanel = function(conversationData, conversationDetails, blobs) {
            // Store references for later use
            window.conversationData = conversationData;
            window.conversationDetails = conversationDetails;
            window.blobs = blobs;
        };
        
        // This function will be called by the sketch when a blob is clicked
        window.updateSidePanelForBlob = (blobId) => {
            const blobData = window.p5SketchInstance.getBlobDataById(blobId);
            if(blobData) {
                // For now, just log it. We can populate the panel here later.
                console.log("Update side panel for:", blobData);
            }
        };

        function openSidePanel() {
            if (!sidePanel) return;
            sidePanel.classList.add('visible');
        }

        function closeSidePanel() {
            if (!sidePanel) return;
            sidePanel.classList.remove('visible');
        }



        panelTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const tabId = this.dataset.tab;
                panelTabs.forEach(t => t.classList.remove('active'));
                panelTabContents.forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                document.getElementById(tabId)?.classList.add('active');
            });
        });

        // Audio controls
        const playBtn = document.getElementById('play-audio');
        const pauseBtn = document.getElementById('pause-audio');
        const volumeSlider = document.getElementById('volume-slider');

        if (playBtn) {
            playBtn.addEventListener('click', () => {
                if (window.p5SketchInstance && typeof window.p5SketchInstance.togglePlayPause === 'function') {
                    window.p5SketchInstance.togglePlayPause();
                }
            });
        }

        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                if (window.p5SketchInstance && typeof window.p5SketchInstance.pauseSound === 'function') {
                    window.p5SketchInstance.pauseSound();
                }
            });
        }

        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                const volume = e.target.value / 100;
                if (window.p5SketchInstance && typeof window.p5SketchInstance.setVolume === 'function') {
                    window.p5SketchInstance.setVolume(volume);
                }
            });
        }

        // Settings checkboxes
        const showConnectionsCheckbox = document.getElementById('show-connections');
        const showRegionsCheckbox = document.getElementById('show-regions');

        if (showConnectionsCheckbox) {
            showConnectionsCheckbox.addEventListener('change', (e) => {
                if (window.p5SketchInstance) {
                    window.connectBlobs = e.target.checked;
                }
            });
        }

        if (showRegionsCheckbox) {
            showRegionsCheckbox.addEventListener('change', (e) => {
                window.showHomeRegions = e.target.checked;
            });
        }

        // Listen for conversation data loaded event
        window.addEventListener('conversationDataLoaded', (event) => {
            const data = event.detail.data;
            if (data) {
                updateConversationStats(data);
                generateConversationSummary(data);
                generateFullTranscript(data);
                generateMeetingSummary(data);
            }
        });

        // Listen for file changed event
        window.addEventListener('fileChanged', (event) => {
            const fileInfo = event.detail;
            updateCurrentFileInfo(fileInfo);
        });

        // ==================== TRANSCRIPT TAB FUNCTIONS ====================
        
        function generateFullTranscript(data) {
            console.log('📝 Generating full transcript...');
            
            const transcriptContainer = document.getElementById('full-transcript-container');
            if (!transcriptContainer) return;
            
            const mp3Keys = Object.keys(data).filter(k => k.endsWith('.mp3')).sort();
            
            if (mp3Keys.length === 0) {
                transcriptContainer.innerHTML = '<div class="transcript-loading">אין נתוני תמלול זמינים</div>';
                return;
            }
            
            let transcriptHTML = '';
            
            mp3Keys.forEach((key, index) => {
                const entry = data[key];
                if (entry && (entry.transcript || entry.words)) {
                    const text = entry.transcript || entry.words || '';
                    const emotions = entry.emotions || [];
                    const speaker = entry.speaker !== undefined ? `דובר ${entry.speaker + 1}` : 'דובר';
                    const timestamp = formatTimestamp(index);
                    
                    transcriptHTML += `
                        <div class="transcript-segment" data-segment="${index}">
                            <div class="transcript-header">
                                <span class="transcript-time">${timestamp}</span>
                                <span class="transcript-speaker">${speaker}</span>
                            </div>
                            <div class="transcript-text">${text}</div>
                            <div class="transcript-emotions">
                                ${emotions.map(emotion => `
                                    <span class="transcript-emotion-tag">${getHebrewEmotion(emotion)}</span>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }
            });
            
            if (transcriptHTML === '') {
                transcriptContainer.innerHTML = '<div class="transcript-loading">לא נמצא תמלול בקובץ זה</div>';
            } else {
                transcriptContainer.innerHTML = transcriptHTML;
            }
            
            console.log('✅ Full transcript generated');
        }
        
        function formatTimestamp(index) {
            const minutes = Math.floor(index * 0.5);
            const seconds = Math.floor((index * 0.5 % 1) * 60);
            return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
        
        // Transcript controls functionality
        const exportTranscriptBtn = document.getElementById('export-transcript');
        const searchTranscriptBtn = document.getElementById('search-transcript');
        const searchContainer = document.getElementById('search-container');
        const transcriptSearchInput = document.getElementById('transcript-search');
        const searchNextBtn = document.getElementById('search-next');
        const searchPrevBtn = document.getElementById('search-prev');
        const searchResults = document.getElementById('search-results');
        
        let currentSearchResults = [];
        let currentSearchIndex = -1;
        
        if (exportTranscriptBtn) {
            exportTranscriptBtn.addEventListener('click', exportTranscript);
        }
        
        if (searchTranscriptBtn) {
            searchTranscriptBtn.addEventListener('click', toggleTranscriptSearch);
        }
        
        if (transcriptSearchInput) {
            transcriptSearchInput.addEventListener('input', performTranscriptSearch);
            transcriptSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    searchNext();
                }
            });
        }
        
        if (searchNextBtn) {
            searchNextBtn.addEventListener('click', searchNext);
        }
        
        if (searchPrevBtn) {
            searchPrevBtn.addEventListener('click', searchPrev);
        }
        
        function exportTranscript() {
            const transcriptContainer = document.getElementById('full-transcript-container');
            if (!transcriptContainer) return;
            
            const segments = transcriptContainer.querySelectorAll('.transcript-segment');
            let exportText = 'תמלול שיחה\n';
            exportText += '================\n\n';
            
            segments.forEach(segment => {
                const time = segment.querySelector('.transcript-time').textContent;
                const speaker = segment.querySelector('.transcript-speaker').textContent;
                const text = segment.querySelector('.transcript-text').textContent;
                
                exportText += `[${time}] ${speaker}: ${text}\n\n`;
            });
            
            // Create and download file
            const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `transcript_${new Date().toISOString().slice(0, 10)}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('📄 Transcript exported');
        }
        
        function toggleTranscriptSearch() {
            if (searchContainer.style.display === 'none') {
                searchContainer.style.display = 'block';
                transcriptSearchInput.focus();
            } else {
                searchContainer.style.display = 'none';
                clearSearchHighlights();
            }
        }
        
        function performTranscriptSearch() {
            const query = transcriptSearchInput.value.trim().toLowerCase();
            
            if (query === '') {
                clearSearchHighlights();
                searchResults.textContent = '';
                return;
            }
            
            const transcriptContainer = document.getElementById('full-transcript-container');
            const textElements = transcriptContainer.querySelectorAll('.transcript-text');
            
            currentSearchResults = [];
            clearSearchHighlights();
            
            textElements.forEach((element, index) => {
                const text = element.textContent.toLowerCase();
                if (text.includes(query)) {
                    currentSearchResults.push({ element, index });
                    
                    // Highlight the search term
                    const originalText = element.textContent;
                    const regex = new RegExp(`(${query})`, 'gi');
                    const highlightedText = originalText.replace(regex, '<span class="transcript-highlight">$1</span>');
                    element.innerHTML = highlightedText;
                }
            });
            
            if (currentSearchResults.length > 0) {
                currentSearchIndex = 0;
                searchResults.textContent = `נמצאו ${currentSearchResults.length} תוצאות`;
                scrollToSearchResult(currentSearchIndex);
            } else {
                searchResults.textContent = 'לא נמצאו תוצאות';
                currentSearchIndex = -1;
            }
        }
        
        function searchNext() {
            if (currentSearchResults.length > 0) {
                currentSearchIndex = (currentSearchIndex + 1) % currentSearchResults.length;
                scrollToSearchResult(currentSearchIndex);
                updateSearchCounter();
            }
        }
        
        function searchPrev() {
            if (currentSearchResults.length > 0) {
                currentSearchIndex = currentSearchIndex <= 0 ? currentSearchResults.length - 1 : currentSearchIndex - 1;
                scrollToSearchResult(currentSearchIndex);
                updateSearchCounter();
            }
        }
        
        function scrollToSearchResult(index) {
            if (index >= 0 && index < currentSearchResults.length) {
                const element = currentSearchResults[index].element;
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
        
        function updateSearchCounter() {
            if (currentSearchResults.length > 0) {
                searchResults.textContent = `תוצאה ${currentSearchIndex + 1} מתוך ${currentSearchResults.length}`;
            }
        }
        
        function clearSearchHighlights() {
            const transcriptContainer = document.getElementById('full-transcript-container');
            const highlightedElements = transcriptContainer.querySelectorAll('.transcript-text');
            
            highlightedElements.forEach(element => {
                const text = element.textContent; // This removes HTML tags
                element.textContent = text;
            });
            
            currentSearchResults = [];
            currentSearchIndex = -1;
        }

        // ==================== MEETING SUMMARY FUNCTIONS ====================
        
        function generateMeetingSummary(data) {
            console.log('🏢 Generating meeting summary...');
            
            const mp3Keys = Object.keys(data).filter(k => k.endsWith('.mp3')).sort();
            const totalSegments = mp3Keys.length;
            
            if (totalSegments === 0) {
                updateMeetingSummaryElements({
                    summary: 'אין נתונים זמינים לסיכום ישיבה',
                    topics: [],
                    decisions: [],
                    actions: [],
                    atmosphere: [],
                    metrics: {
                        duration: '0 דקות',
                        participants: '0',
                        topics: '0',
                        mood: 'לא זמין'
                    }
                });
                return;
            }
            
            // Analyze meeting data
            const meetingAnalysis = analyzeMeetingData(data, mp3Keys);
            
            // Generate meeting summary
            const meetingSummary = generateMeetingSummaryText(meetingAnalysis);
            
            // Extract key topics
            const keyTopics = extractKeyTopics(meetingAnalysis);
            
            // Identify decisions and agreements
            const decisions = identifyDecisions(meetingAnalysis);
            
            // Extract action items
            const actionItems = extractActionItems(meetingAnalysis);
            
            // Analyze atmosphere
            const atmosphere = analyzeMeetingAtmosphere(data, mp3Keys);
            
            // Calculate meeting metrics
            const meetingMetrics = calculateMeetingMetrics(data, mp3Keys);
            
            // Update UI
            updateMeetingSummaryElements({
                summary: meetingSummary,
                topics: keyTopics,
                decisions: decisions,
                actions: actionItems,
                atmosphere: atmosphere,
                metrics: meetingMetrics
            });
        }
        
        function analyzeMeetingData(data, mp3Keys) {
            const speakers = new Set();
            const topics = [];
            const emotionalFlow = [];
            const transcripts = [];
            
            mp3Keys.forEach((key, index) => {
                const entry = data[key];
                if (entry) {
                    // Track speakers
                    if (entry.speaker !== undefined) {
                        speakers.add(entry.speaker);
                    }
                    
                    // Collect transcripts for topic analysis
                    if (entry.transcript || entry.words) {
                        transcripts.push({
                            text: entry.transcript || entry.words || '',
                            emotions: entry.emotions || [],
                            speaker: entry.speaker,
                            timestamp: formatTimestamp(index)
                        });
                    }
                    
                    // Track emotional flow
                    emotionalFlow.push({
                        timestamp: formatTimestamp(index),
                        emotions: entry.emotions || [],
                        intensity: calculateEmotionalIntensity(entry.emotions || [])
                    });
                }
            });
            
            return {
                speakers: Array.from(speakers),
                transcripts: transcripts,
                emotionalFlow: emotionalFlow,
                totalSegments: mp3Keys.length
            };
        }
        
        function generateMeetingSummaryText(analysis) {
            const { speakers, transcripts, totalSegments } = analysis;
            
            const participantCount = speakers.length || 1;
            const estimatedDuration = Math.round(totalSegments * 0.5);
            const transcriptCount = transcripts.length;
            
            let summary = `ישיבה בת ${estimatedDuration} דקות בהשתתפות `;
            
            if (participantCount === 1) {
                summary += 'דובר אחד';
            } else if (participantCount === 2) {
                summary += 'שני דוברים';
            } else {
                summary += `${participantCount} דוברים`;
            }
            
            summary += `. נרשמו ${totalSegments} קטעי שמע`;
            
            if (transcriptCount > 0) {
                summary += `, מתוכם ${transcriptCount} קטעים עם תמלול מלא`;
            }
            
            // Analyze conversation style
            const avgWordsPerSegment = transcripts.length > 0 ? 
                transcripts.reduce((sum, t) => sum + t.text.split(' ').length, 0) / transcripts.length : 0;
            
            if (avgWordsPerSegment > 20) {
                summary += '. הישיבה התנהלה בסגנון מפורט ומעמיק';
            } else if (avgWordsPerSegment > 10) {
                summary += '. הישיבה התנהלה בסגנון בינוני';
            } else if (avgWordsPerSegment > 0) {
                summary += '. הישיבה התנהלה בסגנון קצר וממוקד';
            }
            
            return summary;
        }
        
        function extractKeyTopics(analysis) {
            const { transcripts } = analysis;
            const topics = [];
            
            // Simple topic extraction based on common patterns and keywords
            const topicKeywords = {
                'פרויקט': 'ניהול פרויקטים ומשימות',
                'תקציב': 'נושאים כלכליים ותקציביים',
                'לוח זמנים': 'תכנון ולוחות זמנים',
                'צוות': 'ניהול צוות ומשאבי אנוש',
                'לקוח': 'יחסי לקוחות ושירות',
                'טכנולוגיה': 'נושאים טכנולוגיים',
                'אסטרטגיה': 'תכנון אסטרטגי וחזון',
                'בעיה': 'פתרון בעיות וקשיים'
            };
            
            const topicCounts = {};
            
            transcripts.forEach(transcript => {
                const text = transcript.text.toLowerCase();
                Object.keys(topicKeywords).forEach(keyword => {
                    if (text.includes(keyword)) {
                        topicCounts[keyword] = (topicCounts[keyword] || 0) + 1;
                    }
                });
            });
            
            // Add identified topics
            Object.entries(topicCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .forEach(([keyword, count]) => {
                    topics.push({
                        title: topicKeywords[keyword],
                        description: `נדון ${count} פעמים במהלך הישיבה`
                    });
                });
            
            // Add generic topics if none found
            if (topics.length === 0) {
                topics.push({
                    title: 'דיון כללי',
                    description: 'הישיבה כללה דיון כללי ללא נושאים ספציפיים מזוהים'
                });
            }
            
            return topics;
        }
        
        function identifyDecisions(analysis) {
            const { transcripts } = analysis;
            const decisions = [];
            
            // Keywords that might indicate decisions
            const decisionKeywords = ['החלטנו', 'נחליט', 'הוחלט', 'נסכים', 'מסכימים', 'אישרנו'];
            
            transcripts.forEach((transcript, index) => {
                const text = transcript.text.toLowerCase();
                decisionKeywords.forEach(keyword => {
                    if (text.includes(keyword)) {
                        decisions.push({
                            title: `החלטה בזמן ${transcript.timestamp}`,
                            description: transcript.text.slice(0, 100) + (transcript.text.length > 100 ? '...' : '')
                        });
                    }
                });
            });
            
            // Add generic decision if none found but meeting seems formal
            if (decisions.length === 0 && transcripts.length > 10) {
                decisions.push({
                    title: 'לא זוהו החלטות ספציפיות',
                    description: 'הישיבה הייתה בעיקר דיונית ללא החלטות מפורשות'
                });
            }
            
            return decisions.slice(0, 5); // Limit to 5 decisions
        }
        
        function extractActionItems(analysis) {
            const { transcripts } = analysis;
            const actions = [];
            
            // Keywords that might indicate action items
            const actionKeywords = ['צריך', 'נעשה', 'נטפל', 'אבדוק', 'נכין', 'נשלח'];
            
            transcripts.forEach(transcript => {
                const text = transcript.text.toLowerCase();
                actionKeywords.forEach(keyword => {
                    if (text.includes(keyword)) {
                        actions.push({
                            title: `פעולה נדרשת - ${transcript.timestamp}`,
                            description: transcript.text.slice(0, 100) + (transcript.text.length > 100 ? '...' : '')
                        });
                    }
                });
            });
            
            // Add generic action if none found
            if (actions.length === 0) {
                actions.push({
                    title: 'לא זוהו משימות ספציפיות',
                    description: 'לא נמצאו פעולות מפורשות הדורשות מעקב'
                });
            }
            
            return actions.slice(0, 5); // Limit to 5 actions
        }
        
        function analyzeMeetingAtmosphere(data, mp3Keys) {
            return createEmotionalProgression(data, mp3Keys);
        }
        
        function calculateMeetingMetrics(data, mp3Keys) {
            const totalSegments = mp3Keys.length;
            const estimatedDuration = Math.round(totalSegments * 0.5);
            
            // Count unique speakers
            const speakers = new Set();
            mp3Keys.forEach(key => {
                const entry = data[key];
                if (entry && entry.speaker !== undefined) {
                    speakers.add(entry.speaker);
                }
            });
            
            // Count topics (simple estimate based on transcript variety)
            const transcripts = [];
            mp3Keys.forEach(key => {
                const entry = data[key];
                if (entry && (entry.transcript || entry.words)) {
                    transcripts.push(entry.transcript || entry.words || '');
                }
            });
            
            const estimatedTopics = Math.max(1, Math.floor(transcripts.length / 5));
            
            // Calculate overall mood
            const emotionCounts = {};
            mp3Keys.forEach(key => {
                const entry = data[key];
                if (entry && entry.emotions) {
                    entry.emotions.forEach(emotion => {
                        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
                    });
                }
            });
            
            const dominantEmotion = Object.entries(emotionCounts)
                .sort((a, b) => b[1] - a[1])[0];
            
            return {
                duration: `${estimatedDuration} דקות`,
                participants: speakers.size || 1,
                topics: estimatedTopics,
                mood: dominantEmotion ? getHebrewEmotion(dominantEmotion[0]) : 'נייטרלי'
            };
        }
        
        function updateMeetingSummaryElements(meetingData) {
            // Update meeting summary
            const summaryElement = document.getElementById('meeting-summary');
            if (summaryElement) {
                summaryElement.innerHTML = `
                    <div class="summary-content">${meetingData.summary}</div>
                `;
            }
            
            // Update key topics
            const topicsContainer = document.querySelector('#key-topics .topics-container');
            if (topicsContainer) {
                topicsContainer.innerHTML = '';
                meetingData.topics.forEach(topic => {
                    const topicElement = document.createElement('div');
                    topicElement.className = 'topic-item';
                    topicElement.innerHTML = `
                        <div class="item-title">${topic.title}</div>
                        <div class="item-description">${topic.description}</div>
                    `;
                    topicsContainer.appendChild(topicElement);
                });
            }
            
            // Update decisions
            const decisionsContainer = document.querySelector('#decisions-agreements .decisions-container');
            if (decisionsContainer) {
                decisionsContainer.innerHTML = '';
                meetingData.decisions.forEach(decision => {
                    const decisionElement = document.createElement('div');
                    decisionElement.className = 'decision-item';
                    decisionElement.innerHTML = `
                        <div class="item-title">${decision.title}</div>
                        <div class="item-description">${decision.description}</div>
                    `;
                    decisionsContainer.appendChild(decisionElement);
                });
            }
            
            // Update action items
            const actionsContainer = document.querySelector('#action-items .actions-container');
            if (actionsContainer) {
                actionsContainer.innerHTML = '';
                meetingData.actions.forEach(action => {
                    const actionElement = document.createElement('div');
                    actionElement.className = 'action-item';
                    actionElement.innerHTML = `
                        <div class="item-title">${action.title}</div>
                        <div class="item-description">${action.description}</div>
                    `;
                    actionsContainer.appendChild(actionElement);
                });
            }
            
            // Update atmosphere
            const atmosphereElement = document.querySelector('#meeting-atmosphere .atmosphere-container .progression-chart');
            if (atmosphereElement) {
                if (meetingData.atmosphere.length > 0) {
                    // Calculate overall mood
                    const overallMood = calculateOverallMood(meetingData.atmosphere);
                    
                    atmosphereElement.innerHTML = `
                        <div class="mood-indicator">
                            <span class="mood-emoji">${getMoodEmoji(overallMood.emotion)}</span>
                            <span class="mood-text">אווירה כללית: ${overallMood.emotion}</span>
                        </div>
                        <div class="progression-timeline">
                            ${meetingData.atmosphere.slice(0, 6).map(item => `
                                <div class="progression-item">
                                    <span class="progression-time">${item.time}</span>
                                    <span class="progression-emotion">${item.emotion}</span>
                                    <div class="emotion-progression-bar">
                                        <div class="emotion-progression-fill" style="width: ${Math.round(item.intensity * 100)}%; background-color: ${getMoodColor(item.emotion)};"></div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                } else {
                    atmosphereElement.innerHTML = '<div style="text-align: center; color: var(--text-secondary);">אין נתוני אווירה</div>';
                }
            }
            
            // Update meeting metrics
            const metrics = meetingData.metrics;
            const durationElement = document.getElementById('meeting-duration');
            if (durationElement) durationElement.textContent = metrics.duration;
            
            const participantsElement = document.getElementById('meeting-participants');
            if (participantsElement) participantsElement.textContent = metrics.participants;
            
            const topicsCountElement = document.getElementById('topics-count');
            if (topicsCountElement) topicsCountElement.textContent = metrics.topics;
            
            const overallMoodElement = document.getElementById('overall-mood');
            if (overallMoodElement) overallMoodElement.textContent = metrics.mood;
            
            console.log('✅ Meeting summary updated');
        }
        
        function calculateOverallMood(atmosphere) {
            if (atmosphere.length === 0) return { emotion: 'נייטרלי', intensity: 0.5 };
            
            const emotionCounts = {};
            let totalIntensity = 0;
            
            atmosphere.forEach(item => {
                emotionCounts[item.emotion] = (emotionCounts[item.emotion] || 0) + 1;
                totalIntensity += item.intensity;
            });
            
            const dominantEmotion = Object.entries(emotionCounts)
                .sort((a, b) => b[1] - a[1])[0];
            
            return {
                emotion: dominantEmotion ? dominantEmotion[0] : 'נייטרלי',
                intensity: totalIntensity / atmosphere.length
            };
        }
        
        function getMoodEmoji(emotion) {
            const emojiMap = {
                // Basic emotions
                'שמחה': '😊',
                'עליזות': '😄',
                'עצב': '😔',
                'כעס': '😠',
                'פחד': '😨',
                'הפתעה': '😲',
                'גועל': '🤢',
                'נייטרלי': '😐',
                'רוגע': '😌',
                'התרגשות': '🤩',
                
                // Extended emotions
                'סקרנות': '🤔',
                'בלבול': '😵',
                'עצבנות': '😤',
                'תסכול': '😫',
                'דאגה': '🤗',
                'אהבה': '❤️',
                'שנאה': '😡',
                'קנאה': '😒',
                'אשמה': '😞',
                'בושה': '😳',
                'גאווה': '😏',
                'הקלה': '😅',
                'חרדה': '😰',
                'לחץ': '😩',
                'שעמום': '😴',
                'עניין': '🧐',
                'הערצה': '🤩',
                'בוז': '🙄',
                'אבל': '😢',
                'תקווה': '🙏',
                'אופטימיות': '☺️',
                'פסימיות': '😑',
                'שביעות רצון': '😌',
                'אכזבה': '😞',
                'נחישות': '😤',
                'ביטחון': '😎',
                'חוסר ביטחון': '😟',
                'נוסטלגיה': '🥺',
                'בדידות': '😔',
                'אמפתיה': '🤗',
                'סימפטיה': '😊'
            };
            return emojiMap[emotion] || '😐';
        }
        
        function getMoodColor(emotion) {
            const colorMap = {
                // Basic emotions
                'שמחה': '#4CAF50',
                'עליזות': '#8BC34A',
                'עצב': '#2196F3',
                'כעס': '#F44336',
                'פחד': '#9C27B0',
                'הפתעה': '#FF9800',
                'גועל': '#795548',
                'נייטרלי': '#9E9E9E',
                'רוגע': '#00BCD4',
                'התרגשות': '#E91E63',
                
                // Extended emotions
                'סקרנות': '#FF5722',
                'בלבול': '#9C27B0',
                'עצבנות': '#FF6347',
                'תסכול': '#DC143C',
                'דאגה': '#32CD32',
                'אהבה': '#FF1493',
                'שנאה': '#B22222',
                'קנאה': '#ADFF2F',
                'אשמה': '#708090',
                'בושה': '#F0E68C',
                'גאווה': '#FFD700',
                'הקלה': '#98FB98',
                'חרדה': '#6A5ACD',
                'לחץ': '#CD5C5C',
                'שעמום': '#D3D3D3',
                'עניין': '#FF4500',
                'הערצה': '#DA70D6',
                'בוז': '#8B4513',
                'אבל': '#4682B4',
                'תקווה': '#87CEEB',
                'אופטימיות': '#FFA500',
                'פסימיות': '#696969',
                'שביעות רצון': '#20B2AA',
                'אכזבה': '#BC8F8F',
                'נחישות': '#B8860B',
                'ביטחון': '#1E90FF',
                'חוסר ביטחון': '#DDA0DD',
                'נוסטלגיה': '#DEB887',
                'בדידות': '#5F9EA0',
                'אמפתיה': '#3CB371',
                'סימפטיה': '#48D1CC'
            };
            return colorMap[emotion] || '#9E9E9E';
        }

        function updateCurrentFileInfo(fileInfo) {
            // Update current file name
            const fileElement = document.getElementById('current-file');
            if (fileElement) {
                fileElement.textContent = `${fileInfo.filename} (${fileInfo.index + 1}/${fileInfo.total})`;
            }

            // Update transcript
            const transcriptElement = document.querySelector('#current-transcript .transcript-text');
            if (transcriptElement) {
                transcriptElement.textContent = fileInfo.transcript || 'אין תמלול זמין';
            }

            // Update emotions with Hebrew translations
            const emotionsContainer = document.getElementById('current-emotions');
            if (emotionsContainer) {
                emotionsContainer.innerHTML = '';
                fileInfo.emotions.forEach(emotion => {
                    const tag = document.createElement('div');
                    tag.className = 'emotion-tag';
                    tag.textContent = getHebrewEmotion(emotion); // Use Hebrew translation
                    emotionsContainer.appendChild(tag);
                });
            }
        }

        function updateConversationStats(data) {
            const statsElement = document.getElementById('conversation-stats');
            if (!statsElement) return;

            const mp3Keys = Object.keys(data).filter(k => k.endsWith('.mp3'));
            const totalFiles = mp3Keys.length;
            
            // Count emotions
            const emotionCounts = {};
            mp3Keys.forEach(key => {
                const entry = data[key];
                if (entry && entry.emotions) {
                    entry.emotions.forEach(emotion => {
                        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
                    });
                }
            });

            // Build stats HTML
            let statsHTML = `
                <div>סה"כ קבצים: ${totalFiles}</div>
                <div style="margin-top: 10px;">התפלגות רגשות:</div>
                <div style="margin-top: 5px;">
            `;

            Object.entries(emotionCounts)
                .sort((a, b) => b[1] - a[1])
                .forEach(([emotion, count]) => {
                    const percentage = ((count / totalFiles) * 100).toFixed(1);
                    const emotionHebrew = getHebrewEmotion(emotion); // Use Hebrew translation
                    statsHTML += `<div style="margin: 2px 0;">${emotionHebrew}: ${count} (${percentage}%)</div>`;
                });

            statsHTML += '</div>';
            statsElement.innerHTML = statsHTML;
        }

        // ==================== CONVERSATION SUMMARY FUNCTIONS ====================
        
        function generateConversationSummary(data) {
            console.log('🔍 Generating conversation summary...');
            
            const mp3Keys = Object.keys(data).filter(k => k.endsWith('.mp3')).sort();
            const totalFiles = mp3Keys.length;
            
            if (totalFiles === 0) {
                updateSummaryElements({
                    summary: 'אין נתונים זמינים לסיכום',
                    themes: [],
                    progression: [],
                    metrics: {
                        duration: '0 דקות',
                        words: '0',
                        segments: '0',
                        dominantEmotion: 'לא זמין'
                    }
                });
                return;
            }
            
            // Analyze conversation data
            const analysis = analyzeConversationData(data, mp3Keys);
            
            // Generate summary text
            const summaryText = generateSummaryText(analysis);
            
            // Identify main themes
            const themes = identifyMainThemes(analysis);
            
            // Create emotional progression
            const progression = createEmotionalProgression(data, mp3Keys);
            
            // Calculate metrics
            const metrics = calculateConversationMetrics(data, mp3Keys);
            
            // Update UI
            updateSummaryElements({
                summary: summaryText,
                themes: themes,
                progression: progression,
                metrics: metrics
            });
        }
        
        function analyzeConversationData(data, mp3Keys) {
            const emotionCounts = {};
            const transcriptSegments = [];
            const emotionalIntensity = [];
            
            mp3Keys.forEach((key, index) => {
                const entry = data[key];
                if (entry) {
                    // Count emotions
                    if (entry.emotions) {
                        entry.emotions.forEach(emotion => {
                            emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
                        });
                    }
                    
                    // Collect transcripts
                    if (entry.transcript || entry.words) {
                        transcriptSegments.push({
                            index: index,
                            text: entry.transcript || entry.words || '',
                            emotions: entry.emotions || [],
                            timestamp: `${String(Math.floor(index / 60)).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}`
                        });
                    }
                    
                    // Calculate emotional intensity
                    const intensity = calculateEmotionalIntensity(entry.emotions || []);
                    emotionalIntensity.push({
                        index: index,
                        intensity: intensity,
                        emotions: entry.emotions || []
                    });
                }
            });
            
            return {
                emotionCounts,
                transcriptSegments,
                emotionalIntensity,
                totalSegments: mp3Keys.length
            };
        }
        
        function calculateEmotionalIntensity(emotions) {
            const intensityMap = {
                // Basic emotions
                'happiness': 0.8,
                'joy': 0.9,
                'sadness': 0.7,
                'anger': 0.9,
                'fear': 0.8,
                'surprise': 0.6,
                'disgust': 0.7,
                'neutral': 0.1,
                'calm': 0.2,
                'excitement': 0.8,
                
                // Extended emotions
                'curiosity': 0.6,
                'confusion': 0.5,
                'annoyance': 0.7,
                'frustration': 0.8,
                'caring': 0.6,
                'love': 0.9,
                'hate': 0.9,
                'jealousy': 0.8,
                'guilt': 0.7,
                'shame': 0.7,
                'pride': 0.7,
                'relief': 0.6,
                'anxiety': 0.8,
                'stress': 0.8,
                'boredom': 0.3,
                'interest': 0.6,
                'admiration': 0.7,
                'contempt': 0.7,
                'envy': 0.7,
                'grief': 0.9,
                'hope': 0.6,
                'optimism': 0.7,
                'pessimism': 0.5,
                'satisfaction': 0.6,
                'disappointment': 0.7,
                'determination': 0.8,
                'confidence': 0.7,
                'insecurity': 0.6,
                'nostalgia': 0.5,
                'loneliness': 0.7,
                'empathy': 0.6,
                'sympathy': 0.5
            };
            
            if (emotions.length === 0) return 0.1;
            
            const totalIntensity = emotions.reduce((sum, emotion) => {
                return sum + (intensityMap[emotion.toLowerCase()] || 0.5);
            }, 0);
            
            return totalIntensity / emotions.length;
        }
        
        function generateSummaryText(analysis) {
            const { emotionCounts, transcriptSegments, totalSegments } = analysis;
            
            // Find dominant emotions
            const sortedEmotions = Object.entries(emotionCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);
            
            const dominantEmotion = sortedEmotions[0]?.[0] || 'neutral';
            const dominantCount = sortedEmotions[0]?.[1] || 0;
            const dominantPercentage = Math.round((dominantCount / totalSegments) * 100);
            
            // Analyze conversation flow
            const hasTranscripts = transcriptSegments.length > 0;
            const avgWordsPerSegment = hasTranscripts ? 
                transcriptSegments.reduce((sum, seg) => sum + (seg.text.split(' ').length || 0), 0) / transcriptSegments.length : 0;
            
            // Generate summary
            let summary = `השיחה כוללת ${totalSegments} קטעים`;
            
            if (dominantEmotion !== 'neutral') {
                const emotionHebrew = getHebrewEmotion(dominantEmotion);
                summary += ` עם ${emotionHebrew} כרגש השולט (${dominantPercentage}% מהקטעים)`;
            }
            
            if (hasTranscripts) {
                summary += `. זוהו ${transcriptSegments.length} קטעים עם תמלול`;
                
                if (avgWordsPerSegment > 0) {
                    summary += `, בממוצע ${Math.round(avgWordsPerSegment)} מילים לקטע`;
                }
            }
            
            // Add emotional progression insight
            if (sortedEmotions.length > 1) {
                const secondaryEmotion = getHebrewEmotion(sortedEmotions[1][0]);
                const secondaryPercentage = Math.round((sortedEmotions[1][1] / totalSegments) * 100);
                summary += `. רגש משני הוא ${secondaryEmotion} (${secondaryPercentage}%)`;
            }
            
            summary += '.';
            
            return summary;
        }
        
        function getHebrewEmotion(emotion) {
            const emotionMap = {
                // Basic emotions
                'happiness': 'שמחה',
                'joy': 'עליזות',
                'sadness': 'עצב',
                'anger': 'כעס',
                'fear': 'פחד',
                'surprise': 'הפתעה',
                'disgust': 'גועל',
                'neutral': 'נייטרלי',
                'calm': 'רוגע',
                'excitement': 'התרגשות',
                
                // Extended emotions
                'curiosity': 'סקרנות',
                'confusion': 'בלבול',
                'annoyance': 'עצבנות',
                'frustration': 'תסכול',
                'caring': 'דאגה',
                'love': 'אהבה',
                'hate': 'שנאה',
                'jealousy': 'קנאה',
                'guilt': 'אשמה',
                'shame': 'בושה',
                'pride': 'גאווה',
                'relief': 'הקלה',
                'anxiety': 'חרדה',
                'stress': 'לחץ',
                'boredom': 'שעמום',
                'interest': 'עניין',
                'admiration': 'הערצה',
                'contempt': 'בוז',
                'envy': 'קנאה',
                'grief': 'אבל',
                'hope': 'תקווה',
                'optimism': 'אופטימיות',
                'pessimism': 'פסימיות',
                'satisfaction': 'שביעות רצון',
                'disappointment': 'אכזבה',
                'determination': 'נחישות',
                'confidence': 'ביטחון',
                'insecurity': 'חוסר ביטחון',
                'nostalgia': 'נוסטלגיה',
                'loneliness': 'בדידות',
                'empathy': 'אמפתיה',
                'sympathy': 'סימפטיה'
            };
            return emotionMap[emotion.toLowerCase()] || emotion;
        }
        
        function identifyMainThemes(analysis) {
            const { emotionCounts, transcriptSegments } = analysis;
            const themes = [];
            
            // Theme 1: Emotional tone
            const sortedEmotions = Object.entries(emotionCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 2);
            
            if (sortedEmotions.length > 0) {
                const primaryEmotion = sortedEmotions[0][0];
                const primaryCount = sortedEmotions[0][1];
                const emotionHebrew = getHebrewEmotion(primaryEmotion);
                
                themes.push({
                    title: `רגש מרכזי: ${emotionHebrew}`,
                    description: `מופיע ב-${primaryCount} קטעים מתוך השיחה`
                });
            }
            
            // Theme 2: Conversation length and structure
            const totalSegments = analysis.totalSegments;
            const estimatedDuration = Math.round(totalSegments * 0.5); // Assume 30 seconds per segment
            
            let lengthCategory = '';
            if (estimatedDuration < 5) lengthCategory = 'קצרה';
            else if (estimatedDuration < 15) lengthCategory = 'בינונית';
            else lengthCategory = 'ארוכה';
            
            themes.push({
                title: `שיחה ${lengthCategory}`,
                description: `כ-${estimatedDuration} דקות עם ${totalSegments} קטעים`
            });
            
            // Theme 3: Emotional variety
            const emotionVariety = Object.keys(emotionCounts).length;
            let varietyDescription = '';
            
            if (emotionVariety <= 2) {
                varietyDescription = 'מגוון רגשי מוגבל - שיחה יחסית חד-ממדית';
            } else if (emotionVariety <= 4) {
                varietyDescription = 'מגוון רגשי בינוני - שיחה עם כמה גוונים רגשיים';
            } else {
                varietyDescription = 'מגוון רגשי עשיר - שיחה מורכבת רגשית';
            }
            
            themes.push({
                title: 'מגוון רגשי',
                description: varietyDescription
            });
            
            return themes;
        }
        
        function createEmotionalProgression(data, mp3Keys) {
            const progression = [];
            const segmentSize = Math.max(1, Math.floor(mp3Keys.length / 8)); // Divide into ~8 chunks
            
            for (let i = 0; i < mp3Keys.length; i += segmentSize) {
                const chunk = mp3Keys.slice(i, i + segmentSize);
                const emotionCounts = {};
                
                chunk.forEach(key => {
                    const entry = data[key];
                    if (entry && entry.emotions) {
                        entry.emotions.forEach(emotion => {
                            emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
                        });
                    }
                });
                
                const dominantEmotion = Object.entries(emotionCounts)
                    .sort((a, b) => b[1] - a[1])[0];
                
                if (dominantEmotion) {
                    const timeLabel = `${Math.floor(i * 0.5)}:${String((i * 30) % 60).padStart(2, '0')}`;
                    progression.push({
                        time: timeLabel,
                        emotion: getHebrewEmotion(dominantEmotion[0]),
                        intensity: dominantEmotion[1] / chunk.length
                    });
                }
            }
            
            return progression;
        }
        
        function calculateConversationMetrics(data, mp3Keys) {
            const totalSegments = mp3Keys.length;
            const estimatedDuration = Math.round(totalSegments * 0.5); // 30 seconds per segment
            
            // Count total words
            let totalWords = 0;
            mp3Keys.forEach(key => {
                const entry = data[key];
                if (entry && (entry.transcript || entry.words)) {
                    const text = entry.transcript || entry.words || '';
                    totalWords += text.split(' ').length;
                }
            });
            
            // Find dominant emotion
            const emotionCounts = {};
            mp3Keys.forEach(key => {
                const entry = data[key];
                if (entry && entry.emotions) {
                    entry.emotions.forEach(emotion => {
                        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
                    });
                }
            });
            
            const dominantEmotion = Object.entries(emotionCounts)
                .sort((a, b) => b[1] - a[1])[0];
            
            return {
                duration: `${estimatedDuration} דקות`,
                words: totalWords.toLocaleString('he-IL'),
                segments: totalSegments.toLocaleString('he-IL'),
                dominantEmotion: dominantEmotion ? getHebrewEmotion(dominantEmotion[0]) : 'לא זמין'
            };
        }
        
        function updateSummaryElements(summaryData) {
            // This function is kept for backward compatibility but will be less used
            // since we now have dedicated meeting summary functionality
            
            // Update old conversation summary (if elements exist)
            const oldSummaryElement = document.getElementById('conversation-summary');
            if (oldSummaryElement) {
                oldSummaryElement.innerHTML = `
                    <div class="summary-content">${summaryData.summary}</div>
                `;
            }
            
            // Update old themes container (if exists)
            const oldThemesContainer = document.querySelector('#main-themes .themes-container');
            if (oldThemesContainer) {
                oldThemesContainer.innerHTML = '';
                summaryData.themes.forEach(theme => {
                    const themeElement = document.createElement('div');
                    themeElement.className = 'theme-item';
                    themeElement.innerHTML = `
                        <div class="theme-title">${theme.title}</div>
                        <div class="theme-description">${theme.description}</div>
                    `;
                    oldThemesContainer.appendChild(themeElement);
                });
            }
            
            // Update old emotional progression (if exists)
            const oldProgressionElement = document.querySelector('#emotional-progression .progression-chart');
            if (oldProgressionElement) {
                if (summaryData.progression.length > 0) {
                    oldProgressionElement.innerHTML = `
                        <div class="progression-timeline">
                            ${summaryData.progression.map(item => `
                                <div class="progression-item">
                                    <span class="progression-time">${item.time}</span>
                                    <span class="progression-emotion">${item.emotion}</span>
                                    <div class="emotion-progression-bar">
                                        <div class="emotion-progression-fill" style="width: ${Math.round(item.intensity * 100)}%; background-color: var(--accent-color);"></div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                } else {
                    oldProgressionElement.innerHTML = '<div style="text-align: center; color: var(--text-secondary);">אין נתונים לתצוגה</div>';
                }
            }
            
            // Update old metrics (if elements exist)
            const metrics = summaryData.metrics;
            const oldDurationElement = document.getElementById('total-duration');
            if (oldDurationElement) oldDurationElement.textContent = metrics.duration;
            
            const oldWordsElement = document.getElementById('total-words');
            if (oldWordsElement) oldWordsElement.textContent = metrics.words;
            
            const oldSegmentsElement = document.getElementById('total-segments');
            if (oldSegmentsElement) oldSegmentsElement.textContent = metrics.segments;
            
            const oldEmotionElement = document.getElementById('dominant-emotion');
            if (oldEmotionElement) oldEmotionElement.textContent = metrics.dominantEmotion;
            
            console.log('✅ Conversation summary updated (legacy format)');
        }
    }
});