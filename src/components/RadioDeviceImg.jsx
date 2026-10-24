import { useState, useRef, useEffect } from 'react';
import '../assets/scss/RadioDeviceImg.scss';
import { SKINS } from '../constants/constants';
import RotaryKnob from './RotaryKnob';

export default function RadioDeviceImg({
    config,
    frequency,
    setFrequency,
    volume,
    setVolume,
    minFreq,
    maxFreq,
    step,
    solved
}) {
    const [showVolume, setShowVolume] = useState(false);
    const radioRef = useRef(null);
    const [radioWidth, setRadioWidth] = useState(0);

    useEffect(() => {
        if (!radioRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                setRadioWidth(entry.contentRect.width);
            }
        });
        observer.observe(radioRef.current);
        return () => observer.disconnect();
    }, []);

    const panel = {
        top: config.displayPanel.top,
        left: config.displayPanel.left,
        width: config.displayPanel.width,
        height: config.displayPanel.height,
    };
    const buttons = {
        bottom: config.buttons.bottom,
        left: config.buttons.left,
        width: config.buttons.width,
        height: config.buttons.height,
    };

    const volumeTimeoutRef = useRef(null);

    const setVolumeHandler = (val) => {
        setShowVolume(true);
        setVolume(val);

        if (volumeTimeoutRef.current) {
            clearTimeout(volumeTimeoutRef.current);
        }

        volumeTimeoutRef.current = setTimeout(() => {
            setShowVolume(false);
        }, 1000);
    };

    const calculateNeedlePosition = () => {
        const pct = (frequency - minFreq) / (maxFreq - minFreq);
        const mapped = 21 + (pct * (88.5 - 21));
        return Math.min(Math.max(mapped, 21), 88.5);
    };

    const modernPanel = <div className="lcd-display">
        {showVolume ? <>
            Vol: {(volume * 100).toFixed(0)}
        </> : <>
            {frequency.toFixed(1)} <span className="mhz">MHz</span>
        </>}
    </div>

    const generateScaleMarks = () => {
        const items = [];
        const steps = 5;
        const startPos = 21;
        const endPos = 89;
        const width = endPos - startPos;

        for (let i = 0; i <= steps; i++) {
            const pct = i / steps;
            const freqVal = minFreq + (pct * (maxFreq - minFreq));
            const pos = startPos + (pct * width);
            items.push({
                type: 'mark',
                val: freqVal.toFixed(),
                left: `${pos}%`
            });
            if (i < steps) {
                const dividerPct = (i + 0.5) / steps;
                const dividerPos = startPos + (dividerPct * width);
                items.push({
                    type: 'divider',
                    left: `${dividerPos}%`
                });
            }
        }
        return items;
    };

    const retroPanel = <div className="scale-container" style={{ backgroundImage: `url(${config.displayImg})` }}>
        <div className="needle" style={{ left: `${calculateNeedlePosition()}%` }}></div>
        <div className="scale-marks" >
            {generateScaleMarks().map((item, i) => (
                item.type === 'mark' ? (
                    <div key={i} className="mark" style={{ left: item.left, position: 'absolute', transform: 'translateX(-50%)', fontSize: (radioWidth * 0.03) + "px" }}>
                        {item.val}
                    </div>
                ) : (
                    <div key={i} className="divider" style={{ left: item.left }}></div>
                )
            ))}
        </div>
    </div>

    return (
        <div className="radio-device" ref={radioRef} style={{ backgroundImage: `url(${config.radioImg})`, aspectRatio: config.aspectRatio }}>
            <div className="radio-top" >
                <div className="display-panel" style={panel}>
                    {config.skin === SKINS.MODERN ? modernPanel : retroPanel}
                </div>
            </div>

            <div className="radio-controls" style={buttons}>
                <div className="control-group" style={{ height: "100%" }}>
                    <RotaryKnob
                        image={config.buttonImg}
                        value={volume}
                        min={0}
                        max={1}
                        step={0.01}
                        onChange={(val) => setVolumeHandler(val)}
                    />
                </div>
                <div className="control-group" style={{ height: "100%" }}>
                    <RotaryKnob
                        image={config.buttonImg}
                        value={frequency}
                        min={minFreq}
                        max={maxFreq}
                        step={step}
                        onChange={(val) => setFrequency(val)}
                        disabled={solved}
                    />
                </div>
            </div>
        </div>
    );
}
