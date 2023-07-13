import { FbxVersion } from "../FbxVersion";

class IdentifierToken extends Token {
    public readonly Value: string;
  
    public WriteBinary(version: FbxVersion, binaryWriter: BinaryWriter): void {
      const bytes = Encoding.ASCII.GetBytes(this.Value ?? "");
      if (bytes.Length > byte.MaxValue) {
        throw new FbxException(binaryWriter.BaseStream.Position, "Identifier value is too long");
      }
      binaryWriter.Write(byte(bytes.Length));
      if (bytes.Length > 0) {
        binaryWriter.Write(bytes);
      }
    }
  
    public WriteAscii(version: FbxVersion, lineStringBuilder: LineStringBuilder, indentLevel: number): void {
      lineStringBuilder.Append(`${this.Value}:`);
    }
  
    public Equals(obj: any): boolean {
      if (obj instanceof IdentifierToken) {
        return this.Value == obj.Value;
      }
      return false;
    }
  
    public GetHashCode(): number {
      return this.Value?.GetHashCode() ?? 0;
    }
  
    constructor(value: string) {
      super(TokenType.Identifier, ValueType.None);
      this.Value = value;
    }
  }