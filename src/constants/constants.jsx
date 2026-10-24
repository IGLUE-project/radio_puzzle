export const DEFAULT_APP_SETTINGS = {
  //Authors settings
  skin: "STANDARD",
  backgroundImg: "images/background.png",
  actionAfterSolve: "PLAY_AUDIO",
  enableLoopForChannels: "TRUE",
  initialFrequency: "87",
  initialVolume: "50",

  //Internal
  // whiteNoiseSound: "/sounds/white_noise.wav",
  range: { min: 87.0, max: 108.0 },
  step: 0.1,
  tolerance: 0.3,
};

export const SKINS = {
  STANDARD: "STANDARD",
  RETRO: "RETRO",
  MODERN: "MODERN",
};

export const SKIN_SETTINGS = {
  [SKINS.STANDARD]: {
  },
  [SKINS.RETRO]: {
    radioImg: "images/radio_retro.png",
    buttonImg: "images/button_retro.png",
    displayImg: "images/display_retro.png",
    aspectRatio: "786/546",
    displayPanel: {
      top: "26.5%",
      left: "24%",
      width: "52%",
      height: "13%",
    },
    buttons: {
      bottom: "13.4%",
      left: "-15.1%",
      width: "130%",
      height: "12.5%",
    },
  },
  [SKINS.MODERN]: {
    radioImg: "images/radio_modern.png",
    buttonImg: "images/button_modern.png",
    aspectRatio: "8/5",
    displayPanel: {
      top: "43.5%",
      left: "35%",
      width: "30%",
      height: "20%",
    },
    buttons: {
      bottom: "64.4%",
      left: "31.2%",
      width: "25%",
      height: "12%",
    },
  }
};

export const ESCAPP_CLIENT_SETTINGS = {
  imagesPath: ".images/",
};
export const MAIN_SCREEN = "MAIN_SCREEN";