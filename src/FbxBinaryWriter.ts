import { FbxBinary } from "./FbxBinary";
import { FbxDocument } from "./FbxDocument";
import { FbxNode } from "./FbxNode";
import { FbxVersion } from "./FbxVersion";

class FbxBinaryWriter extends FbxBinary {
    private readonly output: WritableStream;
    private readonly memory: Uint8Array;
    private readonly stream: DataView;
    private readonly nodePath: string[] = [];
    public CompressionThreshold: number = 1024;

    constructor(stream: WritableStream) {
        super();
        if (stream == null) {
            throw new Error('Stream cannot be null.');
        }
        this.output = stream;
        this.memory = new Uint8Array(1024); // create an initial buffer with 1024 bytes
        this.stream = new DataView(this.memory.buffer);
    }

    private writeRaw(obj: any) {
        const bytes = obj as Uint8Array;
        this.stream.setUint32(0, bytes.length, true);
        this.writeToBuffer(bytes);
    }

    private writeString(obj: any) {
        let str = obj.toString();
        // Replace "::" with \0\1 and reverse the tokens
        if (str.contains('::')) {
            const tokens = str.split('::');
            const sb = new StringBuilder();
            let first = true;
            for (let i = tokens.length - 1; i >= 0; i--) {
                if (!first) {
                    sb.Append('\0\1');
                }
                sb.Append(tokens[i]);
                first = false;
            }
            str = sb.ToString();
        }
        const bytes = Encoding.ASCII.GetBytes(str);
        this.stream.setUint32(0, bytes.length, true);
        this.writeToBuffer(bytes);
    }

    private writeArray(array: any[], elementType: Type, writer: (sw: FbxBinaryWriter, obj: any) => void) {
        this.stream.setUint32(0, array.length, true);

        const size = array.length * Marshal.SizeOf(elementType);
        const compress = size >= this.CompressionThreshold;
        this.stream.setUint32(4, compress ? 1 : 0, true);

        let sw = this;
        let codec = null;

        const compressLengthPos = this.stream.byteOffset + this.stream.byteLength;
        this.writeToBuffer(new Uint8Array(4)); // Placeholder compressed length
        const dataStart = this.stream.byteOffset + this.stream.byteLength;
        if (compress) {
            this.writeToBuffer(new Uint8Array([0x58, 0x85])); // Header bytes for DeflateStream settings
            codec = new DeflateWithChecksum({ level: 9 });
            sw = new FbxBinaryWriter(codec);
        }
        for (const obj of array) {
            writer(sw, obj);
        }
        if (compress) {
            codec.close(); // This is important - otherwise bytes can be incorrect
            const checksum = codec.checksum;
            const bytes = new Uint8Array([
                (checksum >> 24) & 0xff,
                (checksum >> 16) & 0xff,
                (checksum >> 8) & 0xff,
                checksum & 0xff,
            ]);
            sw.writeToBuffer(bytes);
        }
        // Now we can write the compressed data length, since we know the size
        if (compress) {
            const dataEnd = this.stream.byteOffset + this.stream.byteLength;
            this.stream.setUint32(compressLengthPos, dataEnd - dataStart, true);
        }
    }

    private writeToBuffer(bytes: Uint8Array) {
        const requiredSize = this.stream.byteOffset + this.stream.byteLength + bytes.length;
        if (requiredSize > this.memory.length) {
            this.expandBuffer(requiredSize);
        }
        const bufferView = new DataView(this.memory.buffer, this.stream.byteOffset + this.stream.byteLength, bytes.length);
        bufferView.set(bytes);
        this.stream.setInt32(4, this.stream.byteLength + bytes.length, true);
    }

    private expandBuffer(requiredSize: number) {
        const newMemory = new Uint8Array(Math.max(requiredSize, this.memory.length * 2));
        newMemory.set(this.memory);
        this.memory = newMemory;
        this.stream = new DataView(this.memory.buffer, 0, this.stream.byteOffset + this.stream.byteLength);
    }

    private writeArray(array: any[], writer: (sw: DataView, obj: any) => void): void {
        const arrayLength = array.length;
        this.stream.setUint32(this.stream.byteOffset + 2, arrayLength, true);
        const arrayBegin = this.stream.byteOffset + 6;
        let offset = arrayBegin;
        for (let i = 0; i < arrayLength; i++) {
            writer(this.stream, array[i]);
            offset += writer.length;
        }

        this.stream.setUint32(this.stream.byteOffset + 2, offset - arrayBegin, true);
    }

    private writeNode(document: FbxDocument, node: FbxNode | null): void {
        if (node === null) {
            const nullData = (document.version >= FbxVersion.v7_5) ? nullData : nullData;
            this.output.write(nullData);

            return;
        }

        this.nodePath.push(node.Name ?? "");
        const name = node.Name ? new TextEncoder().encode(node.Name) : new Uint8Array();
        if (name.length > 255) {
            throw new Error("Node name is too long");
        }

        // Header
        const endOffsetPos = this.stream.byteOffset;
        const propertyLengthPos = endOffsetPos + 8;
        const nameLength = name.length;
        const headerLength = 1 + 1 + 2 + nameLength;
        if (document.version >= FbxVersion.v7_5) {
            this.stream.setBigUint64(endOffsetPos, 0n);
            this.stream.setBigUint64(propertyLengthPos, 0n);
            this.stream.setBigUint64(this.stream.byteOffset, BigInt(headerLength));
        } else {
            this.stream.setUint32(endOffsetPos, 0);
            this.stream.setUint32(propertyLengthPos, 0);
            this.stream.setUint32(this.stream.byteOffset, headerLength);
        }

        this.stream.setUint8(this.stream.byteOffset, nameLength);
        if (nameLength > 0) {
            const nameBegin = this.stream.byteOffset + 2;
            this.memory.set(name, nameBegin);
        }

        // Write properties and length
        const propertyBegin = this.stream.byteOffset;
        for (let i = 0; i < node.Properties.length; i++) {
            this.writeProperty(node.Properties[i], i);
        }

        const propertyEnd = this.stream.byteOffset;
        if (document.version >= FbxVersion.v7_5) {
            this.stream.setBigUint64(propertyLengthPos, BigInt(propertyEnd - propertyBegin));
        } else {
            this.stream.setUint32(propertyLengthPos, propertyEnd - propertyBegin);
        }

        // Write child nodes
        if (node.Nodes.length > 0) {
            for (const childNode of node.Nodes) {
                if (childNode === null) {
                    continue;
                }

                this.writeNode(document, childNode);
            }

            this.writeNode(document, null);
        }

        // Write end offset
        const dataEnd = this.stream.byteOffset;
        if (document.version >= FbxVersion.v7_5) {
            this.stream.setBigUint64(endOffsetPos, BigInt(dataEnd));
        } else {
            this.stream.setUint32(endOffsetPos, dataEnd);
        }

        // Pop the current node path off the stack
        this.nodePath.pop();
    }

    public write(document: FbxDocument): void {
        this.stream.setUint8(0, 0); // Placeholder for header
        this.stream.setUint32(1, 0x1A4587FB, true); // Magic number
        this.stream.setUint32(5, 0x1000000, true); // Version
        this.stream.setUint32(9, 0); // Length of rest of file
        this.stream.setUint32(13, 0); // Unknown flag
        this.stream.setUint32(17, 0); // Reserved

        const headerLength = 21;
        let offset = headerLength;
        for (const node of document.nodes) {
            this.writeNode(document, node);
            offset += this.stream.byteOffset - headerLength;
        }

        this.writeNode(document, null);
        this.stream.setUint8(this.stream.byteOffset, 0); // Placeholder for footer

        const footerLength = GenerateFooterCode(document).length;
        const length = offset + footerLength - 1;

        this.stream.setUint32(9, length, true);
        this.stream.setUint8(length - footerLength, 0x20); // Footer separator
        this.memory.set(GenerateFooterCode(document), length - footerLength + 1);

        this.output.write(this.memory.subarray(0, length));
    }
}