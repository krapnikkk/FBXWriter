import { FbxException } from '../FbxException';
import { FbxVersion } from '../FbxVersion';
import { Token, TokenType, ValueType } from './Token';

export class IdentifierToken extends Token {
  public readonly Value: string;

  constructor(value: string) {
    super(TokenType.Identifier, ValueType.None);
    this.Value = value;
  }

  public WriteBinary(version: FbxVersion, binaryWriter: BinaryWriter): void {
    const bytes = new TextEncoder().encode(Value ?? '');
    if (bytes.length > 255) {
      throw new FbxException(binaryWriter.BaseStream.Position, 'Identifier value is too long');
    }
    binaryWriter.Write(bytes.length);
    if (bytes.length > 0) {
      binaryWriter.Write(bytes);
    }
  }

  public equals(obj: unknown): boolean {
    if (obj instanceof IdentifierToken) {
      return this.Value === obj.Value;
    }
    return false;
  }

  public hashCode(): number {
    return this.Value?.hashCode() ?? 0;
  }
}