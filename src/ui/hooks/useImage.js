export const useImage = (imageName) => {
  if (chrome?.runtime?.getURL) {
    return chrome.runtime.getURL(`assets/${imageName}`)
  } else {
    return `assets/${imageName}`
  }
}
