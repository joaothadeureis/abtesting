type VariantInput = { id: number; name: "A" | "B" | "C"; weight: number };
export function allocateVariant(hashBucket: number, variants: VariantInput[]) {
  const total = variants.reduce((acc, v) => acc + Math.max(0, v.weight), 0);
  if (total <= 0) return variants[0];
  const max = 10000;
  let acc = 0;
  for (const v of variants) {
    const range = Math.floor((Math.max(0, v.weight) / total) * max);
    if (hashBucket >= acc && hashBucket < acc + range) return v;
    acc += range;
  }
  return variants[variants.length - 1];
}

