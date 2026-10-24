import "./../assets/scss/MainScreen.scss";
import React, { useState, useEffect, useContext, useRef, forwardRef, useImperativeHandle } from 'react';
import { GlobalContext } from "./GlobalContext.jsx";
import RadioDevice from "./RadioDevice.jsx";
import RadioDeviceImg from "./RadioDeviceImg.jsx";
import { SKINS } from "../constants/constants.jsx";

const MainScreen = forwardRef((props, ref) => {
    const { appSettings, Storage, Utils } = useContext(GlobalContext);

    //Restore state based on props
    const parsedRestoredChannel = Utils.parseChannelId(props.appState?.channel, appSettings.range);
    let restoredChannel = parsedRestoredChannel ?? appSettings.initialChannelValidated;
    let restoredVolume = props.appState?.volume ?? appSettings.initialVolumeNumber;
    restoredVolume = Math.max(0,Math.min(1,restoredVolume));

    const audioContextRef = useRef(null);
    const masterGainRef = useRef(null);
    const channelAudiosRef = useRef(null);
    const noiseAudioRef = useRef(null);

    const audioContextStartedRef = useRef(false);
    const audioStartedRef = useRef(false);

    const [radioState, setRadioState] = useState("off"); // possible values: "off" and "on". Start with "off" to force the radio to be switched on to allow autoplay
    const radioStateRef = useRef(radioState);
    const radioReadyRef = useRef(false);
    const radioStartTimeoutRef = useRef(null);
    
    const [channel, setChannel] = useState(restoredChannel);
    const channelRef = useRef(channel);
    const [volume, setVolume] = useState(restoredVolume);
    const volumeRef = useRef(volume);

    useImperativeHandle(ref, () => ({
      getState: () => {
        return {
          skin: appSettings.skin,
          radioState: radioStateRef.current,
          channel: channelRef.current,
          volume,
        };
      }
    }));

    useEffect(() => {
        _initRadioAudio();

        return () => {
          // Cancel pending radio startup
          clearTimeout(radioStartTimeoutRef.current);
          radioStartTimeoutRef.current = null;

          // Stop all channel audio tracks
          channelAudiosRef.current?.forEach(channel => {
              channel.audio.pause();
              channel.audio.src = "";
          });

          // Stop static noise
          if (noiseAudioRef.current) {
              noiseAudioRef.current.audio.pause();
              noiseAudioRef.current.audio.src = "";
          }

          audioContextRef.current?.close();

          audioContextRef.current = null;
          audioContextStartedRef.current = false;
          masterGainRef.current = null;
          channelAudiosRef.current = null;
          noiseAudioRef.current = null;
          audioStartedRef.current = false;
          radioReadyRef.current = false;
        };

    }, []);

    function _initRadioAudio() {
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
        channelAudiosRef.current = [];

        // Crear audio de cada emisora
        appSettings.validatedChannels.forEach(channel => {
            const audio = new Audio(channel.src);
            audio.loop = appSettings.enableLoopForChannels;
            audio.preload = "auto";

            // Crear source node
            const source = audioContext.createMediaElementSource(audio);
            // Create initial volume
            const gain = audioContext.createGain();
            gain.gain.value = 0;
            // Connect nodes
            source.connect(gain);
            gain.connect(masterGain);

            // Save channel
            channelAudiosRef.current.push({
                id: channel.id,
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
    }


    ////////////
    // Radio on/off
    ////////////

    useEffect(() => {
        if (!audioContextRef.current) return;

        let audio;

        if (radioStateRef.current === "off" && radioState === "on") {
            // Radio has been turned on
            audio = document.getElementById("audio_radio_on");

            radioReadyRef.current = false;
            _enablePlayingRadioAudio();

            radioStartTimeoutRef.current = setTimeout(() => {
                radioStartTimeoutRef.current = null;

                if (radioStateRef.current === "on") {
                    radioReadyRef.current = true;
                    _playAudioForChannel(channelRef.current);
                }
            }, 400);

        } else if (radioStateRef.current === "on" && radioState === "off") {
            // Radio has been turned off
            audio = document.getElementById("audio_radio_off");

            radioReadyRef.current = false;

            clearTimeout(radioStartTimeoutRef.current);
            radioStartTimeoutRef.current = null;

            _updateRadioAudioVolume();
        }

        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
        }

        radioStateRef.current = radioState;

        return () => {
            clearTimeout(radioStartTimeoutRef.current);
            radioStartTimeoutRef.current = null;
        };
    }, [radioState]);

    async function _enablePlayingRadioAudio() {
        const audioContext = audioContextRef.current;
        if (!audioContext) return;
        await audioContext.resume();

        // Start audio tracks only once
        if (!audioStartedRef.current) {
            audioStartedRef.current = true;

            const audios = [
                ...channelAudiosRef.current.map(channel => channel.audio),
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

    function _playAudioForChannel(_channel) {
        const audioContext = audioContextRef.current;
        const channels = channelAudiosRef.current;
        const noise = noiseAudioRef.current;
        if (!audioContext || !channels || !noise) return;

        const now = audioContext.currentTime;
        const fadeTime = 0.05;

        const channelRange = appSettings.channelRangeNumber;
        const noiseRange = appSettings.channelNoiseRangeNumber > channelRange
            ? appSettings.channelNoiseRangeNumber + 0.1
            : channelRange;

        // Find the closest channel within noise range
        const activeChannel = channels
            .map(channel => ({
                channel,
                distance: Math.abs(channel.id - _channel)
            }))
            .filter(item => item.distance <= noiseRange)
            .sort((a, b) => a.distance - b.distance)[0];

        let channelGain = 0;
        let noiseGain = 1;

        if (activeChannel) {
            const distance = activeChannel.distance;

            if (distance <= channelRange) {
                // Clear reception without static noise
                channelGain = 1;
                noiseGain = 0;
            } else {
                // Gradually mix channel audio with static noise
                const progress = (distance - channelRange) /
                    (noiseRange - channelRange);

                channelGain = 1 - progress;
                noiseGain = progress;
            }
        }

        // Update channel gains
        channels.forEach(channel => {
            channel.gain.gain.setTargetAtTime(
                channel === activeChannel?.channel ? channelGain : 0,
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

        _updateRadioAudioVolume();
    }

    function _updateRadioAudioVolume() {
        const audioContext = audioContextRef.current;
        const masterGain = masterGainRef.current;
        if (!audioContext || !masterGain) return;

        // Update master volume only when the radio is ready
        masterGain.gain.setTargetAtTime(
            radioStateRef.current === "on" && radioReadyRef.current
                ? volumeRef.current
                : 0,
            audioContext.currentTime,
            0.05
        );
    }
    
    useEffect(() => {
        volumeRef.current = volume;
        _updateRadioAudioVolume();
    }, [volume]);

    useEffect(() => {
        channelRef.current = channel;
        if ((radioState !== "on") || (radioReadyRef.current===false)) return;
        _playAudioForChannel(channel);
    }, [channel]);

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
                frequency={channel}
                setFrequency={setChannel}
                volume={volume}
                setVolume={setVolume}
                minFreq={appSettings.range.min}
                maxFreq={appSettings.range.max}
                step={appSettings.step}
                solved={props.solved}
                radioState={radioState}
                onClickPowerButton={onClickPowerButton}
            /> : <RadioDeviceImg
                config={appSettings}
                frequency={channel}
                setFrequency={setChannel}
                volume={volume}
                setVolume={setVolume}
                minFreq={appSettings.range.min}
                maxFreq={appSettings.range.max}
                step={appSettings.step}
                solved={props.solved}
                radioState={radioState}
                onClickPowerButton={onClickPowerButton}
            />}
        </div>
    );
});

export default MainScreen;
