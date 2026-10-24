import { useContext, useEffect, useRef, useState } from "react";
import "./../assets/scss/app.scss";

import { DEFAULT_APP_SETTINGS, ESCAPP_CLIENT_SETTINGS, MAIN_SCREEN, SKIN_SETTINGS } from "../constants/constants.jsx";
import { GlobalContext } from "./GlobalContext.jsx";
import MainScreen from "./MainScreen.jsx";

export default function App() {
  const { escapp, setEscapp, appSettings, setAppSettings, Storage, setStorage, Utils, I18n } = useContext(GlobalContext);
  const hasExecutedEscappValidation = useRef(false);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState(MAIN_SCREEN);
  const prevScreen = useRef(screen);
  const [solved, setSolved] = useState(false);
  const html5AudioExtensions = [
      "mp3",
      "wav",
      "ogg",
      "oga",
      "m4a",
      "mp4",
      "aac",
      "webm",
      "opus",
      "flac"
  ];

  useEffect(() => {
    if (escapp !== null) {
      return;
    }
    let _escapp = new ESCAPP(ESCAPP_CLIENT_SETTINGS);
    setEscapp(_escapp);
    Utils.log("Escapp client initiated with settings:", _escapp.getSettings());
    setStorage(_escapp.getStorage());
    let _appSettings = processAppSettings(_escapp.getAppSettings(),_escapp.getSettings());
    setAppSettings(_appSettings);
    Utils.log("App settings:", _appSettings);
  }, []);

  useEffect(() => {
    if (!hasExecutedEscappValidation.current && escapp !== null && appSettings !== null && Storage !== null) {
      hasExecutedEscappValidation.current = true;

      escapp.validate((success, erState) => {
        try {
          Utils.log("ESCAPP validation", success, erState);
          if (success) {
            restoreAppState(erState);
            setLoading(false);
          }
        } catch (e) {
          Utils.log("Error in validate callback", e);
        }
      });
    }
  }, [escapp, appSettings, Storage]);

  useEffect(() => {
    if (screen !== prevScreen.current) {
      Utils.log("Screen ha cambiado de", prevScreen.current, "a", screen);
      prevScreen.current = screen;
    }
  }, [screen]);

  function restoreAppState(erState) {
    Utils.log("Restore application state based on escape room state:", erState);
    //TO DO
  }

  function processAppSettings(_appSettings,_escappSettings){
    if (!_appSettings || typeof _appSettings !== "object"){
      _appSettings = {};
    }
    if ((typeof _appSettings.skin === "undefined") && (typeof DEFAULT_APP_SETTINGS.skin === "string")) {
      _appSettings.skin = DEFAULT_APP_SETTINGS.skin;
    }

    let skinSettings = SKIN_SETTINGS[_appSettings.skin] || {};

    let DEFAULT_APP_SETTINGS_SKIN = Utils.deepMerge(DEFAULT_APP_SETTINGS, skinSettings);

    // Merge _appSettings with DEFAULT_APP_SETTINGS_SKIN to obtain final app settings
    _appSettings = Utils.deepMerge(DEFAULT_APP_SETTINGS_SKIN, _appSettings);


    _appSettings.noLinkedPuzzles = (!_escappSettings.linkedPuzzleIds || _escappSettings.linkedPuzzleIds.length === 0);

    const allowedActions = ["NONE", "PLAY_AUDIO"];
    if (!allowedActions.includes(_appSettings.actionAfterSolve)) {
      _appSettings.actionAfterSolve = "PLAY_AUDIO";
    }

    _appSettings.enableLoopForStations = (_appSettings.enableLoopForStations !== "FALSE");
    _appSettings.keepState = (_appSettings.keepState !== "FALSE");

    let initialVolume = Utils.parseNumberFromSetting(_appSettings.initialVolume);
    if(initialVolume === null){
      initialVolume = 50;
    }
    _appSettings.initialVolumeNumber = Math.min(1,Math.max(0,initialVolume/100));

    let initialFrequency = Utils.parseNumberFromSetting(_appSettings.initialFrequency);
    if(initialFrequency === null){
      initialFrequency = _appSettings.range.min;
    }
    _appSettings.initialFrequency = Math.min(_appSettings.range.max,Math.max(_appSettings.range.min,initialFrequency));

    _appSettings.validatedStations = [];
    if (_appSettings.stations instanceof Array) {
        _appSettings.stations.forEach(station => {
            const validatedStation = _validateStation(station, _appSettings);
            if (validatedStation !== undefined) {
                _appSettings.validatedStations.push(validatedStation);
            }
        });
    }

    if (typeof _appSettings.backgroundImg === "string" && _appSettings.backgroundImg.trim() !== "" && _appSettings.backgroundImg !== "NONE") {
      _appSettings.background = "url(" + _appSettings.backgroundImg + ") no-repeat";
      _appSettings.backgroundSize = "100% 100%";
    }

    //Init internacionalization module
    I18n.init(_appSettings);

    _appSettings = Utils.checkUrlProtocols(_appSettings);

    Utils.preloadImages([_appSettings.backgroundMessage]);
    Utils.log("App settings:", _appSettings);
    return _appSettings;
  }

  function _validateStation(station, _appSettings) {
      if (!station || typeof station !== "object" || Array.isArray(station)) {
          return undefined;
      }

      //Validate frequency
      if (typeof station.freq !== "string") {
          return undefined;
      }
      const freq = Utils.parseNumberFromSetting(station.freq);
      if (freq === null || !Number.isFinite(freq) || freq < _appSettings.range.min || freq > _appSettings.range.max) {
          return undefined;
      }

      //Validate source
      if (typeof station.src !== "string" || !station.src.trim()) {
          return undefined;
      }
      const src = station.src.trim();
      const extension = src.split(/[?#]/)[0].split(".").pop().toLowerCase();
      if (!html5AudioExtensions.includes(extension)) {
          return undefined;
      }

      const validatedStation = {
          freq: freq,
          src
      };

      return validatedStation;
  }

  function solvePuzzle(_solution) {
    Utils.log("solution: ", _solution);
    return checkResult(_solution);
  }

  function checkResult(_solution) {
    escapp.checkNextPuzzle(_solution, {}, (success, erState) => {
      Utils.log("Check solution Escapp response", success, erState);
      if (success) {
        setSolved(true);
        try {
          setTimeout(() => {
            submitPuzzleSolution(_solution);
          }, 2000);
        } catch (e) {
          Utils.log("Error in checkNextPuzzle", e);
        }
      }
    });
  }
  function submitPuzzleSolution(_solution) {
    Utils.log("Submit puzzle solution", _solution);
    escapp.submitNextPuzzle(_solution, {}, (success, erState) => {
      Utils.log("Solution submitted to Escapp", _solution, success, erState);
    });
  }

  const renderScreens = (screens) => {
    if (loading === true) {
      return null;
    } else {
      return <>{screens.map(({ id, content }) => renderScreen(id, content))}</>;
    }
  };

  const renderScreen = (screenId, screenContent) => (
    <div key={screenId} className={`screen_wrapper ${screen === screenId ? "active" : ""}`}>
      {screenContent}
    </div>
  );

  let screens = [
    {
      id: MAIN_SCREEN,
      content: (
        <div
          className="main-background"
          style={{
            backgroundColor: appSettings?.background ? "transparent" : appSettings?.backgroundColor,
            height: " 100%",
            width: "100%",
          }}
        >
          <MainScreen solvePuzzle={solvePuzzle} solved={solved} />
        </div>
      ),
    }
  ];

  return (
    <div
      id="global_wrapper"
      className={`${appSettings !== null && typeof appSettings.skin === "string" ? appSettings.skin.toLowerCase() : ""
        }`} {...(appSettings !== null &&
          typeof appSettings.background === "string" &&
          typeof appSettings.backgroundSize === "string"
          ? {
            style: {
              background: appSettings.background,
              backgroundSize: appSettings.backgroundSize,
            },
          }
          : {})}
    >
      {renderScreens(screens)}
    </div>
  );
}
