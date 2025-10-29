import { JsonObject } from './json.generator';
import { Writer } from './writer';
import { JsonSerializer } from './json.serializer';

export class JsonFacade {
  constructor(
    private readonly writer: Writer,
    private readonly serializer: JsonSerializer,
  ) {}

  createEntity(body: JsonObject): JsonEntity {
    const content = this.serializer.serialize(body);
    const size = this.writer.count(content);
    return new JsonEntity(body, content, size);
  }

  updateEntity(entity: JsonEntity, newBody: JsonObject): JsonEntity {
    const content = this.serializer.serialize(newBody);
    const size = this.writer.count(content);
    return new JsonEntity(newBody, content, size);
  }
}

export class JsonEntity {
  constructor(
    readonly body: JsonObject,
    readonly content: string,
    readonly size: number,
  ) {}
}
