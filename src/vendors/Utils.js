export function log(...args) {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
}

export function deepMerge(h1, h2) {
  if (typeof h1 === "object" && typeof h2 === "object" && !(h1 instanceof Array)) {
    let keys = Object.keys(Object.assign({}, h1, h2));
    let keysL = keys.length;
    for (let i = 0; i < keysL; i++) {
      h1[keys[i]] = deepMerge(h1[keys[i]], h2[keys[i]]);
    }
    return h1;
  } else {
    if (typeof h2 !== "undefined") {
      return h2;
    } else {
      return h1;
    }
  }
}

export function replaceAll(string, find, replace) {
  return string.replace(new RegExp(find.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"), "g"), replace);
}

export function isValidURL(string) {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (e) {
    return false;
  }
}

export function checkUrlProtocol(url) {
  if (isValidURL(url)) {
    let protocolMatch = url.match(/^https?:\/\//);
    if (protocolMatch instanceof Array && protocolMatch.length === 1) {
      let urlProtocol = protocolMatch[0].replace("://", "");
      let appProtocol = _getProtocol();
      if (urlProtocol != appProtocol) {
        switch (appProtocol) {
          case "https":
            //Try to load HTTP url over HTTPs
            url = "https" + url.replace(urlProtocol, ""); //replace first
            break;
          case "http":
            //Try to load HTTPs url over HTTP
            //Do nothing
            break;
          default:
            //App is not loaded over HTTP or HTTPs
            break;
        }
      }
    }
  }
  return url;
}

export function checkUrlProtocols(obj) {
  if (typeof obj === "string") {
    return checkUrlProtocol(obj);
  } else if (Array.isArray(obj)) {
    return obj.map((item) => checkUrlProtocols(item));
  } else if (obj !== null && typeof obj === "object") {
    const newObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        newObj[key] = checkUrlProtocols(obj[key]);
      }
    }
    return newObj;
  } else {
    return obj;
  }
}

let _getProtocol = function () {
  let protocol;
  try {
    protocol = document.location.protocol;
  } catch (e) {}

  if (typeof protocol == "string") {
    let protocolMatch = protocol.match(/[\w]+/);
    if (protocolMatch instanceof Array && typeof protocolMatch[0] == "string") {
      protocol = protocolMatch[0];
    } else {
      protocol = "unknown";
    }
  }
  return protocol;
};

export function preloadImages(images) {
  if (!Array.isArray(images)) {
    return;
  }
  for (const url of images) {
    if (isImage(url)) {
      const img = new Image();
      img.src = url;
    }
  }
}

export function preloadAudios(sources) {
  if (!Array.isArray(sources)) {
    return;
  }
  sources.forEach((src) => {
    const audio = new Audio();
    audio.src = src;
    audio.preload = "auto";
  });
}

export function preloadVideos(sources) {
  if (!Array.isArray(sources)) {
    return;
  }

  sources.forEach((src) => {
    const video = document.createElement("video");
    video.src = src;
    video.preload = "auto";
    video.muted = true;
    video.style.display = "none";
    document.body.appendChild(video);
  });
}

export function isImage(url) {
  return _hasExtension(["jpg", "jpeg", "png", "gif", "bmp", "svg"], url);
}

let _hasExtension = function (extensions, url) {
  if (typeof url === "string") {
    //Remove options
    url = url.split("?")[0];
    let extension = url.split(".").pop().split("&")[0].toLowerCase();
    if (extensions.indexOf(extension) != "-1") {
      return true;
    }
  }
  return false;
};

export function isPDFSupported() {
  let pdfReaderSupport = false;
  if (typeof navigator.mimeTypes == "object" && "application/pdf" in navigator.mimeTypes) {
    pdfReaderSupport = true;
  }
  return pdfReaderSupport;
}

export function parseNumberFromSetting(value){
  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return null;
    }
    const num = Number(trimmed);
    return Number.isNaN(num) ? null : num;
  }
  return null;
};

export function parseChannelId(channelId, frequencyRange) {
  channelId = parseNumberFromSetting(channelId);
  if (channelId === null || !Number.isFinite(channelId)) {
      return;
  }
  return Math.min(frequencyRange.max,Math.max(frequencyRange.min, channelId));
}