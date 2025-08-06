// Fix for tooltip disappearing on hover
// This script improves the tooltip behavior for conversation items

function fixTooltipHover() {
    console.log('🔧 Applying tooltip hover fix...');
    
    // Remove the problematic transform on hover that might interfere with tooltips
    const style = document.createElement('style');
    style.textContent = `
        .conversation-item:hover {
            background: #e9ecef !important;
            transform: none !important; /* Remove transform that might interfere with tooltips */
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15) !important;
        }
        
        /* Ensure tooltips have proper z-index and positioning */
        [title]:hover::after {
            content: attr(title);
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            white-space: pre-wrap;
            max-width: 300px;
            z-index: 10000;
            pointer-events: none;
            animation: tooltipFadeIn 0.2s ease-in-out;
        }
        
        @keyframes tooltipFadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        /* Improve conversation item hover behavior */
        .conversation-item {
            position: relative;
            transition: all 0.3s ease !important;
        }
        
        .conversation-item:hover {
            background: #e9ecef !important;
            border-color: rgba(102, 126, 234, 0.3) !important;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15) !important;
        }
    `;
    document.head.appendChild(style);
    
    // Add custom tooltip functionality ONLY for conversation grid items
    const conversationItems = document.querySelectorAll('.conversation-grid-item-container, [id^="conv-item-"]');
    conversationItems.forEach(item => {
        const originalTitle = item.getAttribute('title');
        if (originalTitle) {
            // Remove the title attribute to prevent default tooltip
            item.removeAttribute('title');
            
            // Create custom tooltip
            let tooltip = null;
            let tooltipTimeout = null;
            
            item.addEventListener('mouseenter', (e) => {
                // Clear any existing timeout
                if (tooltipTimeout) {
                    clearTimeout(tooltipTimeout);
                }
                
                // Create tooltip after a short delay
                tooltipTimeout = setTimeout(() => {
                    tooltip = document.createElement('div');
                    tooltip.className = 'custom-tooltip';
                    tooltip.textContent = originalTitle;
                    tooltip.style.cssText = `
                        position: absolute;
                        background: rgba(0, 0, 0, 0.9);
                        color: white;
                        padding: 10px 15px;
                        border-radius: 8px;
                        font-size: 12px;
                        white-space: pre-wrap;
                        max-width: 350px;
                        z-index: 10000;
                        pointer-events: none;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                        animation: tooltipFadeIn 0.2s ease-in-out;
                        top: ${e.clientY + 10}px;
                        left: ${e.clientX + 10}px;
                    `;
                    document.body.appendChild(tooltip);
                }, 500); // 500ms delay before showing tooltip
            });
            
            item.addEventListener('mouseleave', () => {
                if (tooltipTimeout) {
                    clearTimeout(tooltipTimeout);
                    tooltipTimeout = null;
                }
                if (tooltip) {
                    tooltip.remove();
                    tooltip = null;
                }
            });
            
            item.addEventListener('mousemove', (e) => {
                if (tooltip) {
                    tooltip.style.top = `${e.clientY + 10}px`;
                    tooltip.style.left = `${e.clientX + 10}px`;
                }
            });
        }
    });
    
    console.log('✅ Tooltip hover fix applied');
}

// Apply the fix when the page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixTooltipHover);
} else {
    fixTooltipHover();
}

// Also apply when conversations are loaded
const originalLoadConversations = window.loadConversations;
if (originalLoadConversations) {
    window.loadConversations = async function(...args) {
        const result = await originalLoadConversations.apply(this, args);
        setTimeout(fixTooltipHover, 100); // Apply fix after conversations are loaded
        return result;
    };
} 