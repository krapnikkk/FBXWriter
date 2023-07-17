class FbxVertex {
    public static readonly SizeInBytes: number = 56;

    public Position: number[];
    public TexCoord: number[];
    public Normal: number[];
    public Tangent: number[];
    public Binormal: number[];

    constructor(position: number[], texCoord: number[], normal: number[], tangent: number[], binormal: number[]) {
        this.Position = position;
        this.TexCoord = texCoord;
        this.Normal = normal;
        this.Tangent = tangent;
        this.Binormal = binormal;
    }

    // public equals(other: FbxVertex): boolean {
    //     return this.Position.equals(other.Position) && this.TexCoord.equals(other.TexCoord) && this.Normal.equals(other.Normal) && this.Tangent.equals(other.Tangent) && this.Binormal.equals(other.Binormal);
    // }

    // private static combineHashCodes(h1: number, h2: number): number {
    //     const shift5: number = ((h1 << 5) | (h1 >>> 27)) >>> 0;
    //     return ((shift5 + h1) ^ h2) >>> 0;
    // }

    // public hashCode(): number {
    //     let hash: number = this.Position.hashCode();
    //     hash = FbxVertex.combineHashCodes(hash, this.TexCoord.hashCode());
    //     hash = FbxVertex.combineHashCodes(hash, this.Normal.hashCode());
    //     hash = FbxVertex.combineHashCodes(hash, this.Tangent.hashCode());
    //     hash = FbxVertex.combineHashCodes(hash, this.Binormal.hashCode());
    //     return hash;
    // }

    // public static equals(left: FbxVertex, right: FbxVertex): boolean {
    //     return left.equals(right);
    // }

    // public static notEquals(left: FbxVertex, right: FbxVertex): boolean {
    //     return !FbxVertex.equals(left, right);
    // }
}