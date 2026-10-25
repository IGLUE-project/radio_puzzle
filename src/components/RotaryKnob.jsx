import { useState, useRef, useEffect } from 'react';

export default function RotaryKnob({
    image,
    value,
    min,
    max,
    onChange,
    step,
    size = "100%",
    disabled = false
}) {
    const knobRef = useRef(null);
    const dragRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    // Keep the current values available during dragging
    const valueRef = useRef(value);
    const onChangeRef = useRef(onChange);

    useEffect(() => {
        valueRef.current = value;
        onChangeRef.current = onChange;
    }, [value, onChange]);

    const normalized = max > min
        ? Math.max(0, Math.min(1, (value - min) / (max - min)))
        : 0;

    const rotation = -135 + normalized * 270;

    const getPointerAngle = (clientX, clientY) => {
        if (!knobRef.current) return null;

        const rect = knobRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const angle = Math.atan2(
            clientY - centerY,
            clientX - centerX
        ) * 180 / Math.PI + 90;

        // Normalize to [-180, 180)
        return ((angle + 180) % 360 + 360) % 360 - 180;
    };

    const handleStart = (clientX, clientY) => {
        if (disabled || max <= min) return;

        const angle = getPointerAngle(clientX, clientY);
        if (angle === null) return;

        dragRef.current = {
            previousAngle: angle,
            currentRotation: -135 +
                ((valueRef.current - min) / (max - min)) * 270
        };

        setIsDragging(true);
    };

    const handleMove = (clientX, clientY) => {
        const drag = dragRef.current;
        if (!drag) return;

        const angle = getPointerAngle(clientX, clientY);
        if (angle === null) return;

        // Shortest angular difference between positions
        let delta = angle - drag.previousAngle;

        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;

        drag.previousAngle = angle;

        // Prevent the knob from rotating beyond its physical limits
        drag.currentRotation = Math.max(
            -135,
            Math.min(135, drag.currentRotation + delta)
        );

        const pct = (drag.currentRotation + 135) / 270;

        let newValue = min + pct * (max - min);

        if (step > 0) {
            newValue = min +
                Math.round((newValue - min) / step) * step;
        }

        newValue = Math.max(min, Math.min(max, newValue));

        // Avoid minor floating-point inaccuracies
        newValue = Number(newValue.toFixed(10));

        if (newValue !== valueRef.current) {
            valueRef.current = newValue;
            onChangeRef.current(newValue);
        }
    };

    const handleEnd = () => {
        dragRef.current = null;
        setIsDragging(false);
    };

    useEffect(() => {
        if (!isDragging) return;

        const onMouseMove = (e) => {
            handleMove(e.clientX, e.clientY);
        };

        const onMouseUp = () => {
            handleEnd();
        };

        const onTouchMove = (e) => {
            if (e.touches.length !== 1) return;

            e.preventDefault();

            const touch = e.touches[0];
            handleMove(touch.clientX, touch.clientY);
        };

        const onTouchEnd = () => {
            handleEnd();
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd);
        window.addEventListener('touchcancel', onTouchEnd);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
            window.removeEventListener('touchcancel', onTouchEnd);
        };
    }, [isDragging, min, max, step]);

    const onMouseDown = (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        handleStart(e.clientX, e.clientY);
    };

    const onTouchStart = (e) => {
        if (e.touches.length !== 1) return;

        const touch = e.touches[0];
        handleStart(touch.clientX, touch.clientY);
    };

    return (
        <div
            ref={knobRef}
            className="rotary-knob"
            style={{
                width: size,
                height: size,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: disabled ? 'not-allowed' : 'grab',
                touchAction: 'none'
            }}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
        >
            <img
                src={image}
                alt="knob"
                draggable={false}
                style={{
                    width: '100%',
                    height: '100%',
                    transform: `rotate(${rotation}deg)`,
                    pointerEvents: 'none',
                    userSelect: 'none',
                    transition: isDragging
                        ? 'none'
                        : 'transform 0.1s ease-out'
                }}
            />
        </div>
    );
}