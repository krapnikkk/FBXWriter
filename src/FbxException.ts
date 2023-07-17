export class FbxException extends Error {
    constructor(position: number, message: string) {
        super(`${message}, near offset ${position}`);

    }
}