import { useState, useEffect } from 'react';
import {
  X,
  Lightbulb,
  Thermometer,
  Camera,
  Power,
  Sun,
  Snowflake,
  Wind,
  RefreshCw,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { smartHomeApi } from '../../services/api';
import './SmartHomeModal.css';

interface SmartHomeModalProps {
  onClose: () => void;
}

type Tab = 'lights' | 'climate' | 'cameras';

interface SmartHomeStatus {
  govee: { configured: boolean; name: string };
  ecobee: { configured: boolean; name: string };
  eufy: { configured: boolean; name: string };
}

interface GoveeDevice {
  device: string;
  model: string;
  deviceName: string;
  controllable: boolean;
  state?: {
    online: boolean;
    powerState: 'on' | 'off';
    brightness: number;
    color?: { r: number; g: number; b: number };
  } | null;
}

interface EcobeeThermostat {
  id: string;
  name: string;
  online: boolean;
  currentTemperature: number;
  targetTemperature: number;
  humidity: number;
  mode: 'heat' | 'cool' | 'auto' | 'auxHeatOnly' | 'off';
  equipmentRunning: string[];
}

interface EufyCamera {
  id: string;
  name: string;
  model: string;
  online: boolean;
  batteryLevel: number;
  motionDetected: boolean;
}

export function SmartHomeModal({ onClose }: SmartHomeModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('lights');
  const [status, setStatus] = useState<SmartHomeStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Govee state
  const [goveeDevices, setGoveeDevices] = useState<GoveeDevice[]>([]);
  const [goveeLoading, setGoveeLoading] = useState(false);

  // Ecobee state
  const [thermostats, setThermostats] = useState<EcobeeThermostat[]>([]);
  const [ecobeeLoading, setEcobeeLoading] = useState(false);

  // Eufy state
  const [cameras, setCameras] = useState<EufyCamera[]>([]);
  const [cameraSnapshots, setCameraSnapshots] = useState<Record<string, string>>({});
  const [eufyLoading, setEufyLoading] = useState(false);

  // Load status on mount
  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const response = await smartHomeApi.getStatus();
      if (response.data.success) {
        setStatus(response.data.data);

        // Auto-select first configured tab
        const data = response.data.data;
        if (data.govee.configured) {
          setActiveTab('lights');
          loadGoveeDevices();
        } else if (data.ecobee.configured) {
          setActiveTab('climate');
          loadEcobeeThermostats();
        } else if (data.eufy.configured) {
          setActiveTab('cameras');
          loadEufyCameras();
        }
      }
    } catch (error) {
      console.error('Failed to load smart home status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGoveeDevices = async () => {
    setGoveeLoading(true);
    try {
      const response = await smartHomeApi.getGoveeDevices();
      if (response.data.success) {
        setGoveeDevices(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load Govee devices:', error);
    } finally {
      setGoveeLoading(false);
    }
  };

  const loadEcobeeThermostats = async () => {
    setEcobeeLoading(true);
    try {
      const response = await smartHomeApi.getEcobeeThermostats();
      if (response.data.success) {
        setThermostats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load Ecobee thermostats:', error);
    } finally {
      setEcobeeLoading(false);
    }
  };

  const loadEufyCameras = async () => {
    setEufyLoading(true);
    try {
      const response = await smartHomeApi.getEufyCameras();
      if (response.data.success) {
        setCameras(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load Eufy cameras:', error);
    } finally {
      setEufyLoading(false);
    }
  };

  // Handle tab change
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'lights' && goveeDevices.length === 0 && status?.govee.configured) {
      loadGoveeDevices();
    } else if (tab === 'climate' && thermostats.length === 0 && status?.ecobee.configured) {
      loadEcobeeThermostats();
    } else if (tab === 'cameras' && cameras.length === 0 && status?.eufy.configured) {
      loadEufyCameras();
    }
  };

  // Govee controls
  const toggleGoveeDevice = async (device: GoveeDevice) => {
    const isOn = device.state?.powerState === 'on';
    try {
      await smartHomeApi.controlGovee(device.device, {
        model: device.model,
        action: isOn ? 'turn_off' : 'turn_on',
      });
      // Refresh device state after a short delay
      setTimeout(loadGoveeDevices, 500);
    } catch (error) {
      console.error('Failed to toggle Govee device:', error);
    }
  };

  const setGoveeBrightness = async (device: GoveeDevice, brightness: number) => {
    try {
      await smartHomeApi.controlGovee(device.device, {
        model: device.model,
        action: 'set_brightness',
        value: brightness,
      });
      // Update local state immediately for responsiveness
      setGoveeDevices(prev => prev.map(d =>
        d.device === device.device
          ? { ...d, state: d.state ? { ...d.state, brightness } : null }
          : d
      ));
    } catch (error) {
      console.error('Failed to set Govee brightness:', error);
    }
  };

  // Ecobee controls
  const setEcobeeTemperature = async (thermostat: EcobeeThermostat, temp: number) => {
    try {
      await smartHomeApi.controlEcobee(thermostat.id, {
        action: 'set_temperature',
        value: temp,
        holdType: 'nextTransition',
      });
      // Update local state
      setThermostats(prev => prev.map(t =>
        t.id === thermostat.id ? { ...t, targetTemperature: temp } : t
      ));
    } catch (error) {
      console.error('Failed to set Ecobee temperature:', error);
    }
  };

  const setEcobeeMode = async (thermostat: EcobeeThermostat, mode: string) => {
    try {
      await smartHomeApi.controlEcobee(thermostat.id, {
        action: 'set_mode',
        value: mode,
      });
      // Refresh thermostat state
      setTimeout(loadEcobeeThermostats, 500);
    } catch (error) {
      console.error('Failed to set Ecobee mode:', error);
    }
  };

  // Eufy controls
  const loadCameraSnapshot = async (cameraId: string) => {
    try {
      const response = await smartHomeApi.getEufySnapshot(cameraId);
      if (response.data.success && response.data.data.imageUrl) {
        setCameraSnapshots(prev => ({
          ...prev,
          [cameraId]: response.data.data.imageUrl,
        }));
      }
    } catch (error) {
      console.error('Failed to load camera snapshot:', error);
    }
  };

  const hasConfiguredServices = status && (
    status.govee.configured ||
    status.ecobee.configured ||
    status.eufy.configured
  );

  if (loading) {
    return (
      <div className="smart-home-modal-overlay" onClick={onClose}>
        <div className="smart-home-modal" onClick={e => e.stopPropagation()}>
          <div className="smart-home-loading">Loading smart home status...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="smart-home-modal-overlay" onClick={onClose}>
      <div className="smart-home-modal" onClick={e => e.stopPropagation()}>
        <div className="smart-home-header">
          <h2>Smart Home</h2>
          <button className="smart-home-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {!hasConfiguredServices ? (
          <div className="smart-home-not-configured">
            <p>No smart home services are configured.</p>
            <p className="smart-home-hint">
              Add your API keys to the environment variables:
            </p>
            <ul>
              <li><code>GOVEE_API_KEY</code> - For Govee lights</li>
              <li><code>ECOBEE_API_KEY</code> + <code>ECOBEE_REFRESH_TOKEN</code> - For Ecobee thermostat</li>
              <li><code>EUFY_EMAIL</code> + <code>EUFY_PASSWORD</code> - For Eufy cameras</li>
            </ul>
          </div>
        ) : (
          <>
            <div className="smart-home-tabs">
              {status?.govee.configured && (
                <button
                  className={`smart-home-tab ${activeTab === 'lights' ? 'active' : ''}`}
                  onClick={() => handleTabChange('lights')}
                >
                  <Lightbulb size={20} />
                  <span>Lights</span>
                </button>
              )}
              {status?.ecobee.configured && (
                <button
                  className={`smart-home-tab ${activeTab === 'climate' ? 'active' : ''}`}
                  onClick={() => handleTabChange('climate')}
                >
                  <Thermometer size={20} />
                  <span>Climate</span>
                </button>
              )}
              {status?.eufy.configured && (
                <button
                  className={`smart-home-tab ${activeTab === 'cameras' ? 'active' : ''}`}
                  onClick={() => handleTabChange('cameras')}
                >
                  <Camera size={20} />
                  <span>Cameras</span>
                </button>
              )}
            </div>

            <div className="smart-home-content">
              {/* Lights Tab */}
              {activeTab === 'lights' && (
                <div className="smart-home-lights">
                  <div className="smart-home-section-header">
                    <h3>Govee Lights</h3>
                    <button
                      className="smart-home-refresh"
                      onClick={loadGoveeDevices}
                      disabled={goveeLoading}
                    >
                      <RefreshCw size={16} className={goveeLoading ? 'spinning' : ''} />
                    </button>
                  </div>

                  {goveeLoading && goveeDevices.length === 0 ? (
                    <div className="smart-home-loading">Loading devices...</div>
                  ) : goveeDevices.length === 0 ? (
                    <div className="smart-home-empty">No Govee devices found</div>
                  ) : (
                    <div className="govee-devices-grid">
                      {goveeDevices.map(device => (
                        <div
                          key={device.device}
                          className={`govee-device-card ${device.state?.powerState === 'on' ? 'on' : 'off'}`}
                        >
                          <div className="govee-device-header">
                            <Lightbulb
                              size={24}
                              className={device.state?.powerState === 'on' ? 'light-on' : ''}
                            />
                            <span className="govee-device-name">{device.deviceName}</span>
                            <button
                              className={`govee-power-btn ${device.state?.powerState === 'on' ? 'on' : ''}`}
                              onClick={() => toggleGoveeDevice(device)}
                              title={device.state?.powerState === 'on' ? 'Turn off' : 'Turn on'}
                            >
                              <Power size={18} />
                            </button>
                          </div>

                          {device.state?.powerState === 'on' && (
                            <div className="govee-device-controls">
                              <label>Brightness</label>
                              <input
                                type="range"
                                min="1"
                                max="100"
                                value={device.state?.brightness || 50}
                                onChange={e => setGoveeBrightness(device, parseInt(e.target.value))}
                                className="govee-brightness-slider"
                              />
                              <span className="govee-brightness-value">
                                {device.state?.brightness || 50}%
                              </span>
                            </div>
                          )}

                          <div className="govee-device-status">
                            {device.state?.online === false && (
                              <span className="offline">Offline</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Climate Tab */}
              {activeTab === 'climate' && (
                <div className="smart-home-climate">
                  <div className="smart-home-section-header">
                    <h3>Ecobee Thermostats</h3>
                    <button
                      className="smart-home-refresh"
                      onClick={loadEcobeeThermostats}
                      disabled={ecobeeLoading}
                    >
                      <RefreshCw size={16} className={ecobeeLoading ? 'spinning' : ''} />
                    </button>
                  </div>

                  {ecobeeLoading && thermostats.length === 0 ? (
                    <div className="smart-home-loading">Loading thermostats...</div>
                  ) : thermostats.length === 0 ? (
                    <div className="smart-home-empty">No thermostats found</div>
                  ) : (
                    <div className="ecobee-thermostats">
                      {thermostats.map(thermostat => (
                        <div key={thermostat.id} className="ecobee-thermostat-card">
                          <div className="ecobee-header">
                            <Thermometer size={24} />
                            <span className="ecobee-name">{thermostat.name}</span>
                            {!thermostat.online && (
                              <span className="ecobee-offline">Offline</span>
                            )}
                          </div>

                          <div className="ecobee-current-temp">
                            <span className="temp-value">{thermostat.currentTemperature}°F</span>
                            <span className="temp-label">Current</span>
                          </div>

                          <div className="ecobee-target-controls">
                            <span className="target-label">Target: {thermostat.targetTemperature}°F</span>
                            <div className="target-buttons">
                              <button
                                onClick={() => setEcobeeTemperature(thermostat, thermostat.targetTemperature - 1)}
                                className="temp-adjust"
                              >
                                <ChevronDown size={20} />
                              </button>
                              <button
                                onClick={() => setEcobeeTemperature(thermostat, thermostat.targetTemperature + 1)}
                                className="temp-adjust"
                              >
                                <ChevronUp size={20} />
                              </button>
                            </div>
                          </div>

                          <div className="ecobee-humidity">
                            <span>Humidity: {thermostat.humidity}%</span>
                          </div>

                          <div className="ecobee-mode-buttons">
                            <button
                              className={`mode-btn ${thermostat.mode === 'heat' ? 'active heat' : ''}`}
                              onClick={() => setEcobeeMode(thermostat, 'heat')}
                              title="Heat"
                            >
                              <Sun size={18} />
                            </button>
                            <button
                              className={`mode-btn ${thermostat.mode === 'cool' ? 'active cool' : ''}`}
                              onClick={() => setEcobeeMode(thermostat, 'cool')}
                              title="Cool"
                            >
                              <Snowflake size={18} />
                            </button>
                            <button
                              className={`mode-btn ${thermostat.mode === 'auto' ? 'active auto' : ''}`}
                              onClick={() => setEcobeeMode(thermostat, 'auto')}
                              title="Auto"
                            >
                              <Wind size={18} />
                            </button>
                            <button
                              className={`mode-btn ${thermostat.mode === 'off' ? 'active off' : ''}`}
                              onClick={() => setEcobeeMode(thermostat, 'off')}
                              title="Off"
                            >
                              <Power size={18} />
                            </button>
                          </div>

                          {thermostat.equipmentRunning.length > 0 && (
                            <div className="ecobee-running">
                              Running: {thermostat.equipmentRunning.join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Cameras Tab */}
              {activeTab === 'cameras' && (
                <div className="smart-home-cameras">
                  <div className="smart-home-section-header">
                    <h3>Eufy Cameras</h3>
                    <button
                      className="smart-home-refresh"
                      onClick={loadEufyCameras}
                      disabled={eufyLoading}
                    >
                      <RefreshCw size={16} className={eufyLoading ? 'spinning' : ''} />
                    </button>
                  </div>

                  {eufyLoading && cameras.length === 0 ? (
                    <div className="smart-home-loading">Loading cameras...</div>
                  ) : cameras.length === 0 ? (
                    <div className="smart-home-empty">No cameras found</div>
                  ) : (
                    <div className="eufy-cameras-grid">
                      {cameras.map(camera => (
                        <div key={camera.id} className="eufy-camera-card">
                          <div className="eufy-camera-header">
                            <Camera size={20} />
                            <span className="eufy-camera-name">{camera.name}</span>
                            <span className={`eufy-camera-status ${camera.online ? 'online' : 'offline'}`}>
                              {camera.online ? 'Online' : 'Offline'}
                            </span>
                          </div>

                          <div className="eufy-camera-preview">
                            {cameraSnapshots[camera.id] ? (
                              <img src={cameraSnapshots[camera.id]} alt={camera.name} />
                            ) : (
                              <div className="eufy-camera-placeholder">
                                <Camera size={48} />
                                <button
                                  className="eufy-load-snapshot"
                                  onClick={() => loadCameraSnapshot(camera.id)}
                                >
                                  Load Snapshot
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="eufy-camera-info">
                            <span className="eufy-battery">
                              Battery: {camera.batteryLevel}%
                            </span>
                            {camera.motionDetected && (
                              <span className="eufy-motion">Motion Detected</span>
                            )}
                          </div>

                          {cameraSnapshots[camera.id] && (
                            <button
                              className="eufy-refresh-snapshot"
                              onClick={() => loadCameraSnapshot(camera.id)}
                            >
                              <RefreshCw size={14} /> Refresh
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
