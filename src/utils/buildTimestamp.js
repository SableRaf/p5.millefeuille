/**
 * Logs deployment information to console
 * Shows build date, time, and duration since deployment
 */
(function() {
  // Check if build timestamp is available (injected by webpack)
  if (typeof __BUILD_TIMESTAMP__ !== 'undefined') {
    var buildDate = new Date(__BUILD_TIMESTAMP__);
    var now = new Date();
    var durationMs = now - buildDate;

    // Format date as: Jan 12, 2025
    var dateStr = buildDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    // Format time as: 3:45 PM
    var timeStr = buildDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    // Calculate human-readable duration
    var durationStr;
    var seconds = Math.floor(durationMs / 1000);
    var minutes = Math.floor(seconds / 60);
    var hours = Math.floor(minutes / 60);
    var days = Math.floor(hours / 24);

    if (days > 0) {
      durationStr = days + ' day' + (days !== 1 ? 's' : '') + ' ago';
    } else if (hours > 0) {
      durationStr = hours + ' hour' + (hours !== 1 ? 's' : '') + ' ago';
    } else if (minutes > 0) {
      durationStr = minutes + ' minute' + (minutes !== 1 ? 's' : '') + ' ago';
    } else {
      durationStr = seconds + ' second' + (seconds !== 1 ? 's' : '') + ' ago';
    }

    var tzName = '';
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
        .formatToParts(buildDate);
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].type === 'timeZoneName') {
          tzName = parts[i].value;
          break;
        }
      }
    } catch (e) {
      // Timezone name not available
    }

    console.log('📅 Last updated on ' + dateStr + ' at ' + timeStr + (tzName ? ' ' + tzName : '') + ' (' + durationStr + ')');
  }
})();