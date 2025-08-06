// Performance Monitor - Simple placeholder
console.log('Performance monitor loaded successfully');

// Simple performance tracking
window.performanceMonitor = {
  start: function(label) {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(label + '-start');
    }
  },
  
  end: function(label) {
    if (typeof performance !== 'undefined' && performance.mark && performance.measure) {
      performance.mark(label + '-end');
      performance.measure(label, label + '-start', label + '-end');
    }
  },
  
  log: function(message) {
    console.log('[Performance]', message);
  }
}; 