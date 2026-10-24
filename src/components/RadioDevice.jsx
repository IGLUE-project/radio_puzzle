import '../assets/scss/RadioDevice.scss';

export default function RadioDevice({
    frequency,
    setFrequency,
    volume,
    setVolume,
    minFreq,
    maxFreq,
    step,
    solved
}) {

    const calculateNeedlePosition = () => {
        const pct = ((frequency - minFreq) / (maxFreq - minFreq)) * 100;
        return Math.min(Math.max(pct, 0), 100);
    };

    return (
        <div className="radio-device">
            <div className="radio-top">
                <div className="speaker-grill"></div>
                <div className="display-panel">
                    <div className="lcd-display">
                        {frequency.toFixed(1)} <span className="mhz">MHz</span>
                    </div>
                    <div className="scale-container-wrapper">
                        <div className="scale-container">
                            <div className="scale-marks">
                                {[0, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100].map(p => (
                                    <span key={p} ></span>
                                ))}
                                <p style={{ position: 'absolute', left: '0%' }}>{minFreq}</p>
                                <p style={{ position: 'absolute', right: '0%' }}>{maxFreq}</p>
                            </div>
                            <div className="needle" style={{ left: `${calculateNeedlePosition()}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="radio-controls">
                <div className="control-group">
                    <label>Tuner</label>
                    <input
                        style={{ cursor: solved ? 'not-allowed' : 'pointer' }}
                        type="range"
                        min={minFreq}
                        max={maxFreq}
                        step={step}
                        value={frequency}
                        disabled={solved}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setFrequency(val);
                        }}
                    />
                </div>
                <div className="control-group">
                    <label>Volume</label>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                    />
                </div>
            </div>
        </div>
    );
}
