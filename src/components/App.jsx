import { useContext, useEffect, useRef, useState } from "react";
import "./../assets/scss/app.scss";

import { DEFAULT_APP_SETTINGS, ESCAPP_CLIENT_SETTINGS, MAIN_SCREEN, SKIN_SETTINGS } from "../constants/constants.jsx";
import { GlobalContext } from "./GlobalContext.jsx";
import MainScreen from "./MainScreen.jsx";

export default function App() {
  const { escapp, setEscapp, appSettings, setAppSettings, Storage, setStorage, Utils, I18n } = useContext(GlobalContext);
  const mainScreenRef = useRef(null);
  const storageRef = useRef(null);
  const appSettingsRef = useRef(null);
  const hasExecutedEscappValidation = useRef(false);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState(MAIN_SCREEN);
  const prevScreen = useRef(screen);
  const [appState, setAppState] = useState({});
  const solution = useRef(null);
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
      storageRef.current = Storage;

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

  useEffect(() => {
    const handleResize = () => {
      // const windowWidth = window.innerWidth;
      // const windowHeight = window.innerHeight;

      // let contentPercentage = 1;
      // const aspectRatio = 16/9;
      // let width = windowWidth * contentPercentage;
      // let height = width / aspectRatio;

      // if (height > windowHeight * contentPercentage) {
      //   height = windowHeight * contentPercentage;
      //   width = height * aspectRatio;
      // }

      // setSize({ width, height });
    };
    const handlePageHide = () => {
      saveAppState();
    };

    handleResize();
    // window.addEventListener("resize", handleResize);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      // window.removeEventListener("resize", handleResize);
      window.removeEventListener("pagehide", handlePageHide);
    };

  }, []);

  useEffect(() => {
    appSettingsRef.current = appSettings;
  }, [appSettings]);

  function restoreAppState(erState) {
    restoreAppStateFromLocalStorage(erState);
  }

  function restoreAppStateFromLocalStorage(erState) {
    if (appSettings.keepState!==true) return;
    if (!Storage) return;
    let stateToRestore = Storage.getSetting("state");
    if (stateToRestore) {
      if((appSettingsRef.current !== null)&&(stateToRestore.skin !== appSettingsRef.current.skin)){
        Storage.removeSetting("state");
        return;
      }
      Utils.log("Restore app state", stateToRestore);
      setAppState(stateToRestore);
    }
  }

  function saveAppState() {
    if (appSettingsRef.current?.keepState !== true) return;
    if (!storageRef.current) return;
    const currentAppState = mainScreenRef.current?.getState?.();
    if (!currentAppState) return;
    Utils.log("Save app state in local storage", currentAppState);
    storageRef.current.saveSetting("state", currentAppState);
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

    _appSettings.enableLoopForChannels = (_appSettings.enableLoopForChannels !== "FALSE");
    _appSettings.keepState = (_appSettings.keepState !== "FALSE");

    let initialVolume = Utils.parseNumberFromSetting(_appSettings.initialVolume);
    if (initialVolume === null || !Number.isFinite(initialVolume)) {
      initialVolume = 50;
    }
    _appSettings.initialVolumeNumber = Math.min(1,Math.max(0,initialVolume/100));

    _appSettings.initialChannelValidated = Utils.parseChannelId(_appSettings.initialChannel, _appSettings.range) ?? _appSettings.range.min;

    let channelRange = Utils.parseNumberFromSetting(_appSettings.channelRange);
    if (channelRange === null || !Number.isFinite(channelRange)) {
        channelRange = DEFAULT_APP_SETTINGS.channelRange;
    }
    _appSettings.channelRangeNumber = Math.max(0, channelRange);

    let channelNoiseRange = Utils.parseNumberFromSetting(_appSettings.channelNoiseRange);
    if (channelNoiseRange === null || !Number.isFinite(channelNoiseRange)) {
        channelNoiseRange = DEFAULT_APP_SETTINGS.channelNoiseRange;
    }
    _appSettings.channelNoiseRangeNumber = Math.max(0, channelNoiseRange);
    if(_appSettings.channelNoiseRangeNumber <= _appSettings.channelRangeNumber){
      _appSettings.channelNoiseRangeNumber = 0;
    }

    _appSettings.validatedChannels = [];
    if (Array.isArray(_appSettings.channels)) {
      _appSettings.channels.forEach(channel => {
          const validatedChannel = _validateChannel(channel, _appSettings);
          if (validatedChannel !== undefined && !_appSettings.validatedChannels.some(existing => existing.id === validatedChannel.id)) {
              _appSettings.validatedChannels.push(validatedChannel);
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
    return _appSettings;
  }

  function _validateChannel(channel, _appSettings) {
      if (!channel || typeof channel !== "object" || Array.isArray(channel)) {
          return undefined;
      }

      //Validate frequency
      if (typeof channel.id !== "string") {
          return undefined;
      }
      const channelId = Utils.parseNumberFromSetting(channel.id);
      if (channelId === null || !Number.isFinite(channelId) || channelId < _appSettings.range.min || channelId > _appSettings.range.max) {
          return undefined;
      }

      //Validate source
      if (typeof channel.src !== "string" || !channel.src.trim()) {
          return undefined;
      }
      const src = channel.src.trim();
      const extension = src.split(/[?#]/)[0].split(".").pop().toLowerCase();
      if (!html5AudioExtensions.includes(extension)) {
          return undefined;
      }

      const validatedChannel = {
          "id": channelId,
          "src": src
      };

      return validatedChannel;
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
          <MainScreen ref={mainScreenRef} appState={appState} saveAppState={saveAppState} solvePuzzle={solvePuzzle} solved={solved} />
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
