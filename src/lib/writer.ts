export interface Writer {
  write(s: string): Promise<number>;

  count(s: string): number;
}

export class WriterToStream implements Writer {
  constructor(
    private readonly stream: NodeJS.WritableStream,
    private readonly encoding: BufferEncoding,
  ) {}

  async write(s: string): Promise<number> {
    const out = this.stream;
    const encoding = this.encoding;
    return new Promise<number>((resolve, reject) => {
      const buffer = Buffer.from(s, encoding);

      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };
      const onClose = () => {
        cleanup();
        reject(new Error('Stream closed before write completed'));
      };
      const cleanup = () => {
        out.off('error', onError);
        out.off('close', onClose);
      };

      out.once('error', onError);
      out.once('close', onClose);

      // write callback гарантує, що саме цей чанк оброблено
      out.write(buffer, (err?: Error | null) => {
        cleanup();
        if (err) {
          return reject(err);
        }
        resolve(buffer.byteLength);
      });
    });
  }

  count(s: string): number {
    return Buffer.byteLength(s, this.encoding);
  }
}
