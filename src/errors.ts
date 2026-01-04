export class UnsupportedContentType extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedContentType";
  }
}
