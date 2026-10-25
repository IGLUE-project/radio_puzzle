import "./../assets/scss/MainScreen.scss";
import React, { useState, useEffect, useContext, useRef, forwardRef, useImperativeHandle } from 'react';
import { GlobalContext } from "./GlobalContext.jsx";
import RadioDevice from "./RadioDevice.jsx";
import RadioDeviceImg from "./RadioDeviceImg.jsx";
import { SKINS } from "../constants/constants.jsx";

const MainScreen = forwardRef((props, ref) => {
    const { appSettings, escapp, Storage, Utils } = useContext(GlobalContext);

    //Restore state based on props
    const parsedRestoredChannel = Utils.parseChannelId(props.appState?.channel, appSettings.range);
    let restoredChannel = parsedRestoredChannel ?? appSettings.initialChannelValidated;
    let restoredVolume = props.appState?.volume ?? appSettings.initialVolumeNumber;
    restoredVolume = Math.max(0,Math.min(1,restoredVolume));
    if(appSettings.skin === "RETRO"){
      // Retro radio is turned on and off using the volume control
      restoredVolume = 0;
    }

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
    const activeChannelRef = useRef(null);
    const [volume, setVolume] = useState(restoredVolume);
    const volumeRef = useRef(volume);

    const channelActivationRef = useRef(0);
    const incorrectSolutions = useRef(new Set());
    const correctSolution = useRef(undefined);
    const correctChannel = useRef(undefined);
    const puzzleCompletionTriggeredRef = useRef(false);
    const finishedChannelAudiosRef = useRef(new Set());

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
          channelActivationRef.current++;
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
            audio.loop = false;
            audio.preload = "auto";

            audio.addEventListener("ended", () => {
                _onChannelAudioEnded(audio, channel.id);
            });

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
            activeChannelRef.current = null;
            channelActivationRef.current++;
            clearTimeout(radioStartTimeoutRef.current);
            radioStartTimeoutRef.current = null;

            _updateRadioAudioVolume();

            channelAudiosRef.current?.forEach(channel => {
                channel.audio.pause();
                channel.audio.currentTime = 0;
            });
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

        if (!audioStartedRef.current) {
            audioStartedRef.current = true;

            try {
                await noiseAudioRef.current.audio.play();
            } catch (error) {
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

        // Find the closest channel within reception range
        const activeChannel = channels
            .map(channel => ({
                channel,
                distance: Math.abs(channel.id - _channel)
            }))
            .filter(item => item.distance <= noiseRange)
            .sort((a, b) => a.distance - b.distance)[0];

        const previousActiveChannel = activeChannelRef.current;
        const newActiveChannel = activeChannel?.channel ?? null;
        activeChannelRef.current = newActiveChannel;
        if (newActiveChannel !== previousActiveChannel) {
          channelActivationRef.current++;
        }
        let channelGain = 0;
        let noiseGain = 1;

        if (activeChannel) {
            const distance = activeChannel.distance;
            if (distance <= channelRange) {
                channelGain = 1;
                noiseGain = 0;
            } else {
                const progress = (distance - channelRange) / (noiseRange - channelRange);
                channelGain = 1 - progress;
                noiseGain = progress;
            }
        }

        // Start the active channel and stop all others
        channels.forEach(channel => {
            const isActive = channel === newActiveChannel;
            const justActivated = isActive && channel !== previousActiveChannel;
            const audio = channel.audio;

            if (isActive) {
                if (justActivated) {
                    // Restart when entering the reception range
                    audio.pause();
                    audio.currentTime = 0;

                    audio.play()
                        .then(() => {
                            // Stop if the channel is no longer active
                            if (
                                radioStateRef.current !== "on" ||
                                activeChannelRef.current !== channel
                            ) {
                                audio.pause();
                                audio.currentTime = 0;
                            }
                        })
                        .catch(error => {
                            if (error.name !== "AbortError") {
                                console.warn("Channel playback failed:", channel.id, error);
                            }
                        });
                }
            } else {
                if (!audio.paused) {
                    audio.pause();
                }

                if (audio.currentTime !== 0) {
                    audio.currentTime = 0;
                }
            }

            channel.gain.gain.setTargetAtTime(
                isActive ? channelGain : 0,
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

        // Solution check
        if (newActiveChannel) {
            if (newActiveChannel !== previousActiveChannel) {
                checkSolution(newActiveChannel.id);
            }
        } else if (appSettings.actionAfterSolve === "NONE") {
            channelActivationRef.current++;
            checkSolution(_channel, false);
        }

        if (appSettings.actionAfterSolve === "PLAY_AUDIO" && correctSolution.current !== undefined && finishedChannelAudiosRef.current.has(correctChannel.current)) {
          completePuzzle();
        }
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
        if (appSettings.skin === "RETRO") {
          // Retro radio is turned on and off using the volume control
          let audio;
          if (volume > 0.01 && volumeRef.current <= 0.01 && radioState === "off") {
              audio = document.getElementById("audio_radio_on");
              setRadioState("on");
          } else if (volume <= 0.01 && volumeRef.current > 0.01 && radioState === "on") {
              audio = document.getElementById("audio_radio_off");
              setRadioState("off");
          }
          if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
          }
        }

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

    const checkSolution = (_channelId, hasAudio = true) => {
        if (appSettings.noLinkedPuzzles) return;
        if (!hasAudio && appSettings.actionAfterSolve === "PLAY_AUDIO") return;
        _channelId = Utils.parseChannelId(_channelId, appSettings.range);
        if (typeof _channelId !== "number") return;

        const activationId = channelActivationRef.current;
        setTimeout(() => {
            if (
                radioStateRef.current === "on" &&
                radioReadyRef.current &&
                channelActivationRef.current === activationId &&
                (
                    hasAudio
                        ? activeChannelRef.current?.id === _channelId
                        : activeChannelRef.current === null && channelRef.current === _channelId
                )
            ) {
                _checkSolutionAfterTimeout(_channelId);
            }
        }, (appSettings.actionAfterSolve === "PLAY_AUDIO") ? 600 : 1500);
    };

    const _checkSolutionAfterTimeout = (_channelId) => {
      Utils.log("Check channel", _channelId);
      
      let solution = _channelId + "";
      if(incorrectSolutions.current.has(_channelId)) return;
      if (correctChannel.current === _channelId) return;
      if((typeof correctChannel.current === "number") && escapp.getAllPuzzlesSolved() && (escapp.getSolvedPuzzles().length > 0)) return;

      Utils.log("Check solution: " + solution);
      escapp.checkNextPuzzle(solution, {}, (success, erState) => {
        Utils.log("Check solution Escapp response", success, erState);
        if(success === true){
          correctSolution.current = solution;
          correctChannel.current = _channelId;
          afterFirstSuccesfullCheck();
        } else {
          incorrectSolutions.current.add(_channelId);
        }
      });
    };

    const afterFirstSuccesfullCheck = () => {
        if (appSettings.actionAfterSolve === "NONE") {
            completePuzzle();
        } else if (appSettings.actionAfterSolve === "PLAY_AUDIO") {
            if (!radioReadyRef.current) return;

            if (finishedChannelAudiosRef.current.has(correctChannel.current)) {
                completePuzzle();
                return;
            }
            // Wait for _onChannelAudioEnded
        }
    };

    function _onChannelAudioEnded(audio, channelId) {
        if (radioStateRef.current !== "on" || !radioReadyRef.current || activeChannelRef.current?.id !== channelId ) {
          return;
        }
        finishedChannelAudiosRef.current.add(channelId);

        if (correctChannel.current === channelId && correctSolution.current !== undefined) {
          //Puzzle solved with this audio
          if(appSettings.actionAfterSolve === "PLAY_AUDIO"){
            completePuzzle();
          }
          return;
        }

        if (appSettings.enableLoopForChannels === true) {
          audio.currentTime = 0;
          audio.play().catch(() => {});
        }
    };

    const completePuzzle = () => {
        if (puzzleCompletionTriggeredRef.current) return;
        if (correctSolution.current === undefined) return;
        puzzleCompletionTriggeredRef.current = true;
        props.onPuzzleSolved(correctSolution.current);
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