export function findSnippet(html: string, experimentId: string): boolean {
  try {
    const id = experimentId.replace(/[^0-9]/g, '');
    if (!html || !id) return false;
    const patterns = [
      new RegExp(String.raw`/embed/` + id + String.raw`\.js`, 'i'),
      new RegExp(String.raw`AB-EXPERIMENT:\s*` + id, 'i'),
      new RegExp(String.raw`data-exp-id\s*=\s*"?` + id + String.raw`"?`, 'i'),
    ];
    return patterns.some((re) => re.test(html));
  } catch {
    return false;
  }
}

