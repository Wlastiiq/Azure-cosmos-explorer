const parentParams = new URLSearchParams(window.parent.location.search);

export function extractFeatures(params?: URLSearchParams): { [key: string]: string } {
  params = params || parentParams;
  const featureParamRegex = /feature.(.*)/i;
  const features: { [key: string]: string } = {};
  params.forEach((value: string, param: string) => {
    if (featureParamRegex.test(param)) {
      const matches: string[] = param.match(featureParamRegex);
      if (matches.length > 0) {
        features[matches[1].toLowerCase()] = value;
      }
    }
  });
  return features;
}
