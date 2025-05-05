export const useImage = (imageName) => {
  if (chrome.runtime) {
    return chrome.runtime.getURL(imageName)
  } else {
    return `assets/${imageName}`
  }
}
