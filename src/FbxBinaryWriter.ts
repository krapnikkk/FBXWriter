import { FbxBinary } from "./FbxBinary";
import { FbxDocument } from "./FbxDocument";
import { FbxNode } from "./FbxNode";
import { FbxVersion } from "./FbxVersion";

class FbxBinaryWriter extends FbxBinary {
    private readonly output: Blob;
    private readonly memory: ArrayBuffer;
    private readonly stream: DataView;
  
    // The minimum size of an array in bytes before it is compressed
    public CompressionThreshold: number = 1024;
  
    constructor(output: string) {
      super();
      this.output = new Blob([output], { type: 'application/octet-stream' });
      // Wrap in a memory buffer to guarantee seeking
      this.memory = new ArrayBuffer(0);
      this.stream = new DataView(this.memory);
    }
  
    private WriteProperty(version: FbxVersion, obj: Token): void {
      if (obj === undefined) {
        return;
      }
  
      obj.writeBinary(version, this.stream);
    }
  
    // Data for a null node
    static readonly nullData: Uint8Array = new Uint8Array(13);
    static readonly nullData7500: Uint8Array = new Uint8Array(25);
  
    // Writes a single document to the buffer
    private WriteNode(document: FbxDocument, node: FbxNode): void {
      if (node === undefined) {
        const data = document.version >= FbxVersion.v7_5 ? FbxBinaryWriter.nullData7500 : FbxBinaryWriter.nullData;
        this.stream.set(data);
      } else {
        // Header
        const endOffsetPos = this.stream.byteOffset + this.stream.byteLength;
        let propertyLengthPos: number;
        if (document.version >= FbxVersion.v7_5) {
          this.stream.setBigInt64(endOffsetPos, BigInt(0)); // End offset placeholder
          this.stream.setBigInt64(endOffsetPos + 8, BigInt(node.Properties.Length));
          propertyLengthPos = this.stream.byteOffset + this.stream.byteLength;
          this.stream.setBigInt64(propertyLengthPos, BigInt(0)); // Property length placeholder
        } else {
          this.stream.setInt32(endOffsetPos, 0); // End offset placeholder
          this.stream.setInt32(endOffsetPos + 4, node.Properties.Length);
          propertyLengthPos = this.stream.byteOffset + this.stream.byteLength;
          this.stream.setInt32(propertyLengthPos, 0); // Property length placeholder
        }
  
        node.Identifier.writeBinary(document.version, this.stream);
  
        // Write properties and length
        const propertyBegin = this.stream.byteOffset + this.stream.byteLength;
        for (let i = 0; i < node.Properties.Length; i++) {
          this.WriteProperty(document.version, node.Properties[i]);
        }
        const propertyEnd = this.stream.byteOffset + this.stream.byteLength;
        const propertyLength = propertyEnd - propertyBegin;
        if (document.version >= FbxVersion.v7_5) {
          this.stream.setBigInt64(propertyLengthPos, BigInt(propertyLength));
        } else {
          this.stream.setInt32(propertyLengthPos, propertyLength);
        }
  
        // Write child nodes
        if (node.Nodes.Length > 0) {
          for (const n of node.Nodes) {
            if (n === undefined) {
              continue;
            }
  
            this.WriteNode(document, n);
          }
          this.WriteNode(document, undefined);
        }
  
        // Write end offset
        const dataEnd = this.stream.byteOffset + this.stream.byteLength;
        if (document.version >= FbxVersion.v7_5) {
          this.stream.setBigInt64(endOffsetPos, BigInt(dataEnd));
        } else {
          this.stream.setInt32(endOffsetPos, dataEnd);
        }
      }
    }
  
    // Writes an FBX file to the output
    public Write(document: FbxDocument): void {
      this.writeHeader(this.memory);
      this.stream.setInt32(this.stream.byteOffset, document.version);
      // TODO: Do we write a top level node or not? Maybe check the version?
      for (const node of document.nodes) {
        this.WriteNode(document, node);
      }
  
      this.WriteNode(document, undefined);
      const footer = this.generateFooterCode(document);
      const footerBuffer = new Uint8Array(footer.length);
      for (let i = 0; i < footer.length; i++) {
        footerBuffer[i] = footer.charCodeAt(i);
      }
      this.stream.set(footerBuffer, this.stream.byteOffset + this.stream.byteLength);
      this.writeFooter(this.memory, document.version);
    }
}