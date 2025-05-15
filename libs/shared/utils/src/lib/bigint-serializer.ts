export function serializeBigInt(obj: any): string {
  return JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  );
}

export function deserializeBigInt(str: string): any {
  return JSON.parse(str, (key, value) => {
    if (typeof value === 'string' && /^\d+n?$/.test(value)) {
      return BigInt(value.replace('n', ''));
    }
    return value;
  });
}
