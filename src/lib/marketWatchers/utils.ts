export function confLine(opts: Record<string, any>): string {
  let conf = [];
  for (const [k, value] of Object.entries(opts)) {
    if (k === 'quoetAmount') {
      continue;
    }
    if (typeof value === 'boolean') {
      conf.push(value ? 'true' : 'false');
    } else {
      conf.push(`${value}`);
    }
  }
  return conf.join(',');
}
