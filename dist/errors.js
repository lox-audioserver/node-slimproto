export class UnsupportedContentType extends Error {
    constructor(message) {
        super(message);
        this.name = "UnsupportedContentType";
    }
}
