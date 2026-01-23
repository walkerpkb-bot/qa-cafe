import React, { useState, useEffect, useRef } from 'react';

interface Props {
  project: string | null;
}

interface LogEntry {
  id: string;
  type: 'text' | 'voice' | 'screenshot';
  content: string;
  timestamp: number;
  duration?: number; // for voice notes
}

interface Session {
  id: string;
  startTime: number;
  endTime?: number;
  entries: LogEntry[];
}

const getSessionKey = (project: string) => `qa-cafe-sessions-${project}`;

function SessionLogger({ project }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [textInput, setTextInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<number | null>(null);

  // Load sessions when project changes
  useEffect(() => {
    if (project) {
      try {
        const saved = localStorage.getItem(getSessionKey(project));
        const loadedSessions = saved ? JSON.parse(saved) : [];
        setSessions(loadedSessions);
        // Check for active session
        const active = loadedSessions.find((s: Session) => !s.endTime);
        setActiveSession(active || null);
      } catch {
        setSessions([]);
      }
    } else {
      setSessions([]);
      setActiveSession(null);
    }
  }, [project]);

  // Save sessions when they change
  useEffect(() => {
    if (project && sessions.length > 0) {
      localStorage.setItem(getSessionKey(project), JSON.stringify(sessions));
    }
  }, [sessions, project]);

  const startSession = () => {
    const newSession: Session = {
      id: Date.now().toString(),
      startTime: Date.now(),
      entries: [],
    };
    setSessions(prev => [...prev, newSession]);
    setActiveSession(newSession);
  };

  const endSession = () => {
    if (!activeSession) return;
    const updated = sessions.map(s =>
      s.id === activeSession.id ? { ...s, endTime: Date.now() } : s
    );
    setSessions(updated);
    setActiveSession(null);
  };

  const addEntry = (entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    if (!activeSession) return;

    const newEntry: LogEntry = {
      ...entry,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };

    const updated = sessions.map(s =>
      s.id === activeSession.id
        ? { ...s, entries: [...s.entries, newEntry] }
        : s
    );
    setSessions(updated);
    setActiveSession(prev => prev ? { ...prev, entries: [...prev.entries, newEntry] } : null);
  };

  const addTextNote = () => {
    if (!textInput.trim()) return;
    addEntry({ type: 'text', content: textInput.trim() });
    setTextInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addTextNote();
    }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          addEntry({
            type: 'voice',
            content: base64,
            duration: recordingTime,
          });
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
        setRecordingTime(0);
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Track recording time
      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const captureScreenshot = async () => {
    // For now, just add a placeholder - full screenshot needs Electron desktopCapturer
    const note = prompt('Describe what you see (screenshot capture coming soon):');
    if (note) {
      addEntry({ type: 'screenshot', content: `[Screenshot note] ${note}` });
    }
  };

  const formatTime = (ms: number) => {
    const date = new Date(ms);
    return date.toLocaleTimeString();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSessionDuration = (session: Session) => {
    const end = session.endTime || Date.now();
    const duration = Math.floor((end - session.startTime) / 1000 / 60);
    return `${duration} min`;
  };

  const exportSession = (session: Session) => {
    const markdown = `# Test Session
**Started:** ${new Date(session.startTime).toLocaleString()}
${session.endTime ? `**Ended:** ${new Date(session.endTime).toLocaleString()}` : '**Status:** In Progress'}
**Duration:** ${getSessionDuration(session)}
**Entries:** ${session.entries.length}

## Timeline

${session.entries.map(entry => {
  const time = new Date(entry.timestamp).toLocaleTimeString();
  if (entry.type === 'text') {
    return `### ${time} - Note\n${entry.content}\n`;
  } else if (entry.type === 'voice') {
    return `### ${time} - Voice Note (${formatDuration(entry.duration || 0)})\n[Audio recording]\n`;
  } else {
    return `### ${time} - Screenshot\n${entry.content}\n`;
  }
}).join('\n')}`;

    navigator.clipboard.writeText(markdown);
    alert('Session copied to clipboard as Markdown!');
  };

  const clearSessions = () => {
    if (confirm('Clear all sessions for this project?')) {
      setSessions([]);
      setActiveSession(null);
      if (project) {
        localStorage.removeItem(getSessionKey(project));
      }
    }
  };

  if (!project) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">📹</div>
          <h2 className="empty-state-title">Session Logger</h2>
          <p>Select a project to start logging test sessions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Session Logger</h1>
        <p className="page-description">Capture observations during testing</p>
      </header>

      {/* Session Controls */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            {activeSession ? 'Active Session' : 'Start a Session'}
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            {activeSession ? (
              <>
                <span style={{
                  padding: '6px 12px',
                  backgroundColor: 'rgba(74, 222, 128, 0.2)',
                  color: '#4ade80',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                }}>
                  Recording • {getSessionDuration(activeSession)}
                </span>
                <button className="btn btn-secondary" onClick={endSession}>
                  End Session
                </button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={startSession}>
                Start Session
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Capture (only when session active) */}
      {activeSession && (
        <div className="card">
          <h3 className="card-title">Quick Capture</h3>

          {/* Text Input */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a note... (Enter to save)"
              rows={2}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                resize: 'none',
                fontFamily: 'inherit',
              }}
            />
            <button
              className="btn btn-primary"
              onClick={addTextNote}
              disabled={!textInput.trim()}
              style={{ alignSelf: 'flex-end' }}
            >
              Add Note
            </button>
          </div>

          {/* Voice & Screenshot */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            {isRecording ? (
              <button
                className="btn btn-primary"
                onClick={stopVoiceRecording}
                style={{ backgroundColor: '#ef4444' }}
              >
                ⏹ Stop ({formatDuration(recordingTime)})
              </button>
            ) : (
              <button className="btn btn-secondary" onClick={startVoiceRecording}>
                🎤 Voice Note
              </button>
            )}
            <button className="btn btn-secondary" onClick={captureScreenshot}>
              📸 Screenshot Note
            </button>
          </div>
        </div>
      )}

      {/* Current Session Timeline */}
      {activeSession && activeSession.entries.length > 0 && (
        <div className="card">
          <h3 className="card-title">Current Session ({activeSession.entries.length} entries)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            {[...activeSession.entries].reverse().map(entry => (
              <div
                key={entry.id}
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${
                    entry.type === 'text' ? '#60a5fa' :
                    entry.type === 'voice' ? '#a78bfa' : '#4ade80'
                  }`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-secondary)',
                    textTransform: 'uppercase',
                  }}>
                    {entry.type}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {formatTime(entry.timestamp)}
                  </span>
                </div>
                {entry.type === 'voice' ? (
                  <div>
                    <audio controls src={entry.content} style={{ width: '100%', height: '32px' }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Duration: {formatDuration(entry.duration || 0)}
                    </span>
                  </div>
                ) : (
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{entry.content}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Previous Sessions */}
      {sessions.filter(s => s.endTime).length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title" style={{ margin: 0 }}>Previous Sessions</h3>
            <button
              onClick={clearSessions}
              style={{
                padding: '4px 8px',
                fontSize: '0.75rem',
                backgroundColor: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Clear All
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            {sessions.filter(s => s.endTime).reverse().map(session => (
              <div
                key={session.id}
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>
                    {new Date(session.startTime).toLocaleDateString()} at {formatTime(session.startTime)}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {getSessionDuration(session)} • {session.entries.length} entries
                  </div>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => exportSession(session)}
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  Export
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!activeSession && sessions.length === 0 && (
        <div className="card">
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
            Start a session to begin capturing test observations.
          </p>
        </div>
      )}
    </div>
  );
}

export default SessionLogger;
