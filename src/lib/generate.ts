import { clampInt } from './utils';
import { getRandom } from './seed';
import { Logger } from './logger';
import { GenerateOptions } from '../index';
import { JsonArrayBuilder } from './json-array.builder';
import { JsonSerializer } from './json.serializer';
import { JsonPlanner } from './json.planner';
import { WriterToStream } from './writer';
import { JsonArrayTokenizer } from './json-array.tokenizer';
import { ConfigJsonGenerator } from './json.generator';
import { MinifierByDataUpdate } from './minifier';
import { JsonFacade } from './json.entity';

export async function generateStream(out: NodeJS.WritableStream, opts: GenerateOptions): Promise<void> {
  const depth = clampInt(opts.depth ?? 3, 0, 12);
  const sizeTarget = opts.size;
  const itemsRequested = opts.items;
  const minItemSize = opts.minItemSize ?? 0;
  const pretty = Boolean(opts.pretty);
  const exact = Boolean(opts.exact);
  const useOid = Boolean(opts.oid);
  const progress = Boolean(opts.progress);
  const encoding = opts.encoding ?? 'utf-8';

  if (!Number.isFinite(sizeTarget) || sizeTarget < 3) {
    throw new Error('Bad size: must be >= 3 bytes, but got ' + sizeTarget);
  }

  const generator = new ConfigJsonGenerator(depth, useOid, getRandom(opts.seed));
  const logger = new Logger(progress, !!process.stderr.isTTY, sizeTarget);
  const writer = new WriterToStream(out, encoding);
  const serializer = new JsonSerializer(pretty);
  const tokenizer = new JsonArrayTokenizer(pretty);
  const builder = new JsonArrayBuilder(writer, tokenizer);
  const planner = new JsonPlanner(sizeTarget, minItemSize, tokenizer, writer);
  const minifier = new MinifierByDataUpdate(writer);

  const facade = new JsonFacade(writer, serializer);

  logger.start();
  await builder.open();

  while (true) {
    if (itemsRequested !== undefined && builder.count >= itemsRequested) {
      break;
    }

    let entity = facade.createEntity(generator.generate(builder.count + 1));

    if (minItemSize) {
      if (entity.size < minItemSize) {
        const item = minifier.fitToSize(entity.body, entity.size, minItemSize);
        entity = facade.createEntity(item);
      }
    }

    if (itemsRequested) {
      const itemSizeTarget = planner.getSoftSizeForItem(builder.size, builder.count, itemsRequested, minItemSize);
      if (entity.size < itemSizeTarget) {
        const item = minifier.fitToSize(entity.body, entity.size, itemSizeTarget);
        entity = facade.createEntity(item);
      }
    }

    const planned = planner.getSizeWithNextItem(builder.size, builder.count, entity.size);

    if (planned > sizeTarget) {
      if (!exact) {
        break;
      }
      const itemSizeTarget = planner.getRemainingSize(builder.size, builder.count);
      if (itemSizeTarget >= 2) {
        const item = minifier.fitToSize(entity.body, entity.size, itemSizeTarget);
        entity = facade.createEntity(item);
      }
    }

    await builder.push(entity.content);

    const sizeActual = planner.getTotalSize(builder.size);
    if (sizeActual >= sizeTarget) {
      if (sizeActual > sizeTarget) {
        logger.warn(`Generated size ${sizeActual} bytes exceeds target size ${sizeTarget} bytes.`);
      }
      break;
    }

    if (builder.count % 25 === 0) {
      logger.progress(builder.size, builder.count);
    }
  }

  await builder.close();
  logger.end(builder.size, builder.count);
}
