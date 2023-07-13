import { FbxNode } from './FbxNode';

export abstract class FbxNodeList {
  /**
   * The list of child/nested nodes
   *
   * A list with one or more null elements is treated differently than an empty list,
   * and represented differently in all FBX output files.
   */
  nodes: FbxNode[] = [];

  /**
   * Gets a named child node
   * @param name The name of the child node
   * @returns The child node, or null
   */
  getByName(name: string): FbxNode | null {
    return this.nodes.find((n) => n?.name === name) || null;
  }

  /**
   * Gets a child node, using a '/' separated path
   * @param path The path to the child node
   * @returns The child node, or null
   */
  getRelative(path: string): FbxNode | null {
    const tokens = path.split('/');
    let n: FbxNodeList = this;
    for (const t of tokens) {
      if (t === '') continue;
      n = n.getByName(t) as FbxNodeList;
      if (!n) break;
    }
    return n as FbxNode || null;
  }
}