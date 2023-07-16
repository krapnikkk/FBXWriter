enum TokenType {
    EndOfStream,
    Comment,
    OpenBrace,
    CloseBrace,
    Comma,
    Asterix,
    Identifier,
    String,
    Value,
    ValueArray
}

enum ValueType {
    None,
    Boolean,
    Byte,  // valid for array only
    Short,  //not valid for array
    Integer,
    Long,
    Float,
    Double
}

interface IEqualityComparer<T> {
    equals(x: T, y: T): boolean;
    getHashCode(obj: T): number;
}

class Token implements IEqualityComparer<Token> {
    public readonly TokenType: TokenType;
    public readonly ValueType: ValueType;

    constructor(tokenType: TokenType);
    constructor(tokenType: TokenType, valueType: ValueType);
    constructor(tokenType: TokenType, valueType?: ValueType) {
        this.TokenType = tokenType;
        this.ValueType = valueType ?? ValueType.None;
    }

    public getHashCode(obj: Token): number {
        // 实现获取对象散列值的逻辑
        return obj.TokenType + obj.ValueType;
    }

    public equals(other: Token): boolean {
        if (other != null) {
            // if (this instanceof BooleanToken && other instanceof BooleanToken) {
            //     return (this as BooleanToken).Value == (other as BooleanToken).Value;
            // }
            // if (this instanceof ShortToken && other instanceof ShortToken) {
            //     return (this as ShortToken).Value == (other as ShortToken).Value;
            // }
            // if (this instanceof IntegerToken && other instanceof IntegerToken) {
            //     return (this as IntegerToken).Value == (other as IntegerToken).Value;
            // }
            // if (this instanceof LongToken && other instanceof LongToken) {
            //     return (this as LongToken).Value == (other as LongToken).Value;
            // }
            // if (this instanceof FloatToken && other instanceof FloatToken) {
            //     return (this as FloatToken).Value == (other as FloatToken).Value;
            // }
            // if (this instanceof DoubleToken && other instanceof DoubleToken) {
            //     return (this as DoubleToken).Value == (other as DoubleToken).Value;
            // }
            // if (this instanceof StringToken && other instanceof StringToken) {
            //     return (this as StringToken).Value == (other as StringToken).Value;
            // }
            // if (this instanceof CommentToken && other instanceof CommentToken) {
            //     return (this as CommentToken).Value == (other as CommentToken).Value;
            // }
            // if (this instanceof IdentifierToken && other instanceof IdentifierToken) {
            //     return (this as IdentifierToken).Value == (other as IdentifierToken).Value;
            // }
            if (this.TokenType == other.TokenType && this.TokenType != TokenType.ValueArray && this.ValueType == other.ValueType) {
                return true;
            }
        }
        return false;
    }

    public static CreateAsterix(): Token {
        return new Token(TokenType.Asterix);
    }

    public static CreateComma(): Token {
        return new Token(TokenType.Comma);
    }

    public static CreateOpenBrace(): Token {
        return new Token(TokenType.OpenBrace);
    }

    public static CreateCloseBrace(): Token {
        return new Token(TokenType.CloseBrace);
    }

    public static CreateEndOfStream(): Token {
        return new Token(TokenType.EndOfStream);
    }

    public WriteBinaryArray(stream: BinaryWriter, uncompressedSize: number, itemWriterAction: (writer: BinaryWriter) => void): void {
        const compress = uncompressedSize >= Settings.CompressionThreshold;

        stream.Write(compress ? 1 : 0);

        if (compress) {
            const compressLengthPos = stream.BaseStream.Position;
            stream.Write(0);
            const dataStart = stream.BaseStream.Position;
            stream.Write(new Uint8Array([0x58, 0x85]), 0, 2);

            let checksum: number;
            using(new DeflateStream(stream.BaseStream, CompressionMode.Compress, true), (deflateStream) => {
                using(new ChecksumBinaryWriter(deflateStream), (checksumBinaryWriter) => {
                    itemWriterAction(checksumBinaryWriter);
                    checksum = checksumBinaryWriter.Checksum;
                });
            });

            const checksumBytes = new Uint8Array([
                (checksum >> 24) & 0xFF,
                (checksum >> 16) & 0xFF,
                (checksum >> 8) & 0xFF,
                checksum & 0xFF,
            ]);
            stream.Write(checksumBytes);

            const dataEnd = stream.BaseStream.Position;
            stream.BaseStream.Position = compressLengthPos;
            const compressedSize = (dataEnd - dataStart) as number;
            stream.Write(compressedSize);
            stream.BaseStream.Position = dataEnd;
        } else {
            stream.Write(uncompressedSize);
            itemWriterAction(stream);
        }
    }
}