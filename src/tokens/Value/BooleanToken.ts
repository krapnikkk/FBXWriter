import { FbxVersion } from "../../FbxVersion";

class BooleanToken extends Token {
    public Value: boolean;

    constructor(value: boolean) {
        super(TokenType.Value, ValueType.Boolean);
        this.Value = value;
    }

    public WriteBinary(version: FbxVersion, dataView: DataView, offset: number): void {
        dataView.setUint8(offset, 'C'.charCodeAt(0));
        dataView.setUint8(offset + 1, this.Value ? 'T'.charCodeAt(0) : 'F'.charCodeAt(0));
    }

}