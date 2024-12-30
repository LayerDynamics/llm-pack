const React = require('react');

const LogViewer = ({ logs = [] }) => {
  const logEnd = React.useRef();

  React.useEffect(() => {
    logEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = (`0${date.getMonth() + 1}`).slice(-2); // Months are zero-based
    const day = (`0${date.getDate()}`).slice(-2);
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="log-viewer" style={{
      height: '300px',
      overflow: 'auto',
      padding: '10px',
      border: '1px solid #ccc',
      borderRadius: '4px',
      backgroundColor: '#f5f5f5'
    }}>
      {logs.length === 0 ? (
        <div>No logs to display</div>
      ) : (
        logs.map((log, index) => (
          <div 
            key={index} 
            className={`log-entry log-${log.level}`}
            style={{
              padding: '4px 8px',
              marginBottom: '4px',
              borderRadius: '2px',
              backgroundColor: log.level === 'error' ? '#fee' : '#fff'
            }}
          >
            <strong>{log.level.toUpperCase()}:</strong> {log.message}
            {log.timestamp && (
              <span style={{ marginLeft: '10px', color: '#888', fontSize: '0.9em' }}>
                {formatDate(log.timestamp)}
              </span>
            )}
          </div>
        ))
      )}
      <div ref={logEnd} />
    </div>
  );
};

module.exports = LogViewer;
