import { FbxException } from "./FbxException";
import { FbxNode } from "./FbxNode";
import { FbxNodeList } from "./FbxNodeList";

abstract class FbxBinary {
  // Header string, found at the top of all compliant files
  private static readonly headerString = new TextEncoder().encode("Kaydara FBX Binary  \0\x1a\0");

  // This data was entirely calculated by me, honest. Turns out it works, fancy that!
  private static readonly sourceId = new Uint8Array([0x58, 0xAB, 0xA9, 0xF0, 0x6C, 0xA2, 0xD8, 0x3F, 0x4D, 0x47, 0x49, 0xA3, 0xB4, 0xB2, 0xE7, 0x3D]);
  private static readonly key = new Uint8Array([0xE2, 0x4F, 0x7B, 0x5F, 0xCD, 0xE4, 0xC8, 0x6D, 0xDB, 0xD8, 0xFB, 0xD7, 0x40, 0x58, 0xC6, 0x78]);
  // This wasn't - it just appears at the end of every compliant file
  private static readonly extension = new Uint8Array([0xF8, 0x5A, 0x8C, 0x6A, 0xDE, 0xF5, 0xD9, 0x7E, 0xEC, 0xE9, 0x0C, 0xE3, 0x75, 0x8F, 0x29, 0x0B]);

  private static readonly footerZeroes = 120;

  protected static readonly footerCodeSize = 16;

  protected static readonly binarySeparator = "0x1";

  protected static readonly asciiSeparator = "::";

  protected static writeHeader(stream: WritableStreamDefaultWriter<Uint8Array>) {
    stream.write(FbxBinary.headerString);
  }

  // Turns out this is the algorithm they use to generate the footer. Who knew!
  private static encrypt(a: Uint8Array, b: Uint8Array) {
    let c = 64;
    for (let i = 0; i < FbxBinary.footerCodeSize; i++) {
      a[i] = (a[i] ^ (c ^ b[i])) & 0xff;
      c = a[i];
    }
  }

  private static readonly timePath1 = "FBXHeaderExtension";
  private static readonly timePath2 = "CreationTimeStamp";

  // Gets a single timestamp component
  private static getTimestampVar(timestamp: FbxNode, element: string): number {
    const elementNode = timestamp[element][0];
    if (elementNode && elementNode.Properties.length > 0) {
      const prop = elementNode.Properties[0];
      const longValue = prop.getAsLong();
      if (longValue !== null) return longValue;
    }
    throw new FbxException(-1, `Timestamp has no ${element}`);
  }

  protected static generateFooterCode(document: FbxNodeList): Uint8Array {
    const timestamp = document.getRelative(`${FbxBinary.timePath1}/${FbxBinary.timePath2}`);
    if (!timestamp) {
      throw new FbxException(-1, "No creation timestamp");
    }

    try {
      return FbxBinary.generateFooterCodeInternal(
        FbxBinary.getTimestampVar(timestamp, "Year"),
        FbxBinary.getTimestampVar(timestamp, "Month"),
        FbxBinary.getTimestampVar(timestamp, "Day"),
        FbxBinary.getTimestampVar(timestamp, "Hour"),
        FbxBinary.getTimestampVar(timestamp, "Minute"),
        FbxBinary.getTimestampVar(timestamp, "Second"),
        FbxBinary.getTimestampVar(timestamp, "Millisecond")
      );
    } catch (e) {
      if (e instanceof RangeError) {
        throw new FbxException(-1, "Invalid timestamp");
      }
      throw e;
    }
  }

  protected static generateFooterCodeInternal(
    year: number, month: number, day: number,
    hour: number, minute: number, second: number, millisecond: number
  ): Uint8Array {
    if (year < 0 || year > 9999) {
      throw new RangeError("year");
    }

    if (month < 0 || month > 12) {
      throw new RangeError("month");
    }

    if (day < 0 || day > 31) {
      throw new RangeError("day");
    }

    if (hour < 0 || hour >= 24) {
      throw new RangeError("hour");
    }

    if (minute < 0 || minute >= 60) {
      throw new RangeError("minute");
    }

    if (second < 0 || second >= 60) {
      throw new RangeError("second");
    }

    if (millisecond < 0 || millisecond >= 1000) {
      throw new RangeError("millisecond");
    }

    const buffer = new ArrayBuffer(FbxBinary.footerCodeSize);
    const code = new Uint8Array(buffer);

    // Write source ID
    code.set(FbxBinary.sourceId);

    // Write timestamp
    const dataView = new DataView(buffer);
    dataView.setUint16(16, year, true);
    dataView.setUint8(18, month);
    dataView.setUint8(19, day);
    dataView.setUint8(20, hour);
    dataView.setUint8(21, minute);
    dataView.setUint8(22, second);
    dataView.setUint16(23, millisecond, true);

    // Encrypt with key
    FbxBinary.encrypt(code, FbxBinary.key);

    // Append extension
    const result = new Uint8Array(FbxBinary.footerCodeSize + FbxBinary.extension.length);
    result.set(code);
    result.set(FbxBinary.extension, FbxBinary.footerCodeSize);

    return result;
  }

  protected static writeFooter(stream: WritableStreamDefaultWriter<Uint8Array>, document: FbxNodeList) {
    const footerCode = FbxBinary.generateFooterCode(document);
    stream.write(new TextEncoder().encode(FbxBinary.binarySeparator));
    stream.write(footerCode);
    stream.write(new Uint8Array(FbxBinary.footerZeroes));
  }
}