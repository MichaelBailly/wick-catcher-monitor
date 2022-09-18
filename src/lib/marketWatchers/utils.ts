export function confLine(opts: Record<string, any>): string {
  let conf = [];
  for (const [_, value] of Object.entries(opts)) {
    if (typeof value === 'boolean') {
      conf.push(value ? 'true' : 'false');
    } else {
      conf.push(`${value}`);
    }
  }
  return conf.join(',');
}
