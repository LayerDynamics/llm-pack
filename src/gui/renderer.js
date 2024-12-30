const React = require('react');
const { createRoot } = require('react-dom/client');
const { ipcRenderer } = require('electron');
const ProgressBar = require('./components/ProgressBar');
const LogViewer = require('./components/LogViewer');
const ErrorDialog = require('./components/ErrorDialog');

const App = () => {
  const [progress, setProgress] = React.useState(50); // Set initial progress
  const [logs, setLogs] = React.useState([
    { level: 'info', message: 'Application started' },
    { level: 'debug', message: 'Initializing components' },
    { level: 'error', message: 'Test error message' }
  ]);
  const [error, setError] = React.useState(null);
  const [settings, setSettings] = React.useState(null);

  React.useEffect(() => {
    console.log('App mounted, loading settings...');
    loadSettings();
    setupLogListener();
  }, []);

  const loadSettings = async () => {
    try {
      const loadedSettings = await ipcRenderer.invoke('settings:load');
      setSettings(loadedSettings);
    } catch (error) {
      setError({
        title: 'Settings Error',
        message: 'Failed to load settings: ' + error.message,
        recoverable: true
      });
    }
  };

  const setupLogListener = () => {
    console.log('Setting up log listener...');
    ipcRenderer.on('log:update', (event, logEntry) => {
      console.log('Received log:', logEntry);
      setLogs(prevLogs => [...prevLogs, logEntry]);
    });
  };

  const handleSettingsSave = async (newSettings) => {
    await ipcRenderer.invoke('settings:save', newSettings);
    setSettings(newSettings);
  };

  const handleErrorClose = () => {
    setError(null);
  };

  return (
    <div className="app-container" style={{
      padding: '20px',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h1 style={{ marginBottom: '20px' }}>LLM-Pack</h1>
      <ProgressBar progress={progress} />
      <LogViewer logs={logs} />
      {error && (
        <ErrorDialog
          error={error}
          onClose={handleErrorClose}
          onRetry={() => {
            setError(null);
            loadSettings();
          }}
        />
      )}
    </div>
  );
};

// Only run in browser environment, not during tests
if (typeof window !== 'undefined' && !process.env.NODE_ENV === 'test') {
  const root = createRoot(document.getElementById('app'));
  root.render(<App />);
}

module.exports = App; // Export the App component
