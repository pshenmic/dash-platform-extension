export const useStaticAsset = (assetName: string): string => {
  if (chrome?.runtime?.getURL != null) {
    return chrome.runtime.getURL(`assets/${assetName}`)
  } else {
    return `assets/${assetName}`
  }
}
