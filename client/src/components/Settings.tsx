import React, { useState, useEffect, useCallback } from 'react';
import key from '../assets/key.gif'
import audio from '../assets/audio.gif'

type HotkeyMap = {
  Brush: string;
  Fill: string;
  Undo: string;
  Clear: string;
  Swap: string;
};

const DEFAULT_HOTKEYS: HotkeyMap = {
  Brush: 'B',
  Fill: 'F',
  Undo: 'U',
  Clear: 'C',
  Swap: 'S',
};

interface SettingsPanelProps {
  onClose?: () => void;
  onSave?: (volume: number, hotkeys: HotkeyMap) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose, onSave }) => {
  const [volume, setVolume] = useState<number>(100);
  const [hotkeys, setHotkeys] = useState<HotkeyMap>({ ...DEFAULT_HOTKEYS });
  const [listening, setListening] = useState<keyof HotkeyMap | null>(null);

  const sliderBackground = `linear-gradient(to right, rgba(255,255,255,0.85) ${volume}%, rgba(255,255,255,0.15) ${volume}%)`;

  const startListening = (action: keyof HotkeyMap) => {
    setListening(action);
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!listening) return;
      e.preventDefault();

      const key = e.key.toUpperCase();

      if (key === 'ESCAPE') {
        setListening(null);
        return;
      }

      const validFKeys = ['F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12'];
      if (key.length === 1 || validFKeys.includes(key)) {
        setHotkeys(prev => ({ ...prev, [listening]: key }));
        setListening(null);
      }
    },
    [listening]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleReset = () => {
    setHotkeys({ ...DEFAULT_HOTKEYS });
    setListening(null);
  };

  const handleSave = () => {
    onSave?.(volume, hotkeys);
    onClose?.();
  };

  const handleCancel = () => {
    onClose?.();
  };

  return (
    <div className="settings-overlay">
      <div className="settings-panel">
        {/* Title */}
        <h2 className="settings-panel__title">Settings</h2>

        {/* Close */}
        <button
          className="settings-panel__close"
          onClick={handleCancel}
          aria-label="Close settings"
        >
          ✕
        </button>

        {/* Volume */}
        <div className="settings-panel__volume">
          <div className="settings-panel__section-label">
            <span className="settings-panel__section-icon" aria-hidden="true">
              <img src={audio} alt="audio" className="shadow" />
            </span>
            Volume {volume}%
          </div>
          <div className="settings-panel__volume-row">
            <input
              type="range"
              className="settings-panel__slider"
              min={0}
              max={100}
              step={1}
              value={volume}
              onChange={e => setVolume(Number(e.target.value))}
              style={{ background: sliderBackground }}
              aria-label="Volume"
            />
            <span className="settings-panel__vol-value">{volume}%</span>
          </div>
        </div>

        <hr className="settings-panel__divider" />

        {/* Hotkeys */}
        <div className="settings-panel__hotkeys-header">
          <div className="settings-panel__section-label settings-panel__hotkeys-label">
            <span className="settings-panel__section-icon" aria-hidden="true">
              <img src={key} alt="key" className="shadow" />
            </span>
            Hotkeys
          </div>
          <button className="settings-panel__reset-btn" onClick={handleReset}>
            Reset
            <span className="settings-panel__tooltip">Reset hotkeys to default</span>
          </button>
        </div>

        <div className="settings-panel__hotkeys-grid">
          {(Object.keys(hotkeys) as Array<keyof HotkeyMap>).map(action => (
            <div key={action} className="settings-panel__hotkey-field">
              <label
                className="settings-panel__hotkey-label"
                htmlFor={`hk-${action}`}
              >
                {action}
              </label>
              <input
                id={`hk-${action}`}
                type="text"
                className={[
                  'settings-panel__hotkey-input',
                  listening === action ? 'settings-panel__hotkey-input--listening' : '',
                ].join(' ').trim()}
                value={listening === action ? '…' : hotkeys[action]}
                readOnly
                onClick={() => startListening(action)}
                title={`Click to rebind ${action}`}
                aria-label={`${action} hotkey: ${hotkeys[action]}`}
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="settings-panel__footer">
          <button className="settings-panel__btn-secondary" onClick={handleCancel}>
            Cancel
          </button>
          <button className="settings-panel__btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;