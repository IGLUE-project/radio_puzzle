import "./../assets/scss/MainScreen.scss";
import { useState, useRef, useEffect, useContext } from "react";
import { GlobalContext } from "./GlobalContext.jsx";
import RadioDevice from "./RadioDevice.jsx";
import RadioDeviceImg from "./RadioDeviceImg.jsx";
import { SKINS } from "../constants/constants.jsx";
import useSound from "../hooks/useSound.js";

export default function MainScreen({ solvePuzzle, solved }) {
    const { appSettings, Storage, Utils } = useContext(GlobalContext);

    const audioContextRef = useRef(null);
    const masterGainRef = useRef(null);
    const stationAudiosRef = useRef(null);
    const noiseAudioRef = useRef(null);

    const audioContextStartedRef = useRef(false);
    const audioStartedRef = useRef(false);

    const [radioState, setRadioState] = useState("off"); // possible values: "off" and "on". Start with "off" to force the radio to be switched on to allow autoplay
    const radioStateRef = useRef(radioState);
    
    const [frequency, setFrequency] = useState(() => {
        const stored = Storage?.getSetting("frequency");
        return (stored !== null && stored !== undefined) ? parseFloat(stored) : (appSettings.range?.min);
    });
    const [volume, setVolume] = useState(() => {
        const stored = Storage?.getSetting("volume");
        return (stored !== null && stored !== undefined) ? parseFloat(stored) : 0.5;
    });

    useEffect(() => {
       _initRadioAudio();
    }, []);

    function _initRadioAudio() {
        Utils.log("_initRadioAudio");
        if(audioContextStartedRef.current === true) return;

        // Crear audio context
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContextClass();

        // Create general volume
        const masterGain = audioContext.createGain();
        masterGain.gain.value = 0;
        masterGain.connect(audioContext.destination);

        // Save references
        audioContextRef.current = audioContext;
        masterGainRef.current = masterGain;
        stationAudiosRef.current = [];

        // Crear audio de cada emisora
        appSettings.validatedStations.forEach(station => {
            const audio = new Audio(station.src);
            audio.loop = true;
            audio.preload = "auto";

            // Crear source node
            const source = audioContext.createMediaElementSource(audio);
            // Create initial volume
            const gain = audioContext.createGain();
            gain.gain.value = 0;
            // Connect nodes
            source.connect(gain);
            gain.connect(masterGain);

            // Save station
            stationAudiosRef.current.push({
                freq: station.freq,
                audio,
                source,
                gain
            });
        });

        // Create noise audio
        const noiseAudio = new Audio(appSettings.soundRadioNoise);
        noiseAudio.loop = true;
        noiseAudio.preload = "auto";
        const noiseSource = audioContext.createMediaElementSource(noiseAudio);
        const noiseGain = audioContext.createGain();
        noiseGain.gain.value = 0;
        noiseSource.connect(noiseGain);
        noiseGain.connect(masterGain);
        noiseAudioRef.current = {
            audio: noiseAudio,
            source: noiseSource,
            gain: noiseGain
        };

        audioContextStartedRef.current = true;
        Utils.log("Audio initiated");
    }

    // Save state to storage on change
    useEffect(() => {
        if (Storage) {
            Storage.saveSetting("frequency", frequency);
        }
    }, [frequency]);

    useEffect(() => {
        if (Storage) {
            Storage.saveSetting("volume", volume);
        }
    }, [volume]);


    ////////////
    // Radio on/off
    ////////////

    useEffect(() => {
        // Utils.log("Previous radioState:", radioStateRef.current);
        // Utils.log("New radioState:", radioState);

        if(audioContextRef.current === null){
            return;
        }

        let audio;
        if((radioStateRef.current === "off")&&(radioState !== "off")){
          //Radio has been turned on
          audio = document.getElementById("audio_radio_on");
          _enablePlayingRadioAudio();
          _playAudioForFrequency(frequency);
        } else if((radioStateRef.current !== "off")&&(radioState === "off")){
          //Radio has been turned off
          audio = document.getElementById("audio_radio_off");
          masterGainRef.current.gain.setTargetAtTime(
            0,
            audioContextRef.current.currentTime,
            0.05
          );
        }

        if (audio != null) {
          setTimeout(() => {
            audio.currentTime = 0;
            audio.play();
          }, 0);
        }

        //Update previous value
        radioStateRef.current = radioState;

    }, [radioState]);

    async function _enablePlayingRadioAudio() {
        const audioContext = audioContextRef.current;
        if (!audioContext) return;

        await audioContext.resume();

        // Start audio tracks only once
        if (!audioStartedRef.current) {
            audioStartedRef.current = true;

            const audios = [
                ...stationAudiosRef.current.map(station => station.audio),
                noiseAudioRef.current.audio
            ];

            const results = await Promise.allSettled(
                audios.map(audio => audio.play())
            );

            if (results.some(result => result.status === "rejected")) {
                audioStartedRef.current = false;
            }
        }
    }

    function _playAudioForFrequency(_frequency) {
        const audioContext = audioContextRef.current;
        const stations = stationAudiosRef.current;
        const noise = noiseAudioRef.current;

        if (!audioContext || !stations || !noise) return;

        const now = audioContext.currentTime;
        const fadeTime = 0.05;

        const stationRange = appSettings.station_range;
        const noiseRange = appSettings.station_noise_range > stationRange
            ? appSettings.station_noise_range + 0.1
            : stationRange;

        // Find the closest station within noise range
        const activeStation = stations
            .map(station => ({
                station,
                distance: Math.abs(station.freq - _frequency)
            }))
            .filter(item => item.distance <= noiseRange)
            .sort((a, b) => a.distance - b.distance)[0];

        let stationGain = 0;
        let noiseGain = 1;

        if (activeStation) {
            const distance = activeStation.distance;

            if (distance <= stationRange) {
                // Clear reception without static noise
                stationGain = 1;
                noiseGain = 0;
            } else {
                // Gradually mix station audio with static noise
                const progress = (distance - stationRange) /
                    (noiseRange - stationRange);

                stationGain = 1 - progress;
                noiseGain = progress;
            }
        }

        // Update station gains
        stations.forEach(station => {
            station.gain.gain.setTargetAtTime(
                station === activeStation?.station ? stationGain : 0,
                now,
                fadeTime
            );
        });

        // Update static noise gain
        noise.gain.gain.setTargetAtTime(
            noiseGain,
            now,
            fadeTime
        );
    }
    
    useEffect(() => {
        const audioContext = audioContextRef.current;
        const masterGain = masterGainRef.current;
        if (!audioContext || !masterGain) return;

        // Update master volume according to radio state
        masterGain.gain.setTargetAtTime(
            radioState === "on" ? volume : 0,
            audioContext.currentTime,
            0.05
        );
    }, [radioState, volume]);

    useEffect(() => {
        if (radioState !== "on") return;
        _playAudioForFrequency(frequency);
    }, [frequency]);

    const lastClickRef = useRef(0);
    const onClickPowerButton = () => {
        const now = Date.now();
        if (now - lastClickRef.current < 1500) {
            return;
        }
        lastClickRef.current = now;
        setRadioState(prev => prev === "off" ? "on" : "off");
    };

    const skinClass = appSettings?.skin ? `skin-${appSettings.skin.toLowerCase()}` : 'skin-standard';
    return (
        <div className={`mainScreen ${skinClass}`}>
            {SKINS.STANDARD === appSettings.skin ? <RadioDevice
                frequency={frequency}
                setFrequency={setFrequency}
                volume={volume}
                setVolume={setVolume}
                minFreq={appSettings.range.min}
                maxFreq={appSettings.range.max}
                step={appSettings.step}
                solved={solved}
                radioState={radioState}
                onClickPowerButton={onClickPowerButton}
            /> : <RadioDeviceImg
                config={appSettings}
                frequency={frequency}
                setFrequency={setFrequency}
                volume={volume}
                setVolume={setVolume}
                minFreq={appSettings.range.min}
                maxFreq={appSettings.range.max}
                step={appSettings.step}
                solved={solved}
                radioState={radioState}
                onClickPowerButton={onClickPowerButton}
            />}
        </div>
    );
}
