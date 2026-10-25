export const DEFAULT_APP_SETTINGS = {
  //Authors settings
  skin: "STANDARD",
  backgroundImg: "images/background_standard.png",
  actionAfterSolve: "PLAY_AUDIO",
  enableLoopForChannels: "TRUE",
  initialChannel: "87",
  initialVolume: "50",
  keepState: "TRUE",
  channelRange: "0.0",
  channelNoiseRange: "0.3",
  channels: [],

  //Internal
  soundRadioNoise: "sounds/noise_radio_soft.mp3",
  soundRadioOn: "sounds/click_button.mp3",
  soundRadioOff: "sounds/click_button.mp3",
  range: { min: 87.0, max: 108.0 },
  step: 0.1,
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
    backgroundImg: "images/background_retro.png",
    soundRadioOn: "sounds/retro_on_off.mp3",
    soundRadioOff: "sounds/retro_on_off.mp3",
    range: { min: 88.0, max: 108.0 },
    radioImg: "images/radio_retro.png",
    buttonImg: "images/button_retro.png",
    displayImg: "images/display_retro.png",
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