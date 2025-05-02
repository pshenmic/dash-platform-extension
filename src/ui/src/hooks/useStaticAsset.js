export const useStaticAsset = (assetName) => {
  if (chrome.extension) {
    chrome.extension.getURL(assetName)
  } else {
    return `assets/${assetName}`
  }
}
