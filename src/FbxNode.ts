import { FbxNodeList } from './FbxNodeList';

export class FbxNode extends FbxNodeList {
    [key: string]: any;
    /**
     * The node name, which is often a class type
     *
     * The name must be smaller than 256 characters to be written to a binary stream
     */
    name = '';

    /**
     * The list of properties associated with the node
     *
     * Supported types are primitives (apart from byte and char), arrays of primitives, and strings
     */
    properties: any[] = [];

    /**
     * The first property element
     */
    get value(): any {
        return this.properties.length < 1 ? null : this.properties[0];
    }
    set value(val: any) {
        if (this.properties.length < 1) {
            this.properties.push(val);
        } else {
            this.properties[0] = val;
        }
    }

    /**
     * Whether the node is empty of data
     */
    get isEmpty(): boolean {
        return this.name === '' && this.properties.length === 0 && this.nodes.length === 0;
    }
}