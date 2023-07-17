import { FbxNodeList } from './FbxNodeList';
import { IdentifierToken } from './IdentifierToken';
import { Token, TokenType } from './tokens/Token';

export class FbxNode extends FbxNodeList {
  private readonly _properties: Token[] = [];

  /**
   * The node name, which is often a class type
   *
   * The name must be smaller than 256 characters to be written to a binary stream
   */
  public readonly Identifier: IdentifierToken;

  /**
   * The list of properties associated with the node
   *
   * Supported types are primitives (apart from byte and char), arrays of primitives, and strings
   */
  public get Properties(): Token[] {
    return [...this._properties];
  }

  constructor(identifier: IdentifierToken) {
    super();
    this.Identifier = identifier;
  }

  public GetPropertyWithName(name: string): Token | null {
    for (const property of this._properties) {
      if (property.TokenType !== TokenType.String) {
        continue;
      }
      const stringToken = property as StringToken;
      const propertyName = stringToken.Value?.split('::')[0];
      if (propertyName?.toLowerCase() === name.toLowerCase()) {
        return property;
      }
    }
    return null;
  }

  public AddProperty(value: Token): void {
    this._properties.push(value);
  }

  public PropertiesToIntArray(): number[] {
    const values: number[] = [];
    for (const property of this.Properties) {
      if (property.TokenType !== TokenType.Value || property.ValueType === Token.ValueType.None) {
        continue;
      }
      if (property.ValueType === Token.ValueType.Boolean && property instanceof BooleanToken) {
        values.push(property.Value ? 1 : 0);
      } else if (property.ValueType === Token.ValueType.Integer && property instanceof IntegerToken) {
        values.push(property.Value);
      } else if (property.ValueType === Token.ValueType.Long && property instanceof LongToken) {
        values.push(Math.round(property.Value));
      } else if (property.ValueType === Token.ValueType.Float && property instanceof FloatToken) {
        values.push(Math.round(property.Value));
      } else if (property.ValueType === Token.ValueType.Double && property instanceof DoubleToken) {
        values.push(Math.round(property.Value));
      }
    }
    return values;
  }

  public PropertiesToFloatArray(): number[] {
    const values: number[] = [];
    for (const property of this.Properties) {
      if (property.TokenType !== TokenType.Value || property.ValueType === Token.ValueType.None) {
        continue;
      }
      if (property.ValueType === Token.ValueType.Boolean && property instanceof BooleanToken) {
        values.push(property.Value ? 1 : 0);
      } else if (property.ValueType === Token.ValueType.Integer && property instanceof IntegerToken) {
        values.push(property.Value);
      } else if (property.ValueType === Token.ValueType.Long && property instanceof LongToken) {
        values.push(property.Value);
      } else if (property.ValueType === Token.ValueType.Float && property instanceof FloatToken) {
        values.push(property.Value);
      } else if (property.ValueType === Token.ValueType.Double && property instanceof DoubleToken) {
        values.push(property.Value);
      }
    }
    return values;
  }

  /**
   * The first property element
   */
  public get Value(): Token | null {
    return this.Properties.length < 1 ? null : this.Properties[0];
  }

  public set Value(value: Token) {
    if (this.Properties.length < 1) {
      this._properties.push(value);
    } else {
      this.Properties[0] = value;
    }
  }

  /**
   * Whether the node is empty of data
   */
  public get IsEmpty(): boolean {
    return this.Identifier.Value === '' && this.Properties.length === 0 && this.Nodes.length === 0;
  }
}