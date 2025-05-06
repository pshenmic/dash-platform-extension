export const useImage = (imageName) => {
  if (chrome?.runtime?.getURL) {
    return chrome.runtime.getURL(imageName)
  } else {
    return `assets/${imageName}`
  }
}
