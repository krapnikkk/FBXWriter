import { FbxNodeList } from './FbxNodeList';
import { FbxVersion } from './FbxVersion';


export class FbxDocument extends FbxNodeList {
  /**
   * Describes the format and data of the document
   *
   * It isn't recommended that you change this value directly, because
   * it won't change any of the document's data which can be version-specific.
   * Most FBX importers can cope with any version.
   */
  version: FbxVersion = FbxVersion.v7_4;
}