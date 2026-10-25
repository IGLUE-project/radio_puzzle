//Copy this file to config.js and specify your own settings

export let ESCAPP_APP_SETTINGS = {
  //Settings that can be specified by the authors
  skin: "STANDARD", //skin can be "STANDARD", "MODERN" or "RETRO".
  // backgroundImg: "NONE", //background can be "NONE" or a URL.
  actionAfterSolve: "PLAY_AUDIO", //actionAfterSolve can be "NONE" or "PLAY_AUDIO".
  enableLoopForChannels: "TRUE", //Whether the channel audios will play on a loop
  initialChannel: "87", //Initial channel of the radio (87-108 by default)
  initialVolume: "50", //Initial volume of the radio (0-100)
  keepState: "TRUE", //Enable keeping the radio state when the app is closed

  channels: [
    {
      id: "88.5", 
      src: "sounds/music_rock.mp3" 
    },
    { 
      id: "100", 
      src: "sounds/music_techno.mp3" 
    }
  ],

  channelRange: "0.0", // Frequency tolerance within which audio plays without noise.
  channelNoiseRange: "0.3", // Frequency tolerance within which audio plays with noise.

  escappClientSettings: {
    endpoint: "https://escapp.es/api/escapeRooms/id",
    linkedPuzzleIds: [1],
    rtc: false,
  },
};