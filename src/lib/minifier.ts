/* eslint-disable @typescript-eslint/no-explicit-any */
import { Writer } from './writer';
import { JsonObject } from './json.generator';
import { JsonSerializer } from './json.serializer';

export interface Minifier {
  fitToSize(value: JsonObject, size: number, targetSize: number): JsonObject;
}

export const DEFAULT_PAD_FIELD_NAME = '___pad';
export const DEFAULT_PAD_CHAR = 'X';

export class MinifierByDataUpdate implements Minifier {
  constructor(
    private readonly writer: Writer,
    private readonly serializer: JsonSerializer,
    private readonly allowToChangeData = true,
    private readonly char: string = DEFAULT_PAD_CHAR,
    private readonly fieldName: string = DEFAULT_PAD_FIELD_NAME,
  ) {}

  fitToSize(value: JsonObject, size: number, targetItemSize: number): JsonObject {
    if (!this.allowToChangeData) {
      return value;
    }

    const padName = this.fieldName;
    const char = this.char;

    const serialize = (v: JsonObject): string => this.serializer.serialize(v);
    const sizeOf = (s: string) => this.writer.count(s);

    // Ensure field exists so overhead is taken into account during calibration
    const initial = (padName in value ? String((value as any)[padName]) : '') as string;
    let padLen = initial.length;
    (value as any)[padName] = initial;

    let s0 = sizeOf(serialize(value));
    if (s0 === targetItemSize) {
      return value;
    }

    // Calibrate add and remove deltas
    // Add one char
    (value as any)[padName] = initial + char;
    const sPlus = sizeOf(serialize(value));
    const deltaAdd = sPlus - s0;
    // Remove one char or delete
    let deltaRemove = 0;
    if (padLen > 0) {
      (value as any)[padName] = initial.slice(0, padLen - 1);
      const sMinus = sizeOf(serialize(value));
      deltaRemove = s0 - sMinus;
    } else {
      delete (value as any)[padName];
      const sDel = sizeOf(serialize(value));
      deltaRemove = s0 - sDel;
    }
    // Restore initial
    (value as any)[padName] = initial;
    s0 = sizeOf(serialize(value));

    if (s0 < targetItemSize && deltaAdd > 0) {
      // Increase towards target
      const need = targetItemSize - s0;
      const n = Math.floor(need / deltaAdd);
      if (n > 0) {
        (value as any)[padName] = initial + char.repeat(n);
        padLen = String((value as any)[padName]).length;
        s0 = sizeOf(serialize(value));
      }
      // Micro-tune up to a small bound, without exceeding target
      let guard = 0;
      while (s0 < targetItemSize && guard++ < 8) {
        const trial = String((value as any)[padName]) + char;
        (value as any)[padName] = trial;
        const s1 = sizeOf(serialize(value));
        if (s1 <= targetItemSize) {
          s0 = s1;
        } else {
          // revert last char
          (value as any)[padName] = trial.slice(0, -1);
          break;
        }
      }
      return value;
    }

    if (s0 > targetItemSize && deltaRemove > 0) {
      // Decrease towards target
      const padStr = String((value as any)[padName]);
      const len = padStr.length;
      const need = s0 - targetItemSize;
      let steps = Math.floor(need / deltaRemove);
      if (steps <= 0) {
        steps = 1;
      }
      if (len > 0) {
        const newLen = Math.max(0, len - steps);
        (value as any)[padName] = padStr.slice(0, newLen);
        let sNow = sizeOf(serialize(value));
        let guard = 0;
        while (sNow > targetItemSize && String((value as any)[padName]).length > 0 && guard++ < 8) {
          (value as any)[padName] = String((value as any)[padName]).slice(0, -1);
          sNow = sizeOf(serialize(value));
        }
        if (sNow > targetItemSize && String((value as any)[padName]).length === 0) {
          delete (value as any)[padName];
        }
        return value;
      }
      // len === 0: try deleting field
      delete (value as any)[padName];
      return value;
    }

    return value;
  }
}
