export const useStaticAsset = (assetName) => {
  if (chrome?.runtime?.getURL) {
    return chrome.runtime.getURL(`assets/${assetName}`)
  } else {
    return `assets/${assetName}`
  }
}
