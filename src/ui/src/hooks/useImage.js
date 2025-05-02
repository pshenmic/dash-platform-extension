export const useImage = (imageName) => {
  if (chrome.extension) {
    chrome.extension.getURL(imageName)
  } else {
    return `assets/${imageName}`
  }
}
