import { pickRandom, randomText, randomWord, RNGFunc } from './seed';

export type JsonPrimitive = string | number | boolean | null;
export type Json = JsonPrimitive | Json[] | JsonObject;
export type JsonObject = { [k: string]: Json };

export interface JsonGenerator {
  generate(index: number): JsonObject;
}

export class ConfigJsonGenerator implements JsonGenerator {
  constructor(
    private readonly depth: number,
    private readonly isEnabledOid: boolean,
    private readonly rng: RNGFunc,
    private readonly createItem: (depth: number, rng: RNGFunc) => JsonObject = makeConfigLike,
  ) {}

  generate(index: number): JsonObject {
    const body = this.createItem(this.depth, this.rng);
    return this.withId(body, index);
  }

  private withId(body: JsonObject, index: number): JsonObject {
    body = { ...body };
    const idKeys = ['_id', 'id'];
    idKeys.forEach((key) => {
      if (key in body) {
        delete body[key];
      }
    });

    if (this.isEnabledOid) {
      return { _id: { $oid: makeObjectId(this.rng) }, ...body };
    }

    return { id: `cfg_${index}_${makeObjectId(this.rng)}`, ...body };
  }
}

function makeObjectId(rng: RNGFunc): string {
  const ts = Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, '0');
  let rest = '';
  for (let i = 0; i < 16; i++) {
    rest += Math.floor(rng() * 16).toString(16);
  }
  return (ts + rest).slice(0, 24);
}

function makeConfigLike(depth: number, rng: RNGFunc): JsonObject {
  const base: JsonObject = {
    configuration_name: `Conf ${randomWord(rng)} v${Math.floor(rng() * 12) + 1}`,
    description: randomText(rng, 80),
    rewards: makeRewards(depth, rng),
  };
  if (rng() < 0.55) {
    base.description_tags = Array.from({ length: Math.floor(rng() * 4) + 1 }, () => randomWord(rng));
  }
  if (rng() < 0.5) {
    base.iterations = Math.floor(rng() * 5) + 1;
  }
  if (rng() < 0.4) {
    base.flags = { beta: rng() < 0.5, canary: rng() < 0.5, rollout: Math.floor(rng() * 100) };
  }
  if (rng() < 0.3) {
    base.limits = {
      daily: Math.floor(rng() * 100) + 1,
      weekly: Math.floor(rng() * 500) + 1,
      monthly: Math.floor(rng() * 2000) + 1,
    };
  }
  if (rng() < 0.3) {
    base.ratio = Number((rng() * 3).toFixed(3));
  }
  if (rng() < 0.3) {
    base.meta = makeNested(depth - 1, rng);
  }
  return base;
}

function makeRewards(depth: number, rng: RNGFunc): JsonObject[] {
  const items = Math.floor(rng() * 8) + 5; // 5..12
  const arr: JsonObject[] = [];
  const rcPool = [1, 2, 3, 4, 5, 7, 10, 12, 15, 20, 30, 60, 120, 180];
  for (let i = 0; i < items; i++) {
    const base: JsonObject = {
      iteration_index: Math.floor(rng() * 3) + 1,
      reward_count: pickRandom(rng, rcPool),
      reward: [{ type: `mystery_${randomWord(rng)}_${Math.floor(rng() * 12) + 1}` }],
      fallback_reward: [{ type: `mystery_${randomWord(rng)}_fallback_${Math.floor(rng() * 12) + 1}` }],
    };
    if (rng() < 0.25) {
      base.extra = makeNested(depth - 1, rng);
    }
    arr.push(base);
  }
  return arr;
}

function makeNested(depth: number, rng: RNGFunc): Json {
  if (depth <= 0) {
    return rndLeaf(rng);
  }
  if (rng() < 0.5) {
    const len = Math.floor(rng() * 5) + 1;
    return Array.from({ length: len }, () => makeNested(depth - 1, rng));
  }
  const keys = Math.floor(rng() * 5) + 2;
  const obj: Record<string, Json> = {};
  for (let i = 0; i < keys; i++) {
    obj[randomWord(rng) + '_' + (Math.floor(rng() * 20) + 1)] = makeNested(depth - 1, rng);
  }
  return obj;
}

function rndLeaf(rng: RNGFunc): JsonPrimitive {
  const t = Math.floor(rng() * 6);
  switch (t) {
    case 0:
      return randomText(rng, Math.floor(rng() * 32) + 8);
    case 1:
      return Math.floor(rng() * 101000) - 1000;
    case 2:
      return Number((rng() * 100).toFixed(4));
    case 3:
      return rng() < 0.5;
    case 4:
      return null;
    default:
      return randomWord(rng);
  }
}
