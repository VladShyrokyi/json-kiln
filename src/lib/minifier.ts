import { Writer } from './writer';
import { JsonObject } from './json.generator';

export interface Minifier {
  fitToSize(value: JsonObject, size: number, targetSize: number): JsonObject;
}

export class MinifierByDataUpdate implements Minifier {
  constructor(
    private readonly writer: Writer,
    private readonly allowToChangeData = true,
    private readonly char = 'X',
    private readonly fieldName = '___pad',
  ) {}

  fitToSize(value: JsonObject, size: number, targetSize: number): JsonObject {
    if (size === targetSize) {
      return value;
    }
    return size >= targetSize ? this.decreaseSize(value, size, targetSize) : this.increaseSize(value, size, targetSize);
  }

  private increaseSize(value: JsonObject, size: number, targetSize: number): JsonObject {
    const sizeDiff = size - targetSize;
    if (sizeDiff <= 0) {
      return value;
    }

    const char = this.char;
    const padFieldName = this.fieldName;
    const charSize = this.writer.count(char);
    const charsToAdd = Math.floor(sizeDiff / charSize);
    if (charsToAdd <= 0) {
      return value;
    }

    if (!this.allowToChangeData) {
      return value;
    }
    value[padFieldName] = char.repeat(charsToAdd);

    return value;
  }

  private decreaseSize(value: JsonObject, size: number, targetSize: number): JsonObject {
    const sizeDiff = size - targetSize;
    if (sizeDiff <= 0) {
      return value;
    }

    const padFieldName = this.fieldName;
    if (!(padFieldName in value)) {
      return value;
    }
    const currentPad = String(value[padFieldName]);
    const currentPadSize = this.writer.count(currentPad);
    if (currentPadSize <= sizeDiff) {
      delete value[padFieldName];
      return value;
    }
    const charSize = this.writer.count(this.char);
    const charsToRemove = Math.floor(sizeDiff / charSize);
    if (charsToRemove <= 0) {
      return value;
    }
    const newPadLength = currentPad.length - charsToRemove;
    value[padFieldName] = currentPad.slice(0, newPadLength);
    return value;
  }
}
