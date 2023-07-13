import { FbxNode } from "./FbxNode";
import { FbxNodeList } from "./FbxNodeList";

export abstract class FbxBinary {
  // Header string, found at the top of all compliant files
  private static readonly headerString: Uint8Array = new TextEncoder().encode(
    "Kaydara FBX Binary  \0\x1a\0"
  );

  // This data was entirely calculated by me, honest. Turns out it works, fancy that!
  private static readonly sourceId: Uint8Array = new Uint8Array([
    0x58,
    0xab,
    0xa9,
    0xf0,
    0x6c,
    0xa2,
    0xd8,
    0x3f,
    0x4d,
    0x47,
    0x49,
    0xa3,
    0xb4,
    0xb2,
    0xe7,
    0x3d,
  ]);
  private static readonly key: Uint8Array = new Uint8Array([
    0xe2,
    0x4f,
    0x7b,
    0x5f,
    0xcd,
    0xe4,
    0xc8,
    0x6d,
    0xdb,
    0xd8,
    0xfb,
    0xd7,
    0x40,
    0x58,
    0xc6,
    0x78,
  ]);
  // This wasn't - it just appears at the end of every compliant file
  private static readonly extension: Uint8Array = new Uint8Array([
    0xf8,
    0x5a,
    0x8c,
    0x6a,
    0xde,
    0xf5,
    0xd9,
    0x7e,
    0xec,
    0xe9,
    0x0c,
    0xe3,
    0x75,
    0x8f,
    0x29,
    0x0b,
  ]);

  // Number of null bytes between the footer code and the version
  private static readonly footerZeroes1 = 20;
  // Number of null bytes between the footer version and extension code
  private static readonly footerZeroes2 = 120;

  /** The size of the footer code **/
  protected static readonly footerCodeSize = 16;

  /** The namespace separator in the binary format (remember to reverse the identifiers) **/
  protected static readonly binarySeparator = "0x1";

  /** The namespace separator in the ASCII format and in object data **/
  protected static readonly asciiSeparator = "::";

  /**
   * Checks if the first part of 'data' matches 'original'
   * @param data
   * @param original
   * @returns true if it does, otherwise false
   */
  protected static checkEqual(data: Uint8Array, original: Uint8Array): boolean {
    for (let i = 0; i < original.length; i++) {
      if (data[i] !== original[i]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Writes the FBX header string
   * @param stream
   */
  protected static writeHeader(stream: WritableStreamDefaultWriter<Uint8Array>): void {
    stream.write(this.headerString);
  }

  // Turns out this is the algorithm they use to generate the footer. Who knew!
  private static encrypt(a: Uint8Array, b: Uint8Array): void {
    let c = 64;
    for (let i = 0; i < this.footerCodeSize; i++) {
      a[i] = a[i] ^ (c ^ b[i]);
      c = a[i];
    }
  }

  private static readonly timePath1 = "FBXHeaderExtension";
  private static readonly timePath2 = "CreationTimeStamp";
  private static readonly timePath = [this.timePath1, this.timePath2];

  // Gets a single timestamp component
  private static getTimestampVar(timestamp: FbxNode, element: string): number {
    const elementNode = timestamp[element];
    if (elementNode != null && elementNode.properties.length > 0) {
      const prop = elementNode.properties[0];
      if (typeof prop === "number") {
        return prop;
      }
    }
    throw new Error(`Timestampcomponent ${element} not found or invalid`);
  }

  /**
   * Writes the FBX footer
   * @param stream
   * @param version The FBX version
   * @param timestamp The creation timestamp
   */
  protected static writeFooter(
    stream: WritableStreamDefaultWriter<Uint8Array>,
    version: number,
    timestamp: FbxNode
  ): void {
    // First, write the source ID
    stream.write(this.sourceId);

    // Write some null bytes
    const zeroes1 = new Uint8Array(this.footerZeroes1);
    stream.write(zeroes1);

    // Write the version number
    const versionArray = new Uint8Array(4);
    versionArray[0] = version & 0xff;
    versionArray[1] = (version >>> 8) & 0xff;
    versionArray[2] = (version >>> 16) & 0xff;
    versionArray[3] = (version >>> 24) & 0xff;
    stream.write(versionArray);

    // Write some more null bytes
    const zeroes2 = new Uint8Array(this.footerZeroes2);
    stream.write(zeroes2);

    // encrypt the extension code
    const encryptedKey = new Uint8Array(this.key.length);
    this.encrypt(encryptedKey, this.key);

    // Write the extension code
    stream.write(encryptedKey);
    stream.write(this.extension);

    // Write the timestamp
    const timestampVar = new Uint8Array(8);
    const timestampNode = timestamp.getSubNode(this.timePath);
    if (timestampNode == null) {
      throw new Error(`Timestamp node not found`);
    }
    const year = this.getTimestampVar(timestampNode, "year");
    const month = this.getTimestampVar(timestampNode, "month");
    const day = this.getTimestampVar(timestampNode, "day");
    const hour = this.getTimestampVar(timestampNode, "hour");
    const minute = this.getTimestampVar(timestampNode, "minute");
    const second = this.getTimestampVar(timestampNode, "second");
    const millisecond = this.getTimestampVar(timestampNode, "millisecond");

    timestampVar.set(new Uint8Array([year - 1900, month - 1, day, hour, minute, second, 0, 0]));
    stream.write(timestampVar);
    const millisecondArray = new Uint8Array(4);
    millisecondArray[0] = millisecond & 0xff;
    millisecondArray[1] = (millisecond >>> 8) & 0xff;
    millisecondArray[2] = (millisecond >>> 16) & 0xff;
    millisecondArray[3] = (millisecond >>> 24) & 0xff;
    stream.write(millisecondArray);
  }


  protected static generateFooterCode(document: FbxNodeList): Uint8Array {
    const timestampNode = document.getRelative(`${this.timePath1}/${this.timePath2}`);
    const year = this.getTimestampVar(timestampNode, "year");
    const month = this.getTimestampVar(timestampNode, "month");
    const day = this.getTimestampVar(timestampNode, "day");
    const hour = this.getTimestampVar(timestampNode, "hour");
    const minute = this.getTimestampVar(timestampNode, "minute");
    const second = this.getTimestampVar(timestampNode, "second");
    const millisecond = this.getTimestampVar(timestampNode, "millisecond");
    var str = this.sourceId.slice();
    var mangledTime = `${('00' + second).slice(-2)}${('00' + month).slice(-2)}${('00' + hour).slice(-2)}${('00' + day).slice(-2)}${('00' + Math.floor(millisecond / 10)).slice(-2)}${('0000' + year).slice(-4)}${('00' + minute).slice(-2)}`;
    var mangledBytes = new TextEncoder().encode(mangledTime);;
    this.encrypt(str, mangledBytes);
    this.encrypt(str, this.key);
    this.encrypt(str, mangledBytes);
    return str;
  }
}